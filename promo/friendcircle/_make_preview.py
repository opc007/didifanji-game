#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 9 张图拼成 9 宫格预览，模拟朋友圈显示效果
"""
from PIL import Image, ImageDraw, ImageFont
import os

PROMO = "/Users/ahs/Documents/姐弟游戏/promo"
FC = f"{PROMO}/friendcircle"

# 朋友圈发布顺序（第一张是大主图，后面 8 张 3x3 网格）
ORDER = [
    ("主图", f"{PROMO}/characters-preview.jpg"),
    (None, f"{FC}/01-ten-levels.png"),
    (None, f"{FC}/02-sister-weapons.png"),
    (None, f"{FC}/03-brother-tools.png"),
    (None, f"{FC}/04-free-open.png"),
    (None, f"{FC}/05-stress-relief.png"),
    (None, f"{FC}/06-cta.png"),
    (None, f"{PROMO}/start-screen.png"),
    (None, f"{PROMO}/victory-screen.png"),
]

# 朋友圈网格：主图占左上 2×2（更大），剩下 8 张 1×1
CELL = 360            # 每个小格子像素
GAP = 10              # 间距
MAIN_W = CELL * 2 + GAP  # 主图宽度 = 2 格 + 间距
TOTAL_W = MAIN_W + CELL * 2 + GAP * 2  # 整体宽度
TOTAL_H = MAIN_W + CELL * 1 + GAP * 2   # 整体高度（3 行）

print(f"预览画布: {TOTAL_W} × {TOTAL_H}")

# 创建画布（带浅灰背景模拟朋友圈）
canvas = Image.new("RGB", (TOTAL_W + 60, TOTAL_H + 60), (245, 245, 245))
draw = ImageDraw.Draw(canvas)


def fit_square(img):
    """把任意比例图裁剪/居中成正方形"""
    w, h = img.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    return img.crop((left, top, left + s, top + s))


def place(idx, src_path, x, y, size):
    img = Image.open(src_path).convert("RGB")
    img = fit_square(img)
    img = img.resize((size, size), Image.LANCZOS)
    canvas.paste(img, (x, y))
    # 序号
    f = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 40)
    # 序号圆圈
    cx, cy = x + 30, y + 30
    draw.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(231, 76, 60, 255), outline=(255, 255, 255), width=3)
    draw.text((cx - 12, cy - 28), str(idx), fill=(255, 255, 255), font=f)


# 主图
place(1, ORDER[0][1], 30, 30, MAIN_W)
# 8 张小图（3x3 中第 2、3 列，第 1、2、3 行）
for i in range(8):
    n = i + 2
    src = ORDER[i + 1][1]
    row = i // 2
    col = i % 2
    x = 30 + MAIN_W + GAP + col * (CELL + GAP)
    y = 30 + row * (CELL + GAP)
    place(n, src, x, y, CELL)

# 标题
f_title = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 28)
draw.text((30, TOTAL_H + 18),
          "↑ 朋友圈 9 宫格发布顺序预览（数字 = 上传顺序，第一张是主图）",
          fill=(100, 100, 100), font=f_title)

out = f"{PROMO}/friendcircle/_preview_9grid.png"
canvas.save(out, "PNG", optimize=True)
print(f"✅ 预览已保存: {out}")
print(f"   {os.path.getsize(out) / 1024:.1f} KB")
