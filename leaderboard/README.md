# Springhaven shared leaderboard

The root `index.html` runs on GitHub Pages or from a local file. It labels the score board as local whenever the shared API is unavailable. The Worker serves the same game and a same-origin API. It replays each daily shot from the submitted club, power and heading. It ranks only a player's best verified result for the Eastern calendar day.

## Deploy

From the repository root, run `npm --prefix leaderboard run deploy -- --login`. Sign in to Cloudflare when the browser opens. The command reuses or creates the `springhaven-leaderboard` database, applies migrations, and prints the public Worker URL. Open that same URL on both devices. To redeploy with an existing login, omit `-- --login`.

### Manual deployment

From the repository root:

1. Run `npx wrangler login`, then `npx wrangler d1 create springhaven-leaderboard`.
2. Copy `leaderboard/wrangler.example.json` to `leaderboard/wrangler.json` and replace `REPLACE_WITH_DATABASE_ID` with the database ID.
3. Run `node leaderboard/build.mjs` to prepare the assets, then `npx wrangler d1 migrations apply springhaven-leaderboard --remote --config leaderboard/wrangler.json`.
4. Run `npx wrangler deploy --config leaderboard/wrangler.json` and share the Worker URL printed by Wrangler. After changing the game, run the build again before deploying. It generates both the site and the server replay module directly from the same root HTML.

For a local shared-board test, run the migration with `--local` and use `npx wrangler dev --config leaderboard/wrangler.json`. Use two browser profiles to test independent entries. The display name is public. The random browser ID is never returned from the leaderboard, and a different browser or cleared storage creates a new player.
