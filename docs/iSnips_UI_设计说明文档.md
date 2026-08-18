# iSnips UI 设计说明文档

> 版本：V1 UI Direction  
> 产品：iSnips  
> 设计方向：Apple / iCloud 风格的 Personal Information OS

---

## 1. 设计目标

iSnips 的 UI 不应表现得像传统 SaaS 后台、笔记软件或知识库，而应该更接近：

> **一个安静、轻盈、私人化的数字信息空间。**

整体视觉参考：

- iCloud.com：整体空间、留白、层次、轻量化
- Apple Notes：内容阅读与编辑体验
- macOS Spotlight：搜索与快速操作
- Bear：Markdown / 长文本阅读体验
- 少量 Raycast：快捷操作效率

核心气质：

> **轻、静、清晰、克制、内容优先、原生感。**

---

# 2. UI 核心关键词

| 关键词 | 设计含义 |
|---|---|
| Light | 轻量、明亮、不压迫 |
| Calm | 安静，不制造视觉噪音 |
| Spacious | 大留白、呼吸感 |
| Content First | 内容优先于装饰 |
| Native | 像操作系统的一部分 |
| Personal | 有个人空间感，而不是企业后台 |
| Focused | 一个页面只突出一个主要目标 |

---

# 3. 整体视觉定位

### 推荐定位

> **Apple-like Personal Information OS**

而不是：

- AI Knowledge Base
- Note Taking SaaS
- Bookmark Manager
- Clipboard Manager
- RSS Reader

iSnips 应该让用户感觉：

> “这是我的个人数字空间。”

---

# 4. 色彩系统

## 4.1 主背景

推荐使用非常接近 Apple 的浅灰白：

```text
Background Primary
#F5F5F7
```

## 4.2 内容表面

```text
Surface
#FFFFFF
```

## 4.3 主要文字

```text
Text Primary
#1D1D1F
```

## 4.4 次要文字

```text
Text Secondary
#6E6E73
```

## 4.5 辅助文字

```text
Text Tertiary
#86868B
```

## 4.6 分割线

```text
Border
rgba(0, 0, 0, 0.06)
```

## 4.7 强调色

使用一个克制的 Apple Blue：

```text
Accent
#0071E3
```

强调色只用于：

- 当前选中状态
- 主要行动按钮
- 链接
- Focus
- AI Action
- 状态提示

禁止大面积使用高饱和色。

---

# 5. 深色模式

后续必须支持 Dark Mode，但第一版优先 Light Mode。

Dark Mode 不应该只是简单反转颜色，而应使用独立的深色层级。

建议：

```text
Background
#000000

Surface
#1C1C1E

Secondary Surface
#2C2C2E

Primary Text
#F5F5F7

Secondary Text
#98989D
```

整体依然保持：

> 低对比度、低噪音、柔和。

---

# 6. 圆角系统

采用 Apple 风格的中等圆角。

```text
XS    8px
SM    10px
MD    12px
LG    16px
XL    20px
XXL   24px
```

推荐：

- 输入框：12px
- Button：10–12px
- 小组件：12–16px
- 大模块：16–20px
- 页面大型 Surface：20–24px

不要所有东西都使用完全胶囊式 `9999px`。

---

# 7. 阴影系统

阴影必须克制。

优先使用：

```text
背景层级
+
轻微边框
```

而不是重阴影。

推荐：

```css
border: 1px solid rgba(0,0,0,0.06);
```

必要时：

```text
Shadow Small
0 2px 12px rgba(0,0,0,0.04)
```

不要出现厚重 SaaS 卡片阴影。

---

# 8. 字体

## Web

推荐：

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "PingFang SC",
  "PingFang TC",
  sans-serif;
```

中文优先：

- PingFang SC
- PingFang TC

## 字体气质

避免：

- 过粗
- 过大的标题
- 强烈的网页营销字体

强调：

> 清晰、细腻、自然。

---

# 9. 字体层级

推荐基础层级：

```text
Page Title
32 / 36

Section Title
22 / 28

Card / Item Title
17 / 22

Body
15 / 22

Secondary
13 / 18

