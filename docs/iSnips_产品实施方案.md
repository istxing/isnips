# iSnips 产品实施方案

> **产品暂定名：iSnips**
>
> **核心定位：把零散的信息记录，持续沉淀为可检索、可分析、可回看的个人报告。**
>
> 核心链路：
>
> **Capture → Index → AI Analysis → Report → Resurface**

---

## 1. 产品定位

iSnips 不应该被定义成：

- 一个剪贴板工具
- 一个 RSS Reader
- 一个收藏夹
- 一个笔记软件
- 一个 AI 聊天工具
- 一个知识库

这些只是不同的数据入口或能力。

### 1.1 核心定义

> **iSnips 是一个 Personal Information Index（个人信息索引系统）。**

用户每天会产生大量碎片化信息：

- 网页
- 网页摘录
- 高亮
- 剪贴板内容
- 收藏
- RSS 文章
- API Key / Token 等敏感信息
- 日记
- 随笔
- 想法
- AI 对话
- 代码片段
- 文件
- 手工记录

传统产品把它们分散在不同应用中。

iSnips 的目标是：

```text
各种信息入口
      ↓
统一进入 Personal Index
      ↓
AI 在用户指定的数据范围内分析
      ↓
生成报告
      ↓
报告长期保存
      ↓
用户不断回看和积累
```

### 1.2 最重要的产品原则

> **原始记录可以无限增长，报告负责不断降低信息复杂度。**

iSnips 不应该让用户最后拥有：

> 10 万条记录 + 5 万条 AI 摘要。

而应该逐渐形成：

```text
大量 Records
    ↓
若干主题
    ↓
阶段性 Reports
    ↓
长期认知 / 趋势 / 问题
```

---

# 2. 产品核心数据模型

产品的核心不是“Note”，而是 **Record**。

## 2.1 Record

所有进入 iSnips 的东西都可以抽象成 Record。

```text
Record
├── id
├── user_id
├── type
├── title
├── content
├── source_url
├── source_type
├── created_at
├── updated_at
├── tags
├── privacy
├── metadata
└── version
```

### type 建议

```text
clip
bookmark
highlight
note
idea
rss
document
report
```

后续可以增加：

```text
image
conversation
task
```

### privacy

第一版只保留两种：

```text
privacy = false
→ 普通

privacy = true
→ 隐私
```

不要拆成“隐私 / 机密”两个等级。

这样用户理解成本最低。

---

# 3. 报告模型

报告是产品真正的核心资产。

## 3.1 核心关系

不是：

```text
Record → Analysis → Report
```

而是：

```text
Record
   ↓
Data Scope
   ↓
AI Task / Prompt
   ↓
Report
```

## 3.2 Report

```text
Report
├── id
├── user_id
├── title
├── description
├── scope
├── prompt
├── model
├── created_at
├── updated_at
├── result
├── token_usage
├── ai_credit_cost
└── version
```

### scope 是关键

报告必须永久记录：

> **本次 AI 被允许读取什么数据。**

例如：

```json
{
  "time_range": {
    "start": "2026-08-01",
    "end": "2026-08-15"
  },
  "types": ["bookmark", "idea", "note"],
  "topics": ["AI", "Agent"],
  "exclude_privacy": true
}
```

因此用户生成报告时，本质是：

> **选择原始数据范围 + 指定分析目标。**

---

# 4. AI 报告机制

## 4.1 不要把 AI 核心设计成聊天

AI Chat 可以有，但不是核心价值。

核心应该是：

> **AI Analysis → Report**

用户真正想获得的是一份长期保存、可再次阅读的成果。

## 4.2 报告类型

### 日报

分析：

```text
今天新增的记录
```

用途：

- 今日信息总结
- 今日想法总结
- 今日关注点

### 周报

```text
最近 7 天
```

可以分析：

- 本周主要主题
- 新出现的关注方向
- 重复出现的观点
- 值得继续研究的问题

### 月报

```text
最近 30 天
```

重点：

