# iSnips Chrome Extension (Capture Client)

已上架 Chrome 商店的 iSnips 官方浏览器插件源码（Capture Client）。

## 核心功能
- **网页剪藏与高亮**：选中文本、一键保存当前网页标题、URL 与摘要。
- **快速便签与想法**：随时在 Side Panel 或弹出窗口中记录 Note / Idea。
- **隐私保护**：支持标记隐私记录，保护敏感信息。
- **本地与云端同步**：支持 Chrome Storage / 远端同步与合并。

## 开发与构建
```bash
# 进入插件目录
cd apps/chrome-extension

# 构建产物输出至 dist/ 目录
node build.js

# 运行测试
node scripts/merge.test.js
```

## 加载至 Chrome 浏览器
1. 打开 Chrome 浏览器，访问 `chrome://extensions/`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择 `apps/chrome-extension/dist` 目录。
