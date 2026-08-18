# iSnips V2 补充产品实施方案

> 版本：V2
>
> 本方案是在 iSnips V1 产品方案基础上的补充与修订，不替代 V1。
>
> V2 的核心变化：
>
> **原始记录保持原样 → 汇总查看不经过 AI → 生成 Markdown 文档后才允许编辑 → AI 主要负责分析、汇总与生成报告。**

## 1. V2 产品核心原则

核心链路：

```text
记录
 ↓
数据范围 Scope
 ↓
 ┌───────────────┬────────────────┬────────────────┐
 ↓               ↓                ↓
汇总查看       生成 Markdown      AI 分析
只读           可编辑文档         AI 报告
不使用 AI      不使用 AI          使用 AI
```

| 功能 | AI | 可编辑 | 作用 |
|---|---:|---:|---|
| 汇总查看 | ❌ | ❌ | 查看一定时间范围内的原始数据 |
| 生成 Markdown 文档 | ❌ | ✅ | 将筛选范围内的原始数据生成新文档 |
| AI 分析/报告 | ✅ | ✅* | 对指定范围的数据进行分析并生成报告 |

> *编辑的是生成出来的报告，不会反向修改原始记录。

## 2. 原始 Record

Record 是 iSnips 最底层的数据。

来源包括：

- 闪记
- 片段
- 剪贴板
- RSS
- Web 手动输入
- Local App
- 后续其他来源

核心原则：

> **原始 Record 不因为汇总、生成文档或 AI 分析而发生变化。**

## 3. 分类体系

V2 保留现有：

```text
闪记
片段
```

增加：

```text
剪贴板
```

### 闪记

用户主动、快速记录的信息，例如一句话、一个想法、临时备忘。

### 片段

主要来自网页的摘录、高亮、选中文字、网页内容、URL / 页面标题。

### 剪贴板

由浏览器插件和 Local App 自动捕获用户 COPY 行为。

## 4. 汇总查看：完全不经过 AI

用户进入某个分类后，可以选择：

```text
原始
按天
按周
按月
按年
```

汇总查看只是：

> **数据库查询 + 分组 + 排序 + 展示。**

不调用 AI，不改变原始内容，也不允许直接编辑。

例如按周：

```text
2026-W33

周一
- ...
- ...

周二
- ...
- ...
```

## 5. 生成 Markdown 文档

“生成文档”与“AI 报告”是两个不同功能。

用户指定范围：

```text
分类：闪记
时间：2026-08-01 ～ 2026-08-15
```

点击“生成 Markdown 文档”，系统直接：

```text
筛选
 ↓
排序
 ↓
按时间组织
 ↓
生成 Markdown
```

不经过 AI。

生成的文档示例：

```markdown
# 2026年8月上半月闪记

## 8月1日

- 今天想到一个新的产品方向。
- 需要进一步研究 RSS。

## 8月2日

- 看到一个新的 AI 项目。
- 记录了几个想法。
```

## 6. Document 与原始 Record 完全分离

```text
Record A
Record B
Record C
      ↓
生成
      ↓
Document X
```

用户可以自由编辑 Document X，但不能反向修改 Record A/B/C。

V2 的核心数据对象变为：

```text
Record
Document
Report
```

### Record

原始数据，不因整理或分析而变化。

### Document

由选定 Record 生成的 Markdown 文档，可由用户继续编辑。

适合：

- 周记
- 工作记录
- 阅读记录
- 项目笔记
- 研究笔记
- 个人总结

### Report

AI 分析产生的 Markdown 报告，可继续编辑，但不会修改原始 Record。

适合：

- AI 日报
- 周报
- 月报
- 年报
- 专题分析
- 自定义报告

## 7. Web / Local App 统一使用 Markdown 编辑器

V2 统一采用 Markdown 作为主要编辑格式。

适用于：

- Document
- Report
- Note
- Idea

支持后续：

- `.md` 导出
- HTML
- PDF
- Git 管理

目标是降低用户的数据锁定感。

## 8. AI 自动分类取消

V2 不做“AI 自动判断这是闪记还是片段”。

