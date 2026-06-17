# 关卡长图标注说明

这个目录保存《弟弟反击战》的主线关卡概念长图。每张图都是横版卷轴地图参考，用于后续拆分 Tiled 地图、碰撞层、障碍层、敌人刷点和道具摆放。

代码调用请优先读取：

- `assets/concepts/levels/level-maps-manifest.json`

命名规则：

```text
level-<关卡编号>-map-v<版本>.png
```

关卡清单：

| 关卡 | 图片 | Asset Key | 主题 | 玩法重点 |
|---|---|---|---|---|
| Level 01 | `level-01-map-v1.png` | `concept_level_01_home_tutorial` | 家庭路线 | 低台阶、沙发平台、桌面跳跃、阳台终点 |
| Level 02 | `level-02-map-v1.png` | `concept_level_02_school_crosswalk` | 放学路 | 路沿跳跃、交通灯、移动斑马线平台 |
| Level 03 | `level-03-map-v1.png` | `concept_level_03_bus_stop_soundwave` | 公交站 | 长椅平台、站牌高台、音波躲避 |
| Level 04 | `level-04-map-v1.png` | `concept_level_04_sofa_bounce` | 客厅 | 沙发垫弹跳、抱枕坑、玩具车障碍 |
| Level 05 | `level-05-map-v1.png` | `concept_level_05_classroom_homework` | 教室 | 课桌平台、椅子连跳、黑板擦移动平台 |
| Level 06 | `level-06-map-v1.png` | `concept_level_06_playground` | 小区花园 | 滑梯加速、跷跷板弹跳、秋千时机跳 |
| Level 07 | `level-07-map-v1.png` | `concept_level_07_supermarket` | 超市 | 货架平台、购物车移动平台、冰柜滑行 |
| Level 08 | `level-08-map-v1.png` | `concept_level_08_bathroom_bubbles` | 浴室 | 泡泡浮台、水流推动、毛巾摆荡 |
| Level 09 | `level-09-map-v1.png` | `concept_level_09_dream_sky` | 梦境星空 | 低重力、枕头云、漂浮平台 |
| Level 10 | `level-10-map-v1.png` | `concept_level_10_final_bedroom` | 最终混合关 | 前面机关混合、Boss 入口、综合挑战 |

开发注意：

- 这些图片是概念图，不直接等同于最终碰撞地图。
- 正式开发时需要按图重新拆出 `background`、`collision`、`hazards`、`objects` 图层。
- `assetKey` 用于 Phaser 预加载或编辑器索引，正式关卡 JSON 可以沿用相同编号。
