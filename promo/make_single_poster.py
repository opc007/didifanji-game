#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
制作《弟弟打姐姐》单张朋友圈宣传海报
1080x1080 正方形格式，效果要吸睛
"""
from PIL import Image, ImageDraw, ImageFont
import os
import random

# 目录设置
OUT_DIR = "/Users/ahs/Documents/姐弟游戏/promo"
DESKTOP_PATH = "/Users/ahs/Desktop/《弟弟打姐姐》朋友圈海报.png"

def create_poster():
    """创建主海报"""
    width, height = 1080, 1080
    
    # 配色方案：温暖可爱的色调
    colors = {
        'gradient_start': (255, 245, 230),  # 温暖的米色
        'gradient_end': (255, 235, 200),    # 浅橙色调
        'snow_highlight': (255, 255, 255),  # 白色高光
        'accent_red': (255, 107, 107),      # 鲜艳红色
        'accent_blue': (78, 205, 196),      # 青绿色
        'accent_yellow': (255, 206, 84),    # 明亮黄色
        'text_dark': (51, 51, 51),          # 深灰色文字
        'text_light': (102, 102, 102),      # 浅灰色文字
    }
    
    # 创建渐变背景
    def create_gradient():
        img = Image.new('RGB', (width, height), colors['gradient_start'])
        draw = ImageDraw.Draw(img)
        
        # 绘制渐变背景
        for y in range(height):
            t = y / height
            r = int(colors['gradient_start'][0] * (1 - t) + colors['gradient_end'][0] * t)
            g = int(colors['gradient_start'][1] * (1 - t) + colors['gradient_end'][1] * t)
            b = int(colors['gradient_start'][2] * (1 - t) + colors['gradient_end'][2] * t)
            
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        return img, draw
    
    # 添加雪花装饰
    def add_snowflakes(draw, count=80):
        random.seed(42)
        for _ in range(count):
            x = random.randint(20, width - 20)
            y = random.randint(20, height - 20)
            size = random.randint(2, 6)
            opacity = random.randint(150, 255)
            
            # 绘制雪花
            draw.ellipse([
                x - size//2, y - size//2,
                x + size//2, y + size//2
            ], fill=(*colors['snow_highlight'], opacity))
    
    # 创建基础图像
    img, draw = create_gradient()
    draw_rgba = ImageDraw.Draw(img, 'RGBA')
    
    # 添加雪花背景
    add_snowflakes(draw_rgba)
    
    # 加载字体（尝试多种字体回退）
    def load_font(size, bold=False):
        fonts_to_try = [
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/STSong.ttf",
            "/System/Library/Fonts/AppleSDGothicNeo.ttc"
        ]
        
        for font_path in fonts_to_try:
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue
        
        # 如果都失败，返回默认字体
        try:
            return ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", size)
        except:
            return ImageFont.load_default()
    
    # 绘制文字
    def draw_text_centered(text, y, font, color, stroke_width=0, stroke_color=None):
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            
            if stroke_width > 0 and stroke_color:
                # 绘制描边
                for dx in range(-stroke_width, stroke_width + 1):
                    for dy in range(-stroke_width, stroke_width + 1):
                        if dx != 0 or dy != 0:
                            draw.text((x + dx, y + dy), text, font=font, fill=stroke_color)
            
            # 绘制主文字
            draw.text((x, y), text, font=font, fill=color)
        except Exception as e:
            print(f"绘制文字失败: {e}")
    
    # === 开始绘制海报内容 ===
    
    # 1. 主标题区域
    title_font = load_font(120, bold=True)
    draw_text_centered("弟弟打姐姐", 180, title_font, colors['text_dark'], 3, colors['snow_highlight'])
    
    # 2. 副标题
    subtitle_font = load_font(48)
    draw_text_centered("Brother vs Sister", 320, subtitle_font, colors['text_light'])
    
    # 3. 中央游戏预览区域
    preview_y = 400
    
    # 绘制游戏场景模拟
    scene_bg = Image.new('RGB', (600, 200), (*colors['snow_highlight'], 200))
    scene_draw = ImageDraw.Draw(scene_bg, 'RGBA')
    
    # 简单的游戏场景表示
    scene_center_x = 300
    scene_center_y = 100
    
    # 弟弟 (左侧)
    scene_draw.ellipse([scene_center_x-200, scene_center_y-40, scene_center_x-180, scene_center_y-20], 
                       fill=colors['accent_blue'])
    scene_draw.text((scene_center_x-220, scene_center_y-10), "👦", font=load_font(30))
    
    # 雪球 (中间)
    for i in range(3):
        offset = i * 25
        scene_draw.ellipse([scene_center_x-100+offset, scene_center_y-25, 
                           scene_center_x-80+offset, scene_center_y-5], 
                          fill=colors['snow_highlight'])
    
    # 姐姐 (右侧)
    scene_draw.ellipse([scene_center_x+180, scene_center_y-40, scene_center_x+200, scene_center_y-20], 
                       fill=colors['accent_red'])
    scene_draw.text((scene_center_x+200, scene_center_y-10), "👧", font=load_font(30))
    
    # 姐姐的武器
    weapons = ["🩴", "📚", "🪮"]
    for i, weapon in enumerate(weapons):
        scene_draw.text((scene_center_x+120-i*30, scene_center_y-30), weapon, 
                       font=load_font(20))
    
    # 将场景放入海报
    img.paste(scene_bg, (width//2 - 300, preview_y), scene_bg if scene_bg.mode == 'RGBA' else None)
    
    # 4. 特色标签区域
    tags_y = 620
    tag_font = load_font(52, bold=True)
    
    tags = [
        ("🎯 10关递进", "教学→4倍速暴走"),
        ("🩴 姐姐武器库", "拖鞋笔记本痒痒挠"),
        ("🧸 六大道具", "雪球加速鞋隐身术"),
        ("⚡ 3分钟一局", "解压神器·排队能玩")
    ]
    
    # 第一行标签
    line1 = f"{tags[0][0]} {tags[0][1]}"
    line2 = f"{tags[1][0]} {tags[1][1]}"
    draw_text_centered(line1, tags_y, tag_font, colors['accent_red'])
    draw_text_centered(line2, tags_y + 70, tag_font, colors['accent_blue'])
    
    # 第二行标签
    line3 = f"{tags[2][0]} {tags[2][1]}"
    line4 = f"{tags[3][0]} {tags[3][1]}"
    draw_text_centered(line3, tags_y + 150, tag_font, colors['accent_yellow'])
    draw_text_centered(line4, tags_y + 220, tag_font, colors['accent_red'])
    
    # 5. CTA行动召唤区域
    cta_y = 900
    cta_font = load_font(60, bold=True)
    link_font = load_font(40)
    
    draw_text_centered("开始游戏 →", cta_y, cta_font, colors['text_dark'], 2, colors['snow_highlight'])
    draw_text_centered("opc007.github.io/didifanji-game", cta_y + 80, link_font, colors['accent_blue'])
    
    # 6. 装饰元素
    # 添加彩色圆点装饰
    decorative_colors = [colors['accent_red'], colors['accent_blue'], colors['accent_yellow']]
    
    for i, color in enumerate(decorative_colors):
        x_pos = 80 + i * 50
        y_pos = 80
        draw.ellipse([x_pos, y_pos, x_pos + 20, y_pos + 20], fill=color)
        
        x_pos = width - 80 - i * 50
        y_pos = height - 100
        draw.ellipse([x_pos, y_pos, x_pos + 20, y_pos + 20], fill=color)
    
    # 添加边框
    draw.rectangle([10, 10, width-10, height-10], outline=colors['accent_blue'], width=3)
    
    return img

if __name__ == "__main__":
    print("🎨 正在制作《弟弟打姐姐》朋友圈宣传海报...")
    
    try:
        # 创建海报
        poster = create_poster()
        
        # 保存到项目目录
        poster_path = os.path.join(OUT_DIR, "朋友圈主海报.png")
        poster.save(poster_path, "PNG", optimize=True, quality=95)
        
        # 复制到桌面
        poster.save(DESKTOP_PATH, "PNG", optimize=True, quality=95)
        
        # 获取文件大小
        poster_size = os.path.getsize(DESKTOP_PATH) / 1024
        
        print(f"✅ 海报制作完成！")
        print(f"📱 尺寸: {poster.size[0]} x {poster.size[1]} (正方形)")
        print(f"💾 文件大小: {poster_size:.1f} KB")
        print(f"📁 位置: 桌面 '《弟弟打姐姐》朋友圈海报.png'")
        print(f"\n🚀 发布建议:")
        print("   ① 直接点击桌面文件打开")
        print("   ② 在朋友圈选择此图片")
        print("   ③ 配文: '给我弟做了个超解压小游戏！10关雪球大战，最后一关姐姐4倍速暴走😂 免费的，快来试试！'")
        
    except Exception as e:
        print(f"❌ 制作失败: {e}")
        if "fatal" in str(e).lower():
            print("💡 提示: 可能是字体文件问题，请检查系统字体")