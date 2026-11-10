"""Create equivalent GIF previews from the public source MP4s. Requires FFmpeg."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, default=ROOT / "output/gifs")
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        parser.error("Install FFmpeg and make it available on PATH.")
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / "results/gif-provenance.json").read_text())
    for item in manifest["gifs"]:
        source = ROOT / item["source"]
        assert hashlib.sha256(source.read_bytes()).hexdigest() == item["sourceSha256"], "Source recording changed"
        output = args.output / pathlib.Path(item["file"]).name
        assert not output.exists(), "Choose an empty output folder to preserve existing files"
        seek = ["-sseof", "-10"] if item.get("reusedExisting") else ["-ss", str(item["excerptSeconds"][0])]
        palette = "palettegen" if item.get("reusedExisting") else "palettegen=max_colors=128"
        use = "paletteuse" if item.get("reusedExisting") else "paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle"
        filters = "[0:v]fps=" + str(item["fps"]) + ",scale=640:-1:flags=lanczos,split[a][b];[a]" + palette + "[p];[b][p]" + use
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", *seek, "-i", str(source), "-t", "8", "-filter_complex", filters, "-an", "-loop", "0", str(output)], check=True)
        print(output.name)
    print("These are equivalent previews. Re-encoding the public MP4s, especially the reused Graphify excerpt, need not reproduce the original GIF bytes. Published files/hashes remain in site/media and results/gif-provenance.json.")


if __name__ == "__main__":
    main()
