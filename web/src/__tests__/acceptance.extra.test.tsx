/**
 * 验收用例补充（AI 测试工程师）
 *
 * 现有 spec.conformance 已覆盖结构 / 格式 / 降级，但 AC-05/06 只断言了文件名与 toast，
 * 未校验「复制与导出的内容结构一致（含生成时间与 7 个分组）」，AC-08 未校验拒绝态的语义色，
 * AC-09 未覆盖屏幕方向切换，AC-01 未校验「全部字段在 1 秒内补全且无空白」。
 * 本文件补齐这些验收点，全部依据 design/rules.md §3–§8 与 AC-01/05/06/08/09。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceInfoPage } from '../pages/DeviceInfoPage';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

function defineNav(key: string, value: unknown) {
  Object.defineProperty(window.navigator, key, { value, configurable: true, writable: true });
}

function defineScreen(patch: Record<string, unknown>) {
  for (const [k, v] of Object.entries(patch)) {
    Object.defineProperty(window.screen, k, { value: v, configurable: true });
  }
}

/** 一套「全字段可用」的浏览器环境，用于验收主路径。 */
function mockFullEnvironment() {
  // jsdom 默认在 window 上暴露 ontouchstart，会让「触控兜底」判定命中；
  // 桌面浏览器无触控时应为 false，这里显式移除，保证设备类型判定为「桌面」。
  try {
    Reflect.deleteProperty(window, 'ontouchstart');
  } catch {
    /* ignore */
  }
  defineNav('userAgent', CHROME_UA);
  defineNav('platform', 'Win32');
  defineNav('language', 'zh-CN');
  defineNav('cookieEnabled', true);
  defineNav('onLine', true);
  defineNav('hardwareConcurrency', 8);
  defineNav('deviceMemory', 8);
  defineNav('maxTouchPoints', 0);
  defineScreen({ width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24 });
  defineNav('connection', { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false });
  defineNav('storage', { estimate: () => Promise.resolve({ quota: 2 * 1024 ** 3, usage: 1024 ** 2 }) });
  defineNav('permissions', { query: () => Promise.resolve({ state: 'granted' }) });
  defineNav('getBattery', () =>
    Promise.resolve({
      level: 0.86,
      charging: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  );
  defineNav('userAgentData', {
    platform: 'Windows',
    getHighEntropyValues: () =>
      Promise.resolve({ architecture: 'x86', bitness: '64', model: '' }),
  });
  defineNav('clipboard', { writeText: () => Promise.resolve() });
  defineNav('share', () => Promise.resolve());
}

beforeEach(() => {
  for (const k of [
    'userAgentData', 'storage', 'getBattery', 'connection', 'mozConnection', 'webkitConnection',
    'permissions', 'mediaDevices', 'clipboard', 'share', 'deviceMemory', 'hardwareConcurrency',
  ]) {
    try {
      Reflect.deleteProperty(window.navigator, k);
    } catch {
      /* ignore */
    }
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AC-05 / AC-06 复制与导出内容', () => {
  it('TC-AC05-02 复制到剪贴板的 JSON 含生成时间与 7 个卡片分组', async () => {
    mockFullEnvironment();
    let copied = '';
    defineNav('clipboard', {
      writeText: (t: string) => {
        copied = t;
        return Promise.resolve();
      },
    });

    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="arch"]')?.textContent).toBe('x86 64 位');
    });
    fireEvent.click(screen.getByRole('button', { name: '复制报告' }));
    await waitFor(() => expect(copied).not.toBe(''));

    const json = JSON.parse(copied) as Record<string, unknown>;
    expect(Object.keys(json)).toEqual([
      '_生成时间',
      '_页面地址',
      '_采集方式',
      '设备概览',
      '屏幕与显示',
      '浏览器环境',
      '硬件与电源',
      '网络',
      '存储',
      '能力检测',
    ]);
    expect(String(json['_生成时间'])).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect((json['设备概览'] as Record<string, string>)['设备类型']).toBe('桌面');
    expect((json['设备概览'] as Record<string, string>)['指令集架构']).toBe('x86 64 位');
    expect((json['存储'] as Record<string, string>)['存储配额']).toBe('2.0 GB');
    expect((json['硬件与电源'] as Record<string, string>)['电池电量']).toBe('86%');
  });

  it('TC-AC06-02 导出内容与复制结果一致（除生成时间外逐字段相同）', async () => {
    mockFullEnvironment();
    let copied = '';
    defineNav('clipboard', {
      writeText: (t: string) => {
        copied = t;
        return Promise.resolve();
      },
    });

    let exported = '';
    vi.stubGlobal(
      'Blob',
      class {
        constructor(parts: string[]) {
          exported = parts.join('');
        }
      },
    );
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const { container } = render(<DeviceInfoPage />);
    // 等异步字段补全后再复制/导出，避免把占位「…」写进报告
    await waitFor(() => {
      expect(container.querySelector('[data-key="arch"]')?.textContent).toBe('x86 64 位');
    });
    fireEvent.click(screen.getByRole('button', { name: '复制报告' }));
    await waitFor(() => expect(copied).not.toBe(''));
    fireEvent.click(screen.getByRole('button', { name: '导出 JSON' }));
    await waitFor(() => expect(exported).not.toBe(''));

    const a = JSON.parse(copied) as Record<string, unknown>;
    const b = JSON.parse(exported) as Record<string, unknown>;
    delete a['_生成时间'];
    delete b['_生成时间'];
    expect(b).toEqual(a);
  });
});

