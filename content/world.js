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

/* 星火市建筑（levels 引用关卡id；lock=未开放提示；archive=档案馆支线） */
PQ.buildings.push(...[
  {id:'hq',   name:'星火科技', emoji:'🏢', x:6,  y:12, w:132, h:150, color:'#3b5a8f', levels:['p1','c1','boss','u1','u4','uboss','l2','l3','l4','lboss','gboss','b3']},
  {id:'cafe', name:'蓝山咖啡馆', emoji:'☕', x:33, y:30, w:104, h:84,  color:'#8a5a38', levels:['c2']},
  {id:'tea',  name:'波波奶茶店', emoji:'🧋', x:56, y:66, w:98,  h:74,  color:'#b56a86', levels:['c3','u2']},
  {id:'home', name:'阳光社区', emoji:'🏠', x:38, y:60, w:100, h:88, color:'#c08552', levels:['u3']},
  {id:'arch', name:'产品档案馆', emoji:'📚', x:79, y:24, w:112, h:110, color:'#6b5a9e', archive:true},
  {id:'eng',  name:'工程部大楼', emoji:'🛠️', x:22, y:66, w:110, h:96,  color:'#4a6b6e', levels:['e1','e2','e3','e4','eboss','t1','t2','t3','t4','tboss','l1']},
  {id:'data', name:'数据中心',  emoji:'📊', x:55, y:16, w:100, h:120, color:'#37648f', levels:['g1','g2','g3','g4']},
  {id:'bank', name:'星火交易所', emoji:'💰', x:80, y:64, w:104, h:86,  color:'#8f7a37', levels:['b1','b2','b4','bboss']}
]);

/* 着陆页痛点轮播 */
PQ.pains.push(...[
  'AI 能帮你把代码写出来，却没法告诉你：<b>该做什么、为谁做、凭什么赢</b>',
  '用 AI 一个周末就搭好了 App，上线才发现——<b>根本没人需要它</b>',
  '文科/商科出身，对做产品心动，却被<b>“技术门槛”</b>三个字劝退',
  'PRD、MVP、AARRR……<b>每个字都认识，连起来全懵</b>',
  '收藏了几十篇产品干货，还是不知道<b>第一步该干嘛</b>',
  'AI 时代，执行越来越便宜——<b>“判断该做什么”越来越值钱</b>'
]);
