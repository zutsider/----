from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
FINAL = ROOT / "final"
QA = ROOT / "qa"
CELL_W = 192
CELL_H = 208
COLS = 8
ROWS = 11


SKIN = (246, 231, 222, 255)
SKIN_SHADE = (228, 204, 193, 255)
HAIR = (22, 22, 26, 255)
HAIR_HI = (48, 49, 58, 255)
LIP = (119, 18, 37, 255)
DRESS = (130, 12, 37, 255)
DRESS_DARK = (92, 8, 31, 255)
DRESS_HI = (185, 45, 69, 255)
PEARL = (244, 239, 225, 255)
GOLD = (196, 142, 64, 255)
LINE = (51, 32, 38, 255)


def ease(value: float) -> float:
    return math.sin(value * math.pi)


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=1):
    draw.ellipse(tuple(round(v) for v in box), fill=fill, outline=outline, width=width)


def polygon(draw: ImageDraw.ImageDraw, points, fill, outline=None):
    draw.polygon([(round(x), round(y)) for x, y in points], fill=fill, outline=outline)


def line(draw: ImageDraw.ImageDraw, points, fill, width=1, joint="curve"):
    draw.line([(round(x), round(y)) for x, y in points], fill=fill, width=width, joint=joint)


def add_soft_highlight(layer: Image.Image, box, color):
    h = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(h)
    d.ellipse(tuple(round(v) for v in box), fill=color)
    h = h.filter(ImageFilter.GaussianBlur(4))
    layer.alpha_composite(h)


