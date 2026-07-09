#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
制作简单的《弟弟打姐姐》朋友圈宣传视频
使用现有海报素材制作15秒介绍视频
"""
import subprocess
import os
from PIL import Image, ImageDraw, ImageFont
import tempfile

def create_simple_video():
    """创建简单视频"""
    print("🎬 正在制作《弟弟打姐姐》朋友圈宣传视频...")
    
    # 创建临时目录
    frames_dir = tempfile.mkdtemp()
    print(f"创建帧目录: {frames_dir}")
    
    # 视频设置
    fps = 24
    duration = 12  # 12秒
    width, height = 1080, 1080
    total_frames = fps * duration
    
    # 颜色搭配
    colors = {
        'bg_start': (255, 245, 230),
        'bg_end': (255, 235, 200),
        'red': (255, 107, 107),
        'blue': (78, 205, 196),
        'dark': (51, 51, 51),
        'white': (255, 255, 255)
    }
    
    def load_font(size):
        """加载字体"""
        fonts = [
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/AppleSDGothicNeo.ttc"
        ]
        for f in fonts:
            try:
                return ImageFont.truetype(f, size)
            except:
                continue
        return ImageFont.load_default()
    
    def create_gradient_bg():
        """创建渐变背景"""
        img = Image.new('RGB', (width, height), colors['bg_start'])
        draw = ImageDraw.Draw(img)
        
        for y in range(height):
            t = y / height
            r = int(colors['bg_start'][0] * (1 - t) + colors['bg_end'][0] * t)
            g = int(colors['bg_start'][1] * (1 - t) + colors['bg_end'][1] * t)
            b = int(colors['bg_start'][2] * (1 - t) + colors['bg_end'][2] * t)
            draw.line([(0, y), (width, y)], (r, g, b))
        
        return img, draw
    
    def draw_centered_text(img, text, y, font_size, color, stroke=False):
        """在图像中央绘制文字"""
        draw = ImageDraw.Draw(img)
        font = load_font(font_size)
        
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            x = (width - w) // 2
            
            if stroke:
                # 描边效果
                for dx in [-2, 0, 2]:
                    for dy in [-2, 0, 2]:
                        if dx != 0 or dy != 0:
                            draw.text((x + dx, y + dy), text, font=font, fill=colors['white'])
            
            draw.text((x, y), text, font=font, fill=color)
        except Exception as e:
            print(f"文字绘制警告: {e}")
    
    # 场景1: 标题动画 (0-3秒)
    title_frames = fps * 3
    for i in range(title_frames):
        img, draw = create_gradient_bg()
        
        # 计算动画进度
        progress = min(1.0, i / (title_frames * 0.6))
        alpha = int(255 * progress)
        
        # 添加透明遮罩
        if alpha < 255:
            mask = Image.new('RGBA', (width, height), (255, 255, 255, 255 - alpha))
            img.paste(mask, (0, 0), mask)
        
        # 标题文字
        draw_centered_text(img, "弟弟打姐姐", 300, 100, colors['red'], stroke=True)
        draw_centered_text(img, "Brother vs Sister", 420, 40, colors['dark'])
        
        # 添加表情符号
        draw_centered_text(img, "👦 ❄️ 👧", 550, 70, colors['dark'])
        
        # 保存帧
        frame_path = os.path.join(frames_dir, f"frame_{i:04d}.png")
        img.save(frame_path)
    
    # 场景2: 游戏特色 (3-8秒)
    feature_frames = fps * 5
    features = [
        ("🎯 10关递进难度", "从教学关到姐姐4倍速暴走"),
        ("🩴 姐姐武器库", "拖鞋、笔记本、痒痒挠齐上阵"),
        ("🧸 六大道具", "雪球、加速鞋、隐身披风"),
        ("⚡ 3分钟解压", "排队神器·快速一局")
    ]
    
    for scene_idx, (title, desc) in enumerate(features):
        start_frame = title_frames + scene_idx * (feature_frames // 4)
        scene_frames = feature_frames // 4
        
        for i in range(scene_frames):
            frame_idx = start_frame + i
            img, draw = create_gradient_bg()
            
            # 当前场景内容
            draw_centered_text(img, title, 350, 60, colors['blue'])
            draw_centered_text(img, desc, 450, 40, colors['dark'])
            
            # 场景特定的图标动画
            if scene_idx == 0:  # 关卡进度
                levels = "🟢 教学关 → 🟡 进阶关 → 🔴 暴走关"
                draw_centered_text(img, levels, 550, 35, colors['dark'])
            elif scene_idx == 1:  # 姐姐武器
                weapons = "🩴 拖鞋  📚 笔记本  🪮 痒痒挠"
                draw_centered_text(img, weapons, 550, 35, colors['dark'])
            elif scene_idx == 2:  # 弟弟道具
                tools = "❄️ 雪球  👟 加速鞋  🥷 隐身披风"
                draw_centered_text(img, tools, 550, 35, colors['dark'])
            else:  # 游戏特点
                tags = "完全免费  开源项目  网页即玩"
                draw_centered_text(img, tags, 550, 35, colors['dark'])
            
            # 保存帧
            frame_path = os.path.join(frames_dir, f"frame_{frame_idx:04d}.png")
            img.save(frame_path)
    
    # 场景3: CTA行动召唤 (8-12秒)
    cta_frames = fps * 4
    cta_start = title_frames + feature_frames
    
    for i in range(cta_frames):
        frame_idx = cta_start + i
        img, draw = create_gradient_bg()
        
        # CTA内容
        draw_centered_text(img, "来和弟弟一起战斗！", 350, 60, colors['red'], stroke=True)
        draw_centered_text(img, "opc007.github.io/didifanji-game", 450, 45, colors['blue'])
        draw_centered_text(img, "🔥 免费开源 · 3分钟一局", 550, 40, colors['dark'])
        
        # 添加装饰元素
        draw_centered_text(img, "👇 点击开始游戏 👇", 650, 40, colors['blue'])
        
        # 保存帧
        frame_path = os.path.join(frames_dir, f"frame_{frame_idx:04d}.png")
        img.save(frame_path)
    
    print(f"✅ 已创建 {total_frames} 帧画面")
    
    # 创建视频
    output_path = "/Users/ahs/Desktop/《弟弟打姐姐》朋友圈宣传视频.mp4"
    
    ffmpeg_cmd = [
        'ffmpeg', '-y',
        '-framerate', str(fps),
        '-i', os.path.join(frames_dir, 'frame_%04d.png'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '23',
        '-r', str(fps),
        output_path
    ]
    
    print("🎥 正在生成视频文件...")
    try:
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        if result.returncode == 0:
            # 获取文件大小
            file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
            print(f"✅ 视频制作成功!")
            print(f"📱 时长: {duration}秒")
            print(f"📐 分辨率: {width}x{height}")
            print(f"💾 文件大小: {file_size:.2f}MB")
            print(f"📁 位置: {output_path}")
            return True
        else:
            print(f"❌ 视频生成失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ 视频生成异常: {e}")
        return False

if __name__ == "__main__":
    success = create_simple_video()
    if success:
        print("\n🎊 现在可以打开朋友圈宣传视频了！")
        print("💡 在微信中分享时，视频会自动播放前几秒")
    else:
        print("\n🎯 建议：先用海报发布，视频可以后续添加")