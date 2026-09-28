# FORMA 参考研究与设计决策

研究日期：2026-09-08。

| 来源 | 查看内容 | 学习点 | FORMA 的独立实现 |
| --- | --- | --- | --- |
| [Apache ECharts 自定义图形](https://echarts.apache.org/examples/zh/index.html#chart-type-custom) | 官方示例入口、[数据过渡文档](https://echarts.apache.org/handbook/en/how-to/animation/transition/) | 图元可由数据驱动；添加、更新和删除有不同的动画时序 | 确定性 SVG 场景与共享时间轴；每一类图形都有自己的展开逻辑 |
| [Lieflat Charts](https://github.com/larashero3-dotcom/lieflat-charts) | README、青瓷、Glance、Lupi 02 与 Wire 实际预览图、字体／留白／单位／数据契约说明 | 图表与标题、来源、刻线和编辑排版构成同一套语言 | 自有品牌 FORMA，墨与朱／群青／朱砂／银版色谱，独立图形实现与工作台 |
| [Observable 动效设计](https://observablehq.com/blog/effective-animation) | 平滑变形、比较、空间变化、时间序列的设计解释 | 动效应帮助人跟踪对象与变化 | 排名保留对象颜色与路径；流域沿真实方向推进；播放与定位共用同一进度函数 |
| [D3 官方图形文档](https://d3js.org/d3-shape) | area、line、arc、ribbon 与尺度文档 | 通过数据映射形状，保持结构与数值一致 | D3 计算路径与比例，SVG 负责独立的视觉表现 |
| [Nivo](https://nivo.rocks/) / [GitHub](https://github.com/plouc/nivo) | 图型目录与可交互展示方式 | 建立完整图表家族，统一参数而不抹平图型差异 | 一个工作台调用 80 种不同数据结构，按适用问题分类 |
| [Unovis](https://unovis.dev/gallery/) / [GitHub](https://github.com/f5/unovis) | 缺失值折线、桑基、弦图、图表注释的示例目录 | 语义明确的交互，区分数据缺口和真实结构 | 全部图形保留原始记录查询；缺失不默认为零；流量严格守恒 |
| [Visual Cinnamon](https://www.visualcinnamon.com/portfolio/) | 作者公开作品集 | 径向图与密集关系图的构图节奏、细节与整体的平衡 | 年轮的周期刻度、弦桥的弧线与细刻度，作为自身数据编码的一部分 |

选择原则：优先借鉴可以解释数据、可以复用的设计方法。没有复制参考项目的模板源码、图像素材或品牌字体配置。Lieflat 仓库标明 PolyForm Noncommercial 1.0.0；本项目将其作为设计研究对象，实际图表源码独立编写。D3、d3-sankey、Lucide 与字体各自保留其依赖许可证。

## 视觉方向

第二版根据用户反馈重新校正：第一版的深绿色底、多色并列和大片叠色抢走了图形结构的注意力。新版把底色固定为中性色，以细线、可数单位、旁注与少数强调色组织画面。

- 背景：纸白 #F8F7F4 与中性炭黑 #202020；四套配色共享底色。
- 色彩：黑白灰构成主要层次，朱红或群青用于强调；颜色含义写进图例或标注。
- 排版：中文标题承担意思，衬线英文提供节奏，等宽小字承担编号和技术标签。
- 图形：细网格、克制的轮廓、可查询的原始样本、明确的零点与单位。
- 运动：先建立参照，再展开数据，最后停留阅读；把形状沿真实的比较或时间方向展开。
- 交互：画廊先看形态，工作台再替换内容；导出物保留所有必要口径。

界面使用图库式错落宽度，为趋势和流域留出足够横向空间。复杂图型采用局部的透明叠色；普通柱、线和对照图保持清楚的比较尺度。

## 第二版的具体取舍

- [Lupi 02 样张](https://github.com/larashero3-dotcom/lieflat-charts/blob/main/docs/assets/preview-lupi-02.png)：学习细线与单位点构成的密度，而非为每一类都选一种显眼颜色。
- [Wire 样张](https://github.com/larashero3-dotcom/lieflat-charts/blob/main/docs/assets/preview-color-wire.png)：学习中性纸面与炭黑画面的搭配，少数橙红强调制造阅读顺序。
- 自有图型采用真实日期刻线、同心百分比进度尺、平直基线单位点列、共享刻度的交叉矩阵、无随机抖动的蜂群、统计箱须与无向弧线。布局、数据、交互和源码独立实现。
- 重绘原 12 张：折线细化、桑基细密流线、山脊轻填充、排名细轮廓、散点空透、日历中性明度、瀑布黑灰与朱红、矩形树图刻纹、弦图轻线带、点阵细基线、哑铃明确增量。


## 第三版：核实跨图型变换

核查提交 `eace082a317b696c5570c25826a53a7fa113e984`。Lieflat 的 [glance-gallery.html 437–500 行](https://github.com/larashero3-dotcom/lieflat-charts/blob/eace082a317b696c5570c25826a53a7fa113e984/templates/glance-gallery.html#L437-L500) 使用 ECharts `universalTransition:true`，保留 `series.id='p'`、记录的 `groupId`；scatter → bar → pie 的更新持续1100ms，缓动 cubicInOut，每3000ms切换一次。不是 Remotion 实现。仓库 README 的GIF是展示素材，未发现制作这些GIF的脚本，不能判断其录制工具。

参考还包括 [ECharts Universal Transition 官方说明](https://echarts.apache.org/handbook/en/basics/release-note/5-2-0/)、[D3 Transition](https://d3js.org/d3-transition) 与 [Remotion 文档](https://www.remotion.dev/docs/)。网页交互变换无需引入视频渲染框架。

FORMA 保留当前原生 SVG 架构，独立实现128点闭合轮廓插值。条形用长度、气泡用面积、环形用角度、矩形树用面积表示同一组值。改进目标落实在：按类别身份固定颜色；快速点击从当前轮廓继续；1.0/1.5/2.4秒三档速度；停留3.9秒读图；手动选择停止轮播；系统减少动态设置；数据编辑、来源校验和自包含HTML导出。动画途中的形状只用于追踪，不展示混合量尺。

第三版界面将连续变换作为可以直接体验的主画布。新八类图分别覆盖频数、累计概率、留存、目标阈值、转化、层级、日历排程和表格微图，补齐前两辑未覆盖的数据问题。年轮、层峦、星群、构成、弦桥、百格进一步重修刻度、原始样本、内部细线和数量旁注。


## 第六版：不同图库、空间图形与变换方式

本轮检索官方图库、文档及 GitHub README；G2 图库页面较重，浏览器全量读取超时，因此没有把其现场动效当作已实测证据。

| 参考 | 学习与落地 |
| --- | --- |
| [Observable Plot Gallery](https://observablehq.com/@observablehq/plot-gallery) / [Contour 文档](https://observablehq.github.io/plot/marks/contour) | 规则采样和等值区域的组织；FORMA 用 D3 contours 计算等值线，保留实际采样点，注明线性插值。 |
| [AntV G2 图库](https://g2.antv.antgroup.com/en/examples) / [Morphing 文档](https://g2.antv.antgroup.com/en/manual/core/animate/morphing) | 以对象身份连接形态。FORMA 在原生 SVG 引擎上扩为八种视图，新增按类别错开和弧线迁移；未引入 G2 运行时。 |
| [ECharts GL](https://github.com/ecomfe/echarts-gl) | 三维散点、网格柱、曲面与坐标系统的图型组织。FORMA 独立实现三维布局和数据约束，运行时采用 Three.js。 |
| [Three.js SVGRenderer](https://threejs.org/docs/pages/SVGRenderer.html) / [OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html) | SVG 矢量渲染与正交相机适用于清晰的技术图形。采用哑光面和细网格，不使用需要 WebGL 着色器的特效；支持旋转、键盘和矢量输出。 |
| [Vega Examples](https://vega.github.io/vega/examples/) | 面积、层级与多种坐标布局的可组合示例。用明确的图型名称组织同一工作台，保留独立的数据契约。 |
| [D3 Hexbin](https://github.com/d3/d3-hexbin) | 从原始二维观测分箱。固定逻辑网格，缩放显示后仍保留每格成员与总样本数。 |
| [3D Force Graph](https://github.com/vasturiano/3d-force-graph) | Three.js 的空间交互与场景组织。作为下一轮空间关系图的研究储备，本版不包含力导向网络。 |
| [Semiotic](https://github.com/nteract/semiotic) / [roughViz](https://github.com/jwilber/roughViz) | 检索其图型组织和手绘表达方向。保留 FORMA 现有精确坐标与纹理，不对数值位置施加随机手绘抖动；未使用源码。 |

新增图型选择兼顾表达范围：三元配比、二维密度、规则采样、分段固定状态、两序列差异、分类层级，以及三指标空间分布与时间轨迹。每张示例仍是明确标注的确定性合成数据。


## 第七版：扩展关系、分布和周期图型

继续沿用前述 ECharts、Observable Plot、Vega 与 G2 的图库研究方向，本版补充以下官方依据。没有引入新的运行时依赖。

| 官方资料 | 本版实现 |
| --- | --- |
| [D3 有向弦图](https://d3js.org/d3-chord/chord) | `chordDirected` 分开构造每个方向的流带，`ribbonArrow` 表达去向；节点汇总流入和流出，总量只计每条边一次。 |
| [D3 Voronoi](https://d3js.org/d3-delaunay/voronoi) | 以等比例空间坐标划分最近邻区域，区域裁剪到可见坐标范围；分区面积不编码数量。 |
| [NIST 正态概率图](https://www.itl.nist.gov/div898/handbook/eda/section3/normprpl.htm) | Q-Q 图对照排序观测与理论正态分位数。本实现明确采用 `(i−0.5)/n` 的绘图位置、样本均值和样本标准差，未直接照搬 NIST 示例的绘图位置。 |
| [NIST Kaplan–Meier](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/kaplan.htm) | 持续率使用乘积极限估计，示例为阅读会话；保留观测截止记录，同一时刻先处理结束事件再移除删失观测。 |

平行集合图独立按三分类的完整组合排布，不从两两汇总推断不存在的完整路径。地平线图在原始线性序列的零点和分带阈值处插入交点后折叠，避免正负区域在错误的时间范围重叠。雨云图保留每个原始观测，共用密度带宽；三维气泡以正交投影面积表示 size，三维多线共享高度尺度。

变换画布增加「汇聚展开」「旋转落位」，都是既有轮廓插值引擎中的独立路径。最终数量编码保持不变，中间帧隐藏混合坐标标注。


## 第八版：科研语义与统计核对

这轮通过 agent-reach 的 Exa 检索官方资料，核对 Penn State 的均值响应 t 区间、NIST 的一致性分析、scikit-learn 的 ROC/AP/校准、Bioconductor 的组学结果、UpSet 的交集矩阵。来源链接与使用边界集中于 [SCIENTIFIC-GUIDE.md](SCIENTIFIC-GUIDE.md)。没有引入这些项目的运行时或复制其代码。新增绘图与数值计算沿用本地 D3/SVG，依赖版本保持不变。

## 第十一至十三批：过程、分布与复杂关系（2026-09-28）

本次新增 24 种图表，图库由 120 扩为 144 种，没有增加运行时依赖。数值方法与数据语义依据以下一手文档核对；绘图实现使用本项目的 D3 / SVG 场景。

| 依据 | 实现与边界 |
| --- | --- |
| [NIST p 控制图](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc332.htm)、[u 控制图](https://www.itl.nist.gov/div898/software/dataplot/refman1/ch2/ucontrol.pdf) | 按各批真实样本量或暴露量计算动态控制限；不将缺陷次数等同于不合格件数。 |
| [NIST CUSUM](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/cusum.htm)、[EWMA](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc324.htm)、[X̄-R](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc311.htm) | 双侧标准化 CUSUM 不在越限后擅自重置；EWMA 使用启动期控制限；子组均值与极差图保留各组原始观测。 |
| [SciPy periodogram](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.periodogram.html) | 等间隔观测先去均值，采用矩形窗的单边每频点功率，单位为观测单位的平方；不是功率谱密度，Nyquist 点不加倍。预测扇形另接收外部模型已计算的嵌套区间，不内置预测模型。 |
| [R quantile](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html)、[R ECDF](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/ecdf.html)、[SciPy ndtr](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.ndtr.html) | 分位数按 Type 7；经验分布保留重复观测；P–P 对照概率而非 Q–Q 的分位值。两组差异的方向与组顺序明确列出。 |
| [世界银行 Gini 定义](https://databank.worldbank.org/metadataglossary/gender-statistics/series/SI.POV.GINI) | 洛伦兹曲线使用等权非负观测，显示 0–1 的 Gini 系数，未声称支持调查权重。 |
| [R Gaussian density](https://search.r-project.org/R/refmans/stats/html/density.html)、[D3 contours](https://d3js.org/d3-contour/contours)、[ggdist half-eye](https://mjskay.github.io/ggdist/reference/stat_halfeye.html) | 真实高斯核密度与声明带宽；二维等高线表示密度层级而非置信概率。半眼的中央区间属于样本分布，不是均值置信区间；分位点阵每点代表等概率份额，不冒充原始样本点。 |
| [D3 pack](https://d3js.org/d3-hierarchy/pack)、[D3 tree](https://d3js.org/d3-hierarchy/tree) | 任意深度层级仅加总叶值；父圆含布局留白，面积不等于严格总量；径向树的枝长与角度仅用于排布。 |
| [D3 geo](https://d3js.org/d3-geo/shape)、[Natural Earth 使用条款](https://www.naturalearthdata.com/about/terms-of-use/) | 复用已有世界底图，地理流线沿大圆方向绘制并在日期变更线分段，线宽表示数量；连线不表示实际运输路线。 |

循环桑基图以强连通分量构造层次，独立排布回流与自环通道，共用数量到线宽比例。节点保留流入、流出和差额，不擅自平衡数据。邻接矩阵要求包含显式零的完整有向方阵；韦恩图要求三集合的七个排他区域，圆面积不编码数量。同期群留存按各群固定起始人数计算，允许回访上升，未观测未来保持缺失。敏感性龙卷风图表示输入参数低/高情景的模型输出，允许两端方向相反或位于基准同一侧。

新增 24 型均采用确定性原生入场动画，支持重播和反向定位；没有将它们登记成未经实现的连续变形。图库直接适配连续变形的模板仍为 65 种。

## 第十四至十六批：多变量、可靠性与决策（2026-09-28）

新增 24 种后，图库由 144 扩为 168 种。沿用现有 D3 / SVG 渲染与主题系统，没有新增运行时依赖。每种图的字段、公式、适用边界与参考链接同时写入中英双语数据指南。

| 依据 | 实现与边界 |
| --- | --- |
| [pandas Andrews curves](https://pandas.pydata.org/docs/reference/api/pandas.plotting.andrews_curves.html)、[R PCA biplot](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/biplot.princomp.html) | Andrews 使用声明顺序的可比尺度原值，不自动标准化；双标图接收外部得分与载荷，明确载荷倍率和缩放约定，不重新拟合 PCA。 |
| [Taylor diagram primer](https://pcmdi.llnl.gov/staff/taylor/CV/Taylor_diagram_primer.pdf) | 泰勒图同时显示标准差比、相关与中心误差，保留负相关半圆；目标图分离均值偏差与中心误差，并检查标准差三角界限。 |
| [NIST Youden plot](https://www.itl.nist.gov/div898/handbook/eda/section3/eda33v.htm)、[R agreementplot](https://search.r-project.org/CRAN/refmans/vcd/html/agreementplot.html)、[R assocplot](https://stat.ethz.ch/R-manual/R-devel/library/graphics/html/assocplot.html) | Youden 图使用等单位比例坐标；一致性 B 不冒充 Cohen κ；列联表保留全部显式零值，关联图面积对应观察与期望频数之差，马赛克面积对应联合频数。 |
| [swimplot](https://stat.ethz.ch/CRAN/web/packages/swimplot/refman/swimplot.html)、[pyts RecurrencePlot](https://pyts.readthedocs.io/en/latest/generated/pyts.image.RecurrencePlot.html) | 个体泳道保留响应与继续观察标记，多状态历程保留未观测空档；复现图直接比较原始标量距离，阈值有原始单位，不声称重构完整相空间。 |
| [NIST Weibull plot](https://www.itl.nist.gov/div898/handbook/eda/section3/weibplot.htm)、[NIST TTT](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/ttt_plot.htm)、[R mean excess](https://search.r-project.org/CRAN/refmans/evir/html/meplot.html) | Weibull 概率位置用 `(i−0.3)/(n+0.4)`；TTT 使用完整等权正寿命；平均超额仅使用严格超阈样本并明确最小样本数。均不擅自拟合寿命或极值模型。 |
| [SciPy spectrogram](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.spectrogram.html) | 接收外部已计算的完整时频功率矩阵，明确时间、频率和功率单位，不执行或伪造 FFT。 |

[RadViz 方法](https://pandas.pydata.org/pandas-docs/version/1.5/user_guide/visualization.html#radviz)按完整观测范围归一化后计算径向平衡位置；[Hive plot](https://www.hiveplot.com/)使用明确轴分组与位置。累计增益按完整同分块推进；[决策曲线原论文](https://pmc.ncbi.nlm.nih.gov/articles/2577036/)的净获益按 `TP/n − FP/n × t/(1−t)` 计算，并展示全部处理和均不处理基线。比例控制漏斗使用声明基准的二项正态近似，要求各分母满足近似条件；[L’Abbé 图](https://search.r-project.org/CRAN/refmans/plotrix/html/labbePlot.html)保留双组原始分母，气泡面积表示样本量。列线图展示用户给定的线性加法评分，不将评分冒充风险概率。

新增模板使用可往返定位的原生入场动画。连续变形兼容性仍按现有引擎判断，65 种已适配模板的范围保持不变。


## 第十七至十九批：统计诊断、业务网络与工程信号（2026-09-28）

新增 36 种后，图库达到 204 种，可使用“200+ 种图表”介绍。新模板均接入现有数据编辑、主题、Agent 说明与作品导出，采用可往返定位的原生入场；65 种连续变形模板和 139 种原生入场模板分别标注，没有新增运行时依赖。

| 方法资料 | 实现与边界 |
| --- | --- |
| [Seaborn boxen](https://seaborn.pydata.org/generated/seaborn.boxenplot.html)、[ggforce sina](https://ggforce.data-imaginist.com/reference/geom_sina.html)、[R 回归诊断](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/plot.lm.html) | 分位箱与密度抖动保留原始观测；回归图接收真实拟合值、残差、杠杆与模型参数，不在图中伪造拟合结果。Cook 距离参考线不用于自动删除观测。 |
| [NetworkX 双部图](https://networkx.org/documentation/stable/reference/algorithms/bipartite.html)、[SciPy 双样本 KS](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html)、[scikit-learn 代价敏感决策](https://scikit-learn.org/stable/auto_examples/model_selection/plot_cost_sensitive_learning.html) | 关系图保留已给边与分组；预测评估按完整同分块统计，阈值、类别与误判代价显式声明。KS 图显示经验分布差，未冒充显著性检验。 |
| [MathWorks Bode](https://www.mathworks.com/help/control/ref/dynamicsystem.bode.html)、[Nyquist](https://www.mathworks.com/help/control/ref/dynamicsystem.nyquist.html)、[scikit-rf 反射系数](https://scikit-rf.readthedocs.io/en/latest/api/generated/skrf.tlineFunctions.zl_2_Gamma0.html) | 幅相、复平面与阻抗图由给定复数观测计算；只连接已给频率点，不补镜像或闭合轮廓，不自行推断稳定性。Smith 图使用正实参考阻抗与非负电阻。 |
| [MetPy hodograph](https://unidata.github.io/MetPy/latest/api/generated/metpy.plots.Hodograph.html)、[MathWorks 眼图](https://www.mathworks.com/help/comm/ref/eyediagram.html)、[星座图](https://www.mathworks.com/help/comm/ref/constellationdiagram.html) | 风廓线保持实测高度与等比例风分量；眼图保留原始采样与不完整窗口；星座图保留实际 I/Q 点，不生成理想符号或虚构 EVM/BER。 |

36 种图的字段、单位、计算方式和限制均有中英双语数据指南。图库预览统一采用可见区域渲染、离屏释放和重复帧跳过；路由切换会使旧渲染任务失效。
