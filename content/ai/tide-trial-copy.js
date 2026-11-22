/* Museum dialogue and exhibit copy by Antigravity · T-22. */
window.TideTrialCopy = {
  "meta": {
    "version": "1.3",
    "locale": "zh-CN",
    "museum": "潮汐馆 · AI 博物馆",
    "audience": "first-time-visitor",
    "basedOn": [
      "潮汐馆试玩验收标准.md (stone 确认版)",
      "tide-museum-copy.json (v1.2)",
      "正式馆现有台词与展签 (v1.1)"
    ],
    "filmDurationSeconds": 24,
    "notes": "100% 保留正式馆既有 stone.*、labels.*、noteCard.*、terminal.*、cinema.*、archive.* 与原 14 个 ui.* 键；新增并定稿两位馆员（靠近招呼、指向电源/片架、实验前后问答、三卷看完后对上片名与镜头）、桌上电脑双实验（开机、空托盘/有便签/仅昨天结果与重做）、片架三卷 24 秒短片与播控（开始/暂停/继续/换片/停播/返回走动/离场）。"
  },
  "stone": {
    "firstVisit": "推门进来吧，海风大。这儿不收门票，也不考你高等数学。我叫石头，这间馆的看门人。眼前这台终端连着一块空桌面，先直接点「运行终端」查查夜市几点开摊，看看它手边没资料时会怎么答。",
    "missingContext": "看见了吧？它回你「缺少营业时间」，不是机器坏了，是眼下工作桌面是空的——它没见过夜市的新牌子，总不能闭卷瞎编。点「插入便签」把旁边的营业时间便签递给它，再点一次「运行终端」试试。",
    "noteInserted": "好，这张写着「夜市 18:00 开摊」的便签已经摊在它的工作桌面上了。刚才它手边空着，只能老实答缺资料；现在有了现成依据——再点「运行终端」，看看回答有什么不一样。",
    "groundedResult": "这回稳了——「夜市 18:00 开摊（来自便签）」。模型还是同一个，差别只在你亲手把真资料补上了工作桌面。这步演示的是手工补充上下文；真要做成完整的检索增强（RAG），还得靠系统自己先检索出相关材料，再交给模型生成。看完这边，可以去对面像素放映厅和里头实验档案室转转。",
    "noteRemoved": "便签撤回来了，终端的短期桌面又清空啦。想再对照一次没资料时的表现，直接点「运行终端」就行。",
    "returning": "又逛回来啦？茶刚沏好。刚才那轮便签实验已经跑通了——想再拿「取下便签」和「插入便签」对照两遍随时动手；要是还没存底，记得去里头实验档案室把这次记录归档。",
    "returningArchived": "典藏员那边收好你的实验记录了吧？茶还热着，歇会儿慢慢逛。在博物馆里慢半拍，反而容易看清 AI 的脾气——想重演刚才的对照，工作台随时归你用。"
  },
  "labels": {
    "shitou": {
      "subtitle": "01 · 上下文实验台",
      "title": "把依据摊上桌，AI 才会开卷作答",
      "body": "大模型不会自动装进所有实时事实。工作桌面空着时，终端会诚实返回「缺少营业时间」；插入写着「夜市 18:00 开摊」的便签再运行终端，它就会依据桌面资料给出带出处的回答。这一步演示的是手工补充上下文；完整的检索增强（RAG），还需要系统自动检索相关材料后再交给模型生成。",
      "cue": "先直接「运行终端」，再「插入便签」运行一次，对照前后差别。"
    },
    "cinema": {
      "subtitle": "02 · 像素放映厅",
      "title": "三卷像素胶片，看懂 AI 七十年",
      "body": "三卷短片把展馆时间长廊缩进了放映机：第一卷从 1956 年达特茅斯木屋讲到寒冬与深度学习；第二卷记录 Transformer 与 ChatGPT 把算法装进聊天框；第三卷看向开源浪潮与动手干活的智能体。转动放映盘，按时间顺序切换画面。",
      "cue": "点击「转动放映盘」，依次浏览 3 卷历史胶片（1/3 至 3/3）。"
    },
    "archive": {
      "subtitle": "03 · 实验档案室",
      "title": "把一次靠谱对照，留成可回看的样本",
      "body": "馆里不只展出结论，也收藏验证过程。你在上下文实验台跑出的「夜市 18:00 开摊（来自便签）」对照，能证明同一台模型在缺资料与有依据时的行为边界。归档后，这份记录会保存在本地展馆档案中，供下次来馆核对。",
      "cue": "完成便签实验后，点击「归档实验记录」收藏本次对照。"
    }
  },
  "noteCard": {
    "title": "星潮夜市营业时间便签",
    "content": "夜市 18:00 开摊"
  },
  "terminal": {
    "query": "查询：星潮夜市几点开摊？",
    "idleStatus": "石头 · 上下文实验台 · 终端等待读取资料",
    "readyStatus": "石头 · 上下文实验台 · 终端已接入营业时间便签",
    "missingResult": "查询结果 · 缺少营业时间",
    "groundedResult": "查询结果 · 夜市 18:00 开摊（来自便签）"
  },
  "cinema": {
    "stationName": "像素放映厅",
    "npcName": "放映员",
    "greeting": "欢迎来像素放映厅。机子里装了三卷压缩版历史胶片，点「转动放映盘」就能一卷一卷往下看。",
    "films": [
      {
        "index": 1,
        "label": "胶片 1/3",
        "title": "1956 达特茅斯木屋 · 从写死规则到数据学习",
        "caption": "十位学者在夏日黑板写下 AI 的名字。历经两次寒冬后，机器才走出手工死规则，转向从数据里找规律。"
      },
      {
        "index": 2,
        "label": "胶片 2/3",
        "title": "2017–2022 破圈之夜 · Transformer 走进聊天框",
        "caption": "注意力机制让模型看懂前后文，而一个像发消息一样的聊天框，把实验室算法递到了普通人手边。"
      },
      {
        "index": 3,
        "label": "胶片 3/3",
        "title": "2025–2026 开源与智能体 · 从动嘴到动手干活",
        "caption": "开源浪潮拉低了深度推理门槛，AI 开始走进真实工作流，而权限沙箱与人工确认成了新底线。"
      }
    ]
  },
  "archive": {
    "stationName": "实验档案室",
    "npcName": "典藏员",
    "beforeExperiment": "工作台完成实验后可归档。先去石头那儿把营业时间便签接入终端跑一遍，再来我这儿建档。",
    "readyToArchive": "有一份实验记录可归档：已收到「夜市 18:00 开摊（来自便签）」的对照结果，点「归档实验记录」就能收入馆藏。",
    "archived": "已收藏便签实验记录：缺资料返回「缺少营业时间」，接入便签返回「夜市 18:00 开摊（来自便签）」。下次来馆依然能查到这份样本。"
  },
  "ui": {
    "museumTitle": "潮汐馆",
    "museumSubtitle": "AI 博物馆",
    "visitPrefix": "拜访",
    "insertNote": "插入便签",
    "removeNote": "取下便签",
    "runTerminal": "运行终端",
    "backToLab": "回到工作台",
    "turnReel": "转动放映盘",
    "archiveRecord": "归档实验记录",
    "continueBrowse": "继续逛",
    "readLabel": "查看展签",
    "closeLabel": "收起展签",
    "hintDesktop": "滚轮或 WASD 移动 · 拖动环顾 · E 互动",
    "hintTouch": "左侧摇杆移动 · 拖动画面环顾",
    "browseHintDesktop": "走近馆员、电脑电源或片架，直接点击就能互动（也可按 E）",
    "browseHintTouch": "左侧摇杆走动 · 拖动环顾 · 直接点馆员、电源或片架互动",
    "talkStone": "跟石头聊聊",
    "talkProjectionist": "跟放映员聊聊",
    "talkArchivist": "跟典藏员聊聊",
    "pressPower": "点一下电源",
    "openComputer": "点电脑电源",
    "useComputer": "查看桌上电脑",
    "powerOn": "开机",
    "powerOff": "关机",
    "askComputer": "问电脑",
    "runAgain": "再问一次",
    "putInTray": "放进托盘",
    "takeOutTray": "拿回桌上",
    "resetExperiment": "重做",
    "switchExperiment": "切换实验",
    "leaveDesk": "离开桌面",
    "leaveComputer": "离开桌面",
    "openFilmRack": "查看片架",
    "openCinema": "选片放映",
    "useCinema": "查看放映台",
    "startScreening": "开始放映",
    "pauseScreening": "暂停",
    "resumeScreening": "继续",
    "switchFilm": "换片",
    "nextFilm": "换下一卷",
    "stopScreening": "停播",
    "replayFilm": "重播",
    "hideRackPanel": "收起面板看银幕",
    "showRackPanel": "打开播控栏",
    "returnToWalk": "返回走动",
    "leaveScreening": "离场",
    "leaveCinema": "离场",
    "selfExplore": "我自己看看",
    "endTalk": "返回走动",
    "goToComputer": "去桌边开电脑",
    "goToFilmRack": "去片架选片"
  },
  "proximity": {
    "hotspots": {
      "stone": "石头 · 馆长",
      "computerPowerOff": "电脑电源 · 点一下开机",
      "computerOff": "桌上电脑 · 点电源开机",
      "computerOn": "桌上电脑 · 已开机",
      "projectionist": "放映员",
      "filmRack": "片架 · 三卷短片",
      "projectorIdle": "放映室片架 · 可选片",
      "projectorPlaying": "银幕 · 放映中",
      "projectorPaused": "银幕 · 已暂停",
      "archivist": "典藏员 · 实验档案室"
    },
    "rules": {
      "triggerOncePerState": true,
      "neverLoopWhileStanding": true,
      "keepPlayerMovable": true,
      "keepMentorHoldingCup": true
    },
    "stone": {
      "beforeComputer": "桌上这台电脑，有张便签还没读。想试试吗？",
      "afterPowerOn": "屏幕亮了。两个实验都能点开试，先试试夜市那张便签吧。",
      "afterExp1Empty": "看它答「还不知道营业时间」了吧？把桌上的便签放进托盘再问一次。",
      "afterNoteInserted": "便签放进托盘了，再点一次「问电脑」看看回答。",
      "afterExp1Done": "刚插进去那张 18:00 的便签见效了吧？想聊原因随时问我，也能接着试第二个实验。",
      "afterExp2Done": "昨天和今天两张便签都比过了吧？想聊聊它为什么信 19:00，随时开口。",
      "afterNoteRemoved": "便签放回桌上了，托盘又清空啦。",
      "afterArchived": "对照记录都存好啦，随时再来喝茶逛逛。"
    },
    "projectionist": {
      "beforeWatched": "来放映室啦？旁边片架上有三卷 24 秒的短片，任选一卷就能暗灯放映。",
      "whilePlaying": "灯暗下来了，银幕正播着呢。看完再来聊聊刚才的镜头。",
      "whilePaused": "银幕正停在当前镜头呢，点「继续」就能接着播。",
      "afterStopped": "刚才那卷中途停住了，不算看完。回片架挑一卷从头播到片尾吧。",
      "afterWatched": "刚才那卷播完了吧？想聊聊片里的画面，还是回片架换一卷？",
      "afterWatchedByFilm": [
        "《1956 的夏天》播完了吧？想聊聊黑板和围桌讨论那段，随时开口。",
        "《一张便签改变答案》看完了吧？钟面亮出 18:00、摊灯点亮那一下很踏实。",
        "《像素怎样变成画面》播到完整夜景了吧？想聊聊刚才那卷，随时问我。"
      ]
    },
    "archivist": {
      "beforeExperiment": "去石头那儿跑完便签实验，就能来我这儿存档。",
      "readyToArchive": "你的对照记录刚送到了，要现在归档吗？",
      "archived": "你的实验样本好好收在档案柜里呢。"
    }
  },
  "dialogue": {
    "stone": {
      "speaker": "石头 · 馆长",
      "openings": {
        "beforeComputer": "我叫石头，这间馆的看门人。桌上有台电脑，直接点电源就能开机试试，想问什么尽管开口。",
        "afterPowerOn": "屏幕亮了吧？里面有两个实验，先试试「夜市几点开摊？」，空托盘和放便签各问一次。",
        "afterExp1Empty": "刚才空托盘问出「还不知道营业时间」了吧？把桌上的「夜市 18:00 开摊」便签放进托盘再问一次试试。",
        "afterNoteInserted": "便签已经放进托盘了，回电脑点一下「问电脑」，就能看见前后的差别。",
        "afterExp1Done": "刚才放进便签答出「夜市 18:00 开摊」了吧？同一台电脑，有没有依据一眼就能比出来。",
        "afterExp2Done": "两个实验都亲手试过了吧？一张便签看「有没有依据」，两张便签看「该信哪一张」。",
        "afterArchived": "典藏员那边收好样本了吧？想重做一遍实验，或者接着聊，随时都在。"
      },
      "questions": {
        "howToPlay": {
          "id": "how_to_play_computer",
          "label": "这台电脑怎么玩？",
          "cue": "point_to_computer_power",
          "replyBeforePower": "走到桌边，第一步直接点一下电脑电源，等屏幕从暗变亮。里面有两个实验，先选「夜市几点开摊？」，空托盘问一次，再把桌上的便签插进托盘问一次。",
          "replyAfterPower": "屏幕已经亮了，选「夜市几点开摊？」或「两张便签，该信哪张？」就能动手。想重来随时点「重做」，逛完点「离开桌面」就能回到桌边。"
        },
        "whyCorrect": {
          "id": "why_answered_right",
          "label": "刚才为什么答对了？",
          "replyBeforePowerOrUntried": "还没插过便签呢，别急。先去点一下桌上的电脑电源，把「夜市 18:00 开摊」便签插进托盘问一次，答出来我们再聊。",
          "replyAfterEmptyOnly": "刚才托盘还是空的，它只答了「还不知道营业时间」，还没答出来呢。把桌上的「夜市 18:00 开摊」便签放进托盘再问一次，再回来问我。",
          "replyAfterExp1Note": "因为你刚把桌上的「夜市 18:00 开摊」便签插进了托盘。电脑还是那台电脑，但这回它能直接读到便签上的 18:00，所以不再答不知道，而是照着依据稳稳答出来。"
        },
        "whyTrustToday": {
          "id": "why_trust_today_note",
          "label": "两张便签时，它为什么信 19:00？",
          "reply": "因为问的是「今天几点开摊？」。托盘里同时有「昨天 18:00」和「今天 19:00」时，它会认准今天那张；一旦拿走今天的便签，只剩昨天的 18:00，它就只报已知的昨天，老实说今天还不知道。"
        },
        "whereNext": {
          "id": "where_next",
          "label": "接下来去哪逛？",
          "reply": "去对面放映室找放映员，片架上有三卷 24 秒的小短片可以任选；顺路也能去里头实验档案室把对照记录存进馆藏。"
        },
        "selfExplore": {
          "id": "self_explore",
          "label": "我自己看看",
          "action": "close_dialogue_immediately",
          "reply": ""
        }
      }
    },
    "projectionist": {
      "speaker": "放映员 · 像素放映室",
      "completionRule": "仅当某卷短片自然播到片尾结束（ended）才记入已看完并更新 lastCompletedFilmIndex；只选片、暂停、手动停播或中途离场均不算看完。",
      "openings": {
        "beforeWatched": "我是这儿的放映员。旁边片架摆着三卷 24 秒短片，点片架就能任选一卷、暗灯放着看。",
        "whilePlaying": "银幕正播着呢，展厅灯光也调暗了。想先聊聊，还是回去接着看？",
        "whilePaused": "画面正停在银幕上呢。点「继续」会从同一镜头接着播。",
        "afterStoppedNoWatch": "刚才那卷中途停住了，还没放到片尾。回旁边片架选一卷从头看到尾，我再陪你细聊。",
        "afterWatchedByFilm": [
          "刚看完《1956 的夏天》吧？研究室黑板上那句「机器能思考吗？」，隔了七十年还是很抓人。",
          "刚看完《一张便签改变答案》吧？便签一进画面，无刻度的钟亮出 18:00、摊灯亮起来，前后对比一眼就懂。",
          "刚看完《像素怎样变成画面》吧？从银幕上的一个光点逐行拼出潮汐馆，最后拉远看见完整夜景，挺耐看的。"
        ]
      },
      "questions": {
        "whichFirst": {
          "id": "which_reel_first",
          "label": "先看哪卷？",
          "cue": "point_to_film_rack",
          "replyBeforeWatched": "先看第一卷《1956 的夏天》吧，就在旁边片架最前面。点开片架选好它，按「开始放映」，24 秒就能从年份片头一路看到研究室片尾。",
          "replyAfterWatched1Only": "第一卷看过了的话，去片架挑第二卷《一张便签改变答案》，正好呼应石头桌上的夜市便签实验。",
          "replyAfterWatched1And2": "前两卷都看过了，片架上第三卷《像素怎样变成画面》还没看吧？从单个光点拼出整座潮汐馆夜景。",
          "replyAfterWatchedAll": "三卷都完整看过啦！想重温哪一卷，去旁边片架点开就能从片头再放一遍。"
        },
        "whatWasThatFilm": {
          "id": "what_was_that_film",
          "label": "刚才那卷讲什么？",
          "replyNeverStarted": "你还没完整看一卷呢。先去旁边片架挑一卷按「开始放映」，等片尾亮灯再来问我。",
          "replySelectedOrStoppedOnly": "刚才那卷只选了片或中途停住了，不算看完。回片架把它从头播到片尾，我再陪你细聊片里的镜头。",
          "replyByCompletedFilm": [
            "你刚才看完的是《1956 的夏天》。短片从 1956 年份片头进入研究室，黑板上写着「机器能思考吗？」，镜头落到围桌讨论的一群人，最后出片尾——讲的就是 AI 这个名字最初诞生的夏天。",
            "你刚才看完的是《一张便签改变答案》。一开始夜市摊位上的钟没有刻度，随后便签被放进画面，钟面亮出 18:00、摊灯点亮——讲的是补上真实依据，答案才真正落定。",
            "你刚才看完的是《像素怎样变成画面》。银幕先出现一个光点，再一行一行拼出潮汐馆，最后拉远看见整片完整夜景——再大的画面，也是从最小一格慢慢垒起来的。"
          ]
        },
        "selfExplore": {
          "id": "self_explore",
          "label": "我自己看看",
          "action": "close_dialogue_immediately",
          "reply": ""
        }
      }
    },
    "archivist": {
      "speaker": "典藏员 · 实验档案室",
      "beforeQuestions": [
        {
          "id": "what_archive",
          "label": "这里能存什么？",
          "reply": "专门收藏你在上下文实验台跑出的对照记录。先去石头那儿插便签跑通一次，再来我这儿建档就行。"
        }
      ],
      "afterQuestions": [
        {
          "id": "stay_saved",
          "label": "存好后以后还能看吗？",
          "reply": "会一直留在这间馆里。下次再进潮汐馆，走过来依然能查到你这次的对照样本。"
        }
      ]
    }
  },
  "computer": {
    "title": "上下文实验台 · 桌上电脑",
    "power": {
      "offHeader": "桌上电脑 · 未开机",
      "offBody": "屏幕未点亮",
      "offHint": "直接点电脑电源开机",
      "bootHeader": "桌上电脑 · 开机中",
      "bootLines": [
        "正在点亮显示器…",
        "载入两个桌面实验…",
        "就绪 · 请选择实验"
      ],
      "menuHeader": "桌上电脑 · 两个实验",
      "menuPrompt": "选一个实验亲手试试，每个实验都能随时「重做」或「离开桌面」。"
    },
    "experiments": [
      {
        "id": "exp-night-market",
        "index": 1,
        "tabLabel": "① 夜市几点开摊？",
        "title": "实验一 · 夜市几点开摊？",
        "shortDesc": "空托盘问一次，再把便签放进托盘问一次",
        "question": "夜市几点开摊？",
        "note": {
          "id": "note-market-1800",
          "title": "星潮夜市便签",
          "text": "夜市 18:00 开摊",
          "highlightText": "18:00",
          "putAction": "放进托盘",
          "takeAction": "拿回桌上"
        },
        "trayStatus": {
          "empty": "托盘：空（桌上有「夜市 18:00 开摊」便签）",
          "loaded": "托盘：已放入「夜市 18:00 开摊」"
        },
        "results": {
          "waiting": "点「问电脑」，看看空托盘时怎么答",
          "readyWithNote": "便签已在托盘中，再点一次「问电脑」",
          "emptyAnswer": "还不知道营业时间",
          "emptyDetail": "托盘是空的，手边没有夜市时间依据，不会瞎猜。",
          "groundedAnswer": "夜市 18:00 开摊",
          "groundedCitation": "引用便签：夜市 18:00 开摊（18:00 已亮起）",
          "groundedDetail": "便签上的 18:00 已亮起，补上依据后同一台电脑立刻答准。",
          "diffBefore": "空托盘：还不知道营业时间",
          "diffAfter": "有便签：夜市 18:00 开摊",
          "diffPending": "有便签：待放进托盘再问"
        },
        "prompts": {
          "emptyIdle": "先空着托盘点「问电脑」，看看没便签时它会怎么答。",
          "afterEmpty": "屏幕显示「还不知道营业时间」。拿起桌上的「夜市 18:00 开摊」便签放进托盘，再问同一个问题。",
          "noteInTray": "「夜市 18:00 开摊」便签已进托盘，再点一次「问电脑」看看变化。",
          "afterGrounded": "答案变成「夜市 18:00 开摊」，便签上的 18:00 也亮起来了。点「重做」会把便签放回桌上，再问又回到第一次结果。",
          "afterReset": "已重做：便签回到桌上，托盘已清空。再点「问电脑」可以验证回到第一次结果。"
        }
      },
      {
        "id": "exp-two-notes",
        "index": 2,
        "tabLabel": "② 两张便签，该信哪张？",
        "title": "实验二 · 两张便签，该信哪张？",
        "shortDesc": "同时放入昨天与今天两张便签，再拿走今天的对比",
        "question": "今天几点开摊？",
        "orderInvariant": true,
        "notes": {
          "yesterday": {
            "id": "note-yesterday-1800",
            "title": "昨天便签",
            "text": "昨天 18:00",
            "fullText": "昨天夜市 18:00 开摊",
            "highlightText": "18:00",
            "putAction": "放入「昨天 18:00」",
            "takeAction": "拿走「昨天 18:00」"
          },
          "today": {
            "id": "note-today-1900",
            "title": "今天便签",
            "text": "今天 19:00",
            "fullText": "今天夜市 19:00 开摊",
            "highlightText": "19:00",
            "putAction": "放入「今天 19:00」",
            "takeAction": "拿走「今天 19:00」"
          }
        },
        "trayStatus": {
          "empty": "托盘：空（桌上有「昨天 18:00」与「今天 19:00」）",
          "both": "托盘：已放入「昨天 18:00」和「今天 19:00」",
          "yesterdayOnly": "托盘：仅剩「昨天 18:00」",
          "todayOnly": "托盘：已放入「今天 19:00」"
        },
        "results": {
          "waiting": "把便签放进托盘，再点「问电脑」",
          "emptyAnswer": "还不知道今天几点开摊",
          "emptyDetail": "托盘里还没有便签，先把「昨天 18:00」和「今天 19:00」都放进去试试。",
          "bothAnswer": "今天 19:00",
          "bothPointer": "指向：今天便签（今天 19:00）",
          "bothDetail": "两张便签都在时，无论先放哪张，屏幕都指向今天那张并答「今天 19:00」。",
          "yesterdayOnlyAnswer": "只知道昨天是 18:00，今天还不知道",
          "yesterdayOnlyPointer": "托盘仅有：昨天便签（昨天 18:00）· 缺少今天依据",
          "yesterdayOnlyDetail": "拿走今天的便签后，它只报已知的昨天 18:00，不把昨天当成今天。",
          "todayOnlyAnswer": "今天 19:00",
          "todayOnlyPointer": "指向：今天便签（今天 19:00）",
          "todayOnlyDetail": "把「昨天 18:00」也一起放进托盘再问一次，看看两张同时在场时它怎么判断。"
        },
        "prompts": {
          "emptyIdle": "把「昨天 18:00」和「今天 19:00」两张便签都放进托盘，再问「今天几点开摊？」。",
          "oneInTrayYesterday": "托盘里现在只有「昨天 18:00」。可以直接点「问电脑」，或把「今天 19:00」也放进去一起比。",
          "oneInTrayToday": "托盘里现在有「今天 19:00」。把「昨天 18:00」也放进去再问一次，看看两张都在时怎么选。",
          "bothInTray": "两张便签都在托盘里了，点「问电脑」问问「今天几点开摊？」。",
          "afterBoth": "屏幕答「今天 19:00」，并指向今天那张便签。现在拿走「今天 19:00」，再问一次看看差别。",
          "afterYesterdayOnly": "只剩昨天的便签时，它答「只知道昨天是 18:00，今天还不知道」。点「重做」可换顺序重试，或离开桌面找石头聊聊。",
          "afterReset": "已重做：两张便签已放回桌上。先放哪张都会得到同样结果。"
        }
      }
    ]
  },
  "projection": {
    "title": "像素放映室 · 片架与银幕",
    "rackSubtitle": "三卷原创短片 · 每卷 24 秒 · 可任选放映",
    "reelButtons": [
      "01 · 1956 的夏天",
      "02 · 一张便签改变答案",
      "03 · 像素怎样变成画面"
    ],
    "status": {
      "idle": "已选胶片 · 灯光常亮",
      "playing": "正在放映 · 室内已暗灯",
      "paused": "已暂停 · 停在当前镜头",
      "stopped": "已停播 · 灯光已恢复",
      "ended": "本卷播完 · 灯光已恢复"
    },
    "screenOverlay": {
      "idle": "在片架任选一卷，点「开始放映」",
      "pausedBadge": "已暂停",
      "pausedHint": "点「继续」从当前镜头接着播",
      "stopped": "银幕已熄下 · 可重新选片",
      "ended": "本卷放映完毕"
    },
    "prompts": {
      "idle": "点片架上任意一卷查看片长与简介，按「开始放映」后展厅暗灯、大银幕连续播放。",
      "playing": "室内已暗灯，短片正在大银幕播放。收起面板也能继续看；可随时暂停、换片、停播或离场。",
      "paused": "银幕已停在当前镜头。等几秒点「继续」会从同一镜头接着播，也可换片、停播或离场。",
      "stopped": "已停播并恢复灯光，声音已同步停止。可以重新选片播放，或点「返回走动」。",
      "ended": "本卷已播完片尾，灯光已恢复。可以点「重播」、换下一卷，或返回走动找放映员聊聊。"
    },
    "reels": [
      {
        "id": "summer-1956",
        "index": 1,
        "shortLabel": "胶片 1/3",
        "title": "1956 的夏天",
        "displayTitle": "《1956 的夏天》",
        "durationSeconds": 24,
        "durationLabel": "24 秒",
        "durationClock": "00:24",
        "summary": "从 1956 年份片头走进一间研究室，看黑板上的提问与围桌讨论的人。",
        "opening": {
          "startSec": 0,
          "endSec": 4,
          "title": "1956",
          "subtitle": "1956 的夏天"
        },
        "scenes": [
          {
            "sceneIndex": 1,
            "startSec": 4,
            "endSec": 9,
            "visualCue": "从年份片头推入一间暖灯研究室",
            "caption": "1956 年的夏天，一间安静的研究室亮起暖灯。"
          },
          {
            "sceneIndex": 2,
            "startSec": 9,
            "endSec": 15,
            "visualCue": "研究室黑板特写，粉笔浮现问题",
            "propText": "机器能思考吗？",
            "caption": "黑板上慢慢写下一行问题：机器能思考吗？"
          },
          {
            "sceneIndex": 3,
            "startSec": 15,
            "endSec": 20,
            "visualCue": "镜头落到围桌讨论的一群人",
            "caption": "几个人围坐桌旁，认真讨论机器能不能像人一样学习。"
          }
        ],
        "ending": {
          "startSec": 20,
          "endSec": 24,
          "title": "《1956 的夏天》· 完",
          "subtitle": "那个夏天的提问，一直走到了今天"
        }
      },
      {
        "id": "note-changes-answer",
        "index": 2,
        "shortLabel": "胶片 2/3",
        "title": "一张便签改变答案",
        "displayTitle": "《一张便签改变答案》",
        "durationSeconds": 24,
        "durationLabel": "24 秒",
        "durationClock": "00:24",
        "summary": "夜市摊位上的钟原本没有刻度，放进一张便签后，18:00 亮起、摊灯点亮。",
        "opening": {
          "startSec": 0,
          "endSec": 4,
          "title": "一张便签改变答案",
          "subtitle": "卷二 · 24 秒"
        },
        "scenes": [
          {
            "sceneIndex": 1,
            "startSec": 4,
            "endSec": 9,
            "visualCue": "暮色中的夜市摊位，墙上的钟没有刻度",
            "caption": "夜市摊位静悄悄的，墙上的钟还没有刻度。"
          },
          {
            "sceneIndex": 2,
            "startSec": 9,
            "endSec": 15,
            "visualCue": "黄色便签被放进画面",
            "propText": "夜市 18:00 开摊",
            "caption": "一张写着「夜市 18:00 开摊」的便签被放进画面。"
          },
          {
            "sceneIndex": 3,
            "startSec": 15,
            "endSec": 20,
            "visualCue": "钟面亮出 18:00，夜市摊灯一盏盏点亮",
            "propText": "18:00",
            "caption": "钟面立刻亮出 18:00，夜市摊灯一盏盏点亮。"
          }
        ],
        "ending": {
          "startSec": 20,
          "endSec": 24,
          "title": "《一张便签改变答案》· 完",
          "subtitle": "补上一张真依据，答案就有了落点"
        }
      },
      {
        "id": "pixels-to-scene",
        "index": 3,
        "shortLabel": "胶片 3/3",
        "title": "像素怎样变成画面",
        "displayTitle": "《像素怎样变成画面》",
        "durationSeconds": 24,
        "durationLabel": "24 秒",
        "durationClock": "00:24",
        "summary": "银幕先亮起一个光点，再逐行拼出潮汐馆，最后拉远看见整片夜景。",
        "opening": {
          "startSec": 0,
          "endSec": 4,
          "title": "像素怎样变成画面",
          "subtitle": "卷三 · 24 秒"
        },
        "scenes": [
          {
            "sceneIndex": 1,
            "startSec": 4,
            "endSec": 9,
            "visualCue": "漆黑银幕中央出现一个光点",
            "caption": "银幕中央，先亮起一个微小的光点。"
          },
          {
            "sceneIndex": 2,
            "startSec": 9,
            "endSec": 15,
            "visualCue": "光点逐行扫描拼出潮汐馆轮廓与灯窗",
            "caption": "光点排成行列，一行一行拼出潮汐馆的屋檐与灯窗。"
          },
          {
            "sceneIndex": 3,
            "startSec": 15,
            "endSec": 20,
            "visualCue": "镜头缓缓拉远，呈现完整海边夜景",
            "caption": "镜头拉远，整座潮汐馆和海边夜景完整展现在眼前。"
          }
        ],
        "ending": {
          "startSec": 20,
          "endSec": 24,
          "title": "《像素怎样变成画面》· 完",
          "subtitle": "最小的光点连在一起，就成了眼前的世界"
        }
      }
    ]
  }
};