- 趋势
- 兴趣变化
- 长期重复出现的主题
- 尚未解决的问题

### 年报

```text
2026-01-01 ~ 2026-12-31
```

重点：

- 全年重点关注方向
- 兴趣变化
- 长期项目
- 反复出现的想法
- 重要转折

### 自定义报告

用户自由设置：

```text
时间
类型
标签
主题
关键词
来源
是否包含报告
是否排除隐私
```

例如：

> 生成一份“2026 年 AI Agent 相关个人思考报告”。

---

# 5. Report 的一个重要设计：动态范围 vs 固定范围

建议同时支持：

### 动态范围

例如：

> 最近 7 天 + AI + Idea

以后再次打开报告时，范围继续动态变化。

适合：

- 持续周报
- 持续主题报告
- Dashboard 报告

### 固定范围

生成时记录明确的数据集合。

适合：

- 年度报告
- 专题报告
- 项目复盘
- 阶段总结

报告创建后应能显示：

```text
数据范围：
2026-08-01 ~ 2026-08-15
共 327 条记录
```

---

# 6. 报告可以继续成为新的 Record

这是非常重要的设计。

```text
原始 Record
      ↓
Report
      ↓
Report 也进入 Index
```

这样：

```text
2026-08 周报
      ↓
2026-08 月报
      ↓
2026-Q3 报告
      ↓
2026 年报
```

但不要简单地把上一层报告全文塞给下一层 AI。

应允许用户重新指定：

```text
原始记录
月报
专题报告
```

作为数据范围。

这样用户可以决定：

> 年报到底基于原始数据，还是基于月报，还是两者组合。

---

# 7. 三端产品结构

iSnips 应该从第一天就按“三端一体”设计。

```text
                         iSnips
                            │
           ┌────────────────┼────────────────┐
           │                │                │
          Web          Browser Extension   Local App
           │                │                │
      管理/编辑/AI         快速捕获          系统级入口
           │                │                │
           └────────────────┼────────────────┘
                            │
                         Sync API
                            │
                    Cloud Data Layer
```

---

# 8. Web 端：核心工作台

Web 是产品真正的“主工作台”。

## 8.1 功能

### Index

- 所有记录
- 搜索
- 筛选
- 标签
- 时间轴
- 类型过滤
- 来源过滤
- 隐私过滤

### 手动创建

支持：

- Note
- Idea
- Journal
- Bookmark
- 自定义 Record

### 编辑

允许：

- 修改标题
- 修改正文
- 修改标签
- 修改来源
- 修改隐私状态
- 删除 / 恢复

### AI

提供：

- 总结
- 分类
- 标签
- 提炼观点
- 生成报告
- 分析指定范围
- 比较多个范围
- 提炼趋势

---

# 9. Web 端核心工作流

建议设计成：

```text
选择数据范围
      ↓
选择分析任务
      ↓
AI 预估成本
      ↓
生成报告
      ↓
保存 Report
```

例如：

```text
数据范围
--------------------------------
时间：2026-08-01 ~ 2026-08-15
类型：Idea / Bookmark / Note
主题：AI / Agent
记录数：327
隐私：排除
--------------------------------

分析目标：
“总结我最近关于 AI Agent 的主要思考，
 找出重复出现的观点和新的方向。”

预计消耗：
12 AI Credits

[生成报告]
```

---

# 10. Browser Extension：iSnips 现有插件继续发展

你已经有 Chrome 插件 iSnips，这是非常重要的资产。

扩展定位应该保持简单：

> **Capture Client**

而不是把所有 Web 功能复制进去。

## 10.1 主要功能

- 选中文字
- 保存当前网页
- 保存 URL
- 保存网页标题
- 保存高亮
- 快速笔记
- 快速 Idea
- 保存为隐私
- 调用 AI 快速摘要

### 右键菜单

```text
Save to iSnips
Save as Note
Save as Idea
Save + AI Summary
Save as Private
```

---

# 11. Local App：Maccy 思路，但产品目标更大

本地 App 不是“另一个剪贴板”。

它是：

> **操作系统级 iSnips 入口。**

## 11.1 核心功能

- Clipboard Monitor
- Clipboard History
- 全局快捷键
- Spotlight 风格搜索
- Quick Capture
- 本地缓存
- 离线访问
- 本地隐私数据
- 后台同步

例如：

```text
⌘ + Shift + Space
```

打开：

```text
Search your Index...
```

可以同时搜索：

- Clipboard
- Bookmark
- Note
- Idea
- Reports

---

# 12. Super Home：超级主页

超级主页不是简单 Dashboard。

定位：

> **用户每天打开 iSnips 的 Personal Start Page。**

同时可以设置为浏览器新标签页。

## 12.1 Widget

建议支持：

- 全局搜索
- 最近记录
- 今日记录
- RSS
- 今日 Digest
- 最近报告
- 快速笔记
- Quick Capture
- 自定义链接
- 日历
- Todo
- GitHub
- 天气
- 自定义 Widget

## 12.2 自定义布局

支持：

- 拖拽
- 调整大小
- 隐藏
- 多页面
- 自定义主题

例如：

```text
My Home
Work
AI
Reading
Personal
```

---

# 13. Super Home 与 AI 的结合

这是主页的核心差异化。

主页不应该只有：

```text
网站快捷方式
天气
时钟
RSS
```

还应该显示：

> **AI 对个人信息的实时观察。**

例如：

```text
今日值得关注

• 最近 3 周你反复关注 Agent Memory
• 本周 AI 相关记录比上周增加 43%
• 你过去反复记录过 2 个尚未推进的想法
• 今天新增 5 篇与你当前关注主题高度相关的 RSS
```

这样：

> **Home = 信息入口 + AI Personal Dashboard**

---

# 14. RSS

不要做成传统 NetNewsWire 的复制品。

RSS 应该是：

> **自动化信息进入 Index 的入口。**

数据流：

```text
RSS Feed
   ↓
抓取
   ↓
Feed Item
   ↓
AI 分类 / 摘要
   ↓
Record
   ↓
Index
   ↓
Digest / Report
```

## 14.1 RSS 功能

- 添加 Feed URL
- OPML 导入
- Feed 分类
- 定时抓取
- 全文抓取
- 已读/未读
- 收藏
- AI 摘要
- AI 筛选

## 14.2 AI RSS

每天生成：

> 今日值得关注的 10 篇

判定依据可以包含：

- 用户订阅主题
- 用户已有 Index
- 最近兴趣变化
- 内容质量
- 新颖度
- 与历史记录的相关性

---

# 15. 统一“Record”是 RSS / Clipboard / Bookmark / Note 的关键

例如：

网页：

```text
type = bookmark
```

剪贴板：

```text
type = clip
```

RSS：

```text
type = rss
```

想法：

```text
type = idea
```

报告：

```text
type = report
```

所有这些都可以进入：

> **同一个 Index。**

这正是 iSnips 与传统工具最大的结构差异。

---

# 16. Local SQLite 是否必要？

建议使用。

但不要把 SQLite 定义成“系统主数据库”。

架构：

```text
Cloud PostgreSQL
        ↓
Sync
        ↓
Local SQLite
```

### Cloud PostgreSQL

承担：

- 多设备同步
- 用户账户
- 服务器数据
- 报告
- AI 计费
- RSS
- Web 数据

### Local SQLite

承担：

- 剪贴板
- 本地缓存
- 快速读取
- 离线
- 本地全文搜索
- 隐私数据
- 本地状态

---

# 17. SQLite 的建议

使用：

> SQLite + FTS5

第一阶段不必引入向量数据库。

前期：

```text
SQLite
+
FTS5
```

优先解决：

- 关键词搜索
- 标题搜索
- 内容搜索
- 标签搜索
- 时间搜索

等真正需要语义搜索时，再加入：

```text
Embedding
+
向量索引
```

---

# 18. 云端数据库

推荐：

> PostgreSQL

理由：

- 成熟
- 关系型结构适合 Record / Report / User / Feed
- 事务能力强
- JSON 支持好
- 后期可使用 pgvector
- 生态成熟

初期不需要为了 AI 强行上 pgvector。

---

# 19. 文件存储

推荐：

> Cloudflare R2

用于：

- 图片
- PDF
- 网页截图
- 文件附件
- 大型原始文档

PostgreSQL 用于：

```text
metadata
```

R2 用于：

```text
blob
```

---

# 20. 技术栈

## Web

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

## Browser Extension

```text
TypeScript
Manifest V3
WebExtension API
IndexedDB
```

## Local App

```text
Tauri 2
Rust
React
TypeScript
SQLite
FTS5
```

Rust 负责：

- Clipboard
- Global Shortcut
- Keychain
- System Integration
- Local DB
- Encryption
- Background Sync

React 负责：

- UI
- Search
- Index
- Settings
- AI UI

## Backend

初期：

```text
Next.js API
```

后续复杂后再拆：

```text
API Service
Sync Service
AI Worker
RSS Worker
```

不要一开始就做微服务。

---

# 21. 推荐架构

```text
                  ┌────────────────────┐
                  │        Web         │
                  │ Next.js / React    │
                  └─────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
 Browser Extension      Local App            Mobile
 TypeScript              Tauri 2              Future
                          Rust
        │                   │
        └───────────────────┼───────────────────┘
                            ↓
                        Sync / API
                            │
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
        PostgreSQL          R2           Queue
             │                             │
             │                      ┌──────┴──────┐
             │                      ↓             ↓
             │                   AI Worker    RSS Worker
             │                      │
             └──────────────────────┤
                                    ↓
                               AI Providers
```

---

# 22. AI Provider Abstraction

不要把 AI 写死在某一家。

建立统一接口：

```text
summarize()
classify()
extract()
analyze()
generateReport()
```

Provider：

```text
OpenAI
Anthropic
Gemini
OpenRouter
Cloudflare
```

后续可以支持：

```text
BYOK
```

即用户自己提供 API Key。

但商业化初期应优先使用：

> **iSnips 自己的 AI Credits**

---

# 23. AI Credits 商业模型

建议：

> **Free / Plus / Pro + AI Credits**

套餐决定权益。

Credits 反映 AI 的可变成本。

不要直接向用户展示 Token。

应该显示：

```text
生成周报
预计 12 AI Credits
```

大型任务：

```text
数据范围：2,347 条记录
预计消耗：86 AI Credits
```

---

# 24. 推荐套餐模型

价格最终应根据模型成本和实际用户行为调整，第一版可以先采用以下测试区间。

## Free

目标：

> 让用户留下数据。

建议：

- Web
- Browser Extension
- Local App
- 基础同步
- 基础搜索
- 少量 AI
- 少量报告
- 每月少量 Credits

## Plus

目标：

> 主力付费用户。

建议测试：

> $6.99/月左右

提供：

- 更高 Record 上限
- 完整 AI
- 日/周/月报告
- 自定义报告
- RSS
- AI Digest
- Super Home 高级能力
- 较高 Credits

## Pro

目标：

> 重度用户。

建议测试：

> $14.99/月左右

提供：

- 更大的 Index
- 全库分析
- 更高 Credits
- 更强模型
- 大型报告
- 更多 RSS
- 高级 Home
- 更高同步能力

## 额外 Credits

允许 Plus / Pro 用户额外购买。

这样：

```text
Subscription
=
软件价值

AI Credits
=
AI 可变成本
```

商业模型更健康。

---

# 25. 隐私设计

前期只设计一个：

> **隐私**

用户可以对每条 Record 设置：

```text
普通
🔒 隐私
```

### 普通

```text
客户端
 ↓
Cloud
 ↓
AI
```

### 隐私

```text
客户端
 ↓ 加密
Cloud
 ↓
密文
```

隐私数据：

