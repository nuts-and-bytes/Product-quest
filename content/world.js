/* ============================================================
   content/world.js — 世界与人物注册表
   包含：NPC 像素精灵、星火市建筑、着陆页痛点轮播
   （世界地图 SVG 图形位于 index.html）
============================================================ */

/* NPC 精灵（16x24，字符=调色板颜色，见 engine.js 的 PAL） */
Object.assign(PQ.sprites, {
  boss: [
  "0000KKKKKKKK0000","000KggggggggK000","00KggggggggggK00","00KggSSSSSSggK00",
  "00KSSSSSSSSSSK00","00KSKKSSSSKKSK00","00KSSSSSSSSSSK00","00KSShKKKKhSSK00",
  "000KSSSSSSSSK000","0000KKKKKKKK0000","000KRRRWWRRRK000","00KRRRRWWRRRRK00",
  "0KSRRRRKKRRRRSK0","0KSRRRRWWRRRRSK0","0KSRRRRRRRRRRSK0","0KKRRRRRRRRRRKK0",
  "00KRRRRRRRRRRK00","00KRRRRRRRRRRK00","000KKKKKKKKKK000","000Khhh00hhhK000",
  "000KhhhK0KhhhK00","000KhhhK0KhhhK00","00KKKKK00KKKKK00","0000000000000000"],
  xiaomei: [
  "0000KKKKKKKK0000","000KHHHHHHHHK000","00KHHHHHHHHHHK00","0KHHSSSSSSSSHHK0",
  "0KHSSSSSSSSSSHK0","0KHSKKSSSSKKSHK0","0KHSSSSSSSSSSHK0","0KHSSSKSSKSSSHK0",
  "0KHHSSSKKSSSHHK0","0KHHKKKKKKKKHHK0","0KHHGGGGGGGGHHK0","0KHGGGGGGGGGGHK0",
  "0KSGGGGGGGGGGSK0","0KSGGGYYYYGGGSK0","0KSGGGGGGGGGGSK0","0KKGGGGGGGGGGKK0",
  "00KGGGGGGGGGGK00","00KGGGGGGGGGGK00","000KKKKKKKKKK000","000KWWW00WWWK000",
  "000KWWWK0KWWWK00","000KWWWK0KWWWK00","00KKKKK00KKKKK00","0000000000000000"],
  lijie: [
  "0000KKKKKKKK0000","000KhhhhhhhhK000","00KhhhhhhhhhhK00","00KhhSSSSSShhK00",
  "00KSSSSSSSSSSK00","00KKKKSSSSKKKK00","00KSKKSSSSKKSK00","00KSSSKSSKSSSK00",
  "000KSSSKKSSSK000","0000KKKKKKKK0000","000KPPPPPPPPK000","00KPPPPPPPPPPK00",
  "0KSPPPPPPPPPPSK0","0KSPPPYYYYPPPSK0","0KSPPPPPPPPPPSK0","0KKPPPPPPPPPPKK0",
  "00KPPPPPPPPPPK00","00KPPPPPPPPPPK00","000KKKKKKKKKK000","000Khhh00hhhK000",
  "000KhhhK0KhhhK00","000KhhhK0KhhhK00","00KKKKK00KKKKK00","0000000000000000"]
});

/* 新NPC模板（M1 章节将启用） */
Object.assign(PQ.sprites, {
  akai: [ // 工程师阿凯：灰色连帽衫
  "0000KKKKKKKK0000","000KhhhhhhhhK000","00KhhhhhhhhhhK00","00KhhSSSSSShhK00",
  "00KSSSSSSSSSSK00","00KSKKSSSSKKSK00","00KSSSSSSSSSSK00","00KSSSKSSKSSSK00",
  "000KSSSKKSSSK000","0000KKKKKKKK0000","000KggggggggK000","00KggggggggggK00",
  "0KSggggggggggSK0","0KSgggKKKKgggSK0","0KSggggggggggSK0","0KKggggggggggKK0",
  "00KggggggggggK00","00KggggggggggK00","000KKKKKKKKKK000","000Khhh00hhhK000",
  "000KhhhKKhhhK000","000KhhhK0KhhhK00","00KKKKK00KKKKK00","0000000000000000"],
  xiaoyu: [ // 设计师小雨：长发黄衫
  "0000KKKKKKKK0000","000KHHHHHHHHK000","00KHHHHHHHHHHK00","0KHHSSSSSSSSHHK0",
  "0KHSSSSSSSSSSHK0","0KHSKKSSSSKKSHK0","0KHSSSSSSSSSSHK0","0KHSSSKSSKSSSHK0",
  "0KHHSSSKKSSSHHK0","0KHHKKKKKKKKHHK0","0KHHYYYYYYYYHHK0","0KHYYYYYYYYYYHK0",
  "0KSYYYYYYYYYYSK0","0KSYYYWWWWYYYSK0","0KSYYYYYYYYYYSK0","0KKYYYYYYYYYYKK0",
  "00KYYYYYYYYYYK00","00KYYYYYYYYYYK00","000KKKKKKKKKK000","000KWWW00WWWK000",
  "000KWWWK0KWWWK00","000KWWWK0KWWWK00","00KKKKK00KKKKK00","0000000000000000"]
});

