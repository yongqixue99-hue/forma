# Third-party notices

FORMA 的界面、视觉 token、数据契约、验证器、组合图形与动画编排独立编写。使用以下开源基础库与字体：

| Dependency | Version used | License |
| --- | --- | --- |
| SheetJS CE | 0.20.3 | Apache-2.0; Excel workbook reader in a dedicated worker |
| fflate | 0.8.3 | MIT; 本地备份分卷 ZIP 打包与校验解包，按需加载 |
| mediabunny | 1.55.7 | MPL-2.0; MP4 编码及封装，按需加载 |
| Apache ECharts | 6.1.0 | Apache-2.0; 旧版 `src/main.js` 使用，当前 FORMA 入口未引入 |
| D3 | 7.9.0 | ISC; individual submodules retain their own licenses |
| Three.js | 0.185.1 | MIT; including SVGRenderer and Projector addons |
| d3-hexbin | 0.2.2 | BSD-3-Clause |
| d3-sankey | 0.12.3 | BSD-3-Clause |
| Lucide | 0.577.0 | ISC |
| Manrope / Fontsource Variable | 5.3.0 | SIL Open Font License 1.1 |
| DM Mono / Fontsource | 5.3.0 | SIL Open Font License 1.1 |
| Instrument Serif / Fontsource | 5.3.0 | SIL Open Font License 1.1 |

相关 LICENSE 文件保存在同级 `licenses/` 目录。更多包版本与开发依赖见项目的 package-lock.json。

设计研究参考与项目源码使用分开记录于 REFERENCE-NOTES.md。参考页面图片没有进入 FORMA 的界面、生成作品或发布包。

SheetJS CE 从官方发布包安装：[0.20.3](https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz)。许可证副本为 `licenses/SheetJS-CE-LICENSE.txt`。读取器不重新计算公式。

2026-09-10 核对：当前 FORMA 的独立 HTML、SVG 与视频帧中嵌入上述三种字体的 Latin WOFF2 子集；中文仍使用设备字体。字体许可证副本见 `Manrope-OFL.txt`、`DM-Mono-OFL.txt`、`Instrument-Serif-OFL.txt`。mediabunny 保留上游实现，源码位置为 `node_modules/mediabunny/src`，版本锁定见 package-lock.json；许可证副本为 `mediabunny-LICENSE.txt`。ECharts 同时保留 LICENSE 与 NOTICE 副本。此清单记录实际依赖及许可证文本，不代表商业化条款已完成专项审查。

PPTX export uses PptxGenJS 4.0.1 (MIT), with JSZip (MIT option), pako (MIT and Zlib), lie, immediate and setimmediate (MIT). License copies are in `licenses/`.
