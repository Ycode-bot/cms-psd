# Activity CMS Component Catalog

This catalog is generated from the visible activityincms component library. Use `componentName` exactly in PSD `cms:` annotations and in generated JSON.

Notes:

- 中文名称 comes from the CMS sidebar label.
- English Purpose is for internal UI/operations collaboration, not public product copy.
- Hidden/commented components are intentionally excluded.
- Business IDs are not provided by UI; operators fill them in JSON or the CMS right panel.

## Main Activity Components

| componentName | 中文名称 | English Purpose | PSD Annotation Example | Notes |
|---|---|---|---|---|
| piccomponent | 静态图片 | Static image block | cms:piccomponent#hero or cms:piccomponent#sectionName | Requires asset upload and CDN replacement |
| tabComp | 选项卡 | Tab container | cms:tabComp#mainTabs | Usually visual/config only |
| linkPicComp | 图片/文本链接 | Editable text block | cms:linkPicComp#moduleName | Usually visual/config only |
| linkBtn | 右侧跳转按钮 | Link or jump module | cms:linkBtn#moduleName | Usually visual/config only |
| popRule | 弹窗 | Popup or rule modal | cms:popRule#moduleName | Usually visual/config only |
| countDown | 94 - 倒计时 | Countdown timer | cms:countDown#mainCountdown | Usually visual/config only |
| charge | 充值按钮 | Recharge or payment activity module | cms:charge#moduleName | Usually requires operator backend IDs |
| videoComp | YouTube视频 | Video module | cms:videoComp#moduleName | Usually visual/config only |
| scrolltop1 | 回到顶部按钮 | Button module | cms:scrolltop1#moduleName | Usually visual/config only |
| videoMp4 | mp4视频 | Video module | cms:videoMp4#moduleName | Usually visual/config only |
| textComp | 文本 | Editable text block | cms:textComp#moduleName | Usually visual/config only |
| titleComp | 标题 / 空白占位 | Title or spacer block | cms:titleComp#moduleName | Usually visual/config only |
| anchorPage | 主播个人页面1 | Anchor profile module | cms:anchorPage#moduleName | Usually visual/config only |
| anchorPage2 | 主播个人页面2 | Anchor profile module | cms:anchorPage2#moduleName | Usually visual/config only |
| kewlBtn | LiveMe App内功能按钮 | Button module | cms:kewlBtn#moduleName | Usually visual/config only |
| swiperCon | 礼物轮播图 | Gift or reward module | cms:swiperCon#moduleName | Usually visual/config only |
| blankTransfer | 空白中转页面 | Activity CMS component | cms:blankTransfer#moduleName | Usually visual/config only |
| activityList | 活动列表 | Activity CMS component | cms:activityList#moduleName | Usually visual/config only |
| teamUp2 | 小队任务2.0 | Task or mission module | cms:teamUp2#taskModule | Usually requires operator backend IDs |
| signUp2 | 报名模板 - 无填写项 | Signup or enrollment module | cms:signUp2#signup | Usually requires operator backend IDs |
| signUpGroup | 报名模板 - 分组报名 | Signup or enrollment module | cms:signUpGroup#signup | Usually requires operator backend IDs |
| newSignUp | 报名模板 - 用户反馈 | Signup or enrollment module | cms:newSignUp#signup | Usually requires operator backend IDs |
| giftExchange | 62 - 礼物兑换 | Gift or reward module | cms:giftExchange#exchangeModule | Usually visual/config only |
| collectCard | 95 - 日月行者之歌 | Activity CMS component | cms:collectCard#moduleName | Usually visual/config only |
| yearTask | 95 - 日月行者每日任务 | Task or mission module | cms:yearTask#taskModule | Usually requires operator backend IDs |
| walkerSongTask | 95 - 日月行者收集星星 | Task or mission module | cms:walkerSongTask#taskModule | Usually requires operator backend IDs |
| yearConvert | 95 - 日月行者兑换 | Exchange or redemption module | cms:yearConvert#exchangeModule | Usually visual/config only |
| yearAdd | 95 - 日月行者累计任务 | Task or mission module | cms:yearAdd#taskModule | Usually requires operator backend IDs |
| globalShow | 139 - GlobalShow节目单 | Program menu module | cms:globalShow#moduleName | Usually visual/config only |
| noThresholdAward | 173 - 无门槛领奖 | Award claim module | cms:noThresholdAward#moduleName | Usually visual/config only |
| noThresholdAwardNew | 173 - 无门槛领奖 - 圣诞倒数日历 | Award claim module | cms:noThresholdAwardNew#moduleName | Usually visual/config only |
| jackpot | 177 - 瓜分奖池 | Jackpot or prize pool module | cms:jackpot#moduleName | Usually requires operator backend IDs |
| jackpotAward | 177 - 瓜分奖池领奖 | Award claim module | cms:jackpotAward#moduleName | Usually visual/config only |
| fastFurious | 178 - 速度与激情 | Activity CMS component | cms:fastFurious#moduleName | Usually visual/config only |
| menuEnroll | 183 - 节目单报名 | Signup or enrollment module | cms:menuEnroll#signup | Usually requires operator backend IDs |
| pieceExchange | 211 - 奖品兑换活动 | Exchange or redemption module | cms:pieceExchange#exchangeModule | Usually visual/config only |
| confessionWall | 216 - 表白墙 | Activity CMS component | cms:confessionWall#moduleName | Usually visual/config only |
| poolGift | 237 - 送礼物兑换物品 | Gift or reward module | cms:poolGift#exchangeModule | Usually visual/config only |
| poolParty | 238 - 泳池派对 | Activity CMS component | cms:poolParty#moduleName | Usually visual/config only |
| independent | 241 - 独立日 | Activity CMS component | cms:independent#moduleName | Usually visual/config only |
| betTicket | 269 - 超级碗 兑换下注券 | Exchange or redemption module | cms:betTicket#exchangeModule | Usually visual/config only |
| bottomPour | 269 - 超级碗 下注 | Activity CMS component | cms:bottomPour#moduleName | Usually visual/config only |
| monopoly | 271 - 大富翁 | Activity CMS component | cms:monopoly#moduleName | Usually visual/config only |
| goldAccumulator | 272 - 金币蓄力池 | Activity CMS component | cms:goldAccumulator#moduleName | Usually visual/config only |
| passCard | 273 - 通行证 | Activity CMS component | cms:passCard#moduleName | Usually visual/config only |
| h2hMenu2 | 280 - 新H2H节目单 | Program menu module | cms:h2hMenu2#moduleName | Usually visual/config only |
| intimate | 292 - 亲密关系活动 | Activity CMS component | cms:intimate#moduleName | Usually visual/config only |
| coastsTime | 294 - 东西大战 分阶段时间线 | Activity CMS component | cms:coastsTime#moduleName | Usually visual/config only |
| coastsSignUp | 294 - 东西大战 报名 | Signup or enrollment module | cms:coastsSignUp#signup | Usually requires operator backend IDs |
| coastsRecord | 294 - 东西大战 我的记录 | Activity CMS component | cms:coastsRecord#moduleName | Usually visual/config only |
| coastsPk | 294 - 东西大战 两阶段PK信息 | Activity CMS component | cms:coastsPk#moduleName | Usually visual/config only |
| fanGroupTaskC | 301 - 粉丝团任务 - 主播 | Task or mission module | cms:fanGroupTaskC#taskModule | Usually requires operator backend IDs |
| fanGroupTaskG | 301 - 粉丝团任务 - 用户 | Task or mission module | cms:fanGroupTaskG#taskModule | Usually requires operator backend IDs |
| voteService | 311 - 投票服务 | Vote module | cms:voteService#moduleName | Usually visual/config only |
| loginAward | 318 - 登录送好礼 | Award claim module | cms:loginAward#moduleName | Usually visual/config only |
| luckyPartner | 319 - 幸运拍档 | Lottery or reward module | cms:luckyPartner#moduleName | Usually requires operator backend IDs |
| battleBet | 324 - 主播争霸赛下注 | Anchor or host activity module | cms:battleBet#moduleName | Usually visual/config only |
| fragmentPrize | 326 - 碎片合成奖励 | Activity CMS component | cms:fragmentPrize#moduleName | Usually visual/config only |
| gameLamp | 小游戏跑马灯 | Activity CMS component | cms:gameLamp#moduleName | Usually visual/config only |
| teamUp | 328 - 小队任务 | Task or mission module | cms:teamUp#taskModule | Usually requires operator backend IDs |
| catchUpCard | 331 - 非签约主播每日打卡 | Anchor or host activity module | cms:catchUpCard#moduleName | Usually visual/config only |
| piggyRank | 335- 金币储蓄罐 | Leaderboard or ranking module | cms:piggyRank#leaderboard | Usually requires operator backend IDs |
| trickOrTreat | 336 -不给糖果就捣蛋 | Activity CMS component | cms:trickOrTreat#moduleName | Usually visual/config only |
| jingleChase | 342 - 圣诞铃铛追击 | Activity CMS component | cms:jingleChase#moduleName | Usually visual/config only |
| rank7 | 单收/送礼榜单 | Leaderboard or ranking module | cms:rank7#leaderboard | Usually requires operator backend IDs |
| rank14 | 单收/送礼榜单-分等级 | Leaderboard or ranking module | cms:rank14#leaderboard | Usually requires operator backend IDs |
| rank4 | 收礼+送礼榜单 | Leaderboard or ranking module | cms:rank4#leaderboard | Usually requires operator backend IDs |
| rank3 | 收送礼榜单-收礼分等级 | Leaderboard or ranking module | cms:rank3#leaderboard | Usually requires operator backend IDs |
| rank13 | 收送礼榜单-均可分等级 | Leaderboard or ranking module | cms:rank13#leaderboard | Usually requires operator backend IDs |
| topOne | 多个收送礼榜单第一名 | Leaderboard or ranking module | cms:topOne#leaderboard | Usually requires operator backend IDs |
| rankTopThree | 礼物榜单前N名 / 160 - 贵族充值前N名 | Leaderboard or ranking module | cms:rankTopThree#leaderboard | Usually requires operator backend IDs |
| rankGroup | 通用收送礼个人分组 / 120 - 多重礼物榜单奖励 / 160 - 贵族充值 参加资格 / 327 - 工会H2H分组 / 337 - 用户个人分组 | Leaderboard or ranking module | cms:rankGroup#leaderboard | Usually requires operator backend IDs |
| curFirst | 收礼榜 前N名及贡献者 | Activity CMS component | cms:curFirst#moduleName | Usually visual/config only |
| allDimensionLists | 礼物榜单 | Leaderboard or ranking module | cms:allDimensionLists#leaderboard | Usually requires operator backend IDs |
| commonDailyRank | 礼物榜单 - 日榜 | Leaderboard or ranking module | cms:commonDailyRank#leaderboard | Usually requires operator backend IDs |
| commonGiftRank | 礼物榜单 - 多个榜单 | Leaderboard or ranking module | cms:commonGiftRank#leaderboard | Usually requires operator backend IDs |
| commonRankImg | 礼物榜单 - 多礼物统计 | Leaderboard or ranking module | cms:commonRankImg#leaderboard | Usually requires operator backend IDs |
| aprilFoolsDay | 24 - 愚人节榜单 | Leaderboard or ranking module | cms:aprilFoolsDay#leaderboard | Usually requires operator backend IDs |
| madnessRank | 160 - 贵族充值 | Leaderboard or ranking module | cms:madnessRank#leaderboard | Usually requires operator backend IDs |
| leaderboardRecharege | 188 - 充值返金币 / 239 - 小游戏任务礼包 | Task or mission module | cms:leaderboardRecharege#taskModule | Usually requires operator backend IDs |
| speedRecharge | 141 - 充值时速 / 144 - 时速对决 | Recharge or payment activity module | cms:speedRecharge#moduleName | Usually requires operator backend IDs |
| jackpotRank | 177 - 瓜分奖池榜单 | Leaderboard or ranking module | cms:jackpotRank#leaderboard | Usually requires operator backend IDs |
| violation | 191 - 违规通报模板 | Activity CMS component | cms:violation#moduleName | Usually visual/config only |
| topicSquare | 235 - 动态广场转评赞 文章榜 | Activity CMS component | cms:topicSquare#moduleName | Usually visual/config only |
| feedpraise | 235 - 动态广场转评赞 用户聚合榜 | Activity CMS component | cms:feedpraise#moduleName | Usually visual/config only |
| vipLevelRank | 120 - 多重礼物榜单 / 175 - 游戏金币流水榜单 / 316 - 直签主播互刷 / 342 - 圣诞铃铛追击 | Leaderboard or ranking module | cms:vipLevelRank#leaderboard | Usually requires operator backend IDs |
| h2hRank | 76 - 直播时长榜单 / 280 - 新H2H节目单 / 323 - 周年消消乐 / 340 - 1v1消费场景榜单 | Leaderboard or ranking module | cms:h2hRank#leaderboard | Usually requires operator backend IDs |
| guildRank | 280 - 新H2H节目单 公会 | Leaderboard or ranking module | cms:guildRank#leaderboard | Usually requires operator backend IDs |
| wishListRank | 119 - 主播粉丝礼物 / 224 - 心愿单榜单 | Leaderboard or ranking module | cms:wishListRank#leaderboard | Usually requires operator backend IDs |
| cpProgress | 234 - cp进度条 + 分组 | Activity CMS component | cms:cpProgress#moduleName | Usually visual/config only |
| cpTopN | 234 - cp活动前几名 | Activity CMS component | cms:cpTopN#moduleName | Usually visual/config only |
| cpRank2 | 234 - cp活动 | Leaderboard or ranking module | cms:cpRank2#leaderboard | Usually requires operator backend IDs |
| cpDailyTop1 | 234 - 日榜top1 cp | Activity CMS component | cms:cpDailyTop1#moduleName | Usually visual/config only |
| legionBattle | 252 - 军团领土争夺战 | Activity CMS component | cms:legionBattle#moduleName | Usually visual/config only |
| agencyRank | 月初公会排名 | Leaderboard or ranking module | cms:agencyRank#leaderboard | Usually requires operator backend IDs |
| accTaskRank | 282 - 通用累积任务 | Leaderboard or ranking module | cms:accTaskRank#leaderboard | Usually requires operator backend IDs |
| starGift | 288 - 明星礼物 | Gift or reward module | cms:starGift#moduleName | Usually visual/config only |
| coastsRank | 294 - 东西大战 榜单 | Leaderboard or ranking module | cms:coastsRank#leaderboard | Usually requires operator backend IDs |
| auditionRank | 312 - 主播晋级赛 | Leaderboard or ranking module | cms:auditionRank#leaderboard | Usually requires operator backend IDs |
| luckyPartnerRank | 319 - 幸运拍档 | Leaderboard or ranking module | cms:luckyPartnerRank#leaderboard | Usually requires operator backend IDs |
| agencyH2H | 327 - 工会H2H | Activity CMS component | cms:agencyH2H#moduleName | Usually visual/config only |
| gameTaskRank | 337 - 累计任务达标 | Leaderboard or ranking module | cms:gameTaskRank#leaderboard | Usually requires operator backend IDs |
| vipLevelRankV2 | 337 - 游戏金币流水榜单V2 | Leaderboard or ranking module | cms:vipLevelRankV2#leaderboard | Usually requires operator backend IDs |
| noContractRank | 343 - 连麦房榜单 | Leaderboard or ranking module | cms:noContractRank#leaderboard | Usually requires operator backend IDs |
| annualAnchor | 347 - 年度主播 | Anchor profile module | cms:annualAnchor#moduleName | Usually visual/config only |
| liveRain | 59 - 缤纷盛夏水果趴 | Activity CMS component | cms:liveRain#moduleName | Usually visual/config only |
| rainResult | 67 - 直播间落雨结果页 | Living room entrance module | cms:rainResult#moduleName | Usually visual/config only |
| blackbox | 103 - 盲盒 | Blind box lottery module | cms:blackbox#moduleName | Usually requires operator backend IDs |
| taskDraw | 154 - 做任务抽奖领礼包 | Lottery or draw module | cms:taskDraw#drawModule | Usually requires operator backend IDs |
| workshop | 215 - 神秘车间 | Activity CMS component | cms:workshop#moduleName | Usually visual/config only |
| encourageDraw | 253 - 激励向抽奖 - 转盘+翻牌 | Lottery or draw module | cms:encourageDraw#drawModule | Usually requires operator backend IDs |
| encourageDraw2 | 253 - 激励向抽奖 - 摩天轮 | Lottery or draw module | cms:encourageDraw2#drawModule | Usually requires operator backend IDs |
| encourageDraw3 | 253 - 激励向抽奖 - 九宫格 | Lottery or draw module | cms:encourageDraw3#drawModule | Usually requires operator backend IDs |
| yearLuckDraw | 253 - 激励向抽奖 - 老虎机 | Lottery or draw module | cms:yearLuckDraw#drawModule | Usually requires operator backend IDs |
| encourageDraw4 | 253 - 激励向抽奖 - 切换 | Lottery or draw module | cms:encourageDraw4#drawModule | Usually requires operator backend IDs |
| encourageDraw5 | 253 - 激励向抽奖 - 扭蛋机 | Lottery or draw module | cms:encourageDraw5#drawModule | Usually requires operator backend IDs |
| cntDrawRecord | 253 - 金币抽奖 - 滚动记录 / 个人记录 / 累计次数进度 | Lottery or draw module | cms:cntDrawRecord#drawModule | Usually requires operator backend IDs |
| cntDraw | 253 - 金币抽奖 | Lottery or draw module | cms:cntDraw#drawModule | Usually requires operator backend IDs |
| drawPool | 274 - 奖池升级 | Lottery or draw module | cms:drawPool#drawModule | Usually requires operator backend IDs |
| drawPool2 | 274 - 奖池升级 节日主题 | Lottery/prize-pool module, including floating award notice / barrage | cms:drawPool2#drawModule | Includes `get`, `barrageBg`, `barrageColor`; requires operator backend IDs |
| shareCake | 277 - 收集物品瓜分蛋糕 | Activity CMS component | cms:shareCake#moduleName | Usually visual/config only |
| auction | 300 - 低价竞拍 | Activity CMS component | cms:auction#moduleName | Usually visual/config only |
| xmasGift | 307 - 圣诞节礼物交换 | Gift or reward module | cms:xmasGift#moduleName | Usually visual/config only |
| matchGame | 323 - 周年消消乐 | Activity CMS component | cms:matchGame#moduleName | Usually visual/config only |
| watchSurprise | 325 - 看播有惊喜 | Activity CMS component | cms:watchSurprise#moduleName | Usually visual/config only |
| turkeyMatch | 338 - 抽奖对对碰 | Lottery or draw module | cms:turkeyMatch#drawModule | Usually requires operator backend IDs |
| gameJackpot | 351 - 游戏Jackpot | Jackpot or prize pool module | cms:gameJackpot#moduleName | Usually requires operator backend IDs |
| rechargeProgressBar | 160 - 双周充值进度 | Recharge or payment activity module | cms:rechargeProgressBar#moduleName | Usually requires operator backend IDs |
| rechargeLX2 | 208 - 连续充值 - 列表 | Recharge or payment activity module | cms:rechargeLX2#moduleName | Usually requires operator backend IDs |
| rechargeStation | 240 - 充值驿站 | Recharge or payment activity module | cms:rechargeStation#moduleName | Usually requires operator backend IDs |
| lattice | 245 - 音乐节 | Activity CMS component | cms:lattice#moduleName | Usually visual/config only |
| accumulateTask | 282 - 通用累积任务 | Task or mission module | cms:accumulateTask#taskModule | Usually requires operator backend IDs |
| accTaskTopOne | 282 - 通用累积任务 / 76 - 直播时长 每日Top1 | Task or mission module | cms:accTaskTopOne#taskModule | Usually requires operator backend IDs |
| accTaskMap | 282 - 通用累积任务 地图 | Task or mission module | cms:accTaskMap#taskModule | Usually requires operator backend IDs |
| accJigsaw | 282 - 通用累积任务 拼图 | Task or mission module | cms:accJigsaw#taskModule | Usually requires operator backend IDs |
| rechargeWeekCard | 304 - 充值周卡 | Recharge or payment activity module | cms:rechargeWeekCard#moduleName | Usually requires operator backend IDs |
| continuousRecharge | 310 - 连续充值签到补签 | Recharge or payment activity module | cms:continuousRecharge#moduleName | Usually requires operator backend IDs |
| rechargeLuckyStar | 322 - 充值幸运星 | Lottery or reward module | cms:rechargeLuckyStar#moduleName | Usually requires operator backend IDs |
| sevenDayRecharge | 339 -7日充值任务 | Task or mission module | cms:sevenDayRecharge#taskModule | Usually requires operator backend IDs |
| rebateCoupon | 341 - 大额促充抽返点 | Activity CMS component | cms:rebateCoupon#moduleName | Usually visual/config only |