describe('AC-08 权限拒绝', () => {
  it('TC-AC08-01 定位/通知被拒绝时显示「已拒绝」且不使用红色（拒绝≠缺失）', async () => {
    mockFullEnvironment();
    defineNav('permissions', { query: () => Promise.resolve({ state: 'denied' }) });

    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="pGeolocation"]')?.textContent).toBe('已拒绝');
    });
    const geo = container.querySelector('[data-key="pGeolocation"]');
    const notif = container.querySelector('[data-key="pNotifications"]');
    expect(notif?.textContent).toBe('已拒绝');
    expect(geo?.className).not.toContain('bad');
    expect(notif?.className).not.toContain('bad');
  });
});

describe('AC-09 屏幕方向', () => {
  it('TC-AC09-01 竖屏 orientation 切换为「纵向」，视口同步更新', () => {
    mockFullEnvironment();
    defineScreen({ width: 390, height: 844, orientation: { type: 'portrait-primary' } });
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });

    const { container } = render(<DeviceInfoPage />);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(container.querySelector('[data-key="orientation"]')?.textContent).toBe('纵向');
    expect(container.querySelector('[data-key="viewport"]')?.textContent).toBe('390 × 844 px');
  });
});

describe('AC-01 / §5.2 全字段补全与空值约束', () => {
  it('TC-AC01-02 首帧占位为「…」，异步返回后 40 个字段全部有值且无占位残留', async () => {
    mockFullEnvironment();
    const { container } = render(<DeviceInfoPage />);

    const values = () =>
      Array.from(container.querySelectorAll('.row .value')).map((n) => n.textContent || '');
    expect(values()).toHaveLength(40);

    await waitFor(() => {
      expect(values().some((t) => t === '…')).toBe(false);
    });
    for (const t of values()) {
      expect(t.trim()).not.toBe('');
    }
  });

  it('TC-AC01-03 全量降级环境下 40 个字段均有明确文案，不出现空白', async () => {
    defineNav('userAgent', CHROME_UA);
    for (const k of [
      'userAgentData', 'storage', 'getBattery', 'connection', 'permissions', 'deviceMemory',
      'hardwareConcurrency',
    ]) {
      try {
        Reflect.deleteProperty(window.navigator, k);
      } catch {
        /* ignore */
      }
    }

    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      const t = Array.from(container.querySelectorAll('.row .value')).map(
        (n) => n.textContent || '',
      );
      expect(t.some((s) => s === '…')).toBe(false);
    });
    const texts = Array.from(container.querySelectorAll('.row .value')).map(
      (n) => n.textContent || '',
    );
    expect(texts).toHaveLength(40);
    for (const t of texts) {
      expect(t.trim()).not.toBe('');
      expect(t).not.toMatch(/undefined|NaN|\[object Object\]|\bnull\b/);
    }
  });
});