Metadata
12 / 16
```

标题不应该全部使用 Heavy / Bold。

---

# 10. 间距系统

采用 4px 基础间距：

```text
4
8
12
16
20
24
32
40
48
64
80
```

主要页面：

- Header：16–24px
- Section：24–40px
- 大模块：32–48px
- 页面外围：32–64px

整体宁愿留白，也不要塞满。

---

# 11. 主体布局

桌面 Web 推荐：

```text
┌──────────────────────────────────────────────────┐
│ iSnips                      Search       Avatar  │
├───────────────┬──────────────────────────────────┤
│               │                                  │
│ Index         │                                  │
│               │             Main                 │
│ Inbox         │            Content               │
│ 闪记          │                                  │
│ 片段          │                                  │
│ 剪贴板        │                                  │
│ RSS           │                                  │
│               │                                  │
│ Documents     │                                  │
│ Reports       │                                  │
│               │                                  │
│ Home          │                                  │
│ Settings      │                                  │
└───────────────┴──────────────────────────────────┘
```

### 原则

- Sidebar 轻量
- Main Content 宽
- 搜索始终容易访问
- 不要做传统后台的深色导航栏

---

# 12. Sidebar

推荐：

```text
iSnips

⌕ Search

Index
  Inbox
  闪记
  片段
  剪贴板
  RSS

Knowledge
  Documents
  Reports

Home

────────────

Settings
```

当前选中项使用：

```text
浅灰色背景
+
12px 圆角
```

而不是明显的蓝色矩形。

---

# 13. Header

Header 尽量简单：

```text
┌──────────────────────────────────────────────┐
│ iSnips         Search your Index       👤   │
└──────────────────────────────────────────────┘
```

搜索是一级能力。

推荐快捷键：

```text
⌘ K
```

---

# 14. 全局搜索

搜索体验参考 macOS Spotlight。

打开：

```text
┌───────────────────────────────────────────┐
│ 🔍 Search your Index...                  │
├───────────────────────────────────────────┤
│                                           │
│ Recent                                    │
│                                           │
│ Cloudflare AI Gateway                    │
│ 一个产品想法                              │
│ AI Agent                                  │
│                                           │
└───────────────────────────────────────────┘
```

搜索对象统一：

- Record
- Document
- Report
- RSS
- Clipboard
- Notes

---

# 15. Super Home

超级主页是 iSnips 的日常入口。

视觉上应该：

> **像 iCloud 首页 + Personal Dashboard**

而不是 SaaS Dashboard。

示例：

```text
                Good evening

         What are you looking for?

             ┌────────────────┐
             │ Search...      │
             └────────────────┘


      Today                  This Week

      23 Records             2 Reports
      8 RSS                  37 New Items


      Recent
      ─────────────────────────────

      AI / Agent
      Cloudflare
      Product Ideas
```

---

# 16. Super Home 的核心原则

不要：

> 每个模块都做成卡片。

应该：

- 大模块使用 Surface
- 小信息使用列表
- 重要内容留白
- 不让页面看起来像数据仪表盘

---

# 17. Home Widgets

可选 Widget：

- Search
- Recent Records
- Today
- RSS
- AI Digest
- Recent Reports
- Quick Note
- Quick Capture
- Calendar
- Todo
- Weather
- Custom Links
- GitHub

用户可以：

- 拖拽
- 调整大小
- 隐藏
- 创建多个 Home
- 自定义布局

例如：

```text
My Home
AI
Work
Reading
Personal
```

---

# 18. Record 列表

风格参考 Apple Notes / Mail。

```text
Today

┌──────────────────────────────────────────────┐
│ Cloudflare AI Gateway                       │
│ cloudflare.com                              │
│ ...                                         │
│ 10:32                               片段   │
├──────────────────────────────────────────────┤
│ 一个新的产品想法                            │
│ ...                                         │
│ 09:41                               闪记   │
├──────────────────────────────────────────────┤
│ https://github.com/...                      │
│ ...                                         │
│ 08:52                             剪贴板   │
└──────────────────────────────────────────────┘
```

核心原则：

> **内容优先，Metadata 次之。**

---

# 19. Record Detail

记录详情更像阅读页面。

```text
← Back

Cloudflare AI Gateway

Aug 17, 2026

cloudflare.com

────────────────────────────

正文内容……

────────────────────────────

Tags
AI   Cloudflare
```

右上角只保留核心操作：

```text
···
Edit
Make Private
Create Document
Analyze
Delete
```

---

# 20. 汇总查看 UI

V2 核心功能。

顶部：

```text
闪记

[原始] [日] [周] [月] [年]
```

内容：

```text
August 17

10:32
记录内容……

09:21
记录内容……


August 16

22:41
记录内容……
```

右上角：

```text
生成文档
AI 分析
```

必须明确区分：

> 汇总 / 文档 / 报告

---

# 21. 汇总查看的视觉原则

汇总查看：

- 只读
- 无 AI
- 不显示复杂编辑工具栏
- 强调时间层次
- 内容连续展示

目的：

> **帮助用户回顾，而不是编辑。**

---

# 22. Markdown 编辑器

Web 与 Local App 统一。

设计方向：

> **Apple Notes + Bear**

而不是 VS Code。

工具栏：

```text
B   I   H1   H2   •   1.   Quote   Link   Code
```

平常可以隐藏。

输入内容时再出现。

---

# 23. Document UI

Document 是用户可编辑内容。

结构：

```text
Document Title

