# 《弟弟反击战》道具图片资源

## 目录说明

- `png/`：512x512 独立道具图，适合关卡掉落物、拾取提示、大图预览。
- `icons-128/`：128x128 HUD 小图标，适合顶部道具栏、背包格、按钮图标。
- `concepts/props-concept-sheet-v1.png`：10 个道具的原始概念总览图。
- `concepts/props-split-preview-v1.png`：拆分后预览图。
- `concepts/props-labeled-reference-v1.png`：带中文名和代码 id 的标注图。
- `items-manifest.json`：开发调用用的道具配置索引。

## 代码 id 对照

| 中文名 | 代码 id | 512 图 | HUD 图标 |
|---|---|---|---|
| 火球糖 | `fireball_candy` | `assets/items/png/fireball_candy.png` | `assets/items/icons-128/fireball_candy.png` |
| 玩具锤 | `toy_hammer` | `assets/items/png/toy_hammer.png` | `assets/items/icons-128/toy_hammer.png` |
| 跳跳鞋 | `bouncy_shoes` | `assets/items/png/bouncy_shoes.png` | `assets/items/icons-128/bouncy_shoes.png` |
| 星星披风 | `star_cape` | `assets/items/png/star_cape.png` | `assets/items/icons-128/star_cape.png` |
| 泡泡盾 | `bubble_shield` | `assets/items/png/bubble_shield.png` | `assets/items/icons-128/bubble_shield.png` |
| 回旋玩具 | `boomerang_toy` | `assets/items/png/boomerang_toy.png` | `assets/items/icons-128/boomerang_toy.png` |
| 爆米花炸弹 | `popcorn_bomb` | `assets/items/png/popcorn_bomb.png` | `assets/items/icons-128/popcorn_bomb.png` |
| 飞行帽 | `flying_cap` | `assets/items/png/flying_cap.png` | `assets/items/icons-128/flying_cap.png` |
| 冰淇淋枪 | `ice_cream_blaster` | `assets/items/png/ice_cream_blaster.png` | `assets/items/icons-128/ice_cream_blaster.png` |
| 变大饼干 | `giant_cookie` | `assets/items/png/giant_cookie.png` | `assets/items/icons-128/giant_cookie.png` |

## 调用建议

- 关卡掉落物：优先使用 `image` 字段，对应 512x512 PNG。
- HUD 道具栏：优先使用 `hudIcon` 字段，对应 128x128 PNG。
- 玩法配置：优先读取 `items-manifest.json`，不要在代码里散落硬编码路径。
- 资源 id：统一使用英文 snake_case，不再使用旧名 `fire_candy`。
