# iSnips 2.0.0 商店素材

更新：2026-10-16。橙色填充、`#e9eeea` 描边；原剪刀和曲针以平滑 SVG 曲线保存。

| 文件 | 用途 | 状态 |
| --- | --- | --- |
| store-icon-128.png | 开发者后台商店图标，128×128，图形 96×96，外围留透明边距 | 可用 |
| promo-small-440x280.png | 小型推广图，440×280，不透明 PNG | 可用 |
| promo-marquee-1400x560.png | 大型推广图，1400×560，不透明 PNG | 可用（可选项） |
| brand-icon-512.png / brand-icon-1024.png | 高清透明品牌图，用于编辑其他素材 | 可用，非后台必填项 |
| screenshot-library-1280x800.jpg | 中文界面截图：片段库汇总瀑布流，1280×800，JPEG | 可用 |
| screenshot-groups-1280x800.jpg | 中文界面截图：按天分组，1280×800，JPEG | 可用 |
| screenshot-settings-1280x800.jpg | 中文界面截图：设置页，1280×800，JPEG | 可用 |
| screenshot-library-en-1280x800.jpg | 英文界面截图：片段库汇总瀑布流，1280×800，JPEG | 可用 |
| screenshot-groups-en-1280x800.jpg | 英文界面截图：按天分组，1280×800，JPEG | 可用 |
| screenshot-settings-en-1280x800.jpg | 英文界面截图：设置页，1280×800，JPEG | 可用 |

推广图是品牌视觉，不是扩展运行截图。`isnips-2.0.0-store-assets.zip` 包含上述正式素材；不要把预览图当作界面截图上传。

## 真实界面截图已就绪

已通过隔离浏览器在加载正式扩展（扩展 ID `bjemnabegidmkbkdepanilbcidpbnpmj`）下，分别使用合成测试数据（405 条，不包含任何真实私人数据或凭据）生成了中文与英文各 3 张 1280×800 标准截图：
- **片段库汇总 (Library All)**：展示等宽自然高度瀑布流与侧边分类、文件夹栏；
- **按天分组 (Library Groups)**：展示按时间段分组的清晰卡片列表；
- **设置页 (Settings)**：展示通用选项、快捷键与干净的设置结构。

## 源文件与再生成

- 图标母版：`../design/icon-master.svg`（内嵌 `../design/icon-butterfly.png`，原始来源 `icon-butterfly-source.webp`）；所有尺寸从母版重新渲染。
- 推广图源文件：本目录同名 SVG。
- 生成脚本：`../design/render-assets.cjs`，需要 `sharp`。可在已有渲染环境运行，或通过 `ISNIPS_SHARP_MODULE` 指定其入口文件。
- Chrome 工具栏图标保留约 99% 占比；商店专用图标按官方图像指南另外留白，二者用途不同。

官方尺寸参考（2026-10-16 核对）：https://developer.chrome.com/docs/webstore/images