Last edited...
────────────────────

# 第一章

正文……

## 第二章

正文……
```

顶部：

```text
Back
Document
···
Export
```

尽可能弱化“后台编辑器”感。

---

# 24. AI Report UI

Report 应该有更明显的“报告阅读感”。

```text
AI Report

2026年8月第二周
AI / Agent 观察报告

Generated Aug 17, 2026

────────────────────────

Data Scope
Aug 10 — Aug 17
327 Records

────────────────────────

Overview

本周你主要关注……

────────────────────────

主要趋势

01 Agent Infrastructure
02 Personal AI
03 Local Models

────────────────────────

关键发现

……

────────────────────────

值得继续关注

……
```

---

# 25. Report 顶部必须显示 Data Scope

报告页面始终显示：

```text
Data Scope

Aug 10 — Aug 17
327 Records
闪记 / 片段 / 剪贴板
```

这是产品信任感的重要来源。

用户应该知道：

> “这份报告是根据哪些数据生成的。”

---

# 26. Document 与 Report 的视觉差异

### Document

强调：

- 编辑
- 整理
- 内容结构
- Markdown

### Report

强调：

- AI Insight
- Summary
- Trend
- Analysis
- 数据范围

但两者最终都使用 Markdown。

---

# 27. RSS UI

不要做成传统 RSS 阅读器。

推荐：

```text
RSS

AI
Technology
Cloudflare
GitHub

────────────────────

Today

The future of AI Agents
Cloudflare
10:32

Why local AI is changing...
09:12
```

重点是：

> 内容阅读 + AI 筛选

而不是：

> 未读数堆叠。

---

# 28. AI Digest

主页可以显示：

```text
Today's Digest

12 articles

3值得阅读
2 与你最近兴趣高度相关
1 个长期趋势
```

视觉上不要大量使用“AI”图标。

重点是结果。

---

# 29. AI 视觉语言

推荐统一使用：

```text
✦
```

作为 AI 标识。

例如：

```text
✦ Analyze
✦ Summarize
✦ Generate Report
```

避免：

- 🤖
- 大号 AI Logo
- 彩色发光渐变
- “AI POWERED”大标签

AI 应该像系统能力，而不是广告。

---

# 30. 隐私视觉

统一：

```text
🔒 Private
```

或者简洁的锁图标。

不要建立复杂的“保险箱”视觉。

普通：

```text
Record
```

隐私：

```text
🔒 Record
```

即可。

---

# 31. Button 体系

### Primary

用于：

- Save
- Generate Report
- Create Document

视觉：

- Accent Color
- 白色文字
- 10–12px 圆角

### Secondary

用于：

- Cancel
- Filter
- View Options

视觉：

- 白 / 浅灰
- 深色文字
- 轻边框

### Tertiary

用于：

- More
- Edit
- Auxiliary Actions

无明显背景。

---

# 32. Icon

建议：

> Lucide / SF Symbols 风格

原则：

- 线性
- 细
- 单色
- 小
- 统一 Stroke

避免：

- 大量 Emoji
- 彩色 3D Icon
- 卡通图标
- 过度装饰

---

# 33. 动效

动画必须：

> 快、轻、自然。

推荐：

```text
150–250ms
```

适合：

- Modal
- Sidebar
- Dropdown
- Page transition
- Hover
- AI 状态

避免：

- 长时间动画
- 大规模位移
- 炫光
- 粒子效果

---

# 34. Loading / AI 状态

不要使用传统：

```text
Loading...
```

推荐：

```text
✦ Analyzing your records...
```

或：

```text
Preparing report...
```

简单的进度状态即可。

---

# 35. Empty State

不要：

> 没有数据

而是：

```text
Nothing here yet.

Start saving snippets from the web,
your clipboard, or write something down.
```

操作：

```text
Quick Note
Save a Page
```

空状态应当引导用户行动。

---

# 36. Responsive Design

### Desktop

完整三栏/两栏布局。

### Tablet

Sidebar 可以收起。

### Mobile Web

优先：

```text
Bottom Navigation
```

建议：

```text
Home
Index
Capture
Reports
Settings
```

---

# 37. Browser Extension UI

插件不要复制完整 Web。

应该：

> 快速、轻量、操作一步完成。

Popup：

```text
iSnips

[ 写点什么...              ]

○ 闪记
○ 片段
○ 剪贴板

☐ 隐私

