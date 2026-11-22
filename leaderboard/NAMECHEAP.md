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


## Upgrade to the combined Daily Challenge

The generated root `index.html` is now the shared front page. `ace.html` retains the existing Hole 6 game and `/api/leaderboard` remains its API. The new `/api/three` API validates the three-hole competition. GitHub Pages previews use explicitly labelled browser-local boards; the shared three-hole board becomes available only after this server/database upgrade.

1. Back up the existing app folder and database. Import the **new `CREATE TABLE IF NOT EXISTS three_attempts` statement** from `namecheap-schema.sql` (re-importing the full schema is also non-destructive). Do not delete or replace `scores` or `daily_attempts`.
2. In the source checkout, run `node leaderboard/build.mjs`. Upload `namecheap-server.js`, `three.mjs`, the existing `leaderboard.mjs`, and the complete newly generated `generated/` folder into the server's `leaderboard` application folder. The dependency list is unchanged; retain existing environment variables and database credentials.
3. **Keep previously deployed `generated/public/course/releases/` directories.** Every official three-hole round is pinned to its starting build for both server replay and browser recovery. Upload into the folder, preserving older release directories; do not empty that directory during upgrades. New server engine validation imports only a build already recorded on an official attempt.
4. Restart the Node.js application after the upload finishes. Check `/DailyChallenge/`, `/DailyChallenge/ace.html?hub=1`, `/DailyChallenge/api/leaderboard` and `/DailyChallenge/api/three`.
5. Play from two devices: each daily competition allows its own first attempt. Confirm that a three-hole shot survives a refresh, total score includes penalties, the Hole 3 tee-shot tiebreak distance is retained, and both named results appear on their corresponding shared boards.

Three-hole official state is saved after each settled shot with an atomic revision update; duplicate retries return the saved state. The browser also stores an unacknowledged shot before launch, so reloading resumes that pending save instead of allowing another first shot. The first round is retained per browser player ID per Eastern date. This is the same device-identity limitation as the existing Hole 6 game; it does not provide account-based identity.

The daily three-hole setup is deterministic (tee, wind pattern/strength, green speed; center pins on the current three greens). Play 3 scoring is par 12. Equal totals use Hole 3's tee-shot finishing distance; a penalty on that shot ranks behind in-play results, and exact matches share rank. Names are posted only after completion. GitHub development and the live Namecheap site remain separate deployments.