/* 星火市建筑（levels 引用关卡id；lock=未开放提示；archive=档案馆支线；wx/wz 为3D开放世界岛屿坐标） */
PQ.buildings.push(...[
  {id:'hq',   name:'星火科技', emoji:'🏢', x:6,  y:12, w:132, h:150, color:'#3b5a8f',
    wx:-21, wz:-16, doorOffset:[2, 6.5], doorDir:[0, 1], npcGuard:'boss',
    subtitle:'主线大本营 · 创业总部',
    levels:['p1','c1','boss','u1','u4','uboss','l2','l3','l4','lboss','gboss','b3','f1','fend']},
  {id:'cafe', name:'蓝山咖啡馆', emoji:'☕', x:33, y:30, w:104, h:84,  color:'#8a5a38',
    wx:-24, wz:3, doorOffset:[6.5, 0], doorDir:[1, 0], npcGuard:'xiaomei',
    subtitle:'第1章 · 用户访谈现场',
    levels:['c2']},
  {id:'tea',  name:'波波奶茶店', emoji:'🧋', x:56, y:66, w:98,  h:74,  color:'#b56a86',
    wx:18, wz:19, doorOffset:[-2, -6.0], doorDir:[0, -1], npcGuard:'xiaomei',
    subtitle:'第1-2章 · 街头观察与伪需求拆解',
    levels:['c3','u2']},
  {id:'home', name:'阳光社区', emoji:'🏠', x:38, y:60, w:100, h:88, color:'#c08552',
    wx:-17, wz:20, doorOffset:[2, -6.2], doorDir:[0, -1], npcGuard:'xiaoyu',
    subtitle:'第2章 · 真实生活场景洞察',
    levels:['u3']},
  {id:'arch', name:'产品档案馆', emoji:'📚', x:79, y:24, w:112, h:110, color:'#6b5a9e',
    wx:22, wz:-15, doorOffset:[-1, 6.5], doorDir:[0, 1], npcGuard:null,
    subtitle:'支线 · 16篇真实产品案例拆解',
    archive:true},
  {id:'eng',  name:'工程部大楼', emoji:'🛠️', x:22, y:66, w:110, h:96,  color:'#4a6b6e',
    wx:1, wz:23, doorOffset:[0, -6.5], doorDir:[0, -1], npcGuard:'akai',
    subtitle:'第3-5章 · PRD评审与研发上线',
    levels:['e1','e2','e3','e4','eboss','t1','t2','t3','t4','tboss','l1']},
  {id:'data', name:'数据中心',  emoji:'📊', x:55, y:16, w:100, h:120, color:'#37648f',
    wx:1, wz:-22, doorOffset:[0, 6.5], doorDir:[0, 1], npcGuard:'laoguan',
    subtitle:'第6章 · 北极星与增长看板',
    levels:['g1','g2','g3','g4']},
  {id:'bank', name:'星火交易所', emoji:'💰', x:80, y:64, w:104, h:86,  color:'#8f7a37',
    wx:25, wz:3, doorOffset:[-6.5, 0], doorDir:[-1, 0], npcGuard:'lijie',
    subtitle:'第7章 · 商业化定价与融资路演',
    levels:['b1','b2','b4','bboss']}
]);

/* 星火纪念广场 · 里程碑体素雕塑（每通关一章Boss/终章，广场自动筑起一座地标雕塑） */
PQ.milestones = [
  { id:'m1', bossId:'boss',  title:'黄金问号探针', ch:'第1章 · 想法验证', desc:'推翻拍脑袋需求，先验证真问题与真伪痛点', angle: -Math.PI * 0.75 },
  { id:'m2', bossId:'uboss', title:'暖心洞察咖啡杯', ch:'第2章 · 用户与需求', desc:'用 Mom Test 与 JTBD 听懂用户真实的任务', angle: -Math.PI * 0.46 },
  { id:'m3', bossId:'eboss', title:'星火蓝金方碑', ch:'第3章 · PRD与原型', desc:'用三把尺子砍需求，用边界异常和埋点立规范', angle: -Math.PI * 0.18 },
  { id:'m4', bossId:'tboss', title:'齿轮协作拱门', ch:'第4章 · 技术协作', desc:'听懂 API、并发与技术债，和工程师背靠背', angle:  Math.PI * 0.11 },
  { id:'m5', bossId:'lboss', title:'金丝雀灯塔', ch:'第5章 · 上线冲刺', desc:'灰度放量与 P0 黄金一小时守住上线底线', angle:  Math.PI * 0.39 },
  { id:'m6', bossId:'gboss', title:'北极星罗盘', ch:'第6章 · 数据与增长', desc:'看穿虚荣指标，定位魔法数字与留存飞轮', angle:  Math.PI * 0.68 },
  { id:'m7', bossId:'bboss', title:'价值飞轮金币柱', ch:'第7章 · 商业化', desc:'算清 LTV/CAC 与回本周期，讲述完整商业故事', angle:  Math.PI * 0.96 },
  { id:'m8', bossId:'fend',  title:'星火巅峰纪念碑', ch:'终章 · 全线通关', desc:'从0到1产品全流程毕业，广场中央最高荣誉雕塑', center: true }
];

/* 远景开放世界群岛（在轨道视角与群岛全览下可见） */
PQ.continents = PQWorldMap.regions.map(r => ({id:r.id, name:r.continent, sub:r.name+' · 可自由探索', wx:r.x, wz:r.z, theme:r.id==='growth'?'autumn':r.id==='ai'?'crystal':'coral'}));

/* 着陆页痛点轮播 */
PQ.pains.push(...[
  'AI 能帮你把代码写出来，却没法告诉你：<b>该做什么、为谁做、凭什么赢</b>',
  '用 AI 一个周末就搭好了 App，上线才发现——<b>根本没人需要它</b>',
  '文科/商科出身，对做产品心动，却被<b>“技术门槛”</b>三个字劝退',
  'PRD、MVP、AARRR……<b>每个字都认识，连起来全懵</b>',
  '收藏了几十篇产品干货，还是不知道<b>第一步该干嘛</b>',
  'AI 时代，执行越来越便宜——<b>“判断该做什么”越来越值钱</b>'
]);
