#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为《弟弟打姐姐》朋友圈宣传生成 6 张 1080x1080 文字配图
风格统一：雪地渐变背景 + 大标题 + emoji + 品牌条
注意：macOS Apple Color Emoji 字体只支持 size=160
"""
from PIL import Image, ImageDraw, ImageFont
import os
import random
import math

OUT_DIR = "/Users/ahs/Documents/姐弟游戏/promo/friendcircle"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_HEI_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_HEI_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_HELV = "/Library/Fonts/HelveticaNeue.ttc"
FONT_EMOJI = "/System/Library/Fonts/Apple Color Emoji.ttc"  # 只支持 160
EMOJI_SIZE = 160

W, H = 1080, 1080

SKY_TOP = (184, 212, 232)
SKY_BOT = (240, 248, 255)
ACCENT_RED = (231, 76, 60)
ACCENT_BLUE = (52, 152, 219)
ACCENT_YELLOW = (241, 196, 15)
ACCENT_GREEN = (39, 174, 96)
DARK = (44, 62, 80)
GRAY = (127, 140, 141)
WHITE = (255, 255, 255)
BRAND_BG = (44, 62, 80)
BRAND_FG = (255, 255, 255)


def gradient_bg(width, height, top, bot):
    img = Image.new("RGB", (width, height), top)
    px = img.load()
    for y in range(height):
        t = y / (height - 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(width):
            px[x, y] = (r, g, b)
    return img


def draw_snow(img, count=80, seed=42):
    draw = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(seed)
    for _ in range(count):
        x = rnd.randint(0, W)
        y = rnd.randint(0, H)
        r = rnd.randint(3, 9)
        alpha = rnd.randint(120, 220)
        draw.ellipse([x - r, y - r, x + r, y + r],
                     fill=(255, 255, 255, alpha))
    for _ in range(8):
        x = rnd.randint(60, W - 60)
        y = rnd.randint(60, H - 200)
        size = rnd.randint(8, 14)
        alpha = rnd.randint(160, 230)
        for ang in range(0, 360, 60):
            rad = math.radians(ang)
            ex = x + size * math.cos(rad)
            ey = y + size * math.sin(rad)
            draw.line([x, y, ex, ey], fill=(255, 255, 255, alpha), width=2)
    return img


def draw_brand_bar(draw, label_top="BROTHER vs SISTER", label_bot="弟弟打姐姐 · 微信搜「弟弟打姐姐」"):
    bar_h = 100
    draw.rectangle([0, H - bar_h, W, H], fill=BRAND_BG)
    f_top = ImageFont.truetype(FONT_HELV, 28)
    bbox = draw.textbbox((0, 0), label_top, font=f_top)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H - bar_h + 18), label_top,
              fill=(241, 196, 15), font=f_top)
    f_bot = ImageFont.truetype(FONT_HEI_BOLD, 34)
    bbox = draw.textbbox((0, 0), label_bot, font=f_bot)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H - bar_h + 52), label_bot,
              fill=WHITE, font=f_bot)


def draw_title(draw, title, sub, y_title, y_sub, color=DARK, sub_color=GRAY,
               title_size=130, sub_size=58):
    f_title = ImageFont.truetype(FONT_HEI_BOLD, title_size)
    f_sub = ImageFont.truetype(FONT_HEI_LIGHT, sub_size)
    bbox = draw.textbbox((0, 0), title, font=f_title)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, y_title), title, fill=color, font=f_title)
    bbox = draw.textbbox((0, 0), sub, font=f_sub)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, y_sub), sub, fill=sub_color, font=f_sub)


def draw_emoji_center(draw, emoji, y):
    f_emoji = ImageFont.truetype(FONT_EMOJI, EMOJI_SIZE)
    bbox = draw.textbbox((0, 0), emoji, font=f_emoji)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, y), emoji, font=f_emoji)


def draw_corner_badge(draw, text, x, y, color):
    f = ImageFont.truetype(FONT_HEI_BOLD, 36)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0] + 40
    th = 60
    draw.rounded_rectangle([x, y, x + tw, y + th], radius=30, fill=color)
    draw.text((x + 20, y + 8), text, fill=WHITE, font=f)


def card_bg(seed):
    img = gradient_bg(W, H, SKY_TOP, SKY_BOT)
    draw_snow(img, count=70, seed=seed)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle([0, 0, W, 14], fill=ACCENT_BLUE)
    return img, draw


def make_card_01():
    """图 1：核心玩法 / 钩子"""
    img, draw = card_bg(seed=1)
    draw_corner_badge(draw, "第 1 关 → 第 10 关", 60, 60, ACCENT_RED)
    draw_title(draw, "10 关递进",
               "从偷偷靠近 → 姐姐 4 倍速暴走", y_title=200, y_sub=340,
               color=ACCENT_RED, title_size=150)
    draw_emoji_center(draw, "⏰", 470)
    f_mid = ImageFont.truetype(FONT_HEI_BOLD, 60)
    msgs = ["第 1 关 🟢 教学关", "第 5 关 🟡 双倍弹幕", "第 10 关 🔴 姐姐暴走 4x"]
    for i, m in enumerate(msgs):
        bbox = draw.textbbox((0, 0), m, font=f_mid)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 760 + i * 60), m, fill=DARK, font=f_mid)
    draw_brand_bar(draw)
    return img


def make_card_02():
    """图 2：姐姐武器库"""
    img, draw = card_bg(seed=2)
    draw_corner_badge(draw, "姐の武器库", 60, 60, ACCENT_RED)
    draw_title(draw, "姐姐的武器库",
               "Sister's Arsenal", y_title=200, y_sub=340,
               color=ACCENT_RED, title_size=140)
    weapons = ["🩴", "📓", "🪒", "🛏️"]
    labels = ["拖鞋", "笔记本", "痒痒挠", "抱枕"]
    f_lab = ImageFont.truetype(FONT_HEI_BOLD, 42)
    f_big = ImageFont.truetype(FONT_EMOJI, 160)
    box_w = W // 4
    for i, (e, l) in enumerate(zip(weapons, labels)):
        cx = box_w * i + box_w // 2
        bbox = draw.textbbox((0, 0), e, font=f_big)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, 500), e, font=f_big)
        bbox = draw.textbbox((0, 0), l, font=f_lab)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, 700), l, fill=DARK, font=f_lab)
    f_mid = ImageFont.truetype(FONT_HEI_BOLD, 50)
    msg = "⚠️  还会翻滚攻击  ⚠️"
    bbox = draw.textbbox((0, 0), msg, font=f_mid)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 830), msg, fill=ACCENT_RED, font=f_mid)
    draw_brand_bar(draw)
    return img


def make_card_03():
    """图 3：弟弟道具"""
    img, draw = card_bg(seed=3)
    draw_corner_badge(draw, "弟の道具箱", 60, 60, ACCENT_BLUE)
    draw_title(draw, "弟弟的道具",
               "Little Brother's Toolkit", y_title=200, y_sub=340,
               color=ACCENT_BLUE, title_size=140)
    items = ["❄️", "🧸", "👟", "🧙"]
    labels = ["雪球", "玩具熊", "加速鞋", "隐身"]
    f_lab = ImageFont.truetype(FONT_HEI_BOLD, 42)
    f_big = ImageFont.truetype(FONT_EMOJI, 160)
    box_w = W // 4
    for i, (e, l) in enumerate(zip(items, labels)):
        cx = box_w * i + box_w // 2
        bbox = draw.textbbox((0, 0), e, font=f_big)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, 500), e, font=f_big)
        bbox = draw.textbbox((0, 0), l, font=f_lab)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, 700), l, fill=DARK, font=f_lab)
    f_mid = ImageFont.truetype(FONT_HEI_BOLD, 50)
    msg = "🛡️ 盾牌  🧲 磁铁  🥷 隐身披风  ……"
    bbox = draw.textbbox((0, 0), msg, font=f_mid)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 830), msg, fill=ACCENT_BLUE, font=f_mid)
    draw_brand_bar(draw)
    return img


def make_card_04():
    """图 4：免费开源"""
    img, draw = card_bg(seed=4)
    draw_corner_badge(draw, "100% FREE", 60, 60, ACCENT_GREEN)
    draw_title(draw, "完全免费 · 开源",
               "Open Source · MIT License", y_title=200, y_sub=340,
               color=ACCENT_GREEN, title_size=130)
    draw_emoji_center(draw, "🎮", 470)
    f_mid = ImageFont.truetype(FONT_HEI_BOLD, 56)
    lines = [
        "✔  浏览器打开即玩",
        "✔  无需下载 / 无需登录",
        "✔  键盘 / 触屏双支持",
        "✔  源码 GitHub 公开",
    ]
    for i, m in enumerate(lines):
        bbox = draw.textbbox((0, 0), m, font=f_mid)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 760 + i * 56), m, fill=DARK, font=f_mid)
    draw_brand_bar(draw)
    return img


def make_card_05():
    """图 5：3 分钟解压"""
    img, draw = card_bg(seed=5)
    draw_corner_badge(draw, "解压神器", 60, 60, ACCENT_YELLOW)
    draw_title(draw, "3 分钟一局",
               "周末解压 · 排队神器", y_title=200, y_sub=340,
               color=ACCENT_YELLOW, title_size=150)
    draw_emoji_center(draw, "😆", 470)
    f_mid = ImageFont.truetype(FONT_HEI_BOLD, 56)
    lines = [
        "🚌 公交车上能玩一局",
        "🍜 等外卖时能玩一局",
        "🛋️ 沙发上躺玩一局",
        "💼 上班摸鱼来来一局",
    ]
    for i, m in enumerate(lines):
        bbox = draw.textbbox((0, 0), m, font=f_mid)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 760 + i * 56), m, fill=DARK, font=f_mid)
    draw_brand_bar(draw)
    return img


def make_card_06():
    """图 6：CTA 行动召唤"""
    img, draw = card_bg(seed=6)
    draw_corner_badge(draw, "NOW PLAYING", 60, 60, ACCENT_RED)
    draw_title(draw, "来打一架？",
               "Challenge Your Sibling", y_title=200, y_sub=340,
               color=ACCENT_RED, title_size=160)
    draw_emoji_center(draw, "👫", 470)
    f_big = ImageFont.truetype(FONT_HEI_BOLD, 78)
    f_small = ImageFont.truetype(FONT_HEI_LIGHT, 48)
    msg = "👉  opc007.github.io/didifanji-game"
    bbox = draw.textbbox((0, 0), msg, font=f_big)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 780), msg, fill=ACCENT_BLUE, font=f_big)
    msg2 = "微信扫码 / 链接直达 · 打通关的来报分"
    bbox = draw.textbbox((0, 0), msg2, font=f_small)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 880), msg2, fill=GRAY, font=f_small)
    draw_brand_bar(draw)
    return img


if __name__ == "__main__":
    cards = [
        ("01-ten-levels.png", make_card_01),
        ("02-sister-weapons.png", make_card_02),
        ("03-brother-tools.png", make_card_03),
        ("04-free-open.png", make_card_04),
        ("05-stress-relief.png", make_card_05),
        ("06-cta.png", make_card_06),
    ]
    for filename, fn in cards:
        img = fn()
        out_path = os.path.join(OUT_DIR, filename)
        img.save(out_path, "PNG", optimize=True)
        size = os.path.getsize(out_path)
        print(f"  ✅ {filename}  {img.size}  {size / 1024:.1f} KB")
    print(f"\n🎉 6 张图已生成到 {OUT_DIR}")