- 可以同步
- 云端不能直接读取
- 默认不进入云端 AI
- 默认不参与云端全文搜索

---

# 26. 密钥设计

不要让所有数据直接使用同一个 AES Key。

使用：

```text
User Password
      ↓
Argon2id
      ↓
Master Key
      ↓
Data Encryption Keys
```

核心原则：

> **用户只有一个 Master Key 体系。**

每条数据使用独立的数据密钥或由 Master Key 派生的密钥。

这样用户只需要管理：

> 一个主密码 / 一个恢复密钥体系

---

# 27. Recovery Key

E2EE 最大的问题是：

> 用户忘记密码怎么办？

因此需要：

```text
Master Key
      ↓
Recovery Key
```

用户第一次启用隐私功能时：

> 生成 Recovery Key

必须明确告诉用户：

> 如果忘记主密码且没有 Recovery Key，服务端无法恢复隐私数据。

后期可以增加：

- Passkey
- Apple Keychain
- iCloud Keychain
- 多设备恢复

---

# 28. 浏览器插件中的隐私数据

不要让 Extension 持有完整 Master Key。

推荐：

```text
Browser Extension
       ↓
Local Companion / App
       ↓
Encryption
       ↓
Cloud Sync
```

初期可以简化：

- 普通保存直接 API
- 隐私保存通过受控客户端加密流程

随着产品成熟，再完善浏览器端 E2EE。

---

# 29. 同步设计

不要同步整个数据库。

采用：

> **Record-level Sync**

Record：

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
 ↓
PostgreSQL
```

其它设备：

```text
Sync API
 ↓
下载变更
 ↓
SQLite
```

---

# 30. 冲突处理

第一版采用简单策略：

```text
version
updated_at
device_id
```

发生冲突：

> 最后写入优先 + 保存冲突版本

以后如果用户频繁协同编辑，再考虑更复杂的 CRDT。

目前没有必要。

---

# 31. AI Report Engine

建议独立成后台任务。

```text
Report Request
      ↓
Scope Builder
      ↓
Filter Records
      ↓
Privacy Check
      ↓
Chunk
      ↓
AI Analysis
      ↓
Synthesis
      ↓
Report
      ↓
Save
```

## 重要规则

AI 永远只能访问：

> **用户明确授权给本次任务的数据范围。**

例如：

```text
时间：
2026-08-01 ~ 2026-08-15

类型：
Idea + Bookmark

主题：
AI

Privacy：
排除
```

---

# 32. 报告生成不要阻塞 Web 请求

错误方式：

```text
HTTP Request
 ↓
读取 5000 条记录
 ↓
AI
 ↓
等待 30 秒
 ↓
返回
```

正确方式：

```text
Create Report Task
       ↓
Queue
       ↓
AI Worker
       ↓
生成
       ↓
保存
       ↓
通知 Web
```

Web 端看到：

```text
正在分析...
35%
```

---

# 33. AI Report 处理策略

大型报告不要一次把所有记录塞给模型。

建议：

```text
Records
  ↓
Normalize
  ↓
Deduplicate
  ↓
Chunk
  ↓
Batch Analyze
  ↓
Intermediate Findings
  ↓
Final Synthesis
```

这样成本和稳定性都更好。

---

# 34. RSS Worker

RSS 不要由用户打开网页时才抓。

使用后台任务：

```text
Scheduler
 ↓
Feed Fetch
 ↓
Parse
 ↓
Deduplicate
 ↓
Create Record
 ↓
Optional AI Classification
```

这样 Home 和 Index 打开时速度更快。

---

# 35. Web 首页性能

Next.js 可以继续使用。

重点不是换框架，而是：

> **避免首页同步等待所有数据。**

首页：

```text
First Paint
 ↓
Search / Shell
 ↓
Recent Data
 ↓
RSS
 ↓
