#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为《弟弟打姐姐》朋友圈宣传生成主海报
专门用于朋友圈发布的主视觉图，1080x1080
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = "/Users/ahs/Documents/姐弟游戏/promo/friendcircle"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_HEI_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_HEI_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_EMOJI = "/System/Library/Fonts/Apple Color Emoji.ttc"

W, H = 1080, 1080

# 色彩方案
SKY_TOP = (184, 212, 232)  # 天蓝色顶部
SKY_BOT = (240, 248, 255)  # 雪白色底部
ACCENT_RED = (231, 76, 60)   # 红色强调
ACCENT_BLUE = (52, 152, 219) # 蓝色强调
ACCENT_YELLOW = (241, 196, 15) # 黄色强调
DARK = (44, 62, 80)
GRAY = (127, 140, 141)
WHITE = (255, 255, 255)

def gradient_bg(width, height, top, bot):
    """创建渐变背景"""
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

def draw_snow_effect(draw, count=120):
    """绘制雪花效果"""
    import random
    random.seed(42)
    for _ in range(count):
        x = random.randint(0, W)
        y = random.randint(0, H)
        size = random.randint(2, 6)
        draw.ellipse([x, y, x + size, y + size], fill=WHITE)

def draw_hero_card():
    """主海报 - 朋友圈发布的头图"""
    
    # 创建渐变背景
    img = gradient_bg(W, H, SKY_TOP, SKY_BOT)
    draw = ImageDraw.Draw(img, "RGBA")
    
    # 添加雪花效果
    draw_snow_effect(draw)
    
    # 画顶部品牌条
    draw.rectangle([0, 0, W, 20], fill=ACCENT_RED)
    
    # 主标题
    try:
        f_title = ImageFont.truetype(FONT_HEI_BOLD, 120)
        title = "弟弟打姐姐"
        bbox = draw.textbbox((0, 0), title, font=f_title)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 180), title, fill=DARK, font=f_title)
    except:
        print("字体加载失败，使用备用字体")
    
    # 副标题
    f_subtitle = ImageFont.truetype(FONT_HEI_LIGHT, 60)
    subtitle = "Brother vs Sister"
    bbox = draw.textbbox((0, 0), subtitle, font=f_subtitle)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 320), subtitle, fill=GRAY, font=f_subtitle)
    
    # 中央装饰表情
    try:
        f_emoji = ImageFont.truetype(FONT_EMOJI, 180)
        emoji = "❄️🩴"
        bbox = draw.textbbox((0, 0), emoji, font=f_emoji)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 420), emoji, font=f_emoji)
    except:
        print("表情字体加载失败")
    
    # 特色说明
    f_feature = ImageFont.truetype(FONT_HEI_BOLD, 48)
    features = [
        "🎮 10关递进 · 从教学到4倍速暴走",
        "🩴 姐姐武器库 · 拖鞋笔记本痒痒挠", 
        "❄️ 六大道具 · 雪球玩具熊加速鞋",
        "⚡ 3分钟一局 · 周末解压神器"
    ]
    
    for i, feature in enumerate(features):
        bbox = draw.textbbox((0, 0), feature, font=f_feature)
        tw = bbox[2] - bbox[0]
        y_pos = 650 + i * 70
        draw.text(((W - tw) // 2, y_pos), feature, fill=DARK, font=f_feature)
    
    # 底部CTA
    f_cta = ImageFont.truetype(FONT_HEI_BOLD, 72)
    cta = "🎯 免费试玩 → opc007.github.io/didifanji-game"
    bbox = draw.textbbox((0, 0), cta, font=f_cta)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 950), cta, fill=ACCENT_BLUE, font=f_cta)
    
    # 添加装饰边框
    draw.rounded_rectangle([10, 10, W-10, H-10], radius=20, outline=ACCENT_RED, width=4)
    
    return img

if __name__ == "__main__":
    print("正在生成主海报...")
    hero_card = draw_hero_card()
    output_path = os.path.join(OUT_DIR, "00-hero-card.png")
    hero_card.save(output_path, "PNG", optimize=True)
    file_size = os.path.getsize(output_path) / 1024
    print(f"✅ 主海报已生成: {output_path}")
    print(f"   尺寸: {hero_card.size}")
    print(f"   文件大小: {file_size:.1f} KB")
    
    print("\n🎊 朋友圈发布建议:")
    print("📱 发布顺序:")
    print("   1. 先发布 '00-hero-card.png' 作为主图")
    print("   2. 再发布现有的6张系列图(01-06)")
    print("   3. 配文建议使用 'promo/social-posts.md' 中的版本")
    print("\n🎯 推荐配文:")
    print("   给我弟做了个小游戏《弟弟打姐姐》🤣")
    print("   10个关卡雪球大战拖鞋，最后一关姐姐4倍速暴走!")
    print("   免费开源，3分钟一局解压神器，快来试试!")
    print("   链接在评论区👇")