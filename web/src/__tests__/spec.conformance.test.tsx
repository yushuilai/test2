/**
 * 设计稿 / 业务规则符合性测试（AI 测试工程师）
 * 依据：design/rules.md §3–§8，design/draft.html 结构
 * 目标：验证「与设计稿/规则不符」的行为，而非仅验证接口可跑通。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectSyncReport } from '../collect';
import { DeviceInfoPage } from '../pages/DeviceInfoPage';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/** 规则 §3 中定义的 7 张卡片与 40 个字段的固定顺序 */
const EXPECTED_GROUPS: Array<[string, string[]]> = [
  ['设备概览', ['设备类型', '操作系统', '平台标识', '指令集架构', '设备型号', '系统语言', '所在时区']],
  ['屏幕与显示', ['屏幕分辨率', '可用屏幕区域', '浏览器视口', '像素比 DPR', '色彩深度', '屏幕方向']],
  ['浏览器环境', ['浏览器', '渲染内核', '触控点数', 'Cookie 可用', 'User Agent']],
  ['硬件与电源', ['逻辑核心数', '设备内存', '显卡 / 渲染器', 'WebGL 版本', '电池电量', '充电状态']],
  ['网络', ['连接状态', '有效连接类型', '下行带宽估算', '往返延迟 RTT', '省流量模式']],
  ['存储', ['存储配额', '已用空间', '占用比例']],
  ['能力检测', [
    'WebAssembly', 'Service Worker', 'IndexedDB', '异步剪贴板',
    'Web Share', '全屏 API', '地理位置权限', '通知权限',
  ]],
];

function defineNav(key: string, value: unknown) {
  Object.defineProperty(window.navigator, key, { value, configurable: true, writable: true });
}

function defineScreen(patch: Record<string, unknown>) {
  for (const [k, v] of Object.entries(patch)) {
    Object.defineProperty(window.screen, k, { value: v, configurable: true });
  }
}

