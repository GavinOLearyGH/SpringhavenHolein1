# Deploy on Namecheap

Use the existing `www.theirishpar.com` hosting account. This app serves the game at
`https://www.theirishpar.com/DailyChallenge/` and the shared API at
`https://www.theirishpar.com/DailyChallenge/api/leaderboard`.

1. In **Database Wizard**, create a dedicated database and database user. Retain the complete cPanel-prefixed names. Import `leaderboard/namecheap-schema.sql` into that database with phpMyAdmin. The running app needs SELECT, INSERT and UPDATE on its leaderboard database.
2. Upload the repository, including root `index.html` and the `leaderboard` directory, to a new folder in your home directory outside `public_html`, for example `irish-par-game`.
3. From that folder run `node leaderboard/build.mjs`. This builds the HTML and the server-side replay engine from the same source. If cPanel Terminal is unavailable, run the build locally before uploading and include `leaderboard/generated`.
4. In **Setup Node.js App**, create an app for `www.theirishpar.com` with URL path `DailyChallenge`, application root `irish-par-game/leaderboard`, startup file `namecheap-server.js`, Production mode and Node.js 22 or 24. Add `PUBLIC_ORIGIN=https://www.theirishpar.com`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` in cPanel environment variables. Set `DB_HOST` if the account uses a host other than `127.0.0.1`. Use **Run NPM Install**, then start or restart the app.
5. Open the API URL. It should return JSON with today's Eastern date, player counts and leaders. Open the game on two devices and post a result under distinct names. Verify both entries appear, then replay from one of those browsers and confirm that its first result remains the only eligible score. The board uses a browser ID for each player, so a player opening the game on a new device appears as a separate entry.

The app redirects the bare domain to the www game URL. GitHub Pages continues using browser-local scores. A different hostname has its own browser storage, so those scores don't automatically appear on the new shared board.


## Upgrade an existing leaderboard

Import `leaderboard/namecheap-first-shot.sql` into the existing leaderboard database before uploading the first-shot release. The migration adds the private attempt table and preserves posted scores. Activate the release at the start of a new Eastern challenge day so all players on that day's board use the first-shot rule. Use the Node.js 24 app and restart after replacing the app files and both generated files.
