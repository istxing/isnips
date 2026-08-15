# iSnips Web Application

iSnips 核心主工作台（Web Application），基于 Next.js 14+ / React / TypeScript / Tailwind CSS 构建。

## 功能架构
- **Super Home (`/`)**: 个人信息中心、全局搜索与 AI 观察分析看板
- **Personal Index (`/index`)**: 统一管理所有剪藏、笔记、书签、RSS 与报告的检索列表
- **AI Reports (`/reports`)**: 设定数据分析范围（Data Scope），生成并保存长期报告
- **RSS (`/rss`)**: RSS 订阅源管理与 AI 自动摘要
- **Settings (`/settings`)**: 会员套餐、AI Credits 与端到端加密 Recovery Key 管理

## 本地开发
```bash
# 进入工作区
cd apps/web

# 启动开发服务器
pnpm run dev
```
