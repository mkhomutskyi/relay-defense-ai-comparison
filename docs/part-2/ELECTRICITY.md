# Part 2 electricity scenarios

These are illustrative assumptions, not measured power consumption. The rate is the EIA's preliminary August 2026 U.S. residential average of **18.16 cents/kWh**, released 23 October and checked 13 November. The next scheduled release is 24 November. [EIA table](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a).

Assume **30 W for the whole AMD development host** during all listed active agent phases. For local Inkling only, add an illustrative **250 W whole-desktop load** for the RTX 5090 machine, giving 280 W combined. The 250 W is a scenario input, not the GPU's rating or a reading inferred from GPU telemetry. Change it for a different desktop assumption.

| Phase | Active time | Assumed combined W | Modeled kWh | Electricity, cents |
|---|---:|---:|---:|---:|
|DeepSeek / cloud|21m43s|30|0.01086|0.197|
|Inkling 2 / cloud|29m02s|30|0.01452|0.264|
|Qwen / cloud|31m32s|30|0.01577|0.286|
|Original Inkling / local RTX 5090 + AMD tools|56m58s|280|0.26582|4.827|
|GLM / cloud|13m18s|30|0.00665|0.121|

Together these scenarios give about **0.314 kWh / 5.7 cents** for the listed active time. They exclude preparation, downloads, independent review, idle periods, unscored calibration and cloud-provider electricity. Hardware, API fees and human effort are additional. This is not the complete experiment's energy bill.

Formula: `active_seconds / 3600 * assumed_watts / 1000 * dollars_per_kWh`.

The [machine-readable calculation](../../results/part-2-energy.json) retains exact durations and assumptions. Cloud calls still need local electricity for Pi, builds and browser checks, even though inference is hosted.
