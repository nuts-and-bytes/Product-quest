# 产品经理大冒险 · Product Quest

在 3D 开放群岛里探索、交谈和调查，用证据尝试解决问题，再观察选择带来的后果。原有产品经理剧情闯关仍可继续游玩。

[进入开放群岛](https://nuts-and-bytes.github.io/Product-quest/) · [继续八章岛上故事](https://nuts-and-bytes.github.io/Product-quest/?experience=chapters) · [在咖啡馆走走](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe-life) · [直接进入蓝山调查](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe) · [观看岛上清晨](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe&film=morning) · [版本记录](CHANGELOG.md) · [English](#english)

## 当前可以玩什么

| 入口 | 玩法 |
| --- | --- |
| 开放群岛 | 漫游星火岛、琥珀林地、星潮观测站与珊瑚花园；行走、交互、收集手记，查看章节成果 |
| 增长大陆 · 琥珀林地 | 在林间茶馆调查分群、首约漏斗、留存实验和渠道投放，按现场证据行动，观察结果并调整方案 |
| 设计大陆 · 珊瑚花园 | 和花房团队改进预约亭，走完现场观察、纸面原型、可用性测试和无障碍交付 |
| 入职第一天 | 创建角色，跟随引导进入总部与咖啡馆，继续原有序章 |
| 蓝山日常 · 3.10 | 点击地面、键盘或手机摇杆走动；绕过桌椅与人物，靠近交谈和全屏检视物件，发现明信片与留座支线，走到门口看海 |
| 蓝山调查 | 交谈、读取订单和现场线索，圈出依据，组合试营业方案，再比较结果与复盘 |
| 岛上的片刻 | 观看与调查状态关联的实时 3D 演出；可暂停、跳过或重看，结尾依据实际试验结果变化 |
| 周末夜市副本 · 3.8 | 和夏青摆摊：交换工作台、备货开价、接单制作交杯、中场调整；长凳或取餐架与人物记忆留在岛上，可回访、可继续经营 |
| 八章岛上故事 · 3.7 | 从纸信封、通勤班车到夜市值班、定价与天台复盘；在 8 个 3D 场景中交谈、查看实物、动手试验，后续回应实际留下的记录 |
| 原有章节练习 | 37 关均使用 3D 室内场景，原有剧情、决策题、术语、方法卡、评级与作品集继续保留 |

新故事以生活中的任务推进，原有 37 关可从建筑面板或完成页进入。截图目录同时保留版本演进中的画面，当前交互以在线版本为准。

## 第一次怎么玩

打开首页后创建角色或继续已有进度。电脑可用 WASD / 方向键行走、Shift 奔跑、E 互动、J 手记、H 取景；手机使用界面摇杆与触屏按钮。

跑图保持高视角，挡住主角和当前交互人物的建筑会局部让开。左上角任务卡可展开详情；右下角「视角」切换观察方式，「更多」打开画质、手记和存档等功能。

手机支持横屏游玩，旋转时保留当前进度；支持的浏览器可点「全屏」。横屏和桌面宽屏将对话放到人物侧边。章节证据可以靠近查看，第一章方案卡可直接在桌面上选择、替换和撤回，完整说明仍可展开阅读。

想直接试调查，可以打开蓝山调查入口。先看现场和交谈，再选择你想验证的猜测与试验。每个情境有行动和预算限制，阅读与整理不扣行动。周三早高峰和周末手冲日的瓶颈不同，没有跨情境通吃的方案。

完成第一天后，夏青会约你带着信封和收据去波波奶茶店。左上角每次只给出一处赴约地点。章节内可以交谈、读实物、排列流程、运行模拟、比较结果和留下复盘；失败也能继续。首次完成的决定会传到后续故事，回访练习不会改写它。也可以从[八章故事入口](https://nuts-and-bytes.github.io/Product-quest/?experience=chapters)接着当前存档玩。

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
- 咖啡馆使用确定性排队模型，后续八章使用各自的固定试验条件；顾客、生活与经营情境为虚构。没有联网 AI 评分，结果不是现实经营预测。
- 四块大陆均有可玩的课程。首页可直达增长或设计大陆，两地各有四章。每章收齐两处证据后可在工作台尝试三种方案，完成后可在章节目录回看结果或重玩。AI 大陆章节目录也可打开独立的第一人称博物馆。
- 自动画质会按帧耗时调整；低性能设备可选择流畅档。历史桌面验证不能替代真实手机验收，也不保证所有设备的帧率。
- 章节与调查是学习机制原型，尚不能据此声称已证明学习效果或真实工作能力。

## 代码与玩法说明

| 内容 | 入口 |
| --- | --- |
| 原有剧情与章节 | `engine.js`、`content/` |
| 群岛、导航与画质 | [开放世界说明](docs/open-world.md)、`assets/world-map.js`、`assets/island3d.js` |
| 户外镜头、遮挡与标签 | [户外可见性说明](docs/outdoor-visibility.md)、`assets/world-visibility.js`、`assets/world-framing.js` |
| 手机横屏与场景内道具 | [横屏与桌面卡片说明](docs/mobile-play.md)、`assets/mobile-play.js`、`assets/chapter-table.js` |
| 调查模型与预算 | [蓝山调查](docs/cafe-case.md)、`assets/cafe-case-state.js` |
| 阿晨交谈与线索 | [3D 对话说明](docs/cafe-dialogue.md) |
| 八章任务、存档与伏笔 | [岛上章节](docs/island-chapters.md)、`content/pm/island-chapters.js`、`assets/chapter-journey-state.js` |
| 任务关联演出 | [岛上的片刻](docs/island-life.md)、`assets/island-life-state.js` |

问题、玩法反馈或知识引用纠错可提交 [Issue](https://github.com/nuts-and-bytes/Product-quest/issues)。

## 许可

原有说明声明代码采用 MIT，剧情与知识内容采用 CC BY-NC 4.0。当前仓库没有独立 LICENSE 文件；维护者仍需补齐对应许可与第三方内容说明。本次不代选或更改许可。

## English

Product Quest combines an explorable 3D island world with product-decision gameplay. Explore, talk to characters, investigate the Blue Mountain café and compare deterministic experiments. Eight connected 3D chapters carry the café encounters into research, prototyping, technical failures, launches, growth, pricing and a final retrospective. Task-linked realtime scenes reflect the selected experiment; the 37 original lessons remain playable in 3D rooms.

[Play](https://nuts-and-bytes.github.io/Product-quest/) or [start the café investigation](https://nuts-and-bytes.github.io/Product-quest/?experience=cafe). Serve the repository with `python3 -m http.server 8765`; run existing checks with `node --test tests/*.test.cjs` and build the standalone HTML with `node scripts/build-single-html.mjs`.

Progress is browser-local; export before moving to another device or origin. The café is a fictional, simplified simulation, not a business forecast or validated learning-outcome claim. Performance depends on the device. The repository still needs standalone license files matching its stated code/content licenses.
