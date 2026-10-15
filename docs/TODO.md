# TODO

## Google Drive 同步改用网页授权(launchWebAuthFlow)

**背景**:`apps/chrome-extension` 的 Google Drive 同步使用 `chrome.identity.getAuthToken`,它依赖 Google Chrome 自带的 Google 账号机制。在 Brave 等 Chromium 衍生浏览器里授权会失败,报「错误 400:invalid_request」,无法用 Google 登录同步。

**目标**:拿不到 `getAuthToken` 令牌时(如 Brave),改走 `chrome.identity.launchWebAuthFlow` 网页授权,让 Brave 也能使用 Google Drive 同步。

**待办**:
- [ ] 在 Google Cloud 里新建「Web 应用」类型的 OAuth 客户端,重定向 URI 设为 `https://<扩展ID>.chromiumapp.org/`(扩展 ID 用商店正式 ID)。注意 Brave 与 Chrome 的重定向域可能不同,需实测。
- [ ] 在 `settings.js`、`sync.js` 里抽出统一的取令牌函数:优先 `getAuthToken`,失败则走 `launchWebAuthFlow`。
- [ ] 令牌过期与退出登录:`launchWebAuthFlow` 拿到的令牌不会被 `removeCachedAuthToken` 管理,需要自己存储、判断过期并支持撤销(`logoutGoogleDrive`)。
- [ ] `manifest.json` 里的 `oauth2.client_id` 与新增的 Web 客户端 ID 分开配置。
- [ ] 在 Chrome、Brave 里分别实测登录、同步、退出登录。

**暂时的替代办法**:Brave 里用 WebDAV(如 Koofr)同步。

## 同步稳定性

- [ ] WebDAV 下载时远端文件为空,不再抛 `Unexpected end of JSON input`,按「远端无数据」处理(`sync.js` 里已有未提交的改动,含测试)。
- [ ] Google Drive 路径里直接 `.json()` 的地方做同样的空内容处理。
