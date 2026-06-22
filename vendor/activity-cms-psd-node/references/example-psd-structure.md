# PSD 结构示例

这些示例给 UI 整理 PSD 时参考。新 PSD 优先使用中文前缀：`切图:` 和 `组件:`。

## 最小页面

```txt
画板 1
  切图:头图[750x900]
  切图:规则背景
  组件:倒计时
```

输出重点：

- `assets/头图.png`
- `assets/规则背景.png`
- `theme.json`
- `cms-page-config.json` 中生成真实 `countDown`
- `--debug` 模式下 `inspect/component-detection.json` 中记录 `countDown` 来源

## 带抽奖和榜单的活动页

```txt
画板 1
  切图:头图
  切图:倒计时背景
  组件:倒计时

  切图:主选项卡
  组件:奖池升级
  切图:飘屏中奖通告
  切图:抽奖标题[700x180]
  切图:抽奖面板
  切图:奖池标题[750x180]
  切图:奖池进度

  组件:榜单
  切图:榜单背景
  切图:规则背景
```

输出重点：

- 所有 `切图:` 都会导出 PNG。
- `组件:奖池升级` 会在 JSON 中生成真实 `drawPool2`。
- `组件:榜单` 会在 JSON 中生成真实 `commonGiftRank`。
- 切图和组件互不阻塞；切图进入 `assets/`，组件进入 `cms-page-config.json`。

## 尺寸标注

有目标尺寸：

```txt
切图:抽奖标题[700x180]
```

无目标尺寸：

```txt
切图:规则背景
```

规则：

- 有尺寸时，Skill 会在 `--debug` 模式的 `inspect/export-report.json` 记录目标尺寸和导出尺寸。
- 无尺寸时，Skill 按 PSD 图层/组的实际 bounds 导出。
- 比例不一致时不自动裁切或拉伸，会在报告中标记 `size-mismatch`。

## 错误示例

不要把整页都放成一个切图：

```txt
切图:整页
  所有内容
```

不要把业务 ID 写进 PSD：

```txt
actId=1200
testId=1716
```

不要把切图和组件混在一个复杂名字里：

```txt
cms:drawPool2#upgradePrizePool[750x1200]
```

正确拆开：

```txt
组件:奖池升级
切图:抽奖面板[750x1200]
```

## 旧格式兼容

旧格式仍可被 Skill 识别，但不再推荐给 UI 使用：

```txt
cms:piccomponent#hero
  asset:url

cms:drawPool2#upgradePrizePool
  asset:drawImg
  asset:poolImg
```