function mockBattery(level: number, charging: boolean) {
  defineNav('getBattery', () =>
    Promise.resolve({
      level,
      charging,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  );
}

beforeEach(() => {
  defineNav('userAgent', CHROME_UA);
  for (const k of [
    'userAgentData', 'storage', 'getBattery', 'connection', 'mozConnection',
    'webkitConnection', 'permissions', 'mediaDevices', 'clipboard', 'share',
  ]) {
    try {
      Reflect.deleteProperty(window.navigator, k);
    } catch {
      /* ignore */
    }
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ===================== §5.1 结构 ===================== */

describe('§5.1 展示结构 / 设计稿区块', () => {
  it('TC-STRUCT-01 7 张卡片按固定顺序渲染，且共 40 个字段', () => {
    const { container } = render(<DeviceInfoPage />);
    const cards = Array.from(container.querySelectorAll('.card'));
    expect(cards.map((c) => c.querySelector('h2')?.textContent)).toEqual(
      EXPECTED_GROUPS.map(([t]) => t),
    );
    const labels = cards.map((c) =>
      Array.from(c.querySelectorAll('.row .label')).map((l) => l.textContent),
    );
    expect(labels).toEqual(EXPECTED_GROUPS.map(([, items]) => items));
    expect(labels.flat()).toHaveLength(40);
  });

  it('TC-STRUCT-02 顶部汇总条含 5 项：连接状态/设备/系统/浏览器/视口', () => {
    const { container } = render(<DeviceInfoPage />);
    const smalls = Array.from(container.querySelectorAll('.strip .item small')).map(
      (n) => n.textContent,
    );
    expect(smalls).toEqual(['连接状态', '设备', '系统', '浏览器', '视口']);
  });

  it('TC-STRUCT-03 页头三按钮文案与主按钮层级（复制报告为 primary）', () => {
    const { container } = render(<DeviceInfoPage />);
    const btns = Array.from(container.querySelectorAll('.actions button'));
    expect(btns.map((b) => b.textContent?.trim())).toEqual(['重新读取', '导出 JSON', '复制报告']);
    expect(btns[2].className).toContain('primary');
  });

  it('TC-STRUCT-04 UA / 显卡为整行（wide）布局', () => {
    const { container } = render(<DeviceInfoPage />);
    const wideLabels = Array.from(container.querySelectorAll('.row.wide .label')).map(
      (n) => n.textContent,
    );
    expect(wideLabels).toEqual(['User Agent', '显卡 / 渲染器']);
  });
});

/* ===================== §5.2 格式规范 ===================== */

describe('§5.2 格式规范', () => {
  it('TC-FMT-01 尺寸使用 ×（两侧各一空格）+ px', () => {
    defineScreen({ width: 1920, height: 1080, availWidth: 1920, availHeight: 1040 });
    const f = collectSyncReport();
    expect(f.resolution.text).toBe('1920 × 1080 px');
    expect(f.availSize.text).toBe('1920 × 1040 px');
  });

  it('TC-FMT-02 DPR 保留两位小数并带 ×；色彩深度带「位」', () => {
    defineScreen({ colorDepth: 24 });
    Object.defineProperty(window, 'devicePixelRatio', { value: 1.5, configurable: true });
    const f = collectSyncReport();
    expect(f.dpr.text).toBe('1.50 ×');
    expect(f.colorDepth.text).toBe('24 位');
  });

  it('TC-FMT-03 核心数/触控点数/内存的数值与单位之间有一个空格', () => {
    defineNav('hardwareConcurrency', 8);
    defineNav('deviceMemory', 8);
    defineNav('maxTouchPoints', 0);
    const f = collectSyncReport();
    expect(f.cores.text).toBe('8 核');
    expect(f.memory.text).toBe('8 GB（近似）');
    expect(f.touchPoints.text).toBe('0 点');
  });

  it('TC-FMT-04 北京时间时区格式为「Asia/Shanghai (UTC+08:00)」', () => {
    const spy = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480);
    const spyTz = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: 'Asia/Shanghai' } as Intl.ResolvedDateTimeFormatOptions);
    const f = collectSyncReport();
    expect(f.timezone.text).toBe('Asia/Shanghai (UTC+08:00)');
    spy.mockRestore();
    spyTz.mockRestore();
  });

  it('TC-FMT-05 布尔状态使用肯定/否定短语，不出现 true/false', () => {
    defineNav('cookieEnabled', true);
    const f = collectSyncReport();
    const texts = Object.values(f).map((v) => v.text);
    for (const t of texts) {
      expect(t).not.toMatch(/^(true|false|null|undefined)$/i);
    }
  });
});

/* ===================== §5.3 颜色语义 ===================== */

describe('§5.3 颜色语义', () => {
  it('TC-COLOR-01 Cookie 可用为绿色 ok，不可用为中性灰 na 而非红色', () => {
    defineNav('cookieEnabled', true);
    expect(collectSyncReport().cookieEnabled.tone).toBe('ok');

    defineNav('deviceMemory', undefined);
    defineNav('hardwareConcurrency', undefined);
    const f = collectSyncReport();
    expect(f.memory.tone).toBe('na');
    expect(f.cores.tone).toBe('na');
    expect(f.memory.text).toBe('不可用');
  });

  it('TC-COLOR-02 设备类型为蓝色胶囊（pill），不使用 ok/bad 语义', () => {
    const f = collectSyncReport();
    expect(f.deviceType.tone).toBe('pill');
  });

  it('TC-COLOR-03 离线为红色 bad，在线为绿色 ok', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    expect(collectSyncReport().online).toEqual({ text: '离线', tone: 'bad' });
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    expect(collectSyncReport().online).toEqual({ text: '在线', tone: 'ok' });
  });
});

/* ===================== AC-02 禁止内容 ===================== */

describe('AC-02 页面不出现 undefined / NaN / null / [object Object]', () => {
  it('TC-AC02-01 全部降级场景下无非法文本', async () => {
    defineNav('userAgentData', undefined);
    defineNav('storage', undefined);
    defineNav('permissions', undefined);
    defineNav('connection', undefined);
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => expect(container.querySelectorAll('.card')).toHaveLength(7));
    const text = container.textContent || '';
    expect(text).not.toMatch(/undefined|NaN|\[object Object\]|\bnull\b/);
  });

  it('TC-AC02-02 RTT 为异常数值时降级为「不可用」（§3.5 降级规则）', () => {
    defineNav('connection', { effectiveType: '4g', downlink: 10, rtt: NaN, saveData: false });
    const f = collectSyncReport();
    expect(f.rtt.text).toBe('不可用');
  });

  it('TC-AC02-03 设备内存为异常数值时降级为「不可用」', () => {
    defineNav('deviceMemory', NaN);
    const f = collectSyncReport();
    expect(f.memory.text).toBe('不可用');
  });
});

/* ===================== §6 降级与权限 ===================== */

describe('§6 降级与失败隔离', () => {
  it('TC-DEG-01 UA-CH 不存在 → 架构/型号显示「不可用（浏览器不支持）」', async () => {
    render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(screen.getAllByText('不可用（浏览器不支持）').length).toBe(2);
    });
  });

  it('TC-DEG-02 UA-CH 返回 architecture=x86, bitness=64 → 「x86 64 位」', async () => {
    defineNav('userAgentData', {
      platform: 'Windows',
      getHighEntropyValues: () =>
        Promise.resolve({ architecture: 'x86', bitness: '64', model: '' }),
    });
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="arch"]')?.textContent).toBe('x86 64 位');
    });
    expect(container.querySelector('[data-key="model"]')?.textContent).toBe('不可用');
  });

  it('TC-DEG-03 电池 API 缺失 → 电量与充电状态均为「不可用」且不影响其它卡片', async () => {
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="batteryLevel"]')?.textContent).toBe('不可用');
    });
    expect(container.querySelector('[data-key="batteryState"]')?.textContent).toBe('不可用');
    expect(container.querySelector('[data-key="batteryLevel"]')?.className).toContain('na');
    expect(container.querySelectorAll('.card')).toHaveLength(7);
  });

  it('TC-DEG-04 电池 0.86 / charging → 「86%」+「充电中」（绿色）', async () => {
    mockBattery(0.86, true);
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="batteryLevel"]')?.textContent).toBe('86%');
    });
    const state = container.querySelector('[data-key="batteryState"]');
    expect(state?.textContent).toBe('充电中');
    expect(state?.className).toContain('ok');
  });

  it('TC-DEG-05 存储配额/占用比例按 §3.6 换算与 <0.1% 边界', async () => {
    defineNav('storage', {
      estimate: () => Promise.resolve({ quota: 2 * 1024 ** 3, usage: 1024 }),
    });
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="storageQuota"]')?.textContent).toBe('2.0 GB');
    });
    expect(container.querySelector('[data-key="storageUsage"]')?.textContent).toBe('1.0 KB');
    expect(container.querySelector('[data-key="storageRate"]')?.textContent).toBe('< 0.1 %');
  });

  it('TC-DEG-06 权限状态未决定/已拒绝文案正确（§3.7）', async () => {
    defineNav('permissions', {
      query: ({ name }: { name: string }) =>
        Promise.resolve({ state: name === 'geolocation' ? 'prompt' : 'denied' }),
    });
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="pGeolocation"]')?.textContent).toBe('未决定');
    });
    expect(container.querySelector('[data-key="pNotifications"]')?.textContent).toBe('已拒绝');
  });

  it('TC-DEG-07 权限 API 同步抛错时不得中断渲染（§6.2 失败不阻塞）', () => {
    defineNav('permissions', {
      query: () => {
        throw new Error('permission query unsupported');
      },
    });
    expect(() => render(<DeviceInfoPage />)).not.toThrow();
  });

  it('TC-DEG-08 存储 estimate 同步抛错时不得中断渲染（§6.2）', () => {
    defineNav('storage', {
      estimate: () => {
        throw new Error('storage blocked');
      },
    });
    expect(() => render(<DeviceInfoPage />)).not.toThrow();
  });

  it('TC-DEG-10 省流量模式字段缺失时应降级为「不可用」而非「关闭」（§3.5）', () => {
    defineNav('connection', { effectiveType: '4g', downlink: 10, rtt: 50 });
    const f = collectSyncReport();
    expect(f.saveData.text).toBe('不可用');
  });

  it('TC-DEG-11 异步接口 reject 时自身降级、其它卡片照常（§6.2）', async () => {
    defineNav('storage', { estimate: () => Promise.reject(new Error('denied')) });
    defineNav('permissions', { query: () => Promise.reject(new Error('denied')) });
    const { container } = render(<DeviceInfoPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-key="storageQuota"]')?.textContent).toBe('不可用');
    });
    expect(container.querySelector('[data-key="pGeolocation"]')?.textContent).toBe('不可用');
    expect(container.querySelector('[data-key="browser"]')?.textContent).toBe('Chrome 141');
  });
});

