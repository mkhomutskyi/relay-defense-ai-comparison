# Relay Defense comparison tables

These are the text versions of the three tables in the personal Medium article. The ranking is my preference among six saved games with different workflows, not a controlled model leaderboard.

## Ranking and creation times

| Place | Model and workflow | Creation time / estimate |
| --- | --- | --- |
| 1 | DeepSeek Flash API · Pi + Graphify | 26m35s |
| 2 | DeepSeek Flash API · Pi | 21m43s, including a later correction |
| 3 | Qwen3.8-Flash-Next IQ2_XS · Strata · Pi | 1h58m23s |
| 4 | GLM-5.3-Flash · Strata · Pi | 5h53m22s |
| 5 | Qwen3.8-Flash-Next IQ2_XS · LM Studio Vulkan · Pi | 1h40m19s; playable, map missing |
| 6 | Qwen3.8-27B Q4_K_M · LM Studio Vulkan · Pi | About 4h10m work (estimated) |

Qwen 27B work is an estimated allocation of 4h10m, plus 4h30m preparation within its original elapsed window. These portions were not timed separately. Other times sum recorded coding/repair phases.

## DeepSeek workflow activity

| Recorded activity | Pi only | Pi + Graphify |
| --- | --- | --- |
| API calls during the original build | 144 | 219 |
| Recorded image reads | 25 | 45 |
| Original coding phase | 20m46s | 26m35s |
| Later correction | 57s title-label fix | None |
| Estimated API cost, including preflight | $0.1446 | $0.1847 |

144/219 count requests during the original game-building phases, not calls made by the finished games. The estimated API costs include compatibility checks; Pi-only also includes its later title-label correction. Costs were calculated from logged usage at the historical off-peak rates, not itemized invoices.

## Estimated electricity

| Phase | Time budget | Estimated kWh | Electricity, cents |
| --- | --- | --- | --- |
| Preparation (estimated allocation) | 4h30m (estimated) | 0.090 | 1.6 |
| Qwen3.8-27B | 4h10m (estimated) | 0.417 | 7.6 |
| Flash-Next / Vulkan | 1h40m | 0.167 | 3.0 |
| Flash-Next / Strata | 1h58m | 0.197 | 3.6 |
| GLM-5.3-Flash / Strata | 5h53m | 0.589 | 10.7 |
| DeepSeek Flash / Pi | 21m43s | 0.011 | 0.2 |
| DeepSeek Flash / Pi + Graphify | 26m35s | 0.013 | 0.2 |

Whole-computer assumptions:100 W local-model work,20 W preparation,30 W local tools/builds/browser checks during hosted inference. These are estimates, not wall-meter readings. Listed periods total 1.48427 kWh, approximately 27 cents electricity at 18.16 cents/kWh. Estimated API usage across the two hosted runs adds 33 cents, giving about 60 cents combined for the listed periods; hardware, outside coordination, human time and unlogged periods are additional. See [assumptions and sources](ELECTRICITY.md).

