# iSnips 项目文件与安装配置清单 (INSTALL_MANIFEST)

> 本文档根据用户规则建立，严格记录项目中所有新增、迁移、下载和配置的文件、程序与脚本清单，并持续保持更新。
> 
> 最后更新时间：2026-08-15

---

## 1. 架构调整与文件迁移记录

### 1.1 Chrome 插件源码独立迁移清单
原位于根目录的已上架 Chrome 插件相关源码已全部安全无损地移入 `apps/chrome-extension/`：

| 原路径 | 新路径 | 类型/用途 |
| :--- | :--- | :--- |
| `manifest.json` | `apps/chrome-extension/manifest.json` | Manifest V3 扩展配置文件 |
| `background.js` | `apps/chrome-extension/background.js` | 插件 Service Worker 后台脚本 |
| `content.js` | `apps/chrome-extension/content.js` | 内容注入与网页选区捕获脚本 |
| `popup.html` / `popup.js` | `apps/chrome-extension/popup.html` / `popup.js` | 侧边栏/弹出窗口界面与逻辑 |
| `library.html` / `library.js` / `library.css` | `apps/chrome-extension/library.*` | 插件本地记录库查看器 |
| `settings.html` / `settings.js` / `settings.css` | `apps/chrome-extension/settings.*` | 插件选项与配置页面 |
| `sync.js` / `merge.js` | `apps/chrome-extension/sync.js` / `merge.js` | 增量同步与数据合并模块 |
| `theme-manager.js` / `theme.css` | `apps/chrome-extension/theme-*` | 多主题样式与管理器 |
| `icons/` | `apps/chrome-extension/icons/` | 插件各尺寸图标资源包 |
| `_locales/` | `apps/chrome-extension/_locales/` | 国际化多语言翻译包 (zh_CN, en 等) |
| `scripts/dev-oauth.js` | `apps/chrome-extension/scripts/dev-oauth.js` | OAuth 派生与本地开发测试脚本 |
| `scripts/merge.test.js` | `apps/chrome-extension/scripts/merge.test.js` | 合并算法单元测试脚本 |
| `build.js` | `apps/chrome-extension/build.js` | 插件打包构建脚本 |
| *(新建)* | `apps/chrome-extension/package.json` | 插件独立 NPM 包配置 (`isnips-chrome-extension`) |
| *(新建)* | `apps/chrome-extension/README.md` | 插件独立说明文档 |

### 1.2 桌面端独立应用 (`apps/desktop/`)
| 原路径 | 新路径 | 说明 |
| :--- | :--- | :--- |
| `app/` | `apps/desktop/` | 迁移为桌面端独立子工程 `@isnips/desktop` |

### 1.3 Web 端独立主工作台 (`apps/web/`)
- 完全自包含独立工程，不依赖外部 workspace packages
- `apps/web/src/types/index.ts`: 统一数据模型 RecordModel, ReportModel, DataScope
- `apps/web/src/lib/scope-builder.ts`: 数据范围筛选与 Credits 预估
- `apps/web/src/lib/crypto.ts`: Recovery Key 恢复密钥工具
- `apps/web/src/lib/db-schema.ts`: 数据库表定义
- `apps/web/src/components/Navigation.tsx`: 全局响应式导航
- `apps/web/src/components/RecordCard.tsx`: Record 展示卡片
- `apps/web/src/components/ScopeBuilder.tsx`: 范围选择器组件
- `apps/web/src/app/page.tsx`: Super Home 超级主页与 AI 实时洞察
- `apps/web/src/app/index/page.tsx`: 个人索引记录管理
- `apps/web/src/app/reports/page.tsx`: AI 报告中心
- `apps/web/src/app/rss/page.tsx`: RSS 动态流
- `apps/web/src/app/settings/page.tsx`: 会员与安全设置

### 1.4 核心文档归档 (`docs/`)
| 文件路径 | 说明 |
| :--- | :--- |
| `docs/iSnips_产品实施方案.md` | iSnips 核心产品实施方案总设计文档 |

---

## 2. 根目录工程配置
- `pnpm-workspace.yaml`: 声明 `apps/*`
- `package.json`: 根目录集中脚本
- `.gitignore`: 忽略规则
- `README.md`: 顶层说明（项目唯一全局说明文档）
