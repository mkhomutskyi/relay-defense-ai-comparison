# Deployment preparation

## Static games

The `site/` folder can be hosted by GitHub Pages. The owner requested public access. Pages publication uses the manual GitHub Actions workflow. The workflow is manual-only; pushing does not publish automatically. It deploys the prepared static files and performs no new game generation. Verify the repository-prefixed URLs, asset requests and fullscreen/input on the final origin.

## Rating API

The local Wrangler configuration contains a placeholder D1 UUID and localhost origins. It must not be treated as a production deployment. Install the pinned Wrangler dependency in `ratings/`, apply SQL migrations locally and run `wrangler dev --port 5220` for integration verification. For local testing only, set `site/config.json` to `{"ratingsApiBase":"/api"}` in a working copy.

Before production, create the D1 binding, apply the same migration to that database, configure the final allowed site origin, deploy the Worker and point the public site's config to its HTTPS `/api` base. No browser-side secret is required. If serving the site through GitHub Pages, configure the Worker API's exact allowed GitHub Pages origin. Origins are not authentication. Add account-supported edge rate limiting before enabling anonymous public writes; per-token update throttling alone does not prevent fabricated new voter tokens.

Test invalid stars, unknown games, missing/hostile origins, vote update instead of duplication, optional categories and API failures. Do not seed or display synthetic QA votes as real reader feedback. Production starts with an empty ratings database.

## Frozen results

Do not fix game behavior while packaging. Record any asset-path-only changes and compare against source hashes. The native Vulkan prototype is playable, with a missing map and known defects. Its recorded TypeScript error remains disclosed. Source-map/asset privacy checks and license review apply to the exact final bundle. Keep model weights and private experiment archives outside this repository.

## Scope

Repository preparation does not publish the Medium article. Public Pages and production rating collection are separate deployment steps. A new repaired game version needs a new result/version identifier and separate votes; do not overwrite the experiment it replaces.
