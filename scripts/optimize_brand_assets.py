from pathlib import Path

from PIL import Image


ROOT = Path("/home/ubuntu/meshline-messenger")
SOURCE = Path("/home/ubuntu/upload/file_00000000f53081f489d82f325b51af66.png")
TARGETS = {
    "assets/images/meshline-brand-mark.png": 512,
    "assets/images/icon.png": 512,
    "assets/images/splash-icon.png": 512,
    "assets/images/android-icon-foreground.png": 512,
    "assets/images/favicon.png": 256,
}


def main() -> None:
    with Image.open(SOURCE) as original:
        image = original.convert("RGBA")
        for relative_path, edge in TARGETS.items():
            target = ROOT / relative_path
            optimized = image.resize((edge, edge), Image.Resampling.LANCZOS)
            optimized.save(target, format="PNG", optimize=True, compress_level=9)
            print(f"{target}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
