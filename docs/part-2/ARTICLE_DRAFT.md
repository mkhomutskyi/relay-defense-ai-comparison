# My Tower-Defense Experiment, Part 2: Six Models and a 22-Cent GLM Game

*Qwen, DeepSeek, two Inklings, GLM and MiniMax through Pi—with the games, costs and failures saved for you to try.*

![Editorial sketch of six models, a tower-defense monitor, an AMD tools host, an RTX 5090 and a cloud API](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/cover-part2.png)

*AI-assisted editorial illustration, created after the tests. This is not a gameplay screenshot.*

In [Part 1](https://medium.com/p/99decaca5454), I compared six tower-defense games built with local models and DeepSeek's API. My favorite used Pi with Graphify and cost an estimated 18.47 cents in API usage.

This time, six deployments received the same six-wave brief and clean Phaser starter. Five produced playable games, with defects recorded. One compiled successfully and opened a blank screen.

The compiler was pleased. The browser was less impressed.

You can [play or inspect all six Part 2 attempts](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/). No model, API key or access to my server is needed. The original six remain available separately.

## The same tools, different inference

My MINISFORUM AI X1 Pro hosted [Pi](https://pi.dev/), the coding agent, plus files, builds and browser tests. Its refurbished barebone and 64 GB of used eBay RAM cost me **$1,042.63**; I reused the NVMe drive.

Qwen used Qwen Cloud. DeepSeek, Inkling 2, GLM and MiniMax used Ollama Cloud. Original Inkling Small ran through a native CUDA server on my existing RTX 5090 desktop. That desktop is additional hardware, outside the AMD box's purchase price.

The selected model wrote the TypeScript game, procedural graphics and Web Audio through Pi. Setup, prompts, packaging and independent checks used outside assistance, excluded from the model-cost table. No Graphify in this round.

I kept Pi 1.5.0, Phaser 4.2.1, TypeScript 7.0.2 and Vite 8.3.6 fixed, with a 64K client context allowance and 16,384-token response ceiling. GLM and MiniMax used high reasoning; DeepSeek and cloud Inkling used medium. Qwen and local Inkling had a 2,048-token thinking cap. Those controls are different.

![Diagram showing five cloud models and local RTX 5090 inference feeding Pi on the AMD machine, producing saved browser games](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/workflow-part2.png)

*Editorial diagram. Inference changes; the development environment stays on the AMD server.*

The [shared brief and method](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/METHODS.md) are on GitHub.

## What the clocks and bills say

| Model and inference route | Active agent time | API usage for this build |
|---|---:|---:|
| GLM-5.3-Flash · Ollama Cloud | 13m18s, two phases | $0.22324 billed increment |
| DeepSeek V4.1 Flash 1017 · Ollama Cloud | 21m43s | ~$0.6315 token estimate |
| Inkling 2 Small · Ollama Cloud | 29m02s | ~$0.3138 token estimate |
| MiniMax M3.1 Flash · Ollama Cloud | 30m00s, two phases | $0.31356 observed; one request unresolved |
| Qwen3.8-Flash · Qwen Cloud US | 31m32s, two phases | ~$0.7909 uncached upper estimate |
| Original Inkling Small UD-IQ1_S · RTX 5090 | 56m58s, four phases | No API fee; electricity additional |

Active time includes tool waits and repair phases. Setup, model loading, gaps, independent review and human effort are excluded. Qwen received one recovery prompt, GLM one visual-feedback prompt, MiniMax one factual repair and local Inkling three continuations.

A calibration job also continued when it should have stopped and overlapped the earlier four runs. Its extra costs are separate. These clocks describe the recorded workflows; I would not turn them into a precise model-speed ratio. The [measurement tables](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/MEASUREMENTS.md) keep the scope beside the numbers.

## GLM: a working game for 22 cents

[GLM-5.3-Flash](https://ollama.com/library/glm-5.3-flash) completed its first pass in **10m36s**, adding **$0.17463** to the bill. It found and corrected a restart bug during its own tests.

My independent replay passed all six waves, paid upgrades, spending rejection, pause, speed, mute, defeat and both restart routes. Screenshots still showed nearly invisible shop buttons and crowded HUD instructions.

One factual visual request added **2m42s** and **$0.04861**. GLM corrected the UI. The spending guard ended that phase before a final reply, but the saved changes passed the build and affected-control checks. Total: **$0.22324**.

![Actual GLM cloud game, showing moving enemies, targeting and firing](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-glm.gif)

[Play GLM-5.3-Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-glm)

Simple graphics, working controls and a canvas that fits a narrow screen.

## DeepSeek: more illustrated detail

DeepSeek's independent campaign finished with **82 kills, full 20/20 integrity and no leaks**. Upgrades, sale refunds, spending limits and main controls passed. The desert, solar panels, enemies and relay have more illustrated detail than GLM's geometric sprites.

![Actual DeepSeek cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-deepseek.gif)

[Play DeepSeek V4.1 Flash 1017 · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-deepseek)

The **$0.6315** figure is a cache-aware estimate from logged tokens, not a direct DeepSeek API quote.

## Inkling 2: playable, with time spent waiting

Cloud Inkling 2 passed a six-wave campaign with ten lives remaining. Paid upgrades and restart after either ending worked. Two of its own test scripts timed out; that waiting remains in the **29m02s** total.

![Actual Inkling 2 cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling2.gif)

[Play Inkling 2 Small · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling2)

Its fixed-width canvas is cropped on a phone. Desktop recommended.

## MiniMax: the repair mattered

MiniMax's first pass compiled but threw `ReferenceError: Phaser is not defined` during play. Several controls failed. One factual repair produced a final game that passed **20/20 independent functional checks**. Its six-wave victory ended with **123 kills, full integrity and no leaks**.

![Actual MiniMax cloud game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-minimax.gif)

[Play MiniMax M3.1 Flash · Ollama Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-minimax)

Total active time was **30 minutes**. The first phase hit its spending guard; the repair ended at its deadline. Neither ended with a normal final reply. The phone canvas fits, but its text becomes tiny.

The observed bill rose **$0.31356** for 207 requests. One more admitted request was aborted without final usage. I retained a **$0.1671168 cost reservation**, not a confirmed charge, so 31 cents is not a fully reconciled final price.

## Qwen: recovery helped, controls still slipped through

Qwen's first pass left the starter unchanged. One recovery prompt produced a game that completed the independent campaign. Ordinary upgrade and sell clicks still failed. Its phone layout is cropped.

![Actual Qwen Cloud Flash game during normal-time combat](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-qwen.gif)

[Play Qwen3.8-Flash · Qwen Cloud · Pi](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-qwen)

The **$0.7909** upper estimate ignores cache discounts. I kept the defects rather than repairing the game outside the tested model.

## Original local Inkling: the failure stays

My local [Unsloth Inkling Small GGUF](https://huggingface.co/unsloth/Inkling-Small-GGUF) used the extreme **UD-IQ1_S** quantization, GPU/host-memory splitting and text-only input. Across four phases it left incomplete code, tool-format errors and a mismatched scene entry point. The final build passed; starting it led to a blank screen.

![Actual local Inkling failure capture: the starter menu transitions to a blank screen](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/media/p2-inkling-local.gif)

[Inspect the failed local Inkling artifact](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/?game=p2-inkling-local)

This older, heavily quantized deployment differs from cloud Inkling 2. Its failure combines the checkpoint, serving stack, tool handling and missing image input. It is not a clean local/cloud pair.

I saved it anyway. Keeping only the good results would make this hobby considerably tidier.

## The API route changes the price

During the DeepSeek run, Ollama was at peak prices while [DeepSeek's own API](https://api-docs.deepseek.com/quick_start/pricing/) was off-peak. Applying direct rates to the **same recorded tokens and cache hits** gives approximately **$0.316**, instead of $0.632. That is a calculation, not a direct-provider replay; cache behavior could differ.

Electricity applies to cloud workflows too. At an assumed **30 W** for the AMD tools host, GLM's active time adds about **0.12 cents** at the [EIA's August 2026 U.S. residential average of 18.16 cents/kWh](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a). The [energy table](https://github.com/mkhomutskyi/relay-defense-ai-comparison/blob/main/docs/part-2/ELECTRICITY.md) models about **6 cents across these six attempts**, including a separate RTX desktop assumption. This excludes preparation and cloud-provider electricity. No wall-meter measurement was made.

## Try them and leave your stars

My personal ratings are still pending. The [gallery](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/) offers one-to-five-star fields for visuals, gameplay and sound. Its GIFs are silent eight-second recordings. Leave sound unrated until you listen.

Ratings stay in your browser and can be exported. Share scores, questions and suggestions in the comments. The Part 1 ranking stays separate.

Part 3 will cover **proprietary models through existing subscriptions**. That will be a separate workflow comparison, with the client and included usage recorded. Those builds are not part of today's results.
