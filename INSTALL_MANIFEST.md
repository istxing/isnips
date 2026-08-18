# iSnips 项目文件与安装配置清单 (INSTALL_MANIFEST)

> 本文档根据用户规则建立，严格记录项目中所有新增、迁移、下载和配置的文件、程序与脚本清单，并持续保持更新。
> 
> 最后更新时间：2026-08-18 (全站彻底去除所有 Card 卡片残留，全面转为纯线条流式排版)

---

## 1. 架构调整与文件迁移记录

### 1.1 Chrome 插件源码独立迁移清单 (`apps/chrome-extension/`)
原位于根目录的已上架 Chrome 插件相关源码已全部安全无损地移入 `apps/chrome-extension/`（**严格保持原状，未经允许绝不修改**）：

| 文件路径 | 类型/用途 |
| :--- | :--- |
| `apps/chrome-extension/manifest.json` | Manifest V3 扩展配置文件 |
| `apps/chrome-extension/background.js` | 插件 Service Worker 后台脚本 |
| `apps/chrome-extension/content.js` | 内容注入与网页选区捕获脚本 |
| `apps/chrome-extension/popup.html` / `popup.js` | 侧边栏/弹出窗口界面与逻辑 |
| `apps/chrome-extension/library.*` | 插件本地记录库查看器 |
| `apps/chrome-extension/settings.*` | 插件选项与配置页面 |
| `apps/chrome-extension/sync.js` / `merge.js` | 增量同步与数据合并模块 |
| `apps/chrome-extension/theme-*` | 多主题样式与管理器 |
| `apps/chrome-extension/icons/` | 插件各尺寸图标资源包 |
| `apps/chrome-extension/_locales/` | 国际化多语言翻译包 (zh_CN, en 等) |
| `apps/chrome-extension/scripts/dev-oauth.js` | OAuth 派生与本地开发测试脚本 |
| `apps/chrome-extension/scripts/merge.test.js` | 合并算法单元测试脚本 |
| `apps/chrome-extension/build.js` | 插件打包构建脚本 |
| `apps/chrome-extension/package.json` | 插件独立 NPM 包配置 (`isnips-chrome-extension`) |
| `apps/chrome-extension/README.md` | 插件独立说明文档 |

### 1.2 桌面端独立应用 (`apps/desktop/`)
| 原路径 | 新路径 | 说明 |
| :--- | :--- | :--- |
| `app/` | `apps/desktop/` | 迁移为桌面端独立子工程 `@isnips/desktop` |

### 1.3 Web 端与 PostgreSQL 后端服务 (`apps/web/`)
完全自包含独立工程，已升级为 **全站彻底无 Card 卡片残留、纯线条流式分割（Pure Line-based Stream）两栏现代架构**：

