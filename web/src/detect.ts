import type { Tone } from './types';

export const NA = '不可用';

/** 统一降级文案：null/undefined/空串/unknown/非有限数值 均视为「不可用」。 */
export function na(v: unknown): string {
  if (
    v === null ||
    v === undefined ||
    v === '' ||
    v === 'unknown' ||
    (typeof v === 'number' && !Number.isFinite(v))
  ) {
    return NA;
  }
  return String(v);
}

function pick(input: string, re: RegExp, idx = 1): string {
  const m = String(input || '').match(re);
  return m && m[idx] ? m[idx] : '';
}

/** §4.1 设备类型判定（短路顺序）。 */
export function detectDeviceType(
  ua: string,
  touchPoints: number,
  hasTouch: boolean,
  minSide: number,
): string {
  if (/iPad/i.test(ua)) return '平板';
  if (/Tablet|PlayBook|Silk/i.test(ua)) return '平板';
  if (/iPhone|iPod/i.test(ua)) return '手机';
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return '手机';
  if (hasTouch && minSide >= 600) return '平板';
  if (hasTouch && minSide < 600) return '手机';
  return '桌面';
}

/** §4.2 操作系统判定（短路顺序）。 */
export function detectOS(ua: string): string {
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10 / 11';
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
  if (/Windows/.test(ua)) return 'Windows';

  let m = ua.match(/Android\s([\d.]+)/);
  if (m) return 'Android ' + m[1];
  m = ua.match(/iPhone OS\s([\d_]+)/);
  if (m) return 'iOS ' + m[1].replace(/_/g, '.');
  m = ua.match(/iPad; CPU OS\s([\d_]+)/);
  if (m) return 'iPadOS ' + m[1].replace(/_/g, '.');

  if (/Mac OS X/.test(ua)) {
    const v = pick(ua, /Mac OS X\s([\d_.]+)/).replace(/_/g, '.');
    return v ? 'macOS ' + v : 'macOS';
  }
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Ubuntu/.test(ua)) return 'Ubuntu';
  if (/Linux/.test(ua)) return 'Linux';
  return '未知系统';
}

/** §4.3 浏览器判定（优先级避免 Edge/Opera 被误判为 Chrome）。 */
export function detectBrowser(ua: string): string {
  let m = ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/);
  if (m) return 'Edge ' + m[1].split('.')[0];
  m = ua.match(/OPR\/([\d.]+)/);
  if (m) return 'Opera ' + m[1].split('.')[0];
  m = ua.match(/Firefox\/([\d.]+)/);
  if (m) return 'Firefox ' + m[1].split('.')[0];
  m = ua.match(/MicroMessenger\/([\d.]+)/);
  if (m) return '微信内置浏览器';
  m = ua.match(/QQBrowser\/([\d.]+)/);
  if (m) return 'QQ 浏览器 ' + m[1].split('.')[0];
  m = ua.match(/UCBrowser\/([\d.]+)/);
  if (m) return 'UC 浏览器 ' + m[1].split('.')[0];
  m = ua.match(/Chrome\/([\d.]+)/);
  if (m) return 'Chrome ' + m[1].split('.')[0];
  m = ua.match(/Version\/([\d.]+).*Safari/);
  if (m) return 'Safari ' + m[1].split('.')[0];
  m = ua.match(/Safari\/([\d.]+)/);
  if (m) return 'Safari';
  return '未知浏览器';
}

/** §4.4 渲染内核判定。 */
export function detectEngine(ua: string): string {
  if (/AppleWebKit/.test(ua) && /Chrome|Edg|OPR/.test(ua)) return 'Blink';
  if (/Gecko\//.test(ua) && /Firefox/.test(ua)) return 'Gecko';
  if (/AppleWebKit/.test(ua)) return 'WebKit';
  if (/Trident/.test(ua)) return 'Trident';
  return NA;
}

/** §4.5 屏幕方向判定。 */
export function detectOrientation(
  orientationType: string,
  innerWidth: number,
  innerHeight: number,
): string {
  const t = orientationType || '';
  if (/landscape/.test(t)) return '横向';
  if (/portrait/.test(t)) return '纵向';
  return innerWidth >= innerHeight ? '横向' : '纵向';
}

/** 字节自动换算单位（B/KB/MB/GB/TB），非字节级保留 1 位小数。 */
export function formatBytes(n: number | null | undefined): string {
  if (!n && n !== 0) return NA;
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return (i === 0 ? String(v) : v.toFixed(1)) + ' ' + u[i];
}

/** 权限状态文案。 */
export function permText(state: string): string {
  if (state === 'granted') return '已授权';
  if (state === 'denied') return '已拒绝';
  if (state === 'prompt') return '未决定';
  return '未知';
}

/** UTC 偏移格式化：入参为 Date#getTimezoneOffset() 分钟值，输出如 `+08:00`。 */
export function formatUTCOffset(timezoneOffsetMin: number): string {
  const off = -timezoneOffsetMin;
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return sign + (h < 10 ? '0' + h : String(h)) + ':' + (m < 10 ? '0' + m : String(m));
}

/** 生成时间格式化：`YYYY-MM-DD HH:mm:ss`。 */
export function fmtTime(d: Date): string {
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    ' ' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes()) +
    ':' +
    p(d.getSeconds())
  );
}

/** WebGL 显卡 / 渲染器（去空格原样输出，不可用时返回「不可用」）。 */
export function detectGPU(): string {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') ||
      c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return NA;
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as
      | { UNMASKED_RENDERER_WEBGL: number }
      | null;
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return r ? String(r).trim() : NA;
  } catch {
    return NA;
  }
}

/** WebGL 版本：依次尝试 webgl2、webgl，并列输出。
 * 注意：同一 canvas 绑定 webgl2 后再取 webgl 会返回 null，
 * 因此必须为 webgl2 与 webgl1 各建一个 canvas 分别检测。 */
export function detectWebGLVersion(): string {
  try {
    const out: string[] = [];
    const c2 = document.createElement('canvas');
    if (c2.getContext('webgl2')) out.push('WebGL 2');
    const c1 = document.createElement('canvas');
    if (c1.getContext('webgl') || c1.getContext('experimental-webgl')) out.push('WebGL 1');
    return out.length ? out.join(' / ') : '不支持';
  } catch {
    return '不支持';
  }
}

/** 能力检测：接口存在与否 → 支持 / 不支持。 */
export function hasFeature(fn: () => boolean): string {
  try {
    return fn() ? '支持' : '不支持';
  } catch {
    return '不支持';
  }
}

export const VALUE_TONES: ReadonlyArray<Tone> = ['ok', 'bad', 'na', 'pill'];
