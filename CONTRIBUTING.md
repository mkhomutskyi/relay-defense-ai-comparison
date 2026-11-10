# Contributing

Start with the [six playable builds](https://mkhomutskyi.github.io/relay-defense-ai-comparison/) and the [recorded limitations](docs/VALIDATION.md). For a bug report, name the model/workflow, browser and steps to reproduce. State whether you reviewed visuals, gameplay or sound. Shared reader voting is currently disconnected.

Preserve the experiment. Keep changes to a game in a new run/version directory with separate results. Do not silently repair, replace or improve a recorded baseline. Use original publisher/model identifiers; label experiments in run IDs. Keep third-party license notices.

Documentation, gallery accessibility and packaging changes can be proposed separately from game changes. Describe the change and the checks performed in the pull request. Avoid checking in dependencies, model weights, private logs, secrets or personal information.

Run the public-repository checks from the repository root:

```bash
python scripts/check_public.py
```

Gameplay GIFs must come from actual browser recordings. Keep them short and silent, disclose cuts, and record source hashes and excerpt times in `results/gif-provenance.json`. Do not add game resources, accelerate time or generate substitute gameplay images. Generate equivalent previews from the public MP4s with `python scripts/make_gifs.py`; FFmpeg is required. Re-encoding need not reproduce the original GIF bytes, particularly the reused Graphify excerpt. Published hashes identify the originals.

Report vulnerabilities through the private route in [SECURITY.md](SECURITY.md), rather than a public issue.