分类基于：

- 来源
- 用户行为
- 产品规则

AI 专注于：

- 摘要
- 分析
- 汇总
- 报告
- 趋势
- 对比

好处：

- 降低 AI 成本
- 减少误判
- 简化后台
- 保持产品确定性

## 9. AI 的核心职责

### 9.1 摘要

对指定数据范围进行压缩。

### 9.2 分析

分析：

- 主要主题
- 重点内容
- 重复观点
- 趋势
- 变化
- 问题
- 机会

### 9.3 报告

生成：

- 日报
- 周报
- 月报
- 年报
- 自定义报告

### 9.4 对比

例如：

> 比较 2026 年 7 月与 8 月我的关注重点有什么变化？

### 9.5 长周期分析

例如：

> 分析我过去半年关于 AI Agent 的所有记录。

## 10. Data Scope：所有 AI 功能的统一入口

AI 不默认读取整个 Index，必须先定义 Scope。

例如：

```text
时间：
2026-08-01 ～ 2026-08-15

类型：
☑ 闪记
☑ 片段
☑ 剪贴板
☐ RSS

关键词：
AI
Agent

隐私：
☐ 排除隐私
```

然后提供：

```text
[汇总查看]
[生成 Markdown]
[AI 分析]
```

这是 V2 的统一操作入口。

## 11. AI Report 模型

```text
Report
├── id
├── user_id
├── title
├── scope
├── prompt
├── model
├── result
├── created_at
├── token_usage
└── ai_credit_cost
```

其中 `scope` 永久记录生成报告时 AI 被允许读取的原始数据范围。

## 12. 报告可编辑，但不修改 Record

```text
327 条 Record
      ↓
AI Analysis
      ↓
Report A
```

用户可以修改标题、删除段落、增加观点、重新组织结构；修改只作用于 Report A。

## 13. 浏览器插件 V2

现有 Chrome 插件升级为：

> **Browser Capture + Clipboard + Sync + Privacy**

核心功能：

```text
主动
├── 闪记
└── 片段

自动
└── 剪贴板

账户
└── 登录 / 同步

安全
└── 隐私
```

## 14. 自动记录 COPY

浏览器插件新增自动捕获 COPY 行为：

```text
网页中复制
 ↓
Clipboard Event
 ↓
创建 Clipboard Record
 ↓
本地保存
 ↓
实时同步
```

建议记录：

```text
content
created_at
source_url
page_title
domain
device_id
privacy
```

如果复制发生在网页中，尽量保存来源上下文：

```text
复制内容
来源 URL
网页标题
复制时间
```

## 15. Local App 自动收集 COPY

Mac App 也自动监听系统剪贴板变化。

统一数据模型：

```text
Browser COPY → type = clipboard
macOS COPY   → type = clipboard
```

这样用户可以跨来源统一搜索剪贴板记录。

## 16. 浏览器历史记录：可选能力

技术上浏览器插件可以申请并读取历史记录，但这属于高度敏感的数据采集功能。

V2 建议：

```text
浏览历史分析
[ ] 启用
```

默认关闭。

## 17. 浏览历史不直接作为普通 Record

不要把每一次网页访问都直接变成 Record，否则数据量会快速膨胀。

单独定义：

```text
BrowserHistory
├── url
├── title
├── domain
├── visited_at
└── visit_count
```

它属于：

> **用户行为数据**

而普通 Record 属于：

> **用户主动保存的信息**

## 18. 浏览历史分析的用途

主要用作 AI 的上下文。

例如用户开启“最近 30 天浏览历史分析”，AI 可以分析：

- 最近关注的主题
- 高频访问的网站
- 兴趣变化
- 与已保存 Record 的关系
- 互联网信息输入轨迹

建议至少支持：

```text
[ ] 启用浏览历史分析

范围：
○ 最近 7 天
○ 最近 30 天
○ 全部

网站范围：
○ 全部
○ 指定域名
```

后续增加黑名单，例如银行、邮箱、企业内部系统等。

## 19. Browser Extension 登录与实时同步

V2 加入用户登录。

登录后：

