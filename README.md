# Relay Defense: six AI-built games

Six saved browser tower-defense games, generated through different model/runtime/agent workflows. This repository contains their source, static browser bundles and comparison page. Playing requires no language model, API key or home-server access.

**[Play all six games](https://mkhomutskyi.github.io/relay-defense-ai-comparison/)** · [Source and build notes](https://github.com/mkhomutskyi/relay-defense-ai-comparison)

The repository and GitHub Pages site are public. Production reader voting is not enabled. The star interface works locally; the shared rating service requires deployment/configuration. These are different games with different development histories, not a controlled model leaderboard.

![Actual DeepSeek and Graphify game during boss combat](site/media/deepseek-graphify.png)

The GIF previews below are continuous eight-second real-time gameplay excerpts. The comparison page also includes six compact videos. The Graphify video joins setup and combat with the waiting interval removed; the cut is disclosed beside it. Clips are silent and do not establish client-device frame rate or perceived audio quality.

## My final ranking

| Place | Development workflow | Recorded creation time | DeepSeek API usage |
|---|---|---:|---:|
|1|DeepSeek Flash API + Pi + Graphify|26m35s|$0.1847|
|2|DeepSeek Flash API + Pi|21m43s, including a later fix|$0.1446|
|3|Qwen3.8-Flash-Next IQ2_XS + Strata HIP/MTP + Pi|1h58m23s|No local inference API fee|
|4|GLM-5.3-Flash + Strata Q2/Q3 Experts + Pi|5h53m22s|No local inference API fee|
|5|Qwen3.8-Flash-Next IQ2_XS + LM Studio Vulkan + Pi|1h40m19s; playable, map missing|No local inference API fee|
|6|Qwen3.8-27B Q4_K_M + LM Studio Vulkan + Pi, early harness|About 8h40m wall span|No local inference API fee|

API usage includes compatibility preflight; excludes outside coordination, setup, independent QA, human effort, hardware and electricity. Most times sum coding/repair phases; 27B is a broader wall span. The 27B harness had significant limitations. GLM used text-only feedback and several recoveries. No general ranking of all local models follows.

Graphify's game won my review. There was one fresh hosted game per configuration. The Graphify session used more in-session API/tool/image work, so the difference cannot be assigned causally to Graphify. Its actual code queries confirmed relationships; no hidden bug discovery or token saving was established.

## Gameplay GIFs and direct play links

Each GIF opens the corresponding browser game. These silent clips show the saved builds, including their defects. Listen to sound in the playable games.

### DeepSeek Flash · Pi + Graphify

[Play this build](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=deepseek-graphify)

[![DeepSeek Flash · Pi + Graphify — actual gameplay](site/media/deepseek-graphify.gif)](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=deepseek-graphify)

### DeepSeek Flash · Pi

[Play this build](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=deepseek-pi)

[![DeepSeek Flash · Pi — actual gameplay](site/media/deepseek-pi.gif)](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=deepseek-pi)

### Flash-Next · Strata · Pi

[Play this build](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=qwen-strata)

[![Flash-Next · Strata · Pi — actual gameplay](site/media/qwen-strata.gif)](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=qwen-strata)

### GLM-5.3-Flash · Strata · Pi

[Play this build](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=glm-strata)

[![GLM-5.3-Flash · Strata · Pi — actual gameplay](site/media/glm-strata.gif)](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=glm-strata)

### Flash-Next · LM Studio Vulkan · Pi

[Play this build](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=qwen-native)

[![Flash-Next · LM Studio Vulkan · Pi — actual gameplay](site/media/qwen-native.gif)](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=qwen-native)

### Qwen3.8-27B · Vulkan · Pi

[Play this build](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=qwen27)

[![Qwen3.8-27B · Vulkan · Pi — actual gameplay](site/media/qwen27.gif)](https://mkhomutskyi.github.io/relay-defense-ai-comparison/?game=qwen27)

[GIF source intervals and provenance](results/gif-provenance.json).

## Play locally

```bash
python scripts/serve.py
```

Open `http://localhost:8080`. The committed static bundles run without a model or API key. Five pass TypeScript checks. The native Flash-Next source retains its recorded unused-method error; its Vite-only bundle preserves the playable prototype and its known defects. The missing map has not been repaired. See [build status](results/build-status.json).

## Source and rebuilding

Sources are in `games/<run-id>`. The identifiers label runs, not renamed checkpoints. Five recent games use pinned Phaser 4.2.1 / TypeScript 7.0.2 / Vite 8.3.6; 27B retains its original project dependencies and vendor files. With dependencies installed in each game folder, run:

```bash
node scripts/build.mjs
```

Use the committed lockfile with `npm ci` wherever present. The release records identify any newly generated lockfiles. Build configuration uses a relative Vite base so separate game folders can be served under a repository URL. Original game implementation is unchanged.

## Reader stars

The UI offers 1–5 stars for overall quality and optional visuals, gameplay/fun and sound. Unrated sound is not counted as zero. `ratings/` contains the Worker/D1 API and SQL migration. It replaces a browser token's earlier vote for the same frozen game version and returns averages with counts. This is best-effort anonymous feedback, not verified one-person/one-vote. Do not use repository stars as game scores.

Production requires a D1 database, the real database binding, allowed public origin, deployment/rate-limit configuration and `site/config.json` pointing to the API base. No credentials are shipped. Current disabled-state messaging explicitly says shared votes are not connected. See [deployment notes](docs/DEPLOYMENT.md) and [rating privacy](site/privacy.html).

## Estimated electricity

The current mixed-load illustration budgets 100 W for local coding, 75 W for the first broad Qwen window, 30 W for hosted-workflow tools and 20 W for light preparation. At 18.16 cents/kWh, the listed periods plus a separate eight-hour preparation allowance total about **2.07 kWh / $0.38 electricity**. If that allowance overlaps the first Qwen clock, the alternative is **1.63 kWh / $0.30**. These are assumptions, not wall-meter measurements or the complete research bill. The two recorded DeepSeek API charges add $0.3292 separately. See [power evidence, per-phase estimates and scope](docs/ELECTRICITY.md).

## Media, credits and experiment scope

Selected screenshots and clips come from actual browser execution. Silent clips/GIFs do not establish sound quality or client FPS. My ranking is separate from public reader feedback. Codex prepared the comparison UI, rating service, packaging and article graphics; the tested models authored the game implementations.

The machine was a refurbished MINISFORUM AI X1 Pro, Ryzen AI 9 HX 370, 64 GB RAM. The refurbished barebone cost $522.63 including tax. I was lucky to find 64 GB of used DDR5 on eBay for $520. Recorded new spending was $1,042.63; the NVMe drive was reused. Local inference ran on that AMD machine; both DeepSeek arms used hosted inference while tools/builds/browser ran locally. The hardware/setup notes are in [minisforum-hx370-local-ai](https://github.com/mkhomutskyi/minisforum-hx370-local-ai). The [recorded GPU memory layout and limits](docs/GPU_MEMORY.md) explain the 2 GiB preallocated heap, 56 GiB GTT budget and shared-memory constraints.

Keep Phaser/template and dependency license notices. See [credits](docs/CREDITS.md). No weights, credentials, account records, private infrastructure configuration or raw model sessions belong in this repository.

For changes, read [Contributing](CONTRIBUTING.md), the [security policy](SECURITY.md) and the [MIT License](LICENSE). Run `python scripts/check_public.py` before submitting. It checks privacy patterns, both exact captured/published source representations and all six GIF/source hashes; GitHub runs the same check on pushes and pull requests. The original source capture and Git's line-ending-normalized snapshot are recorded separately in `results/source-hashes.json` and `results/git-source-hashes.json`.
