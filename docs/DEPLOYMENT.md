# 部署 FORMA

## 静态站点

```bash
npm ci
npm run build
npm run preview
```

将完整 `dist/` 部署到静态托管服务。应用使用 hash 路由，核心制图、编辑和导出在浏览器执行；应正确提供静态资源的 MIME 类型，生产环境使用 HTTPS，以便剪贴板和媒体相关功能正常工作。

`public/forma/` 中的播放器、独立示例、图表指南和 Agent 下载包由构建脚本生成，不需要从旧机器拷贝。仓库保留首页使用的四个 MP4 演示，它们是预录制视频，不会随构建自动重录。

## 可选的 Cloudflare 反馈服务

仓库中的 `wrangler.jsonc` 和 `src/forma/feedback-worker.js` 记录官方站点的部署设置。自建部署前必须改为自己的 Worker 名称、域名和邮件地址，并为反馈服务配置自己的 `FEEDBACK_EMAIL`、`FEEDBACK_LIMIT` 与 `ASSETS` 绑定。`src/forma/beta-feedback.js` 中的邮件链接也应按实际运营方修改。

不要直接使用官方域名配置部署到自己的账号。未配置 Worker 邮件能力时，核心静态应用仍可使用，但网页反馈提交不会成功；邮件联系链接是单独的入口。

`npm run check:cloudflare` 除静态资源大小和目录边界外，还会检查预录视频是否匹配当前播放器及导出脚本的哈希。更改播放器后，旧视频可能无法通过这一严格检查；应重新导出并核验视频，不能仅更新哈希伪装成已重录。这不是运行核心静态应用的前提。

修改并部署 FORMA 时，请同时落实 AGPL 要求，为用户提供所运行版本的对应源码和许可证。参阅 [授权说明](../LICENSING.md)。
