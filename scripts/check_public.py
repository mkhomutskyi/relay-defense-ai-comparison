"""Check the public release without printing potential secret values. No dependencies."""
import hashlib
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
RULES = {
    "private-network": rb"(?<![\d.])(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?![\d.])",
    "private-workspace": rb"[A-Z]:[/\\]+Users[/\\]+|[/]root[/]\.ssh|[/]etc[/]ai370[-]secrets|[/]opt[/]ai370[-]|[/]workspace[/]relay[-]defense",
    "private-key": rb"-----BEGIN (?:[A-Z0-9 ]* )?PRIVATE KEY-----",
    "credential-url": rb"https?://[^\s/]+:[^\s/]+@",
    "provider-token": rb"\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16})\b",
}
RULES = {name: re.compile(pattern) for name, pattern in RULES.items()}
EXCLUDED = {".git", "node_modules", ".wrangler", "__pycache__", "output"}
PRIVATE_NAMES = {"id_rsa", "id_ed25519", "known_hosts", "hosts.yml", "events.jsonl", "COST_LEDGER.json"}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    findings = []
    count = 0
    tracked = subprocess.run(["git", "-C", str(ROOT), "ls-files", "-c", "-o", "--exclude-standard", "-z"], capture_output=True)
    paths = (ROOT / name for name in sorted(set(tracked.stdout.decode().split("\0"))) if name) if tracked.returncode == 0 else ROOT.rglob("*")
    for path in paths:
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDED for part in rel.parts):
            continue
        if path.is_symlink():
            findings.append({"file": rel.as_posix(), "rule": "symlink"})
            continue
        if not path.is_file():
            continue
        count += 1
        if path.name in PRIVATE_NAMES or path.name.startswith((".env", ".dev.vars")):
            findings.append({"file": rel.as_posix(), "rule": "private-file-name"})
        if path.suffix.lower() in {".gguf", ".safetensors", ".onnx", ".ckpt", ".pt"}:
            findings.append({"file": rel.as_posix(), "rule": "model-weights"})
        raw = path.read_bytes()
        for name, pattern in RULES.items():
            if pattern.search(raw):
                findings.append({"file": rel.as_posix(), "rule": name})

    source = json.loads((ROOT / "results/source-hashes.json").read_text(encoding="utf-8"))
    published = json.loads((ROOT / "results/git-source-hashes.json").read_text(encoding="utf-8"))["hashes"]
    if set(source) != set(published):
        findings.append({"file": "results/git-source-hashes.json", "rule": "source-manifest-paths"})
    for rel, expected in source.items():
        if not (ROOT / rel).is_file() or digest(ROOT / rel) not in {expected, published.get(rel)}:
            findings.append({"file": rel, "rule": "frozen-source-hash"})

    games = json.loads((ROOT / "site/games.json").read_text(encoding="utf-8"))
    gifs = json.loads((ROOT / "results/gif-provenance.json").read_text(encoding="utf-8"))["gifs"]
    gif_paths = {item["file"] for item in gifs}
    for game in games:
        if "site/media/" + game["id"] + ".gif" not in gif_paths:
            findings.append({"file": game["id"], "rule": "missing-gif-provenance"})
        if not (ROOT / "site/games" / game["id"] / "index.html").is_file():
            findings.append({"file": game["id"], "rule": "missing-browser-bundle"})
    for item in gifs:
        for rel, expected in [(item["file"], item["sha256"]), (item["source"], item["sourceSha256"])]:
            if not (ROOT / rel).is_file() or digest(ROOT / rel) != expected:
                findings.append({"file": rel, "rule": "media-hash"})
        start, end = item["excerptSeconds"]
        if abs(end - start - 8) > 0.001:
            findings.append({"file": item["file"], "rule": "gif-duration-manifest"})

    print(json.dumps({"filesChecked": count, "frozenSourceHashes": len(source), "gameplayGifs": len(gifs), "findings": findings}))
    return bool(findings)


if __name__ == "__main__":
    sys.exit(main())
