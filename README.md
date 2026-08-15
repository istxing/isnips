# iSnips

> **把零散的信息记录，持续沉淀为可检索、可分析、可回看的个人报告。**
> 
> 核心链路：**Capture → Index → AI Analysis → Report → Resurface**

---

## 1. 项目概览

iSnips 定位为 **Personal Information Index（个人信息索引系统）**。它将用户日常在网页、剪贴板、随笔、RSS 中产生的碎片信息统一抽象为 `Record`，并允许用户指定数据范围，由 AI 生成长期保存、沉淀认知的阶段性 `Report`。

项目采用 **多端完全解耦与独立工程** 架构，各个客户端应用均具备高度内聚性，可独立开发、构建与部署：

```text
iSnips/
├── apps/
│   ├── chrome-extension/   # 已上架 Chrome 商店的官方浏览器插件 (Capture Client)
│   ├── web/                # Web 端主工作台 (Next.js 14+ / React / Tailwind CSS)
│   └── desktop/            # 本地应用 (Local App / 剪贴板监听与离线检索)
│
├── docs/                   # 产品核心实施方案文档
└── INSTALL_MANIFEST.md     # 项目生成与变更清单 (实时维护更新)
```

---

## 2. 各端独立开发与构建

### 1. Chrome 浏览器插件 (`apps/chrome-extension`)
```bash
# 构建 Chrome 插件 (产物输出至 apps/chrome-extension/dist)
node apps/chrome-extension/build.js
# 或进入目录构建
cd apps/chrome-extension && pnpm build
```

### 2. Web 主工作台 (`apps/web`)
```bash
# 进入目录独立运行
cd apps/web
pnpm install
pnpm dev
```

### 3. 桌面端应用 (`apps/desktop`)
```bash
# 进入目录独立运行
cd apps/desktop
pnpm install
pnpm dev
```

---

## 3. 核心文档
- [产品实施方案](docs/iSnips_产品实施方案.md)
- [安装与文件清单](INSTALL_MANIFEST.md)