/* ===================== AC-01 首帧占位 ===================== */

describe('AC-01 / §5.2 空值占位', () => {
  it('TC-AC01-01 异步字段首帧显示「…」', () => {
    defineNav('userAgentData', {
      platform: 'Windows',
      getHighEntropyValues: () => new Promise(() => undefined),
    });
    defineNav('storage', { estimate: () => new Promise(() => undefined) });
    const { container } = render(<DeviceInfoPage />);
    expect(container.querySelector('[data-key="arch"]')?.textContent).toBe('…');
    expect(container.querySelector('[data-key="storageQuota"]')?.textContent).toBe('…');
  });
});

/* ===================== AC-03 / AC-04 / AC-07 交互 ===================== */

describe('AC-03 / AC-04 / AC-07 实时更新与操作', () => {
  it('TC-AC03-01 resize 后视口卡片与汇总条同步更新', () => {
    const { container } = render(<DeviceInfoPage />);
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(container.querySelector('[data-key="viewport"]')?.textContent).toBe('900 × 600 px');
    const stripValues = Array.from(container.querySelectorAll('.strip .item strong')).map(
      (n) => n.textContent,
    );
    expect(stripValues[4]).toBe('900 × 600 px');
  });

  it('TC-AC04-01 offline/online 事件驱动状态点与文案', () => {
    const { container } = render(<DeviceInfoPage />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(container.querySelector('.dot')?.className).toContain('off');
    expect(container.querySelector('.strip .item strong')?.textContent).toContain('离线');
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(container.querySelector('.dot')?.className).toContain('on');
    expect(container.querySelector('.strip .item strong')?.textContent).toContain('在线');
  });

  it('TC-AC07-01 点击「重新读取」重新读取数值（下行带宽变化）', async () => {
    const conn = { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false };
    defineNav('connection', conn);
    const { container } = render(<DeviceInfoPage />);
    expect(container.querySelector('[data-key="downlink"]')?.textContent).toBe('10.0 Mbps（估算）');
    conn.downlink = 2.5;
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => {
      expect(container.querySelector('[data-key="downlink"]')?.textContent).toBe('2.5 Mbps（估算）');
    });
  });

  it('TC-AC07-02 生成时间格式为 YYYY-MM-DD HH:mm:ss', () => {
    render(<DeviceInfoPage />);
    expect(screen.getByText(/^生成时间 \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('TC-AC05-01 无 clipboard API 时降级 execCommand 并提示成功', async () => {
    const execCommand = vi.fn(() => true);
    (document as unknown as { execCommand: unknown }).execCommand = execCommand;
    const { container } = render(<DeviceInfoPage />);
    fireEvent.click(screen.getByRole('button', { name: '复制报告' }));
    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith('copy');
    });
    await waitFor(() => {
      expect(container.querySelector('.toast')?.textContent).toBe('报告已复制到剪贴板');
    });
    expect(container.querySelector('.toast')?.className).toContain('show');
  });

  it('TC-PRIV-01 §7.1 零上传：渲染与复制/导出均不发起网络请求', () => {
    const fetchSpy = vi.fn();
    (window as unknown as { fetch: unknown }).fetch = fetchSpy;
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<DeviceInfoPage />);
    fireEvent.click(screen.getByRole('button', { name: '复制报告' }));
    fireEvent.click(screen.getByRole('button', { name: '导出 JSON' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
  });

  it('TC-AC06-01 导出文件名为 device-info-YYYYMMDD-HHmm.json', () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    let name = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        name = this.download;
      });
    render(<DeviceInfoPage />);
    fireEvent.click(screen.getByRole('button', { name: '导出 JSON' }));
    expect(name).toMatch(/^device-info-\d{8}-\d{4}\.json$/);
    clickSpy.mockRestore();
  });
});
