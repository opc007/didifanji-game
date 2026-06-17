# 角色图片调用说明

本目录保存《弟弟反击战》当前已设计好的角色图片。游戏开发时优先读取 `manifest.json`，按 `id` / `preloadKey` 加载透明 PNG。

## 目录

- `png/`：游戏运行时直接调用的透明 PNG。
- `source_chroma/`：绿幕源图，仅用于重新抠图或后续修图。
- `character-preview.jpg`：带中文/英文标注的角色总览预览图，不用于游戏运行。
- `manifest.json`：角色图片清单，包含调用 key、中文名、路径、尺寸、建议缩放和触发时机。

## 当前角色资产

| preloadKey | 中文名 | 角色类型 | 触发/用途 | 尺寸 | 运行时路径 |
|---|---|---|---|---:|---|
| `brother_player` | 弟弟玩家 | player | 默认玩家角色 | 649x1149 | `assets/characters/png/brother_player.png` |
| `brother_cry_defeat` | 弟弟失败哭哭 | ending_state | `player_health_zero` | 818x993 | `assets/characters/png/brother_cry_defeat.png` |
| `sister_small` | 姐姐小怪 | enemy | 基础巡逻敌人 | 610x1033 | `assets/characters/png/sister_small.png` |
| `sister_headphone` | 耳机姐姐 | enemy | 发音波敌人 | 561x995 | `assets/characters/png/sister_headphone.png` |
| `sister_balloon` | 气球姐姐 | enemy | 空中漂浮敌人 | 725x935 | `assets/characters/png/sister_balloon.png` |
| `sister_pipe` | 管道姐姐 | enemy | 管道探头机关敌人 | 663x1004 | `assets/characters/png/sister_pipe.png` |
| `sister_boss` | Boss 姐姐 | boss | 关卡 Boss 正常形态 | 1029x1025 | `assets/characters/png/sister_boss.png` |
| `sister_cry_defeated` | 姐姐失败哭哭 | ending_state | `sister_or_boss_defeated` | 728x989 | `assets/characters/png/sister_cry_defeated.png` |

## Phaser 加载示例

```js
import characterManifest from './assets/characters/manifest.json';

function preloadCharacters(scene) {
  for (const asset of characterManifest.assets) {
    scene.load.image(asset.preloadKey, asset.path);
  }
}
```

结束状态调用建议：

- 弟弟血量归零时，将玩家贴图切换为 `brother_cry_defeat`。
- 姐姐小怪或 Boss 被最终击败时，将姐姐贴图切换为 `sister_cry_defeated`。
