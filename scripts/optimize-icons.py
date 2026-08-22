from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/webdev-static-assets/meshline-icon.png")
TARGETS = [
    Path("/home/ubuntu/meshline-messenger/assets/images/icon.png"),
    Path("/home/ubuntu/meshline-messenger/assets/images/splash-icon.png"),
    Path("/home/ubuntu/meshline-messenger/assets/images/favicon.png"),
    Path("/home/ubuntu/meshline-messenger/assets/images/android-icon-foreground.png"),
]


def main() -> None:
    with Image.open(SOURCE) as image:
        resized = image.convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
        optimized = resized.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
        for target in TARGETS:
            optimized.save(target, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