def draw_pet(
    *,
    frame: int,
    row: int,
    used: bool,
    direction_deg: float | None = None,
) -> Image.Image:
    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    if not used:
        return cell

    d = ImageDraw.Draw(cell)
    phase = frame / max(1, 7)
    bob = math.sin(phase * math.tau) * 2
    lean = 0
    facing = 1
    arm_wave = 0
    jump = 0
    sad = 0
    work = 0
    review = 0
    wait = 0
    step = 0
    blink = False
    head_turn = 0.0
    gaze_x = 0.0
    gaze_y = 0.0

    if row == 0:
        bob = math.sin(frame / 6 * math.tau) * 2
        blink = frame in (2, 3)
    elif row == 1:
        facing = 1
        lean = 5
        step = math.sin(frame / 8 * math.tau)
        bob = abs(step) * 3
    elif row == 2:
        facing = -1
        lean = -5
        step = math.sin(frame / 8 * math.tau)
        bob = abs(step) * 3
    elif row == 3:
        arm_wave = [0, -18, -31, -12][frame]
        bob = [0, -1, -2, 0][frame]
    elif row == 4:
        jump = [0, -14, -29, -15, 0][frame]
        bob = 0
    elif row == 5:
        sad = [0, 1, 2, 3, 3, 2, 1, 0][frame]
        bob = sad * 1.2
    elif row == 6:
        wait = [0, 1, 2, 1, 0, 1][frame]
        bob = -wait
    elif row == 7:
        work = [0, 1, 2, 1, 0, 1][frame]
        lean = -2 + work
        blink = frame == 3
    elif row == 8:
        review = [0, 1, 2, 1, 0, 1][frame]
        lean = -4
        blink = frame == 2
    elif row in (9, 10) and direction_deg is not None:
        # 000 is up. Convert to screen-coordinate gaze offsets.
        rad = math.radians(direction_deg)
        gaze_x = math.sin(rad)
        gaze_y = -math.cos(rad)
        head_turn = gaze_x * 5
        bob = gaze_y * 1.2
        facing = 1 if gaze_x >= -0.25 else -1

    cx = 96 + lean + head_turn
    base_y = 164 + bob + jump

    # Dress skirt with fishtail shape.
    waist_y = base_y - 58
    hem_y = base_y + 24
    skirt = [
        (cx - 23, waist_y),
        (cx + 23, waist_y),
        (cx + 38, hem_y - 3),
        (cx + 19, hem_y + 10),
        (cx, hem_y + 4),
        (cx - 22, hem_y + 10),
        (cx - 39, hem_y - 3),
    ]
    polygon(d, skirt, DRESS, DRESS_DARK)
    polygon(
        d,
        [(cx + 4, waist_y + 5), (cx + 27, hem_y - 4), (cx + 10, hem_y + 5), (cx - 2, waist_y + 10)],
        DRESS_DARK,
    )
    line(d, [(cx - 14, waist_y + 8), (cx + 5, hem_y - 2)], DRESS_HI, 2)

    # Torso and off-shoulder folded neckline.
    polygon(d, [(cx - 25, waist_y), (cx + 25, waist_y), (cx + 18, waist_y - 45), (cx - 18, waist_y - 45)], DRESS, DRESS_DARK)
    polygon(d, [(cx - 35, waist_y - 44), (cx - 7, waist_y - 31), (cx + 2, waist_y - 44), (cx - 26, waist_y - 54)], DRESS_HI, DRESS_DARK)
    polygon(d, [(cx + 35, waist_y - 44), (cx + 7, waist_y - 31), (cx - 2, waist_y - 44), (cx + 26, waist_y - 54)], DRESS_HI, DRESS_DARK)
    line(d, [(cx - 30, waist_y - 42), (cx + 30, waist_y - 42)], DRESS_DARK, 2)

    # Neck and shoulders.
    ellipse(d, (cx - 10, waist_y - 67, cx + 10, waist_y - 35), SKIN, SKIN_SHADE)
    line(d, [(cx - 36, waist_y - 42), (cx - 20, waist_y - 49)], SKIN_SHADE, 4)
    line(d, [(cx + 36, waist_y - 42), (cx + 20, waist_y - 49)], SKIN_SHADE, 4)

    # Arms with a distinct waving pose on row 3.
    left_hand = (cx - 42 - step * 4, waist_y + 9 + abs(step) * 2)
    right_hand = (cx + 42 + step * 4, waist_y + 9 + abs(step) * 2)
    if row == 3:
        right_hand = (cx + 43, waist_y - 22 + arm_wave)
    if row == 6:
        left_hand = (cx - 32, waist_y - 16 - wait * 2)
        right_hand = (cx + 32, waist_y - 16 - wait * 2)
    if row == 7:
        left_hand = (cx - 34, waist_y - 7 + work * 3)
        right_hand = (cx + 34, waist_y - 5 - work * 2)
    if row == 8:
        left_hand = (cx - 31, waist_y - 20)
        right_hand = (cx + 30, waist_y - 7 + review * 2)
    line(d, [(cx - 23, waist_y - 35), left_hand], SKIN, 6)
    line(d, [(cx + 23, waist_y - 35), right_hand], SKIN, 6)
    ellipse(d, (left_hand[0] - 4, left_hand[1] - 4, left_hand[0] + 4, left_hand[1] + 4), SKIN, SKIN_SHADE)
    ellipse(d, (right_hand[0] - 4, right_hand[1] - 4, right_hand[0] + 4, right_hand[1] + 4), SKIN, SKIN_SHADE)

    # Pearl and bead bracelet on the left wrist.
    for i in range(4):
        ellipse(d, (left_hand[0] - 7 + i * 4, left_hand[1] - 8, left_hand[0] - 3 + i * 4, left_hand[1] - 4), PEARL, GOLD)

    # Hair behind the head, mullet silhouette.
    head_y = waist_y - 72 + sad * 1.5
    hair_back = [
        (cx - 29 + head_turn * 0.2, head_y - 6),
        (cx + 29 + head_turn * 0.2, head_y - 6),
        (cx + 34, head_y + 35),
        (cx + 19, head_y + 58),
        (cx + 4, head_y + 48),
        (cx - 15, head_y + 59),
        (cx - 34, head_y + 36),
    ]
    polygon(d, hair_back, HAIR)
    add_soft_highlight(cell, (cx - 25, head_y + 2, cx + 22, head_y + 46), (0, 0, 0, 45))

    # Face: melon-shaped, calm and slightly severe.
    ellipse(d, (cx - 24, head_y - 8, cx + 24, head_y + 39), SKIN, LINE, 1)
    polygon(d, [(cx - 21, head_y + 20), (cx + 21, head_y + 20), (cx + 12, head_y + 46), (cx, head_y + 52), (cx - 12, head_y + 46)], SKIN, LINE)

    # Layered bangs and side locks.
    polygon(d, [(cx - 27, head_y - 5), (cx + 24, head_y - 7), (cx + 15, head_y + 9), (cx + 1, head_y + 4), (cx - 13, head_y + 11), (cx - 25, head_y + 8)], HAIR)
    line(d, [(cx - 6, head_y - 5), (cx - 10, head_y + 17)], HAIR_HI, 2)
    line(d, [(cx + 7, head_y - 4), (cx + 11, head_y + 15)], HAIR_HI, 2)
    line(d, [(cx - 25, head_y + 9), (cx - 32, head_y + 43)], HAIR, 8)
    line(d, [(cx + 25, head_y + 9), (cx + 32, head_y + 42)], HAIR, 8)

    eye_dx = 7 + gaze_x * 3
    eye_dy = 15 + gaze_y * 2 + sad
    if blink:
        line(d, [(cx - 13 + head_turn * 0.2, head_y + eye_dy), (cx - 4 + head_turn * 0.2, head_y + eye_dy)], LINE, 2)
        line(d, [(cx + 4 + head_turn * 0.2, head_y + eye_dy), (cx + 13 + head_turn * 0.2, head_y + eye_dy)], LINE, 2)
    else:
        ellipse(d, (cx - 15 + eye_dx * 0.25, head_y + eye_dy - 3, cx - 7 + eye_dx * 0.25, head_y + eye_dy + 4), LINE)
        ellipse(d, (cx + 7 + eye_dx * 0.25, head_y + eye_dy - 3, cx + 15 + eye_dx * 0.25, head_y + eye_dy + 4), LINE)
        ellipse(d, (cx - 12 + gaze_x * 3, head_y + eye_dy - 1 + gaze_y * 1.5, cx - 10 + gaze_x * 3, head_y + eye_dy + 1 + gaze_y * 1.5), (235, 235, 238, 255))
        ellipse(d, (cx + 10 + gaze_x * 3, head_y + eye_dy - 1 + gaze_y * 1.5, cx + 12 + gaze_x * 3, head_y + eye_dy + 1 + gaze_y * 1.5), (235, 235, 238, 255))

    line(d, [(cx + gaze_x * 2, head_y + 22), (cx - 2 + gaze_x * 2, head_y + 29)], SKIN_SHADE, 1)
    mouth_y = head_y + 36 + sad
    if sad > 1:
        line(d, [(cx - 7, mouth_y + 3), (cx, mouth_y), (cx + 7, mouth_y + 3)], LIP, 2)
    else:
        line(d, [(cx - 7, mouth_y), (cx + 7, mouth_y)], LIP, 3)

    # Subtle row-specific attached details, never floating marks.
    if row == 5 and sad > 1:
        ellipse(d, (cx + 16, head_y + 24, cx + 21, head_y + 33), (118, 160, 188, 255), (84, 114, 145, 255))
    if row == 7:
        # Hands press against dress front to suggest focused work without new props.
        line(d, [(cx - 16, waist_y - 5), (cx + 14, waist_y - 2)], DRESS_HI, 2)
    if row == 8:
        ellipse(d, (cx - 18, head_y + 10, cx + 18, head_y + 34), (255, 255, 255, 20))

    # Ankles peeking under the gown.
    line(d, [(cx - 8 - step * facing * 4, hem_y + 2), (cx - 12 - step * facing * 7, hem_y + 13)], SKIN_SHADE, 3)
    line(d, [(cx + 8 + step * facing * 4, hem_y + 2), (cx + 12 + step * facing * 7, hem_y + 13)], SKIN_SHADE, 3)

    return cell


