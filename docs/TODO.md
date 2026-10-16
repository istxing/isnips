# TODO

## Chrome 扩展 2.0.0

当前发布入口：[发布说明、上架文案与人工验收](../apps/chrome-extension/RELEASE.md)。

已完成：UI/UE 精简、全文阅读、删除撤销、会话草稿、快捷保存、失败重试、网站停用即时生效、导入与同步事务保护、隐私文档和发布包检查。自动回归为离线测试，真实 Chrome / 云账号 / 商店截图仍待人工验收。

## Google Drive 在 Brave 中的授权

当前使用 `chrome.identity.getAuthToken`，本次仅承诺 Google Chrome。Brave 可选择 WebDAV。

- [ ] 在 Google Cloud 中配置合适的 OAuth 客户端与扩展重定向 URI。
- [ ] 统一 token 获取，按平台支持 `launchWebAuthFlow`；不要把未经验证的回退包装成可用功能。
- [ ] 管理网页授权 token 的过期与撤销。
- [ ] 分别实测 Chrome / Brave 的授权、同步和断开连接。

## 已完成的同步稳定性项

- [x] WebDAV 空远端文件按无数据处理。
- [x] Google Drive 同样处理空响应，并检查下载、创建、更新响应。
- [x] WebDAV 创建时使用 `If-None-Match`，更新时按返回的 ETag 条件写入；本地合并在事务中重读当前数据。
- [x] 请求超时、失效 Google 缓存令牌清理，以及拒绝 WebDAV 凭据重定向。

## 自动备份（2026-10-15 复核）

- [x] 保留已有闹钟的触发时间，缺失时重建。
- [x] 等待闹钟创建结果，反馈创建/清除错误。
- [x] 关闭自动备份后忽略已经派发的事件。
- [x] 自动备份完成后设置页实时刷新时间和可恢复快照。
- [x] 离线回归覆盖定时事件、关闭同步仍备份、48 份轮换、写入失败、并发触发和还原。
- [ ] 在真实 Chrome 中跨备份周期、重启和休眠唤醒验收。