```text
Browser Extension
      ↓
Auth
      ↓
Sync API
```

用户的闪记、片段、剪贴板、隐私状态等自动同步。

“实时同步”不等于每个操作立即完整同步数据库文件，而是：

```text
Local Event
 ↓
Sync Queue
 ↓
Server
 ↓
WebSocket / SSE 通知
 ↓
其他设备拉取变更
```

## 20. 隐私功能

V2 只提供一种隐私等级：

```text
普通
🔒 隐私
```

隐私数据：

- 客户端加密
- 云端保存密文
- 默认不进入云端 AI
- 默认不进入云端全文搜索
- 可以跨设备同步

## 21. 前期只使用云端 AI

V2 不做本地 AI。

原因：

- 降低技术复杂度
- 更快产品化
- 方便控制 AI 成本
- 统一模型体验
- 配合 AI Credits

数据处理：

```text
普通数据
→ Cloud AI

隐私数据
→ 默认不进入 Cloud AI
```

## 22. AI Credits + Free / Plus / Pro

推荐：

```text
Free
Plus
Pro
```

同时底层使用 AI Credits 控制 AI 可变成本。

例如：

```text
摘要            → 少量 Credits
周报            → 中等 Credits
全库分析        → 较多 Credits
大型专题报告    → 根据数据量计算
```

用户前台看到：

> 预计消耗 12 AI Credits

而不是 Token 数量。

## 23. Markdown 编辑体验

Web / Local App 统一 Markdown Editor。

建议所有可编辑对象共享 Markdown 数据格式：

```text
Document
Report
Note
Idea
```

## 24. Web / App / Extension 的职责

### Web

- 主工作台
- 手动新增
- 编辑
- 搜索
- 汇总查看
- Markdown 文档
- AI Report
- RSS
- Super Home
- 账号 / 订阅

### Browser Extension

- 闪记
- 片段
- 自动剪贴板
- 可选浏览历史
- 登录
- 实时同步

### Local App

- 系统剪贴板自动收集
- 全局快捷键
- Quick Capture
- 本地缓存 / 离线
- Markdown 编辑
- 隐私数据处理

## 25. V2 数据模型

建议至少：

```text
users
devices

records
record_tags
tags

documents
reports
report_scopes

feeds
feed_items

browser_history

subscriptions
ai_usage
ai_credits

sync_events
```

以后再增加：

```text
home_pages
home_widgets
attachments
embeddings
```

## 26. V2 核心对象关系

```text
                    Record
                       │
                 Data Scope
                       │
          ┌────────────┼─────────────┐
          ↓            ↓             ↓
       汇总查看      Document       Report
          │            │             │
        只读         可编辑         AI生成
                       │             │
                       └──────┬──────┘
                              ↓
                         Markdown
```

## 27. V2 核心用户流程

### 流程 A：汇总查看

```text
进入分类
 ↓
选择时间范围
 ↓
按天 / 周 / 月 / 年
 ↓
只读查看
```

### 流程 B：生成文档

```text
选择范围
 ↓
生成 Markdown
 ↓
打开编辑器
 ↓
用户编辑
 ↓
保存 Document
```

### 流程 C：AI 报告

```text
选择范围
 ↓
指定分析目标
 ↓
估算 AI Credits
 ↓
生成报告
 ↓
保存 Report
 ↓
用户可以继续编辑
```

## 28. RSS

RSS 定位：

> **自动信息入口。**

核心功能：

- Feed 添加
- OPML 导入
- 分类
- 定时抓取
- 去重
- 阅读
- 保存
- AI 摘要
- Digest

RSS Item 可以进入：

```text
type = rss
```

然后参与 Data Scope / Report。

AI 不负责给 RSS 自动分类，主要负责摘要、Digest、关系分析和报告。

## 29. Super Home

超级主页是用户每天进入 iSnips 的入口，也可以作为浏览器新标签页。

建议 Widget：

```text
Search
Recent Records
RSS
Today's Digest
Recent Documents
Recent Reports
Quick Capture
Quick Note
Custom Links
Clock
Calendar
Weather
```

支持：

