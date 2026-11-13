# Part 2 measurements

Recorded 13 November 2026. These are separate game attempts with unequal feedback and different inference deployments. Owner personal stars remain pending; the original six-game ranking is unchanged.

| Attempt | Active agent time | Admitted HTTP calls | External feedback prompts | API cost | Cost classification |
|---|---:|---:|---:|---:|---|
| DeepSeek V4.1 Flash 1017 / Ollama | 21m43s |185|0|$0.631520688|Cache-aware token-price estimate|
| Inkling 2 Small / Ollama |29m02s|73|0|$0.31379426|Cache-aware token-price estimate|
| Qwen3.8-Flash / Qwen Cloud US |31m32s|141|1|$0.79091344|Uncached list-price upper estimate; cache discounts ignored|
| Original Inkling Small UD-IQ1_S / RTX 5090 |56m58s|47 local requests|3|No API fee|Hardware and electricity additional|
| GLM-5.3-Flash / Ollama |13m18s|135|1|$0.22324|Incremental provider billing, matched by 135 additional account requests|
| MiniMax M3.1 Flash / Ollama |30m00s|208|1|$0.31356 observed|207 billed calls; one aborted request unresolved, $0.1671168 reserved|

GLM's first pass took 635.845 seconds and added $0.17463 to the bill. Its visual follow-up took 161.704 seconds and added $0.04861. There were four further local SDK attempts blocked by the spending guard; these were not admitted HTTP calls. The agent's attempt counter includes them, so it must not be reported as 139 charged requests.

The four non-GLM durations are 1303.173, 1742.191, 1892.403 and 3417.733 seconds respectively. Qwen combines its initial 78.217-second stall and 1814.186-second recovery. Local Inkling sums four separately preserved phases. GLM totals 797.549 seconds. MiniMax totals 1799.827 seconds across 1079.787-second first pass and 720.040-second repair. [Machine-readable values](../../results/part-2.json) preserve precision.

These times include tool waits and exclude setup, loading, gaps, outside coordination, independent review and human time. A separate calibration overlapped earlier runs; [methods](METHODS.md) explains it. No precise model-speed ratio follows.

## Verified outcomes

| Attempt | Campaign | Economy / controls | Presentation |
|---|---|---|---|
| DeepSeek |Six-wave victory, 82 kills, 20/20 integrity, 0 leaks; undefended defeat|Placement, upgrades, sale refund, limits and normal controls checked|Illustrated desert; canvas scales to narrow width|
| Inkling 2 |Six-wave victory, 10 lives remaining; undefended defeat|Paid upgrades and both ending restarts checked|Fixed-width phone cropping|
| Qwen |Six-wave victory, 100 kills, 10 lives, 1 leak; loss/restart checked|Normal upgrade/sell clicks fail; manual hook bypasses pause|HUD crowding and phone cropping|
| Local Inkling |No working normal campaign|Menu reaches blank screen; real state hooks absent on that route|Preserved failure; no successful gameplay claimed|
| GLM |Six-wave victory; undefended loss|Paid upgrades, rejections, pause, speed, mute and both restart routes checked|One UI-feedback phase corrected shop visibility/HUD hints; narrow canvas fits|

MiniMax passed 20/20 final functional checks: six-wave victory, 123 kills, 20/20 integrity and no leaks; economy/controls/restarts passed. First-pass runtime failures remain preserved. The phone canvas fits but text is tiny.

Independent state reports are not human music auditions. No personal star score or sound score has been assigned to the new attempts.

## Provider choice and cache accounting

DeepSeek and Inkling 2 use cached-input token counts from responses at Ollama's listed rates. Their per-arm prices are estimates, not separate invoices. Qwen uses the higher uncached US rates. GLM's account moved from 365 requests/$1.46911 to 500 requests/$1.69235, giving the $0.22324 delta. The token-price calculation gives $0.22260777; the $0.00063223 difference is retained rather than silently rounded away.

The original five selected build figures total approximately $1.95947 in mixed estimates/billing. Adding MiniMax's observed $0.31356 gives approximately $2.27303, plus its unresolved request. The $0.1671168 reservation is a conservative hold, not a billed charge. They exclude unscored calibration, earlier compact tests and setup. They are not the complete research invoice. Budget reservations and rejected-call holds are not treated as money spent.

For the DeepSeek game, the recorded counts were 6,729,252 input tokens, including 5,586,048 cache hits, plus 212,536 output tokens. Its weekday run occurred at approximately 16:42–17:04 UTC. At that time Ollama used peak rates, while direct DeepSeek used off-peak rates:

| Per million tokens | Ollama during recorded run | Direct DeepSeek at the same time |
|---|---:|---:|
| Uncached input |$0.30|$0.15|
| Cached input |$0.006|$0.003|
| Output |$1.20|$0.60|

Applying direct rates to identical token/cache counts gives $0.315760344, exactly half the $0.631520688 Ollama estimate. This is a counterfactual calculation, not a direct-provider replay; token accounting/cache behavior could differ. Direct DeepSeek's canonical `deepseek-flash` currently lists the same published V4.1-Flash-1017 version. Future DeepSeek tests should use the direct route.

Sources checked 13 November: [Ollama pricing](https://ollama.com/pricing), [DeepSeek pricing/version and peak windows](https://api-docs.deepseek.com/quick_start/pricing/), [Qwen model page](https://www.qwencloud.com/models/qwen3.8-flash). Provider schedules and prices can change.

See [electricity scenarios](ELECTRICITY.md) separately. No wall-meter or cloud-provider electricity measurement was made.

## MiniMax bill qualification

Before MiniMax, the Ollama snapshot was 500 requests / $1.69235; after its run it was 707 / $2.00591. The $0.31356 observed delta comprises $0.21168 first pass and $0.10188 repair. Of 208 admitted HTTP requests, 207 had completed usage and appeared in the account count. The last aborted call had no final usage; its full $0.1671168 reservation remains unresolved. Do not call $0.31356 a fully reconciled final total. No new inference was needed to package this evidence.
