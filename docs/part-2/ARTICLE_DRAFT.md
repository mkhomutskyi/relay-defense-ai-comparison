# My Tower-Defense Experiment, Part 2: Six Models, Five Playable Games

*Six waves, two kinds of tower and one final boss. Here’s what the models built and what the runs cost.*

![Editorial sketch of six model deployments, a tower-defense monitor, an AMD tools host, an RTX 5090 and cloud inference](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/cover-part2.png)

*AI-assisted editorial illustration. Actual gameplay captures appear below.*

I gave six model deployments the same job: build a browser game where towers defend a desert relay for six waves. All six compiled. Five could be played. The sixth showed a menu, then a blank screen when the browser test started the game.

The compiler was pleased. The browser was less impressed.

[Play the five games and open the broken one here](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/). You don’t need a model or an API key. The [public repository](https://github.com/mkhomutskyi/relay-defense-ai-comparison) holds the source and measurements.

In [Part 1](https://medium.com/p/99decaca5454), my favorite came from DeepSeek through [Pi](https://pi.dev/), the coding agent, with Graphify. For Part 2, I kept the AMD machine, gave each model a clean Phaser starter and left Graphify out.

## The AMD box still did the development

My MINISFORUM AI X1 Pro has a Ryzen AI 9 HX 370 and 64 GB of RAM. The refurbished barebone cost $522.63 including tax; I got lucky with used eBay RAM for $520. I reused the NVMe drive.

Pi, files, builds and browser tests ran on the AMD server. Qwen used Qwen Cloud US. DeepSeek, Inkling 2, GLM and MiniMax used Ollama Cloud. Original Inkling Small used standalone `llama-server.exe` with CUDA on my RTX 5090 desktop, outside the AMD box’s price. It did not run through LM Studio.

The selected models authored the TypeScript games, procedural graphics and Web Audio through Pi. Setup, prompts, packaging and independent checks used outside assistance, excluded from the model-cost table.

![Workflow showing cloud inference and local RTX 5090 inference feeding Pi and development tools on the AMD machine](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/workflow-part2.png)

*Editorial diagram: the development workspace stayed on AMD; inference changed.*

## What the clocks and bills say

Recorded 13 November 2026.

| Model and inference route | Active agent time | API cost for this run |
|---|---:|---:|
| GLM-5.3-Flash · Ollama Cloud | 13m18s, two phases | $0.22324 billed increment |
| DeepSeek V4.1 Flash 1017 · Ollama Cloud | 21m43s | ~$0.6315 token estimate |
| Inkling 2 Small · Ollama Cloud | 29m02s | ~$0.3138 token estimate |
| MiniMax M3.1 Flash · Ollama Cloud | 30m00s, two phases | $0.31356 observed; one request unresolved |
| Qwen3.8-Flash · Qwen Cloud US | 31m32s, two phases | ~$0.7909 uncached upper estimate |
| Original Inkling Small UD-IQ1_S · RTX 5090 | 56m58s, four phases | No API fee; electricity additional |

These are recorded build costs, not current price quotes. Active time includes tool waits and repairs; setup, loading, gaps, independent review and human effort are excluded.

I kept the agent and build-tool versions fixed. Reasoning settings differed. Qwen received one recovery prompt, GLM one visual-feedback prompt, MiniMax one factual repair, and local Inkling three continuations. An unintended calibration job overlapped earlier runs. This was a workflow comparison, not a precise model-speed ranking. The [methods](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/METHODS.md) and [measurement tables](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/MEASUREMENTS.md) explain those differences.

## GLM: a working game for 22 cents

GLM-5.3-Flash's first pass took 10m36s and added $0.17463 to the bill. It corrected a restart bug during its own tests.

The browser check cleared all six waves and checked upgrades, unaffordable purchases, pause, speed, mute, defeat and restart. Screenshots exposed nearly invisible shop buttons and crowded instructions. One visual-feedback prompt added 2m42s and $0.04861; GLM corrected them.

The spending guard ended that phase before its final reply. The saved changes passed the affected-control checks.

![Actual GLM cloud game showing targeting, moving enemies and firing](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-glm.gif)

*GLM’s saved game in action.*

[Play GLM-5.3-Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-glm)

Here’s a small experiment to try: keep two turret positions the same, then compare a run without upgrades against one with them. In the recorded paired check, the first lost on wave four; the second won.

## DeepSeek: move the towers, lose the relay

DeepSeek's saved prototype had a readable desert map, more illustrated detail, distinct single-target and area weapons, working upgrades and sale refunds. The full campaign check ended with 82 kills, full integrity and no leaks.

A separate restricted test was closer: three towers without upgrades won with just 1/20 integrity. Another placement lost on wave five. Where the towers went mattered in those checks.

![Actual DeepSeek cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-deepseek.gif)

*DeepSeek’s desert relay under attack.*

[Play DeepSeek V4.1 Flash 1017 · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-deepseek)

The $0.6315 figure is a cache-aware estimate from logged tokens through Ollama, not a direct DeepSeek invoice.

## Inkling 2: more strategic pressure

The Inkling 2 campaign test finished with ten lives remaining. Paid upgrades and restart after either ending worked. Its homing lancer and fixed-location mortar blasts offered different ways to handle moving targets.

A restricted two-lancer setup lost on wave three without upgrades. Upgrading those same towers reached wave six, but still lost.

Two of its own test scripts timed out; those waits remain in the total. The fixed-width canvas is cropped on phones, so use a desktop for this build.

![Actual Inkling 2 cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling2.gif)

*Inkling 2’s lancer and mortar defenses.*

[Play Inkling 2 Small · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling2)

Inkling 2 ran through Ollama Cloud. Its 73 requests cost an estimated 31 cents, calculated from logged tokens. That is not a separate provider invoice.

## MiniMax: the repair mattered

MiniMax's first pass compiled but threw `ReferenceError: Phaser is not defined`. Several controls failed. One factual repair produced a game that passed 20/20 independent functional checks, including a six-wave victory with full integrity and no leaks.

![Actual MiniMax cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-minimax.gif)

*MiniMax after the repair.*

[Play MiniMax M3.1 Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-minimax)

MiniMax was more forgiving in a restricted test: three level-one towers won with 12/20 integrity and 2,712 credits left.

Both phases ended at spending limits or deadlines. The bill rose by $0.31356 for 207 requests. One more request was interrupted. I kept $0.1671168 in the budget for it; its final charge is unknown.

## Qwen: a campaign clear with broken controls

Qwen's first pass left the starter unchanged. A recovery prompt produced a game that completed the campaign. Ordinary upgrade and sell clicks still failed, and the phone layout was cropped.

![Actual Qwen Cloud Flash game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-qwen.gif)

*Qwen’s working combat; controls need attention.*

[Play Qwen3.8-Flash · Qwen Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-qwen)

The $0.7909 upper estimate ignores cache discounts. I preserved the delivered defects.

## Original local Inkling: the failure stays

My local [Unsloth Inkling Small GGUF](https://huggingface.co/unsloth/Inkling-Small-GGUF) used extreme UD-IQ1_S quantization, GPU/host-memory splitting and text-only input. Four phases left incomplete code and tool-format errors. The menu called a scene the game never registered, producing the blank screen. This local run had no API fee; hardware and electricity still cost money.

![Actual local Inkling failure: its menu transitions to a blank screen](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling-local.gif)

*Local Inkling: menu, then blank screen.*

[Inspect the failed local Inkling artifact](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling-local)

This older, heavily quantized deployment is not a clean match for cloud Inkling 2. Checkpoint, serving stack, tool handling and missing image input all differ. Its failure cannot settle whether local models can build games.

## A victory screen needs context

Those strategy checks used legal purchases and upgrades, with simulation hooks advancing combat. The GIFs are separate eight-second recordings at normal speed.

Each strategy was tried once. Starting armies and economies differed, and the upgrade policy was not optimized. These outcomes do not establish fair balance or replay value. Several games also let a boss leak if enough base health remains. The [gameplay notes](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/GAMEPLAY_NOTES.md) explain the checks.

## Small bills still need the right accounting

During the recorded DeepSeek run, Ollama's peak rates were twice the direct provider's off-peak rates. Applying direct rates to the same tokens and cache hits gives about $0.316 instead of $0.632. This is a calculation, not a direct-provider replay; cache behavior could differ. Future DeepSeek tests will use its direct API.

Cloud workflows use local electricity too. The [electricity scenarios](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/ELECTRICITY.md) estimate about six cents across these attempts, including a separate RTX desktop assumption. Preparation and cloud-provider electricity are excluded. Power was estimated, not measured at the wall.

## Try them, rate them, or give another model the brief

The [gallery](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/) has one-to-five-star fields for overall quality, visuals, gameplay and sound. The GIFs are silent; open the games before rating sound. My personal stars are still pending.

Your ratings stay in your browser and can be exported as JSON. I can’t see them unless you share them. Which game rewards careful placement? Which would you replay?

To inspect the saved games locally, clone the repository and run `python scripts/serve.py` from its root. Open `http://localhost:8080/part-2/`. That serves the prebuilt games without inference. The [methods](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/METHODS.md) cover rebuilding them.

For a fresh attempt, try the [same brief](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/PROMPT.md) with your model. Record the provider, extra prompts and whether Start, upgrade and restart actually work. Tell me what surprised you.

You can [follow me on Medium](https://medium.com/@mkhomutskyi) or watch [Tokens and Tea](https://www.youtube.com/@TokensAndTea) for more experiments. Suggestions for the next test are welcome.
