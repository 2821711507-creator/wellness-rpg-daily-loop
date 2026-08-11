from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "public" / "avatar" / "v2"
PALETTE = ((53, 65, 61), (91, 107, 99), (143, 158, 145), (218, 222, 207))


def is_skin(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and red > green > blue and red - blue > 35


def recolor(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    red, green, blue, alpha = pixel
    lightness = (red * 3 + green * 5 + blue * 2) // 10
    index = 0 if lightness < 75 else 1 if lightness < 135 else 2 if lightness < 205 else 3
    return (*PALETTE[index], alpha)


def create(gender: str, runner: bool) -> None:
    prefix = f"{gender}-top-runner" if runner else gender
    source = Image.open(ASSET_DIR / f"{prefix}-shoes-trainers.png").convert("RGBA")
    pixels = source.load()
    for y in range(122, 144):
        for x in range(18, 78):
            pixel = pixels[x, y]
            if pixel[3] and not is_skin(pixel):
                pixels[x, y] = recolor(pixel)
    destination = ASSET_DIR / f"{prefix}-shoes-walk.png"
    source.save(destination)
    print(destination)


if __name__ == "__main__":
    for avatar_gender in ("female", "male"):
        create(avatar_gender, False)
        create(avatar_gender, True)
