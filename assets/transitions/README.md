# 《弟弟反击战》过渡画面资产说明

本目录存放游戏开始、失败、胜利等状态切换时使用的全屏过渡图片。

## 文件结构

| 文件 | 标注 | 用途 |
|---|---|---|
| `start_screen.png` | 开始画面 / `start_screen` | 主菜单、首次点击开始前 |
| `game_over_screen.png` | 失败画面 / `game_over_screen` | 弟弟血量归零、哭哭重启前 |
| `victory_screen.png` | 胜利画面 / `victory_screen` | 通关、击败 Boss、进入下一关前 |
| `raw/start_background.png` | 开始画面无字底图 | 代码动态叠 UI 或多语言时使用 |
| `raw/game_over_background.png` | 失败画面无字底图 | 代码动态叠 UI 或多语言时使用 |
| `raw/victory_background.png` | 胜利画面无字底图 | 代码动态叠 UI 或多语言时使用 |
| `transitions-manifest.json` | 过渡画面调用清单 | Phaser 预加载和状态机读取 |
| `transitions-labeled-reference-v1.png` | 标注总览图 | 美术、策划、开发对照使用 |

## 调用约定

- 所有成品过渡图尺寸均为 `1920x1080`。
- 游戏运行时优先读取 `transitions-manifest.json`，不要在代码里手写零散路径。
- `image` 是已叠好中文标题和按钮提示的完整图，可直接用于 MVP。
- `background` 是无字底图，后续需要动态按钮、语言切换、动画 UI 时使用。
- `key` 可直接作为 Phaser texture key。

## 状态对应

| 状态 | 触发事件 | 图片 key | 音乐 key |
|---|---|---|---|
| 开始界面 | `enter_start_menu` | `start_screen` | `theme_brother` |
| 失败重启 | `player_health_zero` | `game_over_screen` | `jingle_game_over` |
| 通关胜利 | `stage_clear_or_boss_defeated` | `victory_screen` | `jingle_victory` |

## Phaser 预加载示例

```js
import transitionManifest from './assets/transitions/transitions-manifest.json';

function preloadTransitions(scene) {
  for (const transition of transitionManifest.transitions) {
    scene.load.image(transition.key, transition.image);
    scene.load.image(`${transition.key}_background`, transition.background);
  }
}
```
