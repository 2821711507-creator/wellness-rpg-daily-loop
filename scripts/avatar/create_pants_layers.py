from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "public" / "avatar" / "v2"
PALETTE = ((36, 48, 69), (52, 70, 97), (76, 99, 132), (112, 139, 170))
STRIPE = (142, 193, 216, 255)


def is_skin(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and red > green > blue and red - blue > 35


def fabric(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    red, green, blue, _ = pixel
    lightness = (red * 3 + green * 5 + blue * 2) // 10
    index = 0 if lightness < 85 else 1 if lightness < 135 else 2 if lightness < 190 else 3
    return (*PALETTE[index], 255)


def create(gender: str) -> None:
    source = Image.open(ASSET_DIR / f"base-{gender}.png").convert("RGBA")
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_pixels = source.load()
    output_pixels = output.load()

    for y in range(60, 130):
        row = []
        for x in range(25, 72):
            pixel = source_pixels[x, y]
            shorts = y < 78 and 32 <= x <= 65 and pixel[3] > 0
            legs = y >= 74 and 32 <= x <= 65 and is_skin(pixel)
            if shorts or legs:
                output_pixels[x, y] = fabric(pixel)
                row.append(x)

        # A restrained sky-blue outside seam keeps the trousers readable at 1x.
        if row and 78 <= y < 125:
            gaps = [index for index in range(len(row) - 1) if row[index + 1] - row[index] > 2]
            starts = [row[0], *(row[index + 1] for index in gaps)]
            ends = [*(row[index] for index in gaps), row[-1]]
            for start, end in zip(starts, ends):
                if end - start >= 3:
                    output_pixels[start, y] = STRIPE

    # Dark waistband and pale cuffs define the garment boundaries.
    for y in range(60, 63):
        for x in range(25, 72):
            if output_pixels[x, y][3]:
                output_pixels[x, y] = (*PALETTE[0], 255)
    for y in range(125, 130):
        for x in range(25, 72):
            if output_pixels[x, y][3]:
                output_pixels[x, y] = (*PALETTE[1 if y < 128 else 0], 255)

    destination = ASSET_DIR / f"{gender}-bottom-pants.png"
    output.save(destination)
    print(destination)


if __name__ == "__main__":
    create("female")
    create("male")
