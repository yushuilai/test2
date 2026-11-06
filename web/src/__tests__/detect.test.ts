import { describe, expect, it } from 'vitest';
import {
  NA,
  detectBrowser,
  detectDeviceType,
  detectEngine,
  detectOS,
  detectOrientation,
  detectWebGLVersion,
  formatBytes,
  formatUTCOffset,
  fmtTime,
  hasFeature,
  na,
  permText,
} from '../detect';

describe('na', () => {
  it('将空值统一为「不可用」', () => {
    expect(na(null)).toBe(NA);
    expect(na(undefined)).toBe(NA);
    expect(na('')).toBe(NA);
    expect(na('unknown')).toBe(NA);
    expect(na(Number.NaN)).toBe(NA);
    expect(na(Number.POSITIVE_INFINITY)).toBe(NA);
  });

  it('保留有效值', () => {
    expect(na('Chrome 141')).toBe('Chrome 141');
    expect(na(0)).toBe('0');
    expect(na(42)).toBe('42');
  });
});

describe('detectDeviceType', () => {
  it('iPad → 平板', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 5, true, 768)).toBe('平板');
  });

  it('iPhone → 手机', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 5, true, 390)).toBe('手机');
  });

  it('Android + Mobile → 手机', () => {
    expect(
      detectDeviceType('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit Mobile', 5, true, 412),
    ).toBe('手机');
  });

  it('触控点 > 0 且短边 ≥ 600 → 平板', () => {
    expect(detectDeviceType('Mozilla/5.0 (X11; Linux)', 10, true, 800)).toBe('平板');
  });

  it('无触控 → 桌面', () => {
    expect(detectDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0, false, 1080)).toBe('桌面');
  });
});

describe('detectOS', () => {
  it('Windows NT 10.0 → Windows 10 / 11', () => {
    expect(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows 10 / 11');
  });

  it('Windows NT 6.1 → Windows 7', () => {
    expect(detectOS('Mozilla/5.0 (Windows NT 6.1)')).toBe('Windows 7');
  });

  it('Android 带版本号', () => {
    expect(detectOS('Mozilla/5.0 (Linux; Android 13)')).toBe('Android 13');
  });

  it('iPhone OS → iOS 版本（下划线还原为点）', () => {
    expect(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X)')).toBe('iOS 17.2.1');
  });

  it('Mac OS X → macOS 版本', () => {
    expect(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0)')).toBe('macOS 14.5.0');
  });

  it('Linux', () => {
    expect(detectOS('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux');
  });

  it('全部失败 → 未知系统', () => {
    expect(detectOS('SomeUnknownThing')).toBe('未知系统');
  });
});

describe('detectBrowser', () => {
  it('Edge 优先于 Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    expect(detectBrowser(ua)).toBe('Edge 120');
  });

  it('Opera 优先于 Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0';
    expect(detectBrowser(ua)).toBe('Opera 105');
  });

  it('Firefox', () => {
    expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0')).toBe(
      'Firefox 120',
    );
  });

  it('微信内置浏览器', () => {
    expect(
      detectBrowser('Mozilla/5.0 MicroMessenger/8.0.47 (Linux; Android 13) AppleWebKit'),
    ).toBe('微信内置浏览器');
  });

  it('Chrome', () => {
    expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36')).toBe(
      'Chrome 141',
    );
  });

  it('Safari Version', () => {
    expect(
      detectBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15'),
    ).toBe('Safari 17');
  });

  it('未知浏览器', () => {
    expect(detectBrowser('curl/8.0')).toBe('未知浏览器');
  });
});

describe('detectEngine', () => {
  it('Chrome UA → Blink', () => {
    expect(detectEngine('Mozilla/5.0 AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36')).toBe('Blink');
  });

  it('Firefox → Gecko', () => {
    expect(detectEngine('Mozilla/5.0 Gecko/20100101 Firefox/120.0')).toBe('Gecko');
  });

  it('Safari → WebKit', () => {
    expect(detectEngine('Mozilla/5.0 AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15')).toBe('WebKit');
  });

  it('Trident', () => {
    expect(detectEngine('Mozilla/5.0 (Windows NT 6.1; Trident/7.0)')).toBe('Trident');
  });

  it('未知内核 → 不可用', () => {
    expect(detectEngine('curl/8.0')).toBe(NA);
  });
});

describe('detectOrientation', () => {
  it('orientation type landscape → 横向', () => {
    expect(detectOrientation('landscape-primary', 1024, 768)).toBe('横向');
  });

  it('orientation type portrait → 纵向', () => {
    expect(detectOrientation('portrait-primary', 768, 1024)).toBe('纵向');
  });

  it('无 orientation 时按宽高推断', () => {
    expect(detectOrientation('', 1280, 800)).toBe('横向');
    expect(detectOrientation('', 375, 812)).toBe('纵向');
  });
});

describe('formatBytes', () => {
  it('字节级不保留小数', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('换算 KB 保留 1 位小数', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('换算 GB', () => {
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe('5.0 GB');
  });

  it('空值 → 不可用', () => {
    expect(formatBytes(undefined)).toBe(NA);
    expect(formatBytes(null)).toBe(NA);
  });
});

describe('permText', () => {
  it('映射权限状态', () => {
    expect(permText('granted')).toBe('已授权');
    expect(permText('denied')).toBe('已拒绝');
    expect(permText('prompt')).toBe('未决定');
    expect(permText('other')).toBe('未知');
  });
});

describe('formatUTCOffset', () => {
  it('东八区 getTimezoneOffset(-480) → +08:00', () => {
    expect(formatUTCOffset(-480)).toBe('+08:00');
  });

  it('UTC → +00:00', () => {
    expect(formatUTCOffset(0)).toBe('+00:00');
  });

  it('西五区 getTimezoneOffset(300) → -05:00', () => {
    expect(formatUTCOffset(300)).toBe('-05:00');
  });
});

describe('fmtTime', () => {
  it('格式化为 YYYY-MM-DD HH:mm:ss', () => {
    expect(fmtTime(new Date(2026, 10, 5, 9, 8, 7))).toBe('2026-11-05 09:08:07');
  });
});

describe('hasFeature', () => {
  it('存在返回支持，不存在返回不支持', () => {
    expect(hasFeature(() => true)).toBe('支持');
    expect(hasFeature(() => false)).toBe('不支持');
  });

  it('抛错视为不支持', () => {
    expect(
      hasFeature(() => {
        throw new Error('boom');
      }),
    ).toBe('不支持');
  });
});

describe('detectWebGLVersion', () => {
  it('§3.4 WebGL 2 与 WebGL 1 并列输出（独立 canvas）', () => {
    // 模拟真实浏览器：同一 canvas 只能绑定一种 context，再取另一种返回 null
    const bound = new WeakMap<HTMLCanvasElement, string>();
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (function (
      this: HTMLCanvasElement,
      type: string,
    ) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') {
        if (bound.has(this)) return null;
        bound.set(this, type);
        return {} as unknown as WebGLRenderingContext;
      }
      return null;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    try {
      expect(detectWebGLVersion()).toBe('WebGL 2 / WebGL 1');
    } finally {
      HTMLCanvasElement.prototype.getContext = orig;
    }
  });

  it('均不支持时输出「不支持」', () => {
    expect(detectWebGLVersion()).toBe('不支持');
  });
});
