# Part 2 method and reproduction

Five fresh attempts used the same six-wave Relay Defense brief and clean MIT Phaser starter at commit `d1d7d58acfcf47f97642bcb8b4967071b85f8db9`. The selected models authored the implementations and procedural graphics/audio through Pi. No earlier game's implementation was supplied in the starting files.

Development tools, files, compilation and browser checks ran on the AMD Ryzen AI 9 HX 370 machine. Four inference routes were hosted; original Inkling inference ran on an existing RTX 5090 desktop. The desktop is outside the AMD machine's $1,042.63 purchase cost. No Graphify in this round.

## Versions and limits

| Setting | Configuration |
|---|---|
| Agent | Pi 1.5.0 |
| Node.js | 26.13.0 in the recorded development environment |
| Framework | Phaser 4.2.1 |
| TypeScript / Vite | 7.0.2 / 8.3.6 |
| Client context allowance | 65,536 tokens |
| Generated response ceiling | 16,384 tokens |
| Active time allowance | Up to one hour per attempt, with bounded continuations |
| Thinking | GLM high; other Ollama models medium; Qwen/local numeric cap 2,048. These controls are not numerically equal. |
| Asset policy | Procedural drawing and Web Audio; no external game-art service |

The [public prompt](PROMPT.md) replaces only the environment-specific host label with a generic description. Models had normal file and shell tools plus the same frontend/web-game skill resources. Credentials, private host details and raw sessions are not published.

## Original identities

| Attempt | Provider and canonical model/checkpoint |
|---|---|
| DeepSeek | Ollama Cloud: `deepseek-v4.1-flash:1017` |
| Inkling 2 | Ollama Cloud: `inkling-2-small` |
| Qwen | Qwen Cloud US: `qwen3.8-flash` |
| Local Inkling | `unsloth/Inkling-Small-GGUF`, original `Inkling-Small-UD-IQ1_S-00001-of-00003.gguf` |
| GLM | Ollama Cloud: `glm-5.3-flash` |

The local API returned a host-specific absolute path, which is kept private. The table identifies its original publisher, checkpoint and filename without inventing an API alias. No model weights or wrappers are distributed here. Public game IDs label artifacts, not renamed models.

Local Inkling used native CUDA 13, a 64K context, 15 GPU layers, 12 generation/prompt threads, batch/ubatch 64, F16 KV, flash attention and mmap. A 36 GiB resident working-set cap applied only to the owned test process. This was an older extreme quantization with text-only input; it is not an identical local/cloud pair with Inkling 2.

## Feedback and validation

Qwen received one recovery prompt after leaving the starter unchanged. GLM received one factual visual request after the first functional pass. Original Inkling received three continuations, including a transport compatibility attempt. DeepSeek and cloud Inkling 2 received no external repair prompt. First-pass and follow-up evidence remain separate in the private archive.

Independent browser checks used ordinary input, read-only state and the game's real simulation hook. No resource grants, forced victories or injected health/waves were used. The final public clips are separately recorded normal-time excerpts without time-hook calls. Source hashes distinguish captured bytes from Git-normalized bytes.

GLM's full independent campaign passed on its preserved first pass. The follow-up changes only three UI lines: build-button depth, shorter/repositioned top hints and shorter placement text. Production build, affected controls, the trusted web-game client and actual normal-time combat were rechecked. The follow-up ended at the spending guard before a final model reply; the saved artifact was independently verified.

The local Inkling source compiles but the menu calls a scene name that was not registered. Its blank screen is a preserved failure, not a missing Pages bundle. Qwen's normal upgrade/sell bug and phone clipping in Qwen/Inkling 2 remain unfixed.

## Timing incident and interpretation

A calibration stop failed, so an unscored Qwen attempt continued to an hour and its dispatcher started an extra DeepSeek attempt. Those ran in separate workspaces but overlapped the earlier scored cloud work. Their extra costs are outside the per-build table and remain in the private accounting. No stale inference jobs remain.

Durations are observed active agent phases including tool waits. They exclude setup, loading, outside coordination, independent QA and gaps between phases. Different reasoning, feedback, model versions and quantization also limit comparisons. This is not an isolated speed benchmark or a statistically repeated quality leaderboard.

## Build and play

The committed static bundles run without a model, API key or home server. Each new source folder includes the existing matching dependency lockfile from the same pinned toolchain. No dependency version was changed. Rebuild from the repository root after installing dependencies in the new game folders:

```bash
for game in games/part-2/*; do
  (cd "$game" && npm ci)
done
node scripts/build-part2.mjs
python scripts/serve.py
```

Open `http://localhost:8080/part-2/`. Vite's relative-base setting changes packaging paths, not model-authored game logic. Runtime failures remain visible even though all five source trees pass type checking.

The new gallery stores stars only in the reader's browser and offers JSON export. No shared backend, public averages or owner scores are fabricated. Original Part 1 rankings and ratings remain separate. Silent GIFs do not establish music quality or client-device frame rate.

The cover and workflow diagram are editorial assets made after testing. They were not game inputs or outputs. The cover is AI-assisted and is labelled accordingly; gameplay media are real captures. Keep template, Phaser and dependency license notices.
