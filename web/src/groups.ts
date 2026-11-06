export interface GroupItemDef {
  key: string;
  label: string;
  wide?: boolean;
  pill?: boolean;
}

export interface GroupDef {
  icon: string;
  title: string;
  desc: string;
  items: GroupItemDef[];
}

/** 7 个信息卡片，顺序与 §5.1 一致。 */
export const GROUPS: GroupDef[] = [
  {
    icon: '▤',
    title: '设备概览',
    desc: '设备形态与系统标识',
    items: [
      { key: 'deviceType', label: '设备类型', pill: true },
      { key: 'os', label: '操作系统' },
      { key: 'platform', label: '平台标识' },
      { key: 'arch', label: '指令集架构' },
      { key: 'model', label: '设备型号' },
      { key: 'language', label: '系统语言' },
      { key: 'timezone', label: '所在时区' },
    ],
  },
  {
    icon: '◫',
    title: '屏幕与显示',
    desc: '物理屏幕与视口尺寸',
    items: [
      { key: 'resolution', label: '屏幕分辨率' },
      { key: 'availSize', label: '可用屏幕区域' },
      { key: 'viewport', label: '浏览器视口' },
      { key: 'dpr', label: '像素比 DPR' },
      { key: 'colorDepth', label: '色彩深度' },
      { key: 'orientation', label: '屏幕方向' },
    ],
  },
  {
    icon: '❯',
    title: '浏览器环境',
    desc: '浏览器、内核与 UA',
    items: [
      { key: 'browser', label: '浏览器' },
      { key: 'engine', label: '渲染内核' },
      { key: 'touchPoints', label: '触控点数' },
      { key: 'cookieEnabled', label: 'Cookie 可用' },
      { key: 'ua', label: 'User Agent', wide: true },
    ],
  },
  {
    icon: '⚙',
    title: '硬件与电源',
    desc: 'CPU、内存、显卡、电池',
    items: [
      { key: 'cores', label: '逻辑核心数' },
      { key: 'memory', label: '设备内存' },
      { key: 'gpu', label: '显卡 / 渲染器', wide: true },
      { key: 'webgl', label: 'WebGL 版本' },
      { key: 'batteryLevel', label: '电池电量' },
      { key: 'batteryState', label: '充电状态' },
    ],
  },
  {
    icon: '⌁',
    title: '网络',
    desc: '连接状态与链路质量',
    items: [
      { key: 'online', label: '连接状态' },
      { key: 'effectiveType', label: '有效连接类型' },
      { key: 'downlink', label: '下行带宽估算' },
      { key: 'rtt', label: '往返延迟 RTT' },
      { key: 'saveData', label: '省流量模式' },
    ],
  },
  {
    icon: '▦',
    title: '存储',
    desc: '配额与占用',
    items: [
      { key: 'storageQuota', label: '存储配额' },
      { key: 'storageUsage', label: '已用空间' },
      { key: 'storageRate', label: '占用比例' },
    ],
  },
  {
    icon: '✓',
    title: '能力检测',
    desc: '关键 Web 能力与权限',
    items: [
      { key: 'fWebAssembly', label: 'WebAssembly' },
      { key: 'fServiceWorker', label: 'Service Worker' },
      { key: 'fIndexedDB', label: 'IndexedDB' },
      { key: 'fClipboard', label: '异步剪贴板' },
      { key: 'fShare', label: 'Web Share' },
      { key: 'fFullscreen', label: '全屏 API' },
      { key: 'pGeolocation', label: '地理位置权限' },
      { key: 'pNotifications', label: '通知权限' },
    ],
  },
];
