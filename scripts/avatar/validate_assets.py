from pathlib import Path
import sys

from PIL import Image


def validate(path: Path) -> None:
    image = Image.open(path)
    if image.size != (96, 144):
        raise ValueError(f"{path}: expected 96x144, got {image.size[0]}x{image.size[1]}")
    if image.mode != "RGBA":
        raise ValueError(f"{path}: expected RGBA, got {image.mode}")
    alpha = image.getchannel("A")
    if alpha.getbbox() is None:
        raise ValueError(f"{path}: empty foreground")
    corners = [(0, 0), (95, 0), (0, 143), (95, 143)]
    if any(alpha.getpixel(point) != 0 for point in corners):
        raise ValueError(f"{path}: corners must be transparent")
    print(f"{path}: 96x144 RGBA, transparent corners, foreground {alpha.getbbox()}")


if __name__ == "__main__":
    for argument in sys.argv[1:]:
        validate(Path(argument))