## Living Room Entrance Components

| componentName | 中文名称 | English Purpose | PSD Annotation Example | Notes |
|---|---|---|---|---|
| tabComps | 选项卡 | Tab container | cms:tabComps#mainTabs | Usually visual/config only |
| room1 | 静态图 | Static image block | cms:room1#hero or cms:room1#sectionName | Requires asset upload and CDN replacement |
| room2 | 礼物榜单 | Leaderboard or ranking module | cms:room2#leaderboard | Usually requires operator backend IDs |
| room3 | 199 - 闯关 | Living room entrance module | cms:room3#moduleName | Usually visual/config only |
| room5 | 256 - 万圣节 | Living room entrance module | cms:room5#moduleName | Usually visual/config only |
| room6 | 电商入口 | Living room entrance module | cms:room6#moduleName | Usually visual/config only |
| room7 | 120 - 多重收礼buff消息 | Living room entrance module | cms:room7#moduleName | Usually visual/config only |
| room8 | 120 - 多重收礼榜单V2 | Leaderboard or ranking module | cms:room8#leaderboard | Usually requires operator backend IDs |
| room9 | 216 - 表白墙 | Living room entrance module | cms:room9#moduleName | Usually visual/config only |
| room10 | 234 - cp活动 | Living room entrance module | cms:room10#moduleName | Usually visual/config only |
| room12 | 262 - 推广召回活动 | Living room entrance module | cms:room12#moduleName | Usually visual/config only |
| room13 | 267 - 唤醒丘比特 | Living room entrance module | cms:room13#moduleName | Usually visual/config only |
| room14 | 253 - 激励抽奖 | Lottery or draw module | cms:room14#drawModule | Usually requires operator backend IDs |
| room15 | 272 - 金币蓄力池 | Living room entrance module | cms:room15#moduleName | Usually visual/config only |
| room16 | 271 - 大富翁 | Living room entrance module | cms:room16#moduleName | Usually visual/config only |
| room19 | 284 - 线下推广 | Living room entrance module | cms:room19#moduleName | Usually visual/config only |
| room20 | 292 - 亲密关系 | Living room entrance module | cms:room20#moduleName | Usually visual/config only |
| room21 | 294 - 东西大战 全民PK | Living room entrance module | cms:room21#moduleName | Usually visual/config only |
| room22 | 294 - 东西大战 明星赛 | Living room entrance module | cms:room22#moduleName | Usually visual/config only |
| room23 | 294 - 东西大战 榜单 | Leaderboard or ranking module | cms:room23#leaderboard | Usually requires operator backend IDs |
| room24 | 330 - 主播颜艺评选 | Anchor or host activity module | cms:room24#moduleName | Usually visual/config only |
| room25 | 329 - 观光巴士 | Living room entrance module | cms:room25#moduleName | Usually visual/config only |
| room26 | 282 - 通用累积任务 | Task or mission module | cms:room26#taskModule | Usually requires operator backend IDs |
| room27 | 342 - 圣诞铃铛追击 | Living room entrance module | cms:room27#moduleName | Usually visual/config only |
