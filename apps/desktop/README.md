# iSnips Desktop Application

iSnips 桌面端应用程序（Local App），提供操作系统级别的剪贴板监听、全局热键呼出、本地 SQLite + FTS5 离线极速检索与云端双向同步。

## 架构规划
- **架构方案**：基于 Tauri 2 (Rust) / Electron 架构
- **核心模块**：
  - Clipboard Monitor: 系统剪贴板实时监控与过滤
  - Global Search: Spotlight 风格全局快捷键（`⌘ + Shift + Space`）即时呼出
  - Local Storage: 本地 SQLite + FTS5 全文索引
  - E2EE 隐私引擎: 本地数据加解密与 Keyring / Keychain 托管
  - Record Sync: 与远端 PostgreSQL 增量同步

## 运行与开发
```bash
cd apps/desktop
pnpm install
pnpm dev
```