AI Digest
```

按优先级逐步加载。

尤其是作为 Chrome New Tab 时：

> 首屏必须非常轻。

---

# 36. Next.js 使用原则

Next.js：

- Web UI
- Auth
- API
- Server Components
- 用户页面

后台任务：

- AI Worker
- RSS Worker
- Sync Worker

不要让一次 HTTP 请求承担：

```text
RSS 抓取
+
全文提取
+
AI
+
Report
```

---

# 37. 推荐部署

如果尽量使用 Cloudflare：

```text
Cloudflare
├── DNS
├── CDN
├── R2
├── Workers
└── Queues
```

Web 可以：

```text
Next.js
```

部署到兼容的托管环境。

数据库：

```text
Managed PostgreSQL
```

不要第一版自己维护 PostgreSQL 服务器。

---

# 38. 第一阶段不要做的东西

为了避免项目失控，V1 不建议加入：

- 本地 AI
- 自建大模型
- Android App
- 复杂知识图谱
- CRDT
- 团队协作
- 社交
- 完整密码管理器
- 复杂插件市场
- 多级权限
- 自动 Agent

它们都可以成为后续路线。

---

# 39. MVP 建议

第一版只做：

## Capture

- Chrome Extension
- Web 手动添加

## Index

- Record
- 搜索
- 标签
- 时间
- 编辑
- 删除
- 隐私

## AI

- 摘要
- 分类
- 生成报告

## Report

- 时间范围
- 类型
- 关键词
- 自定义 Prompt
- 保存报告

## Web

- Dashboard
- Index
- Reports
- Settings

## Sync

- PostgreSQL
- Local SQLite
- Record-level Sync

---

# 40. V1.5

增加：

- Mac Local App
- Clipboard
- Global Shortcut
- RSS
- AI Digest
- Super Home
- Chrome New Tab
- AI Credits
- Free / Plus / Pro
- Billing

---

# 41. V2

增加：

- iPhone / iPad
- Passkey
- 完整 E2EE
- 多设备密钥体系
- semantic search
- pgvector / 本地向量搜索
- 高级 Report
- 长期趋势
- Report-to-Report Analysis

---

# 42. V3

考虑：

- AI Memory
- Agent
- 自动主题
- 自动发现长期兴趣变化
- 自动发现重复想法
- 主动提醒
- 更强的 Personal Dashboard
- 更多浏览器 / 平台

---

# 43. 最重要的产品闭环

整个产品最终应该形成：

```text
                    Internet
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
         RSS        Browser      Clipboard
          │            │            │
          └────────────┼────────────┘
                       ↓
                 Personal Index
                       │
                ┌──────┴──────┐
                ↓             ↓
              Search         AI
                              ↓
                         Data Scope
                              ↓
                           Report
                              ↓
                         Save Report
                              ↓
                          Super Home
                              ↓
                       用户每天再次进入
```

其中：

### Capture

让用户不断产生数据。

### Index

让数据可控。

### AI

让数据产生意义。

### Report

让意义长期沉淀。

### Super Home

让用户不断回到产品。

---

# 44. 产品最核心的差异化

不要宣传：

> “一个更好的剪贴板。”

不要宣传：

> “一个 AI 笔记软件。”

不要宣传：

> “一个更好的 RSS Reader。”

真正应该宣传：

> **iSnips 把你每天遇到、保存、记录的信息，持续整理成真正值得回看的个人报告。**

核心价值：

```text
Save less manually.
Understand more automatically.
```

中文可以考虑：

> **记录一切，提炼真正重要的东西。**

或者：

> **把零散的信息，变成自己的长期认知。**

---

# 45. 品牌建议

建议继续使用：

> **iSnips**

原因：

- 已有 Chrome 插件
- Snip 表示摘录 / 片段
- 与 Capture 逻辑一致
- 不被“Note”限制
- 可以容纳网页、剪贴板、RSS、想法、报告
- 未来可以继续扩展

不建议更名为：

### Quick Note

过于泛化，而且容易被理解为普通笔记软件。

### Zero Note

产品语义偏向一次性、销毁型秘密笔记，与 iSnips 的“长期积累”方向不匹配。

---

# 46. 技术栈最终建议

```text
Web
--------------------------------
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui

Browser Extension
--------------------------------
TypeScript
Manifest V3
IndexedDB

Desktop
--------------------------------
Tauri 2
Rust
React
SQLite
FTS5

Backend
--------------------------------
Next.js API
PostgreSQL
R2
Queue / Worker

AI
--------------------------------
Provider Abstraction
OpenAI
Anthropic
Gemini
OpenRouter
Cloudflare

Search
--------------------------------
MVP:
PostgreSQL / SQLite + FTS5

Later:
pgvector / local vector index

Security
--------------------------------
Argon2id
AES-256-GCM / XChaCha20-Poly1305
Master Key
Data Key
Recovery Key
```

---

# 47. 第一版数据库核心表

建议至少：

```text
users
devices

records
record_tags
tags

reports
report_scopes

feeds
feed_items

subscriptions
ai_usage
ai_credits

sync_events
```

后期增加：

```text
home_pages
home_widgets
attachments
embeddings
report_versions
```

---

# 48. 第一版开发顺序

推荐严格按照这个顺序：

```text
1. 统一 Record 数据模型
        ↓
2. Web Index
        ↓
3. Web 手动新增/编辑
        ↓
4. Chrome Extension 接入
        ↓
5. PostgreSQL + Sync API
        ↓
6. AI 摘要 / 分类
        ↓
7. Scope Builder
        ↓
8. Report Engine
        ↓
9. Report 保存
        ↓
10. AI Credits
        ↓
11. Subscription
        ↓
12. Tauri Local App
        ↓
13. Clipboard
        ↓
14. RSS
        ↓
15. Super Home
        ↓
16. Chrome New Tab
        ↓
17. Privacy Encryption
        ↓
18. iOS
```

---

# 49. 开发时最应该避免的三个坑

## 坑 1：一开始就做“全能知识库”

不要一开始做：

- Wiki
- Graph
- Knowledge Graph
- 双向链接
- 数十种块
- 复杂 Markdown 编辑器

你的核心不是“组织知识”。

而是：

> **收集 → AI 分析 → 报告**

---

## 坑 2：AI 过早复杂化

第一阶段不需要：

- Agent
- 多模型协作
- RAG 大系统
- 向量数据库集群

先做到：

> **指定数据范围 → AI → 有价值的报告。**

---

## 坑 3：过早建设庞大后端

不要一开始：

```text
Next.js
+
NestJS
+
Python
+
Go
+
Rust
+
Kafka
+
Redis
+
Kubernetes
```

第一阶段：

```text
Next.js
PostgreSQL
R2
Queue
Tauri
```

足够。

---

# 50. 最终产品愿景

iSnips 最终可以成为：

```text
                    iSnips
                       │
     ┌─────────────────┼──────────────────┐
     │                 │                  │
   Capture           Index          Intelligence
     │                 │                  │
 Browser            Records             AI
 Clipboard          Search              Reports
 RSS                Tags                Digest
 Mobile             Privacy             Trends
     │                 │                  │
     └─────────────────┼──────────────────┘
                       ↓
                 Personal Home
                       ↓
                 Personal Memory
```

它不是帮助用户“记更多东西”。

而是帮助用户：

> **把每天产生的大量信息，最终变成自己真正理解、能够回顾、能够继续思考的东西。**

---

# 51. 最终一句话

### 产品定位

> **iSnips — Personal Information Index**

### 核心能力

> **Capture → Index → Analyze → Report**

### 商业模式

> **Free / Plus / Pro + AI Credits**

### 技术路线

> **Next.js + TypeScript + Tauri/Rust + SQLite + PostgreSQL + R2 + Cloud AI**

### 安全路线

> **普通 / 隐私；隐私数据客户端加密，云端 AI 默认不读取**

### 核心资产

> **用户长期积累的 Records + AI 生成的 Reports**

### 最终目标

> **让“信息的不断膨胀”最终转化成“认知的不断沉淀”。**