[ Save ]
```

网页选中文字后：

```text
Save to iSnips
```

即可。

---

# 38. Desktop App UI

Local App 的第一功能：

> **Spotlight / Maccy 风格 Quick Search**

例如：

```text
┌──────────────────────────────────────┐
│ 🔍 Search your Index...              │
├──────────────────────────────────────┤
│ Today                                │
│                                      │
│ Cloudflare AI Gateway                │
│ 一个产品想法                          │
│ AI Agent                             │
│                                      │
└──────────────────────────────────────┘
```

同时支持：

```text
⌘ + Shift + Space
```

快速呼出。

---

# 39. Personal Home 的视觉层次

建议采用：

```text
Background
    ↓
Large Content Surface
    ↓
Small Modules
    ↓
List Items
```

而不是：

```text
Background
 ↓
很多白色 Card
 ↓
Card 中再套 Card
```

避免“Dashboard 套娃”。

---

# 40. 边框与分割线

尽量用：

```text
rgba(0,0,0,0.06)
```

避免：

```text
#D0D0D0
```

这种明显的灰色边框。

Apple 风格更多依赖：

> 色彩层次 + 空间 + 微弱边界。

---

# 41. 页面最大宽度

一般内容阅读页面推荐：

```text
max-width: 1200–1360px
```

长文阅读区域：

```text
max-width: 720–820px
```

Report：

```text
720–900px
```

不要让长文本铺满整个屏幕。

---

# 42. 长文本阅读

Markdown / Report 阅读特别注意：

- 行高充足
- 段落间距明显
- 标题分级清晰
- 引用有轻微背景
- Code Block 有独立 Surface
- 链接保持强调色

阅读优先于信息密度。

---

# 43. UI 中避免的风格

iSnips 不建议：

- 深色 SaaS Sidebar
- 大量彩色 Card
- 大量渐变
- 过度玻璃拟态
- 大量 Emoji
- 巨型标题
- 复杂 Dashboard 图表
- 过度阴影
- 复杂 Block Editor
- 过多 Badge

核心原则：

> **少设计一点，反而更像 Apple。**

---

# 44. Design Tokens

建议第一版就建立：

```text
Color
Typography
Spacing
Radius
Shadow
Border
Motion
Icon
```

例如：

```text
--color-bg
--color-surface
--color-text
--color-text-secondary
--color-border
--color-accent

--space-1
--space-2
--space-3
...

--radius-sm
--radius-md
--radius-lg

--shadow-sm
```

后续 Web / Extension / Desktop 都尽量共用设计语言。

---

# 45. 设计系统组件

第一阶段建议建立：

```text
AppShell
Sidebar
Header
SearchCommand
Button
IconButton
Input
Textarea
Select
SegmentedControl
Tabs
Dropdown
Popover
Modal
Tooltip
Toast
RecordItem
RecordList
RecordDetail
Tag
PrivacyBadge
DateGroup
MarkdownEditor
ReportHeader
ReportSection
Widget
```

---

# 46. UI 组件设计原则

组件本身应该：

> 简单、无装饰、可复用。

例如 Button：

```text
Primary
Secondary
Tertiary
Destructive
```

不要一开始设计十几种视觉变体。

---

# 47. UI 与产品逻辑的对应

| 产品对象 | UI 形态 |
|---|---|
| Record | List / Detail |
| 汇总 | Timeline / Grouped List |
| Document | Markdown Editor |
| Report | Reading / Analysis |
| RSS | Reader List |
| Home | Custom Dashboard |
| Search | Spotlight |
| Privacy | Lock Status |

这套映射应该成为设计的基础。

---

# 48. 最终设计原则

1. **内容优先**
2. **大留白**
3. **低对比度**
4. **少卡片**
5. **少按钮**
6. **搜索优先**
7. **AI 克制**
8. **原生感**
9. **Markdown 优先**
10. **让用户感觉这是自己的数字空间**

---

# 49. 最终视觉定位

> **iSnips = iCloud 的空间感 + Apple Notes 的内容感 + Spotlight 的效率 + 少量 Raycast 的快捷能力。**

核心不是模仿 Apple，而是借鉴 Apple 的产品哲学：

> **让复杂功能隐藏在简单界面之后。**

用户看到的是：

```text
Search
Record
Home
Document
Report
```

而真正复杂的：

```text
Sync
AI
Scope
Encryption
RSS
Credits
```

都应该被隐藏在清晰的交互路径之后。

---

# 50. UI 设计结论

iSnips 最终应该呈现一种：

> **“私人、安静、现代、轻量，但功能非常深。”**

打开首页，不应该感觉：

> “这里有很多功能。”

而应该感觉：

> **“这是我的信息空间。”**

这才是最适合 iSnips 长期发展的 UI 方向。