| 文件路径 | 状态 | 类型/说明 |
| :--- | :--- | :--- |
| `apps/web/package.json` | 已配置 | Web 端 NPM 工程与依赖声明 (`isnips-web`) |
| `apps/web/tsconfig.json` | 已配置 | TypeScript 编译配置 (`moduleResolution: node`) |
| `apps/web/next.config.js` | 已配置 | Next.js 14 配置 (含 `/index` 重定向与 `serverComponentsExternalPackages`) |
| `apps/web/tailwind.config.js` | **升级** | Tailwind CSS 3 配置文件，引入 Apple / 飞书级设计 Token（色彩、圆角、阴影） |
| `apps/web/postcss.config.js` | 已配置 | PostCSS 配置文件 |
| `apps/web/src/styles/globals.css` | **升级** | 纯净全局样式系统、底色色彩变量 (Canvas / Surface / Secondary) |
| `apps/web/src/lib/i18n.ts` | **新增** | 保留多语言扩展配置架构 (当前纯中文版) |
| `apps/web/src/types/index.ts` | **升级** | 统一数据模型 (DocumentModel, TimelineGroup, RecordType, DataScope) |
| `apps/web/src/lib/db.ts` | **升级** | PostgreSQL 核心数据访问层 (新增 documents 表与 V2 种子数据) |
| `apps/web/src/lib/auth.ts` | 已配置 | 用户认证与会话管理 (Session、Cookie、Passkey) |
| `apps/web/src/lib/auth-context.tsx` | **升级** | 全局 AuthContext，支持 Passkey 绑定与解绑 |
| `apps/web/src/lib/api-client.ts` | **升级** | Documents API、时序分组算法 `groupRecordsByTimeline` 与 Markdown 生成 |
| `apps/web/src/lib/storage.ts` | 已配置 | 本地容灾存储引擎 |
| `apps/web/src/lib/crypto.ts` | 已配置 | 端到端加密 (E2EE) 工具与 24 字符 Recovery Key |
| `apps/web/src/app/api/documents/route.ts` | **新增** | Documents 知识文档查询与创建 API |
| `apps/web/src/app/api/documents/[id]/route.ts` | **新增** | 单篇 Document 详情、更新与删除 API |
| `apps/web/src/app/api/records/route.ts` | 已配置 | Records 查询与新增 API |
| `apps/web/src/app/api/records/[id]/route.ts` | 已配置 | 单条记录详情、修改与删除 API |
| `apps/web/src/app/api/reports/route.ts` | 已配置 | AI 报告存储、查询与删除 API |
| `apps/web/src/app/api/rss/feeds/route.ts` | 已配置 | RSS 订阅源增删查 API |
| `apps/web/src/app/api/rss/items/route.ts` | 已配置 | Feed Items 推荐流与一键入库 API |
| `apps/web/src/app/api/settings/route.ts` | 已配置 | 用户权益与 AI Credits 管理 API |
| `apps/web/src/app/api/sync/route.ts` | 已配置 | Record-level 增量同步端点 |
| `apps/web/src/components/AppShell.tsx` | **重构** | **原生两栏外壳（大字阶顶栏 + 独立主工作区）** |
| `apps/web/src/components/Sidebar.tsx` | **重构** | **大字体极简侧栏（w-56，导航项 text-sm 14px，浅柔灰底色 #F7F8FA）** |
| `apps/web/src/components/RecordCard.tsx` | **重构** | **纯线条分割列表项（彻底移除所有卡片边框阴影与圆角 padding）** |
| `apps/web/src/components/ScopeBuilder.tsx` | **重构** | **纯线条范围配置面板（去除 Card 外壳）** |
| `apps/web/src/components/SpotlightModal.tsx` | **升级** | macOS Spotlight 风格 ⌘K 极速聚焦检索 |
| `apps/web/src/components/MarkdownEditor.tsx` | **升级** | 纯净 Markdown 编辑与阅读器 |
| `apps/web/src/components/QuickCaptureModal.tsx` | **升级** | 快速记录弹窗 |
| `apps/web/src/components/EditRecordModal.tsx` | **升级** | 记录编辑弹窗 |
| `apps/web/src/app/layout.tsx` | **升级** | 根布局外壳 |
| `apps/web/src/app/page.tsx` | **重构** | **工作台主页（纯线条随手记与内容流水）** |
| `apps/web/src/app/records/page.tsx` | **重构** | **个人索引库（纯线条时序流式排版）** |
| `apps/web/src/app/documents/page.tsx` | **重构** | **知识文档中心（纯线条双栏排版与编辑器）** |
| `apps/web/src/app/reports/page.tsx` | **重构** | **AI 阶段报告中心（纯线条双栏排版）** |
| `apps/web/src/app/rss/page.tsx` | **重构** | **纯线条 RSS 智能订阅流** |
| `apps/web/src/app/settings/page.tsx` | **升级** | 系统与安全设置 |

---

## 2. 依赖包清单

| 所属子工程 | 包名 | 版本 | 用途 |
| :--- | :--- | :--- | :--- |
| `apps/web` | `@simplewebauthn/server` | `^10.0.1` | WebAuthn / Passkey 服务端验证 |
| `apps/web` | `@simplewebauthn/browser` | `^10.0.0` | 浏览器端 Touch ID / Face ID 唤起 |
| `apps/web` | `bcryptjs` | `^2.4.3` | 密码哈希 |
| `apps/web` | `@electric-sql/pglite` | `^0.2.14` | 嵌入式 PostgreSQL 数据库 |
| `apps/web` | `next` | `^14.2.4` | App Router Web 框架 |
| `apps/web` | `react` / `react-dom` | `^18.3.1` | React 核心 |
| `apps/web` | `lucide-react` | `^0.383.0` | 极简单色线性图标库 |
| `apps/web` | `tailwindcss` | `^3.4.4` | 样式引擎 |
