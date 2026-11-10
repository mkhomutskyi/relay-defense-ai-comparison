# Verification and limitations

Checked 10 November 2026. These checks establish public loading, media integrity and packaging behavior. They do not establish model quality, replay value, sound quality or player-device frame rate.

## Public site and media

All 36 public browser checks passed on the AMD machine: six game cards and GIF links, matching GIF downloads, all six game canvases, mobile gallery fit, and accurate unavailable-voting messages. No page or HTTP errors were observed. GitHub CI and the manual Pages deployment passed.

Each GIF is a continuous eight-second excerpt from actual browser execution. The five newer GIFs have 80 frames at 10 fps; the Graphify GIF has 96 frames at 12 fps. All clips are silent. The Graphify MP4 removes waiting between setup and combat; that cut is disclosed on the site. Its GIF is continuous combat. No game resources, outcomes or game speed were modified for the recordings. See [GIF provenance](../results/gif-provenance.json).

## Builds and source integrity

Five sources pass TypeScript checks. Native Flash-Next retains its unused `bakeBackground` error. Its Vite-only bundle is a playable prototype with a missing map and overlapping interface; those defects are preserved.

The 128 captured source hashes are in `results/source-hashes.json`. The published Git representation is recorded separately in `results/git-source-hashes.json`; ten files differ only by CRLF-to-LF normalization. The release check accepts either exact known representation. Game implementations and earlier media are unchanged.

The source files, current public history, workflow logs and Pages artifacts were checked for exposed credentials and private owner/server details. None were found in the reviewed scope. Automated scans are not an exhaustive security guarantee. See [SECURITY.md](../SECURITY.md).

## Comparison limits

Each result is one saved game with its own development history. The early 27B workflow had restrictive tool limits and tooling defects. GLM had text-only feedback and several recovery phases. Later runs used an updated Pi setup. These results support a comparison of the saved games, not a general model leaderboard.

Creation clocks have different boundaries. API charges exclude setup, outside coordination, independent checks, human effort, hardware and electricity. The electricity estimate is an illustrative whole-box assumption, not a wall-plug measurement. Graphify's run used more in-session calls and image review, so its first-place result cannot be attributed to Graphify alone.

Shared reader voting is not enabled. Local rating checks covered input validation, vote updates, optional categories, hostile origins and submission failures; synthetic test votes are not public reader feedback. The optional service needs its production configuration and abuse controls before public collection.
