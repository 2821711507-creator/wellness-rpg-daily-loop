from pathlib import Path
import argparse

import cv2
import numpy as np
from PIL import Image
from perfect_pixel import get_perfect_pixel


ROOT = Path(__file__).resolve().parent
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("name", nargs="?", default="female-base-anchor-v1")
    parser.add_argument("--crop", default="35:1690,35:650")
    args = parser.parse_args()
    source_path = ROOT / f"{args.name}-chroma.png"
    y_range, x_range = args.crop.split(",")
    y0_crop, y1_crop = (int(value) for value in y_range.split(":"))
    x0_crop, x1_crop = (int(value) for value in x_range.split(":"))

    source = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    if source is None:
        raise FileNotFoundError(source_path)

    # Keep only the full-body anchor; the separate face study is outside this crop.
    crop = source[y0_crop:y1_crop, x0_crop:x1_crop]
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    width, height, refined = get_perfect_pixel(
        rgb,
        sample_method="majority",
        min_size=3.5,
        refine_intensity=0.25,
        fix_square=False,
    )
    if width is None or height is None:
        raise RuntimeError("Perfect Pixel could not detect the source grid")

    Image.fromarray(refined).save(ROOT / f"{args.name}-refined-grid.png")

    # Remove the chroma background after grid normalization.
    red = refined[:, :, 0].astype(np.int16)
    green = refined[:, :, 1].astype(np.int16)
    blue = refined[:, :, 2].astype(np.int16)
    chroma = (green > 170) & (green - red > 65) & (green - blue > 65)
    alpha = np.where(chroma, 0, 255).astype(np.uint8)

    # The generated sheet also contains a detached face study. Keep only the
    # largest connected foreground component, which is the full-body anchor.
    count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
    if count > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        alpha = np.where(labels == largest, 255, 0).astype(np.uint8)
    rgba = np.dstack([refined, alpha])

    visible = np.argwhere(alpha > 0)
    if visible.size == 0:
        raise RuntimeError("Chroma removal removed the whole character")
    y0, x0 = visible.min(axis=0)
    y1, x1 = visible.max(axis=0) + 1
    character = Image.fromarray(rgba[y0:y1, x0:x1], mode="RGBA")

    target_width, target_height = 96, 144
    padding = 4
    scale = min(
        (target_width - padding * 2) / character.width,
        (target_height - padding * 2) / character.height,
    )
    resized = character.resize(
        (max(1, round(character.width * scale)), max(1, round(character.height * scale))),
        Image.Resampling.NEAREST,
    )
    canvas = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    x = (target_width - resized.width) // 2
    y = target_height - padding - resized.height
    canvas.alpha_composite(resized, (x, y))
    canvas.save(ROOT / f"{args.name}-96x144.png")
    canvas.resize((384, 576), Image.Resampling.NEAREST).save(ROOT / f"{args.name}-4x.png")
    print(f"Perfect Pixel grid: {width}x{height}; character: {character.width}x{character.height}; target: 96x144")


if __name__ == "__main__":
    main()
