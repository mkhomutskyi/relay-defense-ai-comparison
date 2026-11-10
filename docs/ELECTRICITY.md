# Electricity estimate for the six game builds

Checked 10 November 2026. This is a workload-based whole-computer estimate, not a measured wall-plug bill or the full research project's total energy.

## Power evidence

MINISFORUM specifies a 135 W internal power supply for the AI X1 Pro. The supply rating describes output capacity, not continuous AC draw. An original Notebookcheck test of the HX 370 model measured 70.2 W average-load draw and a 97.7 W observed peak; its idle range was 8.6–10 W. A review peak is not a guaranteed maximum for every configuration. The evidence does not establish that this server continuously drew 140–150 W.

## Working assumptions

- Local coding phases: a conservative 100 W whole-box allowance over the recorded coding/repair intervals.
- Earliest Qwen27 wall span: a 75 W mixed-use average, because it includes interventions and gaps.
- Local tools/browser while DeepSeek hosts inference: 30 W average.
- Light preparation: 20 W, above the clean review system's idle draw to allow for server services.
- Extra preparation allowance: 8 hours, modeled as 3.5 hours at 100 W and 4.5 hours at 20 W. Using 3–4 active hours instead would make this allowance about 0.40–0.48 kWh.

These are assumptions, not measurements of each phase's duty cycle. Fan noise indicates cooling activity but does not quantify wall power. Use a meter for an actual bill. No new stress or model test was run to create this estimate.

## Hosted inference still uses local electricity

The DeepSeek rows include local electricity for Pi, file/shell tools, builds and browser checks on the AMD server. The 30 W whole-box average is an assumption, not a measurement of Pi alone or a Raspberry Pi power figure. Each hosted workflow is about 0.2 cents in estimated local electricity; its recorded API charge is additional. DeepSeek's server electricity is not measured in this experiment.

Hosted inference does not require a local AI GPU, downloaded model weights or 64 GB of model memory. Reuse an existing computer where possible; this task does not by itself require an AI-hardware purchase. A container with 2 vCPUs and 2 GB RAM is a reasonable initial allocation for Pi calling the API, not a published minimum or a configuration tested here. Project builds, Graphify indexing and browser automation may require more CPU, RAM or storage.

A suitable 64-bit Raspberry Pi should also be a viable API client, directly or inside a compatible Linux container. This is an architecture inference from [Pi's documented Node.js/Linux setup](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md) and [64-bit Raspberry Pi OS support](https://www.raspberrypi.com/documentation/computers/os.html), not a completed Raspberry Pi benchmark. Install a compatible Node.js version and ARM64 project tools. No identical end-to-end speed or Raspberry Pi electricity cost is claimed.

## Calculation

```text
phase kWh = sum(segment watts × segment hours) / 1000
phase electricity USD = phase kWh × 0.1816
```

The rate is the latest published EIA U.S. residential average available on 10 November 2026: August 2026, 18.16 cents/kWh, released 23 October. It is not the server's verified utility tariff.

| Phase | Time budget | Estimated kWh | Electricity, cents |
|---|---:|---:|---:|
|Preparation allowance|8h allowance|0.440|8.0|
|Qwen3.8-27B|8h40m|0.650|11.8|
|Flash-Next / Vulkan|1h40m|0.167|3.0|
|Flash-Next / Strata|1h58m|0.197|3.6|
|GLM-5.3-Flash / Strata|5h53m|0.589|10.7|
|DeepSeek Flash / Pi|21m43s|0.011|0.2|
|DeepSeek Flash / Pi + Graphify|26m35s|0.013|0.2|

Including a separate setup allowance: 2.0676 kWh, approximately $0.3755 electricity. The actual two recorded DeepSeek bills total $0.329236782. Their sum is approximately $0.7047 for the selected modeled periods, before hardware and human effort.

The first Qwen clock is a broad start-to-freeze span, and setup was not timed in an independent ledger. If the eight-hour allowance overlaps that clock, exclude it: 1.6276 kWh / $0.2956 electricity, or approximately $0.6248 with the same API charges. These are alternative totals, not two bills to add together.

## Sensitivity and scope

A deliberately heavy 150 W what-if for all local-model intervals and only the 3.5 loaded preparation hours produces approximately $0.6119 electricity. Hosted-tool periods stay at 30 W and light preparation stays at 20 W. This is a sensitivity scenario, not measured consumption or a certified upper bound.

Existing APU sensor-energy records cover processor power, not the complete machine. They exclude RAM/SSD/fans and power-supply losses, and their observation windows differ from these clocks. They are not added to this estimate, which would double-count part of the same energy.

Excluded: unlogged runtime screens, downloads, later independent QA/media work, server idle outside listed windows, displays/network equipment, separate coordinator equipment, hardware depreciation and human time. DeepSeek's provider-side energy was not measured; its recorded API charge is kept separate from this server's electricity.

The original uniform 50/75/100 W scenarios remain as dated data in `results/owner-ranking.json`. The current mixed-load estimate is in [electricity-estimate.json](../results/electricity-estimate.json). Original rankings, times, API charges and game files are unchanged.

Sources: [MINISFORUM specifications](https://www.minisforum.com/collections/ai-pcs/products/minisforum-ai-x1-pro), [Notebookcheck's original HX 370 measurements](https://www.notebookcheck.net/Minisforum-AI-X1-Pro-review-An-all-round-mini-PC-for-the-office-multimedia-gaming-and-creative-tasks.973433.0.html), [EIA Table 5.6.A](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a).