def build_atlas() -> Image.Image:
    atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    used_counts = {0: 6, 1: 8, 2: 8, 3: 4, 4: 5, 5: 8, 6: 6, 7: 6, 8: 6, 9: 8, 10: 8}
    directions = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5]
    for row in range(ROWS):
        for col in range(COLS):
            used = col < used_counts[row] or (row == 0 and col == 6)
            direction = None
            if row >= 9:
                direction = directions[(row - 9) * 8 + col]
            cell = draw_pet(frame=col, row=row, used=used, direction_deg=direction)
            atlas.alpha_composite(cell, (col * CELL_W, row * CELL_H))
    # Clear hidden RGB under transparent pixels.
    clean = Image.new("RGBA", atlas.size, (0, 0, 0, 0))
    clean.alpha_composite(atlas)
    return clean


def make_contact_sheet(atlas: Image.Image) -> Image.Image:
    sheet = Image.new("RGB", atlas.size, (236, 238, 242))
    checker = Image.new("RGB", (CELL_W, CELL_H), (245, 246, 248))
    cd = ImageDraw.Draw(checker)
    for y in range(0, CELL_H, 16):
        for x in range(0, CELL_W, 16):
            if (x // 16 + y // 16) % 2:
                cd.rectangle((x, y, x + 15, y + 15), fill=(224, 226, 231))
    for row in range(ROWS):
        for col in range(COLS):
            bg = checker.copy()
            cell = atlas.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))
            bg.paste(cell, (0, 0), cell)
            sheet.paste(bg, (col * CELL_W, row * CELL_H))
    return sheet


def main() -> None:
    FINAL.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    atlas = build_atlas()
    png = FINAL / "spritesheet.png"
    webp = FINAL / "spritesheet.webp"
    atlas.save(png)
    atlas.save(webp, "WEBP", lossless=True, quality=100, method=6)
    make_contact_sheet(atlas).save(QA / "contact-sheet-extended.png")
    manifest = {
        "id": "crimson-muse",
        "displayName": "Crimson Muse",
        "description": "A calm crimson-gowned desktop companion with layered black hair and a focused gaze.",
        "spriteVersionNumber": 2,
        "spritesheetPath": "spritesheet.webp",
    }
    (FINAL / "pet.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (ROOT / "README.md").write_text(
        "# Crimson Muse\n\n"
        "Codex Desktop v2 custom pet generated from the provided visual references. "
        "The spritesheet is an original deterministic cartoon rendering, not a reused pose sheet.\n\n"
        "- `final/pet.json`\n"
        "- `final/spritesheet.webp`\n"
        "- `qa/contact-sheet-extended.png`\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
