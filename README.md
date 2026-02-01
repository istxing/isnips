# iSnips · 片语 (Source Branch)

> **简洁高效的浏览器信息采集工具**

iSnips 是一款专为高效采集网页信息而设计的浏览器扩展程序。它不仅支持快速截取文本和笔记，还提供了强大的云端同步功能（Google Drive & WebDAV），确保您的灵感与数据在不同设备间无缝流动。

---

## 📂 分支说明

为了保证项目结构的清晰和 GitHub Pages 的高效托管，本仓库采用了双分支策略：

*   **`source` (当前分支)**: 存储插件的完整源代码。日常开发、功能更新和问题修复均在此分支进行。
*   **`master`**: 专门用于托管 [iSnips 官网](https://istxing.github.io/isnips/)。仅包含发布所需的静态 HTML 页面及验证文件。

## 🚀 开发与构建

如果您希望从源码开始构建版本，请按照以下步骤操作：

### 1. 安装依赖
本项目使用 [Bun](https://bun.sh/) 作为包管理工具（也可使用 npm）：
```bash
bun install
```

### 2. 构建插件
运行构建脚本以生成可加载的插件目录：
```bash
bun run build
```
编译产物将生成在 `dist/` 目录中。

### 3. 加载到浏览器
1. 打开 Chrome 浏览器，进入 `chrome://extensions/`。
2. 开启右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”，并选择生成的 `dist/` 文件夹。

## 🔐 权限说明

*   **`storage`**: 用于存储本地配置和采集的数据。
*   **`identity`**: 用于与 Google Drive 进行 OAuth2 认证同步。
*   **`activeTab` & `tabs`**: 用于在当前页面抓取选中的文本。
*   **`contextMenus`**: 提供右键菜单采集功能。

## 🌐 相关链接

*   **官方主页**: [https://istxing.github.io/isnips/](https://istxing.github.io/isnips/)
*   **Chrome 应用商店**: [点击前往](https://chromewebstore.google.com/detail/isnips/bjemnabegidmkbkdepanilbcidpbnpmj)
*   **隐私政策**: [Privacy Policy](https://istxing.github.io/isnips/privacy.html)

---
*Created with ❤️ by nicekate & Antigravity AI*
