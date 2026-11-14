# My Tower-Defense Experiment, Part 2: Six Models, Five Playable Games

*Qwen, DeepSeek, two Inklings, GLM and MiniMax through Pi. What did the time and API spending actually buy?*

![Editorial sketch of six model deployments, a tower-defense monitor, an AMD tools host, an RTX 5090 and cloud inference](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/cover-part2.png)

*AI-assisted editorial illustration. Actual gameplay captures appear below.*

In [Part 1](https://medium.com/p/99decaca5454), I used my roughly $1,043 AMD box to compare six tower-defense games. My favorite came from DeepSeek through [Pi](https://pi.dev/) with Graphify, at an estimated 18.47 cents in API usage.

For Part 2, I gave six model deployments the same six-wave brief and clean Phaser starter. Five produced playable games, with defects. One compiled successfully and opened a blank screen.

The compiler was pleased. The browser was less impressed.

[Play or inspect all six attempts here](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/). No model, API key or home-server connection is needed. The [same public repository](https://github.com/mkhomutskyi/relay-defense-ai-comparison) holds the source and measurements.

## The AMD box still did the development

My MINISFORUM AI X1 Pro has a Ryzen AI 9 HX 370 and 64 GB of RAM. The refurbished barebone cost $522.63 including tax; I got lucky with used eBay RAM for $520. I reused the NVMe drive.

Pi, files, builds and browser tests ran on the AMD server. Qwen used Qwen Cloud US. DeepSeek, Inkling 2, GLM and MiniMax used Ollama Cloud. Original Inkling Small used a native CUDA server on my RTX 5090 desktop—additional hardware outside the AMD box's price.

The selected models authored the TypeScript games, procedural graphics and Web Audio through Pi. Setup, prompts, packaging and independent checks used outside assistance, excluded from the model-cost table. Graphify was not used in this round.

![Workflow showing cloud inference and local RTX 5090 inference feeding Pi and development tools on the AMD machine](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/workflow-part2.png)

*Editorial diagram: the development workspace stayed on AMD; inference changed.*

## What the clocks and bills say

| Model and inference route | Active agent time | API usage for this build |
|---|---:|---:|
| GLM-5.3-Flash · Ollama Cloud | 13m18s, two phases | $0.22324 billed increment |
| DeepSeek V4.1 Flash 1017 · Ollama Cloud | 21m43s | ~$0.6315 token estimate |
| Inkling 2 Small · Ollama Cloud | 29m02s | ~$0.3138 token estimate |
| MiniMax M3.1 Flash · Ollama Cloud | 30m00s, two phases | $0.31356 observed; one request unresolved |
| Qwen3.8-Flash · Qwen Cloud US | 31m32s, two phases | ~$0.7909 uncached upper estimate |
| Original Inkling Small UD-IQ1_S · RTX 5090 | 56m58s, four phases | No API fee; electricity additional |

These are recorded build costs, not current price quotes. Active time includes tool waits and repairs; setup, loading, gaps, independent review and human effort are excluded.

I kept Pi 1.5.0, Phaser 4.2.1, TypeScript 7.0.2 and Vite 8.3.6 fixed. Reasoning settings differed. Qwen received one recovery prompt, GLM one visual-feedback prompt, MiniMax one factual repair, and local Inkling three continuations. An unintended calibration job overlapped earlier runs. This was a workflow comparison, not a precise model-speed ranking. The [methods](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/METHODS.md) and [measurement tables](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/MEASUREMENTS.md) explain those differences.

## GLM: a working game for 22 cents

GLM-5.3-Flash's first pass took 10m36s and added $0.17463 to the bill. It corrected a restart bug during its own tests.

My independent replay passed all six waves, paid upgrades, spending rejection, pause, speed, mute, defeat and restart checks. Screenshots exposed nearly invisible shop buttons and crowded instructions. One visual-feedback prompt added 2m42s and $0.04861; GLM corrected them.

The spending guard ended that phase before its final reply. The saved changes passed the affected-control checks. Total: $0.22324. Simple geometric sprites, but a functioning game.

![Actual GLM cloud game showing targeting, moving enemies and firing](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-glm.gif)

[Play GLM-5.3-Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-glm)

## DeepSeek: the most coherent implementation

DeepSeek's saved prototype had a readable desert map, more illustrated detail, distinct single-target and area weapons, working upgrades and sale refunds. Its independent campaign ended with 82 kills, full integrity and no leaks.

That clear alone says little about difficulty. The restricted-strategy checks below were more revealing.

![Actual DeepSeek cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-deepseek.gif)

[Play DeepSeek V4.1 Flash 1017 · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-deepseek)

The $0.6315 figure is a cache-aware estimate from logged tokens through Ollama, not a direct DeepSeek invoice.

## Inkling 2: more strategic pressure

Cloud Inkling 2 completed the campaign with ten lives remaining. Paid upgrades and restart after either ending worked. Its homing lancer and fixed-location mortar blasts offered different ways to handle moving targets.

Two of its own test scripts timed out; those waits remain in the 29m02s total. The fixed-width canvas is cropped on phones, so use a desktop for this build.

![Actual Inkling 2 cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling2.gif)

[Play Inkling 2 Small · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling2)

## MiniMax: the repair mattered

MiniMax's first pass compiled but threw `ReferenceError: Phaser is not defined`. Several controls failed. One factual repair produced a game that passed 20/20 independent functional checks, including a six-wave victory with full integrity and no leaks.

![Actual MiniMax cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-minimax.gif)

[Play MiniMax M3.1 Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-minimax)

Its two phases totaled 30 minutes and ended at guards or deadlines. The observed bill increased $0.31356 for 207 requests. One additional aborted request had no final usage, so I retained a $0.1671168 reservation. That hold is not a confirmed charge; 31 cents is not a fully reconciled price.

## Qwen: a campaign clear with broken controls

Qwen's first pass left the starter unchanged. A recovery prompt produced a game that completed the campaign. Ordinary upgrade and sell clicks still failed, and the phone layout was cropped.

![Actual Qwen Cloud Flash game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-qwen.gif)

[Play Qwen3.8-Flash · Qwen Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-qwen)

The $0.7909 upper estimate ignores cache discounts. I left the implementation's defects intact rather than repairing them outside the tested model.

## Original local Inkling: the failure stays

My local [Unsloth Inkling Small GGUF](https://huggingface.co/unsloth/Inkling-Small-GGUF) used extreme UD-IQ1_S quantization, GPU/host-memory splitting and text-only input. Four phases left incomplete code, tool-format errors and a mismatched scene entry point. The final build passed; starting it reached a blank screen.

![Actual local Inkling failure: its menu transitions to a blank screen](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling-local.gif)

[Inspect the failed local Inkling artifact](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling-local)

This older, heavily quantized deployment is not a clean match for cloud Inkling 2. Checkpoint, serving stack, tool handling and missing image input all differ. Its failure cannot settle whether local models can build games.

## Winning the test is not the same as making a challenging game

I also checked fixed-army strategies using legal purchases and upgrades. DeepSeek survived one no-upgrade route with just 1/20 integrity; a weaker placement lost. Inkling 2's two-lancer route lost on wave three; upgrading those towers reached wave six but still lost. GLM's fixed two-turret route lost without upgrades and won with them.

MiniMax was more forgiving: three level-one towers won with 12/20 integrity and 2,712 credits left. That was a deliberately restricted army, not an optimized strategy. The games have different economies, so equal tower counts are not an equal-budget benchmark.

These probes made DeepSeek and Inkling 2 the stronger candidates for further gameplay review. They do not prove fair balance or replay value. Several games also allow a boss to leak if enough base health remains. A victory screen needs context. [Gameplay notes and limitations](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/GAMEPLAY_NOTES.md).

## Small bills still need the right accounting

During the recorded DeepSeek run, Ollama's peak rates were twice the direct provider's off-peak rates. Applying direct rates to the same tokens and cache hits gives about $0.316 instead of $0.632. This is a calculation, not a direct-provider replay; cache behavior could differ. Future DeepSeek tests will use its direct API.

Cloud workflows use local electricity too. At an assumed 30 W for the AMD tools host, GLM's active time adds about 0.12 cents using 18.16 cents/kWh, the EIA rate recorded with the study. The [electricity scenarios](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/ELECTRICITY.md) total about six cents across these attempts, including a separate RTX desktop assumption. Preparation and cloud-provider electricity are excluded. Nothing was measured at the wall.

## Try them and leave your stars

My personal ratings are pending. The [gallery](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/) has one-to-five-star fields for visuals, gameplay and sound. The GIFs are silent eight-second recordings; listen before rating sound.

Ratings stay in your browser and can be exported. Share your scores in the comments. Which game rewards careful placement? Which would you replay? I would also welcome questions and suggestions for the next experiment.

A later part can cover proprietary models through subscriptions. Those results belong to a separate comparison.
