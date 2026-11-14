# Part 2: gameplay and challenge notes

Recorded 13 November 2026. Technical assessment of the six frozen public prototypes, not the owner's personal star ratings or a review of later production games.

Source inspection and 12 additional strategy probes compared legal fixed-army play with and without upgrades, plus alternative placements. Real mouse/keyboard purchases used each game's normal currency. Existing simulation hooks advanced normal combat; no money, health, waves or wins were granted. These are per-game exploratory contrasts, not an equal-budget benchmark across games. One replay per condition does not establish fair balance or human enjoyment.

| Prototype | Fixed initial army, no upgrades | Same army with legal upgrades | Alternative placement, no upgrades |
|---|---|---|---|
| DeepSeek | Win, 1/20 integrity | Win, 13/20 integrity | Loss, wave 5 |
| Inkling 2 | Loss, wave 3 | Loss, wave 6 | Loss, wave 2 |
| GLM | Loss, wave 4 | Win | Loss, wave 1 |
| MiniMax | Win, 12/20 integrity | Win, 20/20 integrity | Loss, wave 3 |

DeepSeek and MiniMax used three initial towers; Inkling 2 and GLM used two. No additional towers were built during these probes. The upgrade policy was not optimized. MiniMax's no-upgrade run retained 2,712 credits; unspent money in a deliberately fixed-army test does not show that spending it would be pointless. GLM's final hook did not retain HP/credit values, so those are not invented. All twelve probes completed without browser or observer errors.

DeepSeek had the most coherent implementation in the technical review: readable terrain, differentiated single-target/area weapons, functioning economy and between-wave planning. Inkling 2 gave the tested restricted armies greater pressure, with a useful homing-versus-fixed-blast distinction, but its phone layout and an unsorted spawn queue remained drawbacks. GLM demonstrated that upgrades changed the tested strategy's outcome. MiniMax's recorded routes were generally more forgiving. Qwen's broken upgrade/sale clicks undermine strategy; original local Inkling has no functioning normal campaign.

Boss handling also matters: MiniMax charges eight of twenty HP for a boss leak, DeepSeek seven of twenty, Inkling 2 five of twenty for each of two bosses, and GLM one of ten. These rules permit surviving a boss leak and winning. That can be an intended health tradeoff, but a campaign-clear check alone does not establish a difficult boss fight.

The models authored the frozen prototypes. Test assistance, inspection and this editorial interpretation are separate from their build time and API costs. No personal sound score, human enjoyment claim or owner ranking is assigned here. The delivered defects remain visible rather than being repaired for the comparison.

[Play the prototypes](https://mkhomutskyi.github.io/relay-defense-ai-comparison/part-2/) · [Methods](METHODS.md) · [Measurements](MEASUREMENTS.md).
