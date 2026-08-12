from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "public" / "avatar" / "v2"
SOURCE_DIR = ROOT / "assets-src" / "avatar"


def is_hair(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and red < 235 and green < 180 and blue < 155 and red > green * 1.08


def is_elastic(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and blue > red + 8 and blue > green


def protected_face(x: int, y: int) -> bool:
    return 36 <= x <= 60 and 18 <= y <= 34


def create(gender: str) -> None:
    base = Image.open(ASSET_DIR / f"base-{gender}.png").convert("RGBA")
    tied = Image.open(SOURCE_DIR / f"{gender}-hair-tied-reference.png").convert("RGBA")
    mask = Image.new("RGBA", base.size, (255, 255, 255, 255))
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    base_pixels = base.load()
    tied_pixels = tied.load()
    mask_pixels = mask.load()
    layer_pixels = layer.load()

    for y in range(0, 48):
        for x in range(12, 84):
            if y < 35 or (is_hair(base_pixels[x, y]) and not protected_face(x, y)):
                mask_pixels[x, y] = (255, 255, 255, 0)
            if (y < 35 and tied_pixels[x, y][3]) or (is_hair(tied_pixels[x, y]) and not protected_face(x, y)) or is_elastic(tied_pixels[x, y]):
                layer_pixels[x, y] = tied_pixels[x, y]

    mask.save(ASSET_DIR / f"{gender}-hair-replacement-mask.png")
    layer.save(ASSET_DIR / f"{gender}-hair-tied.png")
    print(gender)


if __name__ == "__main__":
    create("female")
    create("male")
