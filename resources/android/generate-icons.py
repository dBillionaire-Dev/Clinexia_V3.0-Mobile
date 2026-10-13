#!/usr/bin/env python3
"""Regenerates the Android launcher icons and splash images from store/play/icon-512.png.

  python3 resources/android/generate-icons.py

Needs Pillow (pip install pillow). The output goes to resources/android/res/, and
scripts/android-icons.mjs copies it into android/app/src/main/res on every release build.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(ROOT, "store", "play", "icon-512.png")
OUT = os.path.join(HERE, "res")

ICON_BLUE = (37, 99, 235)      # #2563EB, the colour of the Play Store icon
SPLASH_BG = (7, 58, 104)       # #073A68, the app theme colour (same as capacitor.config.ts)
SAFE_RADIUS_DP = 29            # inside the 33dp safe radius, leaving some breathing room

DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

src = Image.open(SRC).convert("RGB")
# The mark is white on a flat blue tile, so its red channel is its opacity (blue R=37 -> 0, white R=255 -> 1).
r = src.getchannel("R").point(lambda v: max(0, min(255, round((v - ICON_BLUE[0]) * 255 / (255 - ICON_BLUE[0])))))
bbox = r.point(lambda v: 255 if v > 128 else 0).getbbox()
cx, cy = src.width / 2, src.height / 2
px = r.load()
max_r = 0.0
for y in range(r.height):
    for x in range(r.width):
        if px[x, y] > 128:
            max_r = max(max_r, ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5)

def white_mark(size_px: int, scale: float) -> Image.Image:
    """RGBA white mark scaled by `scale` (source px -> output px), centred on a transparent square canvas."""
    w = round(src.width * scale)
    mask = r.resize((w, w), Image.LANCZOS)
    layer = Image.new("RGBA", (size_px, size_px), (255, 255, 255, 0))
    white = Image.new("RGBA", (w, w), (255, 255, 255, 255))
    white.putalpha(mask)
    layer.alpha_composite(white, ((size_px - w) // 2, (size_px - w) // 2))
    return layer

def save(img: Image.Image, rel: str):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)

# 1) Adaptive foreground: 108dp canvas, mark inside the safe circle. Render big, then shrink for each density.
MASTER = 108 * 16
fg_master = white_mark(MASTER, (SAFE_RADIUS_DP * 16) / max_r)
for name, d in DENSITIES.items():
    n = round(108 * d)
    save(fg_master.resize((n, n), Image.LANCZOS), f"mipmap-{name}/ic_launcher_foreground.png")

# 2) Legacy launcher icons (Android 7 / API 24-25): the full artwork in a rounded square and in a circle.
def legacy(shape: str, n: int) -> Image.Image:
    big = src.resize((n * 4, n * 4), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", big.size, 0)
    d = ImageDraw.Draw(mask)
    if shape == "round":
        d.ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, big.width - 1, big.height - 1), radius=round(big.width * 0.22), fill=255)
    big.putalpha(mask)
    return big.resize((n, n), Image.LANCZOS)

for name, d in DENSITIES.items():
    n = round(48 * d)
    save(legacy("square", n), f"mipmap-{name}/ic_launcher.png")
    save(legacy("round", n), f"mipmap-{name}/ic_launcher_round.png")

# 3) Adaptive background colour.
os.makedirs(os.path.join(OUT, "values"), exist_ok=True)
with open(os.path.join(OUT, "values", "ic_launcher_background.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % ICON_BLUE)

# 3b) Adaptive icon definitions. The <monochrome> layer lets Android 13+ tint the icon with the user's wallpaper colours.
ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""
os.makedirs(os.path.join(OUT, "mipmap-anydpi-v26"), exist_ok=True)
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(os.path.join(OUT, "mipmap-anydpi-v26", name), "w") as f:
        f.write(ADAPTIVE_XML)

# 4) Splash images (same sizes Capacitor generates): navy background, white mark at 30% of the short side.
SPLASH = {
    "drawable": (480, 320),
    "drawable-land-mdpi": (480, 320), "drawable-land-hdpi": (800, 480), "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960), "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480), "drawable-port-hdpi": (480, 800), "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600), "drawable-port-xxxhdpi": (1280, 1920),
}
mark_w = bbox[2] - bbox[0]
for folder, (w, h) in SPLASH.items():
    target = 0.30 * min(w, h)
    scale = target / mark_w
    img = Image.new("RGB", (w, h), SPLASH_BG)
    m = white_mark(max(w, h), scale)
    img.paste(m.crop(((m.width - w) // 2, (m.height - h) // 2, (m.width - w) // 2 + w, (m.height - h) // 2 + h)), (0, 0), m.crop(((m.width - w) // 2, (m.height - h) // 2, (m.width - w) // 2 + w, (m.height - h) // 2 + h)))
    save(img, f"{folder}/splash.png")

print(f"mark radius {max_r:.0f}px of 512 -> {SAFE_RADIUS_DP}dp safe radius; wrote {OUT}")
