# 产品经理大冒险 · Product Quest

在 3D 开放群岛里探索、交谈和调查，用证据尝试解决问题，再观察选择带来的后果。原有产品经理剧情闯关仍可继续游玩。

[进入开放群岛](https://nuts-and-bytes.github.io/Product-quest/) · [直接进入蓝山调查](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe) · [观看岛上清晨](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe&film=morning) · [版本记录](CHANGELOG.md) · [English](#english)

## 当前可以玩什么

| 入口 | 玩法 |
| --- | --- |
| 开放群岛 | 漫游星火岛、琥珀林地、星潮观测站与珊瑚花园；行走、交互、收集手记，查看章节成果 |
| 入职第一天 | 创建角色，跟随引导进入总部与咖啡馆，继续原有序章 |
| 蓝山调查 | 交谈、读取订单和现场线索，圈出依据，组合试营业方案，再比较结果与复盘 |
| 岛上的片刻 · 3.6 | 观看与调查状态关联的实时 3D 演出；可暂停、跳过或重看，结尾依据实际试验结果变化 |
| 原有主线 | 保留从想法验证到商业化的章节、术语、方法卡、案例与作品集；未将全部章节改造成新调查玩法 |

这已经包含实时 3D 场景和人物交谈。旧像素剧情仍是产品的一部分，`screenshots/` 下的历史截图不能代表所有当前场景。

## 第一次怎么玩

打开首页后创建角色或继续已有进度。电脑可用 WASD / 方向键行走、Shift 奔跑、E 互动、J 手记、H 取景；手机使用界面摇杆与触屏按钮。

想直接试调查，可以打开蓝山调查入口。先看现场和交谈，再选择你想验证的猜测与试验。每个情境有行动和预算限制，阅读与整理不扣行动。周三早高峰和周末手冲日的瓶颈不同，没有跨情境通吃的方案。

## 本地运行与单文件版本

需要 Python 3；测试和打包还需要 Node.js。

```sh
git clone https://github.com/nuts-and-bytes/Product-quest.git
cd Product-quest
python3 -m http.server 8765
```

打开 <http://localhost:8765/>。可分别执行现有检查与打包：

```sh
node --test tests/*.test.cjs
node scripts/build-single-html.mjs
```

单文件产物为 `dist/Product-Quest.html`。打包工具内联本地脚本、样式和剧情，并移除远程统计；实际产物大小以本次构建为准。

## 存档、模型与边界

- 进度保存在当前浏览器；换设备、浏览器、域名或改用单文件版本前，先使用导出和导入存档。
- 咖啡馆使用确定性排队模型比较方案，顾客与经营情境为虚构。没有联网 AI 评分，结果不是现实经营预测。
- 当前是四岛连续区域，没有无限世界、联网多人或完整新增大陆课程。
- 自动画质会按帧耗时调整；低性能设备可选择流畅档。历史桌面验证不能替代真实手机验收，也不保证所有设备的帧率。
- 章节与调查是学习机制原型，尚不能据此声称已证明学习效果或真实工作能力。

## 代码与玩法说明

| 内容 | 入口 |
| --- | --- |
| 原有剧情与章节 | `engine.js`、`content/` |
| 群岛、导航与画质 | [开放世界说明](docs/open-world.md)、`assets/world-map.js`、`assets/island3d.js` |
| 调查模型与预算 | [蓝山调查](docs/cafe-case.md)、`assets/cafe-case-state.js` |
| 阿晨交谈与线索 | [3D 对话说明](docs/cafe-dialogue.md) |
| 任务关联演出 | [岛上的片刻](docs/island-life.md)、`assets/island-life-state.js` |

问题、玩法反馈或知识引用纠错可提交 [Issue](https://github.com/nuts-and-bytes/Product-quest/issues)。

## 许可

原有说明声明代码采用 MIT，剧情与知识内容采用 CC BY-NC 4.0。当前仓库没有独立 LICENSE 文件；维护者仍需补齐对应许可与第三方内容说明。本次不代选或更改许可。

## English

Product Quest combines an explorable 3D island world with product-decision gameplay. Explore, talk to characters, investigate the Blue Mountain café and compare deterministic experiments. Task-linked realtime scenes reflect the selected experiment; the original product-management chapters remain playable.

[Play](https://nuts-and-bytes.github.io/Product-quest/) or [start the café investigation](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe). Serve the repository with `python3 -m http.server 8765`; run existing checks with `node --test tests/*.test.cjs` and build the standalone HTML with `node scripts/build-single-html.mjs`.

Progress is browser-local; export before moving to another device or origin. The café is a fictional, simplified simulation, not a business forecast or validated learning-outcome claim. Performance depends on the device. The repository still needs standalone license files matching its stated code/content licenses.
