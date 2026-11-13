# My Tower-Defense Experiment, Part 2: Five Models and a 22-Cent GLM Game

*Qwen, DeepSeek, two Inklings and GLM through Pi—with the games, costs and failures saved for you to try.*

![Editorial sketch of five model names, a tower-defense monitor, an AMD tools host, an RTX 5090 and a cloud API](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/cover-part2.png)

*AI-assisted editorial illustration, created after the tests. The drawing is not a gameplay screenshot.*

In [Part 1](https://medium.com/p/99decaca5454), I compared six tower-defense games built with local models and DeepSeek's API. My favorite used Pi with Graphify and cost an estimated 18.47 cents in API usage.

I wanted another round with a more consistent starting point. This time, five deployments received the same six-wave brief and clean Phaser starter. Four produced playable games, with some defects. One compiled successfully and opened a blank screen.

The compiler was pleased. The browser was less impressed.

You can [play or inspect all five Part 2 attempts](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/). No model, API key or access to my server is needed. The original six remain available separately.

## The same tools, different inference

My MINISFORUM AI X1 Pro still hosted [Pi](https://pi.dev/), the coding agent, plus files, builds and browser tests. Its refurbished barebone and 64 GB of used eBay RAM cost me **$1,042.63**; I reused the NVMe drive.

Qwen used Qwen Cloud. DeepSeek, Inkling 2 and GLM used Ollama Cloud. Original Inkling Small ran through a native CUDA server on my existing RTX 5090 desktop. That desktop is additional hardware, outside the AMD box's purchase price.

Pi gave each selected model file and shell tools. The model wrote the TypeScript game, procedural graphics and Web Audio. Setup, prompts, packaging and independent checks used outside assistance; those activities are excluded from the model-cost table.

I kept Pi 1.5.0, Phaser 4.2.1, TypeScript 7.0.2 and Vite 8.3.6 fixed. The client context allowance was 64K and each response could generate up to 16,384 tokens. GLM used high reasoning; the other Ollama models used medium. Qwen and local Inkling had a 2,048-token thinking cap. Those are different controls, not equal reasoning budgets. No Graphify in this round.

![Diagram showing cloud models and local RTX 5090 inference feeding the Pi workspace on the AMD machine, producing saved browser games](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/workflow-part2.png)

*Editorial diagram. Inference changes; the development environment stays on the AMD server.*

The [shared brief and method](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/METHODS.md) are on GitHub.

## What the clocks and bills say

| Model and inference route | Active agent time | API usage for this build |
|---|---:|---:|
| GLM-5.3-Flash · Ollama Cloud | 13m18s, two phases | $0.22324 billed increment |
| DeepSeek V4.1 Flash 1017 · Ollama Cloud | 21m43s | ~$0.6315 token estimate |
| Inkling 2 Small · Ollama Cloud | 29m02s | ~$0.3138 token estimate |
| Qwen3.8-Flash · Qwen Cloud US | 31m32s, two phases | ~$0.7909 uncached upper estimate |
| Original Inkling Small UD-IQ1_S · RTX 5090 | 56m58s, four phases | No API fee; electricity additional |

Active time includes tool waits and repair phases. Setup, model loading, gaps between phases, independent review and human effort are excluded. Qwen received one recovery prompt, GLM one visual-feedback prompt and local Inkling three continuations.

These are fresh games with new token and cache histories. The first article's prices belong to its own runs.

A calibration job also continued when it should have stopped and overlapped the earlier four runs. I preserved its extra costs separately. These clocks describe the recorded workflows; I would not turn them into a precise model-speed ratio. The [measurement tables](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/MEASUREMENTS.md) keep the scope beside the numbers.

## GLM: a working game for 22 cents

[GLM-5.3-Flash](https://ollama.com/library/glm-5.3-flash) completed its first pass in **10m36s**, adding **$0.17463** to the Ollama bill. During its own tests, it found a restart bug: Phaser reuses scene instances, so the game needed to reset state explicitly.

My independent replay passed all six waves, paid upgrades, spending rejection, pause, speed, mute, defeat and both restart routes. The screenshots still showed nearly invisible shop buttons and crowded HUD instructions.

One factual visual request added **2m42s** and **$0.04861**. GLM corrected the UI. The spending guard ended that phase before a final model reply, but the saved changes passed the build and affected-control checks. Total: **$0.22324**.

![Actual GLM cloud game, showing moving enemies, targeting and firing](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-glm.gif)

[Play GLM-5.3-Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-glm)

The graphics are simple. The game works, and its canvas fits a narrow screen instead of cutting off half the map.

## DeepSeek: more illustrated detail

DeepSeek's independent campaign finished with **82 kills, full 20/20 integrity and no leaks**. Upgrades, sale refunds, spending limits and the main controls passed. The desert, solar panels, enemies and relay have more illustrated detail than GLM's geometric sprites.

![Actual DeepSeek cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-deepseek.gif)

[Play DeepSeek V4.1 Flash 1017 · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-deepseek)

The **$0.6315** figure is a cache-aware estimate from logged tokens. It is not a direct DeepSeek API quote; the provider choice matters below.

## Inkling 2: playable, with time spent waiting

Cloud Inkling 2 also passed a six-wave campaign, finishing with ten lives remaining. Paid upgrades and restart after either ending worked. Two of its own test scripts timed out, and that waiting remains in the **29m02s** total.

![Actual Inkling 2 cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling2.gif)

[Play Inkling 2 Small · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling2)

Its fixed-width canvas is cropped on a phone. Use a desktop for a fair look at the game.

## Qwen: recovery helped, controls still slipped through

Qwen's first pass left the starter unchanged. One recovery prompt produced a game that completed the independent campaign. But ordinary upgrade and sell clicks failed during normal play. Its phone layout is also cropped.

![Actual Qwen Cloud Flash game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-qwen.gif)

[Play Qwen3.8-Flash · Qwen Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-qwen)

The **$0.7909** upper estimate ignores cache discounts. I kept the defects rather than quietly repairing the game outside the tested model.

## Original local Inkling: the failure stays

My local [Unsloth Inkling Small GGUF](https://huggingface.co/unsloth/Inkling-Small-GGUF) used the extreme **UD-IQ1_S** quantization, GPU/host-memory splitting and text-only input. Across four phases it left incomplete code, tool-format errors and a mismatched scene entry point. The final build passed; starting it led to a blank screen.

![Actual local Inkling failure capture: the starter menu transitions to a blank screen](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling-local.gif)

[Inspect the failed local Inkling artifact](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling-local)

This older, heavily quantized local deployment is different from cloud Inkling 2. Its failure combines the checkpoint, serving stack, tool handling and missing image input. I am not treating it as a clean local/cloud pair.

I saved it anyway. Keeping only the good results would make this hobby considerably tidier.

## The API route changes the price

I reused Ollama's connection for DeepSeek. That was convenient, but during this run Ollama was at peak prices while [DeepSeek's own API](https://api-docs.deepseek.com/quick_start/pricing/) was off-peak.

Applying the direct rates to the **same recorded token counts and cache hits** gives approximately **$0.316**, instead of $0.632. That is a calculation, not a measured direct-provider replay; cache behavior could differ. Future DeepSeek tests should use the direct route.

Electricity also applies to cloud workflows. At an assumed **30 W** for the AMD tools host, GLM's active time adds about **0.12 cents** at the [EIA's August 2026 U.S. residential average of 18.16 cents/kWh](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a). That is modeled, not metered. The [energy table](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/ELECTRICITY.md) also labels a separate whole-desktop scenario for local Inkling. Hardware, preparation and cloud-provider electricity are additional.

## Try them and leave your stars

My personal star ratings for this new round are still pending. I have kept the Part 1 ranking separate.

The [Part 2 gallery](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/) offers one-to-five-star fields for visuals, gameplay and sound. The GIFs are silent, continuous eight-second recordings; the local Inkling clip shows a failure, not gameplay. Leave sound unrated until you listen.

Ratings currently stay in your browser and can be exported. To share them, post your scores in the article comments. I would love your questions, your favorite build and suggestions for the next test.

For now, I have another working game for roughly 22 cents—and another reason to try an API on an existing computer before buying AI hardware specifically for coding.