- 拖拽
- 调整大小
- 隐藏
- 多页面
- 自定义主题

例如：

```text
My Home
AI
Work
Reading
Personal
```

## 30. Chrome New Tab

浏览器插件可以通过 `chrome_url_overrides` 将 iSnips 设置为新标签页。

必须由用户主动开启。

首屏应该极轻量，优先加载：

```text
Search
Quick Capture
Recent
Digest
```

其他 Widget 异步加载。

## 31. V2 性能原则

Next.js 继续使用。

重点不是更换 Web 框架，而是控制首屏和后台任务。

首页采用：

```text
First Paint
 ↓
Search / Navigation
 ↓
Recent Records
 ↓
RSS
 ↓
AI Digest
```

不要让首页等待 RSS 抓取或 AI 完成。

## 32. V2 技术栈调整

### Web

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

### Browser Extension

```text
TypeScript
Manifest V3
WebExtension API
IndexedDB
```

### Local App

```text
Tauri 2
Rust
React
TypeScript
SQLite
FTS5
```

### Backend

```text
Next.js API
PostgreSQL
R2
Queue / Worker
```

### AI

```text
OpenAI
Anthropic
Gemini
OpenRouter
Cloudflare
```

通过统一 Provider 抽象调用。

## 33. V2 同步原则

不要同步 SQLite 文件。

采用：

> **Record-level Sync**

字段：

```text
record_id
device_id
version
updated_at
deleted_at
```

本地：

```text
SQLite
 ↓
Outbox
 ↓
Sync API
```

云端：

```text
PostgreSQL
 ↓
Sync Event
 ↓
其他设备
```

## 34. V2 暂不做

- AI 自动分类
- 本地 AI
- Android
- 知识图谱
- CRDT
- 团队协作
- 社交
- 完整密码管理器
- Agent
- 复杂自动化
- 过度复杂的 Markdown Block 系统

重点先做好：

> **Capture → Index → Scope → View / Document / AI Report**

## 35. V2 开发优先级

### P0：核心

1. Record 数据模型
2. 闪记 / 片段 / 剪贴板
3. COPY 自动记录
4. Web 登录
5. Browser Extension 登录
6. 实时同步
7. Markdown 编辑器
8. 汇总查看
9. Markdown 生成文档
10. Data Scope
11. AI Report
12. 隐私

### P1：产品增强

13. Local App Clipboard
14. RSS
15. Super Home
16. Chrome New Tab
17. AI Credits
18. Free / Plus / Pro

### P2：探索能力

19. Browser History
20. 兴趣趋势分析
21. 长周期 AI 分析
22. iOS
23. Semantic Search
24. 更高级 Report

## 36. V2 核心差异化

传统工具：

```text
用户保存
 ↓
信息越来越多
 ↓
越来越难管理
```

iSnips：

```text
用户持续记录
 ↓
Index 持续增长
 ↓
选择 Data Scope
 ↓
免费快速汇总查看
 ↓
生成 Markdown 文档
 ↓
AI 分析
 ↓
生成 Report
 ↓
形成长期认知
```

## 37. V2 产品设计原则

> **记录保持原始，汇总保持客观，文档允许编辑，AI 负责产生洞察。**

### Record

事实 / 原始记录。

### 汇总

查看数据，不改变数据。

### Document

用户整理后的可编辑内容。

### Report

AI 对指定数据范围分析后的结果。

## 38. V2 最终价值闭环

```text
复制 / 摘录 / 记录 / RSS
             ↓
        Personal Index
             ↓
       持续积累 Record
             ↓
        选择 Data Scope
             ↓
    ┌────────┼─────────┐
    ↓        ↓         ↓
  汇总     Document   AI Report
    │        │         │
  查看      编辑      洞察
    │        │         │
    └────────┴─────────┘
             ↓
          长期积累
             ↓
      更完整的个人信息资产
```

> **iSnips V2 不是让 AI 替用户管理每一条信息，而是让用户保留原始信息，并在需要的时候，以不同的时间范围、分类和主题重新组织、重新理解，并把有价值的结果沉淀下来。**
