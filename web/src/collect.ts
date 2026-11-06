import {
  NA,
  detectBrowser,
  detectDeviceType,
  detectEngine,
  detectGPU,
  detectOS,
  detectOrientation,
  detectWebGLVersion,
  fmtTime,
  formatBytes,
  formatUTCOffset,
  hasFeature,
  na,
  permText,
} from './detect';
import { GROUPS } from './groups';
import type { FieldMap } from './types';

/* ---------------- 浏览器 API 扩展类型（部分接口不在标准 DOM 类型内） ---------------- */

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface BatteryLike {
  level: number;
  charging: boolean;
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
}

interface UADataLike {
  platform?: string;
  getHighEntropyValues(hints: string[]): Promise<{
    architecture?: string;
    bitness?: string;
    model?: string;
    platformVersion?: string;
    fullVersionList?: Array<{ brand: string; version: string }>;
  }>;
}

interface PermissionStatusLike {
  state: string;
}

interface StorageManagerLike {
  estimate?: () => Promise<{ quota?: number; usage?: number }>;
}

interface MediaDeviceLike {
  kind: string;
}

type ExtNavigator = Navigator & {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryLike>;
  userAgentData?: UADataLike;
  storage?: StorageManagerLike;
  permissions?: { query?: (d: { name: string }) => Promise<PermissionStatusLike> };
  mediaDevices?: { enumerateDevices?: () => Promise<MediaDeviceLike[]> };
};

function getNav(): ExtNavigator {
  return navigator as ExtNavigator;
}

/* ---------------- 同步数据采集 ---------------- */

export function collectSyncReport(): FieldMap {
  const nav = getNav();
  const scr = window.screen;
  const ua = nav.userAgent || '';
  const touchPoints = nav.maxTouchPoints || 0;
  const hasTouch = touchPoints > 0 || 'ontouchstart' in window;
  const screenW = scr ? scr.width : 0;
  const screenH = scr ? scr.height : 0;
  const minSide = Math.min(screenW, screenH);

  const fields: FieldMap = {};

  // —— 设备概览 ——
  fields.deviceType = { text: detectDeviceType(ua, touchPoints, hasTouch, minSide), tone: 'pill' };
  fields.os = { text: detectOS(ua), tone: null };
  const platform = nav.platform || (nav.userAgentData && nav.userAgentData.platform) || '';
  fields.platform = { text: na(platform), tone: platform ? null : 'na' };
  fields.arch = { text: '…', tone: 'na' };
  fields.model = { text: '…', tone: 'na' };
  const language = nav.language || (nav.languages && nav.languages[0]) || '';
  const languageText = na(language);
  fields.language = { text: languageText, tone: languageText === NA ? 'na' : null };

  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tz = '';
  }
  const off = formatUTCOffset(new Date().getTimezoneOffset());
  fields.timezone = { text: tz ? `${tz} (UTC${off})` : NA, tone: tz ? null : 'na' };

  // —— 屏幕与显示 ——
  fields.resolution = { text: `${screenW} × ${screenH} px`, tone: null };
  fields.availSize = { text: `${scr ? scr.availWidth : 0} × ${scr ? scr.availHeight : 0} px`, tone: null };
  fields.viewport = { text: `${window.innerWidth} × ${window.innerHeight} px`, tone: null };
  fields.dpr = { text: `${(window.devicePixelRatio || 1).toFixed(2)} ×`, tone: null };
  const colorDepth = scr ? scr.colorDepth : 24;
  fields.colorDepth = { text: `${colorDepth || 24} 位`, tone: null };
  const oriType = (scr && scr.orientation && scr.orientation.type) || '';
  fields.orientation = { text: detectOrientation(oriType, window.innerWidth, window.innerHeight), tone: null };

  // —— 浏览器环境 ——
  fields.browser = { text: detectBrowser(ua), tone: null };
  const engineText = detectEngine(ua);
  fields.engine = { text: engineText, tone: engineText === NA ? 'na' : null };
  fields.touchPoints = { text: `${touchPoints} 点`, tone: null };
  fields.cookieEnabled = nav.cookieEnabled
    ? { text: '可用', tone: 'ok' }
    : { text: '已禁用', tone: 'bad' };
  fields.ua = { text: ua, tone: null };

  // —— 硬件与电源 ——
  fields.cores = nav.hardwareConcurrency
    ? { text: `${nav.hardwareConcurrency} 核`, tone: null }
    : { text: NA, tone: 'na' };
  fields.memory = nav.deviceMemory
    ? { text: `${nav.deviceMemory} GB（近似）`, tone: null }
    : { text: NA, tone: 'na' };
  const gpuText = detectGPU();
  fields.gpu = { text: gpuText, tone: gpuText === NA ? 'na' : null };
  fields.webgl = { text: detectWebGLVersion(), tone: null };

  // —— 网络 ——
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  fields.online = nav.onLine ? { text: '在线', tone: 'ok' } : { text: '离线', tone: 'bad' };
  if (conn) {
    const effectiveTypeText = na(conn.effectiveType && conn.effectiveType.toUpperCase());
    fields.effectiveType = { text: effectiveTypeText, tone: effectiveTypeText === NA ? 'na' : null };
    fields.downlink =
      conn.downlink != null && Number.isFinite(conn.downlink)
        ? { text: `${conn.downlink.toFixed(1)} Mbps（估算）`, tone: null }
        : { text: NA, tone: 'na' };
    fields.rtt =
      conn.rtt != null && Number.isFinite(conn.rtt)
        ? { text: `${conn.rtt} ms`, tone: null }
        : { text: NA, tone: 'na' };
    fields.saveData =
      typeof conn.saveData === 'boolean'
        ? { text: conn.saveData ? '已开启' : '关闭', tone: null }
        : { text: NA, tone: 'na' };
  } else {
    fields.effectiveType = { text: NA, tone: 'na' };
    fields.downlink = { text: NA, tone: 'na' };
    fields.rtt = { text: NA, tone: 'na' };
    fields.saveData = { text: NA, tone: 'na' };
  }

  // —— 能力检测 ——
  fields.fWebAssembly = { text: hasFeature(() => typeof WebAssembly === 'object'), tone: null };
  fields.fServiceWorker = { text: hasFeature(() => 'serviceWorker' in navigator), tone: null };
  fields.fIndexedDB = { text: hasFeature(() => !!window.indexedDB), tone: null };
  fields.fClipboard = { text: hasFeature(() => !!(nav.clipboard && nav.clipboard.writeText)), tone: null };
  fields.fShare = { text: hasFeature(() => !!nav.share), tone: null };
  fields.fFullscreen = {
    text: hasFeature(
      () => !!(document.fullscreenEnabled || (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled),
    ),
    tone: null,
  };

  return fields;
}

/* ---------------- 异步数据采集 ---------------- */

type Apply = (patch: FieldMap) => void;

/** §6.1：异步字段最多 3 秒内返回真实值，否则降级为「不可用」。 */
const ASYNC_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('async timeout'));
    }, ASYNC_TIMEOUT_MS);
    p.then(
      (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function loadAsyncReport(apply: Apply): void {
  loadUAData(apply);
  loadBattery(apply);
  loadStorage(apply);
  loadPermissions(apply);
  loadMediaDevices(apply);
}

function loadUAData(apply: Apply): void {
  const nav = getNav();
  if (!nav.userAgentData || !nav.userAgentData.getHighEntropyValues) {
    apply({
      arch: { text: '不可用（浏览器不支持）', tone: 'na' },
      model: { text: '不可用（浏览器不支持）', tone: 'na' },
    });
    return;
  }
  const fallback = () => apply({ arch: { text: NA, tone: 'na' }, model: { text: NA, tone: 'na' } });
  // 注意：UA-CH 只用于补全 arch/model，不再用 fullVersionList 覆盖浏览器名。
  // §4.3 规定浏览器名以 UA 正则判定为准，避免 Opera/微信/QQ/UC 被改写为 Chromium。
  let uaPromise: Promise<{
    architecture?: string;
    bitness?: string;
    model?: string;
    platformVersion?: string;
    fullVersionList?: Array<{ brand: string; version: string }>;
  }>;
  try {
    uaPromise = nav.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion']);
  } catch {
    fallback();
    return;
  }
  withTimeout(uaPromise)
    .then((d) => {
      const arch = d.architecture ? d.architecture + (d.bitness ? ` ${d.bitness} 位` : '') : '';
      apply({
        arch: { text: arch || NA, tone: arch ? null : 'na' },
        model: { text: d.model || NA, tone: d.model ? null : 'na' },
      });
    })
    .catch(fallback);
}

/* 电池监听缓存：避免「重新读取」重复注册监听导致泄漏。 */
let batteryManager: BatteryLike | null = null;
let batteryHandlers: Array<{ type: string; cb: () => void }> = [];

function loadBattery(apply: Apply): void {
  const nav = getNav();
  if (!nav.getBattery) {
    apply({ batteryLevel: { text: NA, tone: 'na' }, batteryState: { text: NA, tone: 'na' } });
    return;
  }
  const fallback = () =>
    apply({ batteryLevel: { text: NA, tone: 'na' }, batteryState: { text: NA, tone: 'na' } });
  let batteryPromise: Promise<BatteryLike>;
  try {
    batteryPromise = nav.getBattery();
  } catch {
    fallback();
    return;
  }
  withTimeout(batteryPromise)
    .then((b) => {
      if (batteryManager) {
        batteryHandlers.forEach((h) => batteryManager!.removeEventListener(h.type, h.cb));
      }
      batteryManager = b;
      batteryHandlers = [];
      const levelOk = typeof b.level === 'number' && Number.isFinite(b.level);
      const update = () =>
        apply({
          batteryLevel: levelOk
            ? { text: `${Math.round(b.level * 100)}%`, tone: null }
            : { text: NA, tone: 'na' },
          batteryState: b.charging ? { text: '充电中', tone: 'ok' } : { text: '未充电', tone: null },
        });
      update();
      const hLevel = () => update();
      const hCharge = () => update();
      b.addEventListener('levelchange', hLevel);
      b.addEventListener('chargingchange', hCharge);
      batteryHandlers = [
        { type: 'levelchange', cb: hLevel },
        { type: 'chargingchange', cb: hCharge },
      ];
    })
    .catch(fallback);
}

function loadStorage(apply: Apply): void {
  const nav = getNav();
  if (!(nav.storage && nav.storage.estimate)) {
    apply({
      storageQuota: { text: NA, tone: 'na' },
      storageUsage: { text: NA, tone: 'na' },
      storageRate: { text: NA, tone: 'na' },
    });
    return;
  }
  const fallback = () =>
    apply({
      storageQuota: { text: NA, tone: 'na' },
      storageUsage: { text: NA, tone: 'na' },
      storageRate: { text: NA, tone: 'na' },
    });
  let estimatePromise: Promise<{ quota?: number; usage?: number }>;
  try {
    estimatePromise = nav.storage.estimate();
  } catch {
    fallback();
    return;
  }
  withTimeout(estimatePromise)
    .then((est) => {
      const hasQuota = typeof est.quota === 'number' && Number.isFinite(est.quota);
      const hasUsage = typeof est.usage === 'number' && Number.isFinite(est.usage);
      const patch: FieldMap = {
        storageQuota: hasQuota
          ? { text: formatBytes(est.quota as number), tone: null }
          : { text: NA, tone: 'na' },
        storageUsage: hasUsage
          ? { text: formatBytes(est.usage as number), tone: null }
          : { text: NA, tone: 'na' },
      };
      if (hasQuota && hasUsage && (est.quota as number) > 0) {
        const rate = ((est.usage as number) / (est.quota as number)) * 100;
        patch.storageRate = { text: `${rate < 0.1 ? '< 0.1' : rate.toFixed(1)} %`, tone: null };
      } else {
        patch.storageRate = { text: NA, tone: 'na' };
      }
      apply(patch);
    })
    .catch(fallback);
}

function loadPermissions(apply: Apply): void {
  const nav = getNav();
  if (!nav.permissions || !nav.permissions.query) {
    apply({ pGeolocation: { text: NA, tone: 'na' }, pNotifications: { text: NA, tone: 'na' } });
    return;
  }
  const names: Array<{ name: string; key: string }> = [
    { name: 'geolocation', key: 'pGeolocation' },
    { name: 'notifications', key: 'pNotifications' },
  ];
  names.forEach((n) => {
    const fallback = () => apply({ [n.key]: { text: NA, tone: 'na' } });
    let queryPromise: Promise<PermissionStatusLike>;
    try {
      queryPromise = nav.permissions!.query({ name: n.name });
    } catch {
      fallback();
      return;
    }
    withTimeout(queryPromise)
      .then((st) => {
        apply({ [n.key]: { text: permText(st.state), tone: null } });
      })
      .catch(fallback);
  });
}

function loadMediaDevices(apply: Apply): void {
  const nav = getNav();
  if (!nav.mediaDevices || !nav.mediaDevices.enumerateDevices) return;
  let devicesPromise: Promise<MediaDeviceLike[]>;
  try {
    devicesPromise = nav.mediaDevices.enumerateDevices();
  } catch {
    return;
  }
  devicesPromise
    .then((list) => {
      let cam = 0;
      let mic = 0;
      list.forEach((d) => {
        if (d.kind === 'videoinput') cam++;
        if (d.kind === 'audioinput') mic++;
      });
      apply({ mediaSummary: { text: `摄像头 ${cam} / 麦克风 ${mic}`, tone: null } });
    })
    .catch(() => {
      /* 静默忽略 */
    });
}

/* ---------------- 报告构建（导出 / 复制） ---------------- */

export function buildReport(fields: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {
    '_生成时间': fmtTime(new Date()),
    '_页面地址': typeof location !== 'undefined' ? location.href : '',
    '_采集方式': '浏览器本地 API 实时读取',
  };
  for (const g of GROUPS) {
    const obj: Record<string, string> = {};
    for (const it of g.items) {
      const v = fields[it.key];
      if (v !== undefined) obj[it.label] = v.text;
    }
    out[g.title] = obj;
  }
  const media = fields.mediaSummary;
  if (media) {
    (out['硬件与电源'] as Record<string, string>)['音视频输入'] = media.text;
  }
  return out;
}
