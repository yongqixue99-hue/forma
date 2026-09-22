import * as echarts from "echarts/core";
import { CustomChart, LineChart, ScatterChart } from "echarts/charts";
import {
  GraphicComponent,
  GridComponent,
  MarkAreaComponent,
  TooltipComponent,
} from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import "./style.css";

echarts.use([
  CustomChart,
  LineChart,
  ScatterChart,
  GraphicComponent,
  GridComponent,
  MarkAreaComponent,
  TooltipComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

const TOKENS = {
  carbon: "#0B0E0D",
  surface: "#151918",
  surfaceRaised: "#1B201E",
  bone: "#F3F0E8",
  boneDeep: "#DFDBD0",
  graphite: "#7F8984",
  graphiteDark: "#59615D",
  rule: "#29302D",
  ruleLight: "#D7D2C6",
  acid: "#D9FF52",
};

const FONT_SANS = '"Manrope", "Noto Sans SC", "PingFang SC", sans-serif';
const FONT_MONO = '"IBM Plex Mono", "SFMono-Regular", monospace';
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MOTION = {
  reveal: reduceMotion ? 0 : 880,
  morph: reduceMotion ? 0 : 720,
  focus: reduceMotion ? 0 : 180,
  stagger: reduceMotion ? 0 : 34,
};

const controllers = new Map();
let selectedPeriod = "current";
let revealObserver;

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function periodPair(baseline, current, mode) {
  return mode === "current"
    ? { active: current, previous: baseline }
    : { active: baseline, previous: current };
}

function createChart(id) {
  const element = document.getElementById(id);
  return {
    element,
    chart: echarts.init(element, null, { renderer: "canvas" }),
  };
}

function baseAnimation(overrides = {}) {
  return {
    animation: !reduceMotion,
    animationDuration: MOTION.reveal,
    animationEasing: "cubicOut",
    animationDurationUpdate: MOTION.morph,
    animationEasingUpdate: "cubicInOut",
    textStyle: { fontFamily: FONT_SANS },
    ...overrides,
  };
}

function tooltipTheme(light = false) {
  return {
    trigger: "item",
    confine: true,
    backgroundColor: light ? TOKENS.carbon : TOKENS.bone,
    borderWidth: 0,
    padding: [10, 12],
    textStyle: {
      color: light ? TOKENS.bone : TOKENS.carbon,
      fontFamily: FONT_SANS,
      fontSize: 11,
    },
    extraCssText: "border-radius:4px;box-shadow:0 16px 36px rgba(0,0,0,.18);",
  };
}

// 01 — 收入潮位：一条主线 + 一个低对比体积
function initTide() {
  const { chart } = createChart("chart-tide");
  const labels = ["JAN", "", "FEB", "", "MAR", "", "APR", "", "MAY", "", "JUN", ""];
  const baseline = [42, 45, 49, 53, 57, 61, 65, 68, 71, 74, 78, 82];
  const current = [43, 48, 53, 59, 65, 71, 77, 82, 87, 91, 98, 103];

  const activePoints = (values) =>
    values.map((value, index) => ({
      id: `tide-${index}`,
      value,
      symbolSize: index === values.length - 1 ? 11 : 0,
      itemStyle:
        index === values.length - 1
          ? { color: TOKENS.acid, borderColor: TOKENS.surface, borderWidth: 4 }
          : { color: TOKENS.acid },
    }));

  chart.setOption({
    ...baseAnimation(),
    grid: { left: 46, right: 34, top: 64, bottom: 34 },
    tooltip: {
      ...tooltipTheme(false),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: rgba(TOKENS.bone, 0.14), width: 1 } },
      formatter: (items) => {
        const activeItem = items.find((item) => item.seriesId === "tide-active");
        const previousItem = items.find((item) => item.seriesId === "tide-previous");
        if (!activeItem || !previousItem) return "";
        return `累计收入<br><b style="font:600 17px ${FONT_MONO}">¥${(Number(activeItem.value) / 10).toFixed(1)}M</b><br><span style="opacity:.55">对照 ¥${(Number(previousItem.value) / 10).toFixed(1)}M</span>`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TOKENS.graphite, fontFamily: FONT_MONO, fontSize: 9, margin: 14 },
    },
    yAxis: {
      type: "value",
      min: 30,
      max: 110,
      interval: 20,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: TOKENS.graphite,
        fontFamily: FONT_MONO,
        fontSize: 9,
        formatter: (value) => `${Math.round(value / 10)}M`,
      },
      splitLine: { show: false },
    },
    graphic: [
      {
        type: "group",
        right: 34,
        top: 18,
        children: [
          {
            type: "rect",
            shape: { x: 0, y: 0, width: 98, height: 28, r: 14 },
            style: { fill: rgba(TOKENS.acid, 0.1) },
          },
          {
            type: "circle",
            shape: { cx: 14, cy: 14, r: 3 },
            style: { fill: TOKENS.acid },
          },
          {
            type: "text",
            style: {
              x: 25,
              y: 14,
              text: "TARGET 9.0M",
              textVerticalAlign: "middle",
              fill: TOKENS.bone,
              font: `500 9px ${FONT_MONO}`,
            },
          },
        ],
      },
    ],
    series: [
      {
        id: "tide-previous",
        type: "line",
        data: baseline,
        smooth: 0.38,
        showSymbol: false,
        silent: true,
        lineStyle: { width: 0, opacity: 0 },
        areaStyle: { color: rgba(TOKENS.bone, 0.07) },
        z: 1,
      },
      {
        id: "tide-active",
        type: "line",
        data: activePoints(current),
        smooth: 0.38,
        showSymbol: true,
        lineStyle: { color: TOKENS.acid, width: 4, cap: "round" },
        itemStyle: { color: TOKENS.acid },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: rgba(TOKENS.acid, 0.22) },
            { offset: 1, color: rgba(TOKENS.acid, 0) },
          ]),
        },
        universalTransition: { enabled: true, divideShape: "clone" },
        z: 3,
      },
    ],
  });

  const setMode = (mode) => {
    const { active, previous } = periodPair(baseline, current, mode);
    const delta = ((active.at(-1) - previous.at(-1)) / previous.at(-1)) * 100;
    document.getElementById("tide-metric").textContent = `¥${(active.at(-1) / 10).toFixed(1)}M`;
    document.getElementById("tide-delta").textContent = `${mode === "current" ? "较基线" : "对照当前"} ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
    document.getElementById("tide-target-status").textContent = `目标 ¥9.0M · ${active.at(-1) >= 90 ? "已越过" : "尚未越过"}`;
    chart.setOption({
      series: [
        { id: "tide-previous", data: previous },
        { id: "tide-active", data: activePoints(active) },
      ],
    });
  };

  setMode(selectedPeriod);
  return { chart, setMode };
}

// 02 — 平衡环：粗轨道替代密集刻度
function initOrbit() {
  const { element, chart } = createChart("chart-orbit");
  const names = ["激活", "留存", "满意"];
  const baseline = [72, 61, 88];
  const current = [84, 68, 91];
  let average = 81;

  const makeData = (mode) => {
    const { active, previous } = periodPair(baseline, current, mode);
    return active.map((value, index) => [value, previous[index], index]);
  };

  const renderOrbit = (params, api) => {
    const active = Number(api.value(0));
    const previous = Number(api.value(1));
    const index = Number(api.value(2));
    const width = element.clientWidth;
    const height = element.clientHeight;
    const cx = width * 0.5;
    const cy = height * 0.44;
    const outer = Math.min(width * 0.34, height * 0.32);
    const radius = outer - index * Math.max(25, outer * 0.2);
    const band = Math.max(9, radius * 0.09);
    const start = Math.PI * 0.76;
    const span = Math.PI * 1.48;
    const activeEnd = start + span * (active / 100);
    const previousEnd = start + span * (previous / 100);
    const children = [
      {
        type: "sector",
        shape: { cx, cy, r: radius, r0: radius - band, startAngle: start, endAngle: start + span },
        style: { fill: rgba(TOKENS.carbon, 0.11) },
      },
      {
        type: "sector",
        shape: { cx, cy, r: radius, r0: radius - band, startAngle: start, endAngle: activeEnd },
        style: { fill: TOKENS.carbon },
        enterFrom: { shape: { endAngle: start } },
        transition: ["shape"],
      },
      {
        type: "circle",
        shape: {
          cx: cx + Math.cos(previousEnd) * (radius - band / 2),
          cy: cy + Math.sin(previousEnd) * (radius - band / 2),
          r: 4,
        },
        style: { fill: TOKENS.acid, stroke: rgba(TOKENS.carbon, 0.46), lineWidth: 1 },
        transition: ["shape"],
      },
      {
        type: "circle",
        shape: {
          cx: cx + Math.cos(activeEnd) * (radius - band / 2),
          cy: cy + Math.sin(activeEnd) * (radius - band / 2),
          r: 4.5,
        },
        style: { fill: TOKENS.bone, stroke: TOKENS.carbon, lineWidth: 2 },
        transition: ["shape"],
      },
      {
        type: "text",
        style: {
          x: width * (0.2 + index * 0.3),
          y: height - 29,
          text: `${names[index]}  ${active}`,
          textAlign: "center",
          fill: TOKENS.carbon,
          font: `600 10px ${FONT_MONO}`,
        },
      },
    ];

    if (index === 0) {
      children.push(
        {
          type: "text",
          style: {
            x: cx,
            y: cy - 9,
            text: String(average),
            textAlign: "center",
            textVerticalAlign: "middle",
            fill: TOKENS.carbon,
            font: `600 49px ${FONT_MONO}`,
          },
          transition: ["style"],
        },
        {
          type: "text",
          style: {
            x: cx,
            y: cy + 24,
            text: "BALANCE SCORE",
            textAlign: "center",
            textVerticalAlign: "middle",
            fill: rgba(TOKENS.carbon, 0.55),
            font: `500 9px ${FONT_MONO}`,
          },
        },
      );
    }

    return { type: "group", children };
  };

  chart.setOption({
    ...baseAnimation(),
    tooltip: {
      ...tooltipTheme(true),
      formatter: (item) => `${names[item.dataIndex]}<br><b style="font:600 17px ${FONT_MONO}">${item.value[0]}%</b><br><span style="opacity:.55">基线 ${item.value[1]}%</span>`,
    },
    series: [
      {
        id: "orbit-series",
        type: "custom",
        coordinateSystem: "none",
        renderItem: renderOrbit,
        data: makeData(selectedPeriod),
      },
    ],
  });

  const setMode = (mode) => {
    const data = makeData(mode);
    average = Math.round(data.reduce((sum, item) => sum + item[0], 0) / data.length);
    chart.setOption({ series: [{ id: "orbit-series", data }] });
  };

  setMode(selectedPeriod);
  return { chart, setMode };
}

// 03 — 功能磁柱：实体长度 + 单个基线标记
function initRank() {
  const { chart } = createChart("chart-rank");
  const names = ["自动摘要", "实时协作", "批量导出", "API 工作流", "团队权限"];
  const baseline = [61, 68, 42, 49, 55];
  const current = [84, 79, 66, 58, 57];

  const makeData = (mode) => {
    const { active, previous } = periodPair(baseline, current, mode);
    return active.map((value, index) => [index, value, previous[index]]);
  };

  const renderRank = (params, api) => {
    const row = Number(api.value(0));
    const active = Number(api.value(1));
    const previous = Number(api.value(2));
    const start = api.coord([0, row]);
    const end = api.coord([active, row]);
    const previousPoint = api.coord([previous, row]);
    const maximum = api.coord([100, row]);
    const railHeight = 10;
    const barHeight = 18;
    const labelOnLeft = active > 88;
    const fill = row === 0 ? TOKENS.acid : row === 1 ? TOKENS.graphiteDark : TOKENS.carbon;

    return {
      type: "group",
      children: [
        {
          type: "rect",
          shape: { x: start[0], y: start[1] - railHeight / 2, width: maximum[0] - start[0], height: railHeight, r: railHeight / 2 },
          style: { fill: TOKENS.boneDeep },
        },
        {
          type: "rect",
          shape: { x: start[0], y: start[1] - barHeight / 2, width: Math.max(2, end[0] - start[0]), height: barHeight, r: barHeight / 2 },
          style: { fill },
          enterFrom: { shape: { width: 0 } },
          transition: ["shape", "style"],
        },
        {
          type: "rect",
          shape: { x: previousPoint[0] - 1, y: start[1] - 14, width: 2, height: 28, r: 1 },
          style: { fill: rgba(TOKENS.carbon, 0.34) },
          transition: ["shape"],
        },
        {
          type: "text",
          style: {
            x: labelOnLeft ? end[0] - 10 : end[0] + 10,
            y: start[1],
            text: `${active}%`,
            textAlign: labelOnLeft ? "right" : "left",
            textVerticalAlign: "middle",
            fill: labelOnLeft ? TOKENS.bone : TOKENS.carbon,
            font: `600 10px ${FONT_MONO}`,
          },
          transition: ["style"],
        },
      ],
    };
  };

  chart.setOption({
    ...baseAnimation({ animationDelay: (index) => index * 70 }),
    grid: { left: 104, right: 46, top: 32, bottom: 25 },
    tooltip: {
      ...tooltipTheme(true),
      formatter: (item) => `${names[item.dataIndex]}<br><b style="font:600 17px ${FONT_MONO}">${item.value[1]}%</b><br><span style="opacity:.55">基线 ${item.value[2]}%</span>`,
    },
    xAxis: { type: "value", min: 0, max: 100, show: false },
    yAxis: {
      type: "category",
      inverse: true,
      data: names,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TOKENS.carbon, fontFamily: FONT_SANS, fontSize: 10, fontWeight: 600, margin: 16 },
    },
    series: [
      {
        id: "rank-series",
        type: "custom",
        coordinateSystem: "cartesian2d",
        renderItem: renderRank,
        encode: { x: [1, 2], y: 0, tooltip: [1, 2] },
        data: makeData(selectedPeriod),
      },
    ],
  });

  const setMode = (mode) => {
    chart.setOption({ series: [{ id: "rank-series", data: makeData(mode) }] });
  };

  return { chart, setMode };
}

// 04 — 相位阵列：同一数据单元在波形、排名与轨道之间保持身份
function initPhases() {
  const { element, chart } = createChart("chart-phases");
  const signals = [
    ["PAGES", 41, 48, 58],
    ["FORMS", 48, 57, 65],
    ["DOCS", 58, 69, 82],
    ["BOARDS", 67, 82, 91],
    ["EDITOR", 76, 94, 100],
    ["FLOWS", 72, 87, 86],
    ["VAULT", 65, 78, 72],
    ["CHAT", 59, 68, 69],
    ["VIEWS", 61, 74, 76],
    ["SYNC", 55, 66, 63],
    ["HUB", 44, 54, 51],
    ["GRID", 50, 62, 60],
  ].map(([id, baseline, current, volume], index) => ({ id, baseline, current, volume, index }));
  const phases = [
    { key: "wave", label: "波形" },
    { key: "rank", label: "排名" },
    { key: "orbit", label: "轨道" },
  ];
  let phaseIndex = 0;
  let mode = selectedPeriod;
  let phaseTimer;

  const activeValue = (signal) => signal[mode];
  const previousValue = (signal) => signal[mode === "current" ? "baseline" : "current"];
  const ranked = () => [...signals].sort((a, b) => activeValue(b) - activeValue(a));

  const makeData = () => {
    const rankById = new Map(ranked().map((signal, rank) => [signal.id, rank]));
    const orderedSignals = phaseIndex === 0 ? signals : ranked();
    return orderedSignals.map((signal) => ({
      id: signal.id,
      name: signal.id,
      value: [signal.index, activeValue(signal), previousValue(signal), signal.volume, rankById.get(signal.id), phaseIndex],
    }));
  };

  const renderSignal = (params, api) => {
    const index = Number(api.value(0));
    const active = Number(api.value(1));
    const previous = Number(api.value(2));
    const volume = Number(api.value(3));
    const rank = Number(api.value(4));
    const phase = Number(api.value(5));
    const signal = signals[index];
    const width = element.clientWidth;
    const height = element.clientHeight;
    const compact = width < 620;
    const centerX = width * 0.53;
    const centerY = height * 0.53;
    const isLeader = rank === 0;
    const fill = isLeader
      ? TOKENS.acid
      : rank === 1
        ? TOKENS.bone
        : rank < 4
          ? "#B8BFBB"
          : rank < 8
            ? TOKENS.graphite
            : "#3A413E";
    let x;
    let y;
    let rotation;
    let length;
    let previousLength;
    let thickness;
    let labelX;
    let labelY;
    let labelAlign = "center";
    let labelVisible = rank < 3;
    let valueVisible = false;
    let labelText = signal.id;

    if (phase === 0) {
      const left = compact ? 20 : 38;
      const right = compact ? 20 : 38;
      const step = (width - left - right) / signals.length;
      const t = (index + 0.5) / signals.length;
      const theta = t * Math.PI * 2 - Math.PI * 0.72;
      const amplitude = height * (compact ? 0.14 : 0.18);
      const segmentCenterX = left + (index + 0.5) * step;
      const segmentCenterY = height * 0.56 + Math.sin(theta) * amplitude;
      const tangent = Math.atan2(Math.cos(theta) * amplitude * Math.PI * 2, width - left - right);
      rotation = tangent;
      length = step * (0.67 + ((active - 40) / 60) * 0.2);
      previousLength = step * (0.67 + ((previous - 40) / 60) * 0.2);
      thickness = compact ? 12 + volume * 0.035 : 15 + volume * 0.07;
      x = segmentCenterX - Math.cos(rotation) * length * 0.5;
      y = segmentCenterY - Math.sin(rotation) * length * 0.5;
      labelX = segmentCenterX + Math.cos(rotation) * length * 0.5;
      labelY = segmentCenterY + Math.sin(rotation) * length * 0.5 - 15;
      labelText = `${signal.id}  ${active}`;
      labelVisible = isLeader;
    } else if (phase === 1) {
      const top = 17;
      const bottom = 18;
      const rowStep = (height - top - bottom) / signals.length;
      const startX = compact ? 66 : 92;
      const usable = width - startX - (compact ? 54 : 76);
      x = startX;
      y = top + rank * rowStep + rowStep / 2;
      rotation = 0;
      length = Math.max(42, usable * (active / 100));
      previousLength = Math.max(42, usable * (previous / 100));
      thickness = Math.max(9, Math.min(15, rowStep * 0.56));
      labelX = compact ? 10 : 20;
      labelY = y;
      labelAlign = "left";
      labelVisible = true;
      valueVisible = true;
      labelText = signal.id;
    } else {
      const angle = -Math.PI / 2 + (rank / signals.length) * Math.PI * 2;
      const radius = Math.min(width * (compact ? 0.18 : 0.13), height * 0.27);
      length = 18 + active * (compact ? 0.43 : 0.62);
      previousLength = 18 + previous * (compact ? 0.43 : 0.62);
      thickness = compact ? 11 : 15;
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius;
      rotation = angle;
      labelX = centerX + Math.cos(angle) * (radius + length + 14);
      labelY = centerY + Math.sin(angle) * (radius + length + 14);
      labelAlign = Math.cos(angle) > 0.18 ? "left" : Math.cos(angle) < -0.18 ? "right" : "center";
      labelText = `${signal.id}  ${active}`;
      labelVisible = isLeader;
    }

    const markerOutside = previousLength > length + 2;
    const markerPosition = clamp(previousLength, thickness * 0.55, Math.max(thickness * 0.55, length - thickness * 0.55));
    const markerSize = Math.max(4, thickness * 0.3);
    const body = {
      type: "group",
      name: "body",
      x,
      y,
      rotation,
      enterFrom: {
        x: width * 0.5,
        y: height * 0.72,
        rotation: 0,
        opacity: 0,
      },
      transition: ["x", "y", "rotation", "opacity"],
      children: [
        {
          type: "rect",
          name: "mass",
          shape: { x: 0, y: -thickness / 2, width: length, height: thickness, r: thickness / 2 },
          style: { fill },
          enterFrom: { shape: { width: 2 } },
          transition: ["shape", "style"],
          emphasis: { style: { fill: isLeader ? TOKENS.acid : TOKENS.bone } },
        },
        {
          type: "rect",
          name: "baseline-notch",
          shape: {
            x: markerPosition - markerSize / 2,
            y: -markerSize / 2,
            width: markerSize,
            height: markerSize,
            r: markerSize / 2,
          },
          style: {
            fill: TOKENS.surface,
            stroke: markerOutside ? rgba(TOKENS.bone, 0.8) : rgba(TOKENS.bone, 0.18),
            lineWidth: markerOutside ? 1.5 : 1,
          },
          transition: ["shape", "style"],
        },
        {
          type: "circle",
          name: "leader-cap",
          shape: { cx: length - thickness / 2, cy: 0, r: isLeader ? thickness * 0.2 : 0 },
          style: { fill: TOKENS.carbon },
          transition: ["shape"],
        },
      ],
    };

    const children = [body];
    children.push({
      type: "text",
      name: "label",
      silent: true,
      style: {
        x: labelX,
        y: labelY,
        text: labelVisible ? labelText : "",
        textAlign: labelAlign,
        textVerticalAlign: "middle",
        fill: isLeader ? TOKENS.acid : rank < 3 ? TOKENS.bone : TOKENS.graphite,
        opacity: labelVisible ? 1 : 0,
        font: `${rank < 3 ? 600 : 500} ${compact ? 7 : 9}px ${FONT_MONO}`,
      },
      transition: ["style"],
    });

    if (valueVisible) {
      children.push({
        type: "text",
        name: "value",
        silent: true,
        style: {
          x: x + length + 10,
          y,
          text: String(active),
          textAlign: "left",
          textVerticalAlign: "middle",
          fill: isLeader ? TOKENS.acid : TOKENS.graphite,
          opacity: 1,
          font: `600 ${compact ? 8 : 10}px ${FONT_MONO}`,
        },
        transition: ["style"],
      });
    }

    if (phase === 2 && index === 0) {
      const currentMean = Math.round(signals.reduce((sum, item) => sum + activeValue(item), 0) / signals.length);
      children.push(
        {
          type: "text",
          name: "orbit-score",
          silent: true,
          style: {
            x: centerX,
            y: centerY - 7,
            text: String(currentMean),
            textAlign: "center",
            textVerticalAlign: "middle",
            fill: TOKENS.bone,
            opacity: 1,
            font: `500 ${compact ? 28 : 38}px ${FONT_MONO}`,
          },
          transition: ["style"],
        },
        {
          type: "text",
          name: "orbit-caption",
          silent: true,
          style: {
            x: centerX,
            y: centerY + 19,
            text: "SIGNAL MEAN",
            textAlign: "center",
            textVerticalAlign: "middle",
            fill: TOKENS.graphite,
            opacity: 1,
            font: `500 ${compact ? 7 : 8}px ${FONT_MONO}`,
          },
          transition: ["style"],
        },
      );
    }

    return { type: "group", children };
  };

  chart.setOption({
    ...baseAnimation({
      animationDuration: reduceMotion ? 0 : 1080,
      animationDurationUpdate: reduceMotion ? 0 : 1080,
      animationEasing: "quarticOut",
      animationEasingUpdate: "cubicInOut",
      animationDelay: (index) => index * 38,
      animationDelayUpdate: (index) => index * 34,
    }),
    tooltip: {
      ...tooltipTheme(false),
      formatter: (item) => {
        const signal = signals[item.value[0]];
        const delta = item.value[1] - item.value[2];
        return `${signal.id}<br><b style="font:600 17px ${FONT_MONO}">${item.value[1]}</b> 信号指数<br><span style="opacity:.55">基线 ${item.value[2]} · ${delta >= 0 ? "+" : ""}${delta}</span>`;
      },
    },
    graphic: [
      {
        id: "phase-guide",
        type: "text",
        left: 24,
        top: 4,
        silent: true,
        style: {
          text: "SAME 12 SIGNALS · PERSISTENT IDENTITY",
          fill: rgba(TOKENS.bone, 0.28),
          font: `500 8px ${FONT_MONO}`,
        },
      },
      {
        id: "phase-hint",
        type: "text",
        right: 24,
        top: 4,
        silent: true,
        style: {
          text: "CLICK TO SHIFT",
          fill: rgba(TOKENS.bone, 0.28),
          font: `500 8px ${FONT_MONO}`,
        },
      },
    ],
    series: [
      {
        id: "phase-series",
        type: "custom",
        coordinateSystem: "none",
        renderItem: renderSignal,
        data: makeData(),
        encode: { tooltip: [1, 2] },
      },
    ],
  });

  const renderPhase = () => {
    document.getElementById("phase-metric").textContent = `0${phaseIndex + 1}/03`;
    document.getElementById("phase-label").textContent = phases[phaseIndex].label;
    chart.setOption({ series: [{ id: "phase-series", data: makeData() }] });
  };

  const advancePhase = () => {
    phaseIndex = (phaseIndex + 1) % phases.length;
    renderPhase();
  };

  const restartTimer = () => {
    window.clearInterval(phaseTimer);
    if (!reduceMotion) phaseTimer = window.setInterval(advancePhase, 3200);
  };

  const handleClick = () => {
    advancePhase();
    restartTimer();
  };

  chart.getZr().on("click", handleClick);
  restartTimer();

  const setMode = (nextMode) => {
    mode = nextMode;
    renderPhase();
  };

  const dispose = () => {
    window.clearInterval(phaseTimer);
    chart.getZr().off("click", handleClick);
  };

  renderPhase();
  return { chart, setMode, dispose };
}

// 05 — 路径重量：三条有序粗轨道
function initRoute() {
  const { chart } = createChart("chart-route");
  const routes = [
    {
      name: "搜索路径",
      labels: ["搜索", "比较", "试用", "激活"],
      baseline: [[5, 75], [35, 73], [65, 66], [95, 69]],
      current: [[5, 78], [35, 77], [65, 72], [95, 76]],
      volume: { baseline: 486, current: 624 },
    },
    {
      name: "内容路径",
      labels: ["内容", "收藏", "回访", "激活"],
      baseline: [[5, 50], [35, 53], [65, 50], [95, 54]],
      current: [[5, 54], [35, 58], [65, 56], [95, 61]],
      volume: { baseline: 352, current: 417 },
    },
    {
      name: "推荐路径",
      labels: ["推荐", "浏览", "咨询", "激活"],
      baseline: [[5, 26], [35, 29], [65, 25], [95, 31]],
      current: [[5, 29], [35, 34], [65, 32], [95, 39]],
      volume: { baseline: 218, current: 301 },
    },
  ];
  let activeRoute = 0;
  let renderVersion = 0;

  const makeData = () => routes.map((_, index) => [index, renderVersion]);

  const renderRoute = (params, api) => {
    const index = Number(api.value(0));
    const route = routes[index];
    const activeCoords = route[selectedPeriod].map((point) => api.coord(point));
    const previousCoords = route[selectedPeriod === "current" ? "baseline" : "current"].map((point) => api.coord(point));
    const selected = index === activeRoute;
    const firstPoint = activeCoords[0];
    const children = [
      {
        type: "polyline",
        shape: { points: activeCoords, smooth: 0.32 },
        style: {
          stroke: selected ? TOKENS.acid : rgba(TOKENS.carbon, 0.14),
          fill: "none",
          lineWidth: selected ? 12 : 8,
          lineCap: "round",
          lineJoin: "round",
        },
        enterFrom: { shape: { points: activeCoords.map(() => firstPoint) } },
        transition: ["shape", "style"],
      },
    ];

    if (selected) {
      previousCoords.forEach((point) => {
        children.push({
          type: "circle",
          shape: { cx: point[0], cy: point[1], r: 4 },
          style: { fill: TOKENS.bone, stroke: rgba(TOKENS.carbon, 0.38), lineWidth: 1.5 },
          transition: ["shape"],
        });
      });

      activeCoords.forEach((point, pointIndex) => {
        children.push(
          {
            type: "circle",
            shape: { cx: point[0], cy: point[1], r: pointIndex === activeCoords.length - 1 ? 8 : 5 },
            style: { fill: TOKENS.carbon, stroke: TOKENS.acid, lineWidth: 3 },
            transition: ["shape"],
          },
          {
            type: "text",
            style: {
              x: point[0],
              y: point[1] - 19,
              text: route.labels[pointIndex],
              textAlign: "center",
              fill: TOKENS.carbon,
              font: `600 10px ${FONT_SANS}`,
            },
          },
        );
      });

      if (!reduceMotion) {
        children.push({
          type: "circle",
          shape: { cx: activeCoords.at(-1)[0], cy: activeCoords.at(-1)[1], r: 3 },
          style: { fill: TOKENS.bone },
          keyframeAnimation: {
            duration: MOTION.reveal,
            delay: 160,
            easing: "cubicInOut",
            keyframes: activeCoords.map((point, pointIndex) => ({
              percent: pointIndex / (activeCoords.length - 1),
              shape: { cx: point[0], cy: point[1] },
            })),
          },
        });
      }
    }

    children.push({
      type: "text",
      style: {
        x: activeCoords.at(-1)[0] + 17,
        y: activeCoords.at(-1)[1],
        text: String(route.volume[selectedPeriod]),
        textVerticalAlign: "middle",
        fill: selected ? TOKENS.carbon : rgba(TOKENS.carbon, 0.42),
        font: `${selected ? 600 : 500} ${selected ? 12 : 10}px ${FONT_MONO}`,
      },
      transition: ["style"],
    });

    return { type: "group", children };
  };

  chart.setOption({
    ...baseAnimation(),
    grid: { left: 42, right: 74, top: 48, bottom: 28 },
    tooltip: {
      ...tooltipTheme(true),
      formatter: (item) => {
        const route = routes[item.dataIndex];
        return `${route.name}<br><b style="font:600 17px ${FONT_MONO}">${route.volume[selectedPeriod]}</b> 个激活团队<br><span style="opacity:.55">基线 ${route.volume[selectedPeriod === "current" ? "baseline" : "current"]}</span>`;
      },
    },
    xAxis: { type: "value", min: 0, max: 105, show: false },
    yAxis: { type: "value", min: 10, max: 90, show: false },
    series: [
      {
        id: "route-series",
        type: "custom",
        coordinateSystem: "cartesian2d",
        renderItem: renderRoute,
        data: makeData(),
      },
    ],
  });

  const updateRoute = () => {
    renderVersion += 1;
    document.querySelectorAll("[data-route]").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.route) === activeRoute);
    });
    chart.setOption({ series: [{ id: "route-series", data: makeData() }] });
  };

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.onclick = () => {
      activeRoute = Number(button.dataset.route);
      updateRoute();
    };
  });

  const setMode = () => updateRoute();
  updateRoute();
  return { chart, setMode };
}

// 06 — 请求脉冲：只用圆点面积与异常描边
function initPulse() {
  const { chart } = createChart("chart-pulse");
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const hours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
  const cells = [];

  days.forEach((day, dayIndex) => {
    hours.forEach((hour, hourIndex) => {
      const wave = Math.sin((hourIndex / 11) * Math.PI) * 38;
      const weekday = dayIndex < 5 ? 19 : -7;
      const texture = ((dayIndex * 29 + hourIndex * 17) % 31) - 10;
      const baseline = clamp(22 + wave + weekday + texture, 12, 98);
      const change = ((dayIndex * 13 + hourIndex * 7) % 19) - 4;
      const current = clamp(baseline + change, 10, 100);
      cells.push({
        id: `${day}-${hour}`,
        name: `${day} ${hour}:00`,
        x: hourIndex,
        y: dayIndex,
        baseline,
        current,
      });
    });
  });

  const makeData = (mode) =>
    cells.map((cell) => {
      const value = cell[mode];
      const anomaly = value >= 92;
      return {
        id: cell.id,
        name: cell.name,
        value: [cell.x, cell.y, value],
        symbolSize: 5 + value * 0.1,
        itemStyle: {
          color: anomaly ? TOKENS.surface : TOKENS.bone,
          borderColor: anomaly ? TOKENS.acid : TOKENS.bone,
          borderWidth: anomaly ? 2.5 : 0,
          opacity: anomaly ? 1 : 0.18 + value / 130,
        },
      };
    });

  chart.setOption({
    ...baseAnimation({
      animationDelay: (index) => (index % 12) * 24 + Math.floor(index / 12) * 14,
    }),
    grid: { left: 42, right: 20, top: 30, bottom: 32 },
    tooltip: {
      ...tooltipTheme(false),
      formatter: (item) => `${item.data.name}<br><b style="font:600 17px ${FONT_MONO}">${item.value[2]}</b> 请求指数`,
    },
    xAxis: {
      type: "category",
      data: hours,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: TOKENS.graphite,
        fontFamily: FONT_MONO,
        fontSize: 8,
        interval: 0,
        formatter: (value, index) => ([0, 5, 11].includes(index) ? value : ""),
        margin: 12,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: days,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TOKENS.graphite, fontFamily: FONT_MONO, fontSize: 8, margin: 10 },
      splitLine: { show: false },
    },
    series: [
      {
        id: "pulse-series",
        type: "scatter",
        data: makeData(selectedPeriod),
        universalTransition: { enabled: true, divideShape: "clone" },
        emphasis: { scale: 1.5, itemStyle: { opacity: 1 } },
      },
    ],
  });

  const setMode = (mode) => {
    chart.setOption({ series: [{ id: "pulse-series", data: makeData(mode) }] });
  };

  return { chart, setMode };
}

const chartFactories = {
  tide: initTide,
  orbit: initOrbit,
  rank: initRank,
  phases: initPhases,
  route: initRoute,
  pulse: initPulse,
};

function initChart(name) {
  if (controllers.has(name)) return;
  const controller = chartFactories[name]();
  controllers.set(name, controller);
  controller.setMode(selectedPeriod);
}

function observeCharts() {
  revealObserver?.disconnect();
  const panels = document.querySelectorAll("[data-chart]");

  if (!("IntersectionObserver" in window)) {
    panels.forEach((panel) => {
      panel.classList.add("is-visible");
      initChart(panel.dataset.chart);
    });
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        initChart(entry.target.dataset.chart);
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "100px 0px" },
  );

  panels.forEach((panel) => revealObserver.observe(panel));
}

function updatePeriod(mode) {
  selectedPeriod = mode;
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.period === mode);
  });
  controllers.forEach((controller) => controller.setMode(mode));
}

function replayCharts() {
  revealObserver?.disconnect();
  controllers.forEach((controller) => {
    controller.dispose?.();
    controller.chart.dispose();
  });
  controllers.clear();
  document.querySelectorAll("[data-chart]").forEach((panel) => panel.classList.remove("is-visible"));
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === "0");
  });
  updatePeriod("current");
  requestAnimationFrame(observeCharts);
}

document.querySelectorAll("[data-period]").forEach((button) => {
  button.onclick = () => updatePeriod(button.dataset.period);
});

document.getElementById("replay-button").onclick = (event) => {
  event.currentTarget.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-2px)" },
      { transform: "translateY(0)" },
    ],
    { duration: MOTION.focus * 2, easing: "ease-out" },
  );
  replayCharts();
};

const resizeObserver = new ResizeObserver(() => {
  controllers.forEach((controller) => controller.chart.resize({ animation: { duration: MOTION.focus } }));
});

resizeObserver.observe(document.querySelector(".chart-grid"));
observeCharts();

window.addEventListener("beforeunload", () => {
  revealObserver?.disconnect();
  resizeObserver.disconnect();
  controllers.forEach((controller) => {
    controller.dispose?.();
    controller.chart.dispose();
  });
});
