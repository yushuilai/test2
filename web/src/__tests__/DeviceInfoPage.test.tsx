import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectSyncReport, loadAsyncReport } from '../collect';
import { DeviceInfoPage } from '../pages/DeviceInfoPage';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

function defineNav(key: string, value: unknown) {
  Object.defineProperty(window.navigator, key, { value, configurable: true, writable: true });
}

function renderPage() {
  return render(<DeviceInfoPage />);
}

beforeEach(() => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: CHROME_UA,
    configurable: true,
  });
  // 清理上一用例注入的扩展 / 异步 mock，避免串扰
  for (const k of [
    'userAgentData',
    'storage',
    'getBattery',
    'connection',
    'mozConnection',
    'webkitConnection',
    'permissions',
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

describe('DeviceInfoPage', () => {
  it('渲染页头、汇总条、7 张卡片与页脚', () => {
    renderPage();

    // 页头
    expect(screen.getByRole('heading', { name: '设备信息' })).toBeInTheDocument();
    expect(screen.getByText('当前浏览器的运行时环境概览')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制报告' })).toBeInTheDocument();

    // 汇总条（「连接状态」「浏览器」在卡片中亦出现，需 getAllByText）
    expect(screen.getAllByText('连接状态').length).toBeGreaterThan(0);
    expect(screen.getByText('设备')).toBeInTheDocument();
    expect(screen.getByText('系统')).toBeInTheDocument();
    expect(screen.getAllByText('浏览器').length).toBeGreaterThan(0);
    expect(screen.getByText('视口')).toBeInTheDocument();

    // 7 张卡片
    for (const title of ['设备概览', '屏幕与显示', '浏览器环境', '硬件与电源', '网络', '存储', '能力检测']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }

    // 页脚
    expect(screen.getByText(/本页所有信息均由浏览器在本地实时读取并渲染/)).toBeInTheDocument();
    expect(screen.getByText(/^生成时间 /)).toBeInTheDocument();
  });

  it('派生值正确显示（Chrome UA → Windows 10 / 11 + Chrome 141）', () => {
    renderPage();

    expect(screen.getAllByText('Windows 10 / 11').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chrome 141').length).toBeGreaterThan(0);
  });

  it('点击「复制报告」调用剪贴板并写入分组 JSON', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '复制报告' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const payload = writeText.mock.calls[0][0] as string;
    expect(payload).toContain('_生成时间');
    expect(payload).toContain('设备概览');
    expect(payload).toContain('能力检测');
  });

  it('点击「导出 JSON」触发下载且文件名符合规范', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    let downloadedName = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download;
      });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '导出 JSON' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(downloadedName).toMatch(/^device-info-\d{8}-\d{4}\.json$/);

    clickSpy.mockRestore();
  });

  it('§4.3 Opera 不被 UA-CH 校正为 Chromium', async () => {
    defineNav(
      'userAgent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 OPR/95.0.0.0',
    );
    defineNav('userAgentData', {
      platform: 'Windows',
      getHighEntropyValues: () =>
        Promise.resolve({
          architecture: 'x86',
          bitness: '64',
          model: '',
          fullVersionList: [
            { brand: 'Opera', version: '95.0.0.0' },
            { brand: 'Chromium', version: '109.0.0.0' },
          ],
        }),
    });

    renderPage();

    await waitFor(() => expect(screen.getAllByText(/Opera 95/).length).toBeGreaterThan(0));
    expect(screen.queryAllByText(/Chromium/).length).toBe(0);
  });

  it('§3.3/§8.1 微信内置浏览器不被 UA-CH 校正为 Chromium', async () => {
    defineNav(
      'userAgent',
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.49',
    );
    defineNav('userAgentData', {
      platform: 'Android',
      getHighEntropyValues: () =>
        Promise.resolve({
          architecture: '',
          bitness: '',
          model: 'Pixel 7',
          fullVersionList: [{ brand: 'Chromium', version: '122.0.0.0' }],
        }),
    });

    renderPage();

    await waitFor(() => expect(screen.getAllByText('微信内置浏览器').length).toBeGreaterThan(0));
    expect(screen.queryAllByText(/^Chromium /).length).toBe(0);
  });
});

describe('collect 同步字段', () => {
  it('§3.5 下行带宽保留一位小数', () => {
    defineNav('connection', { downlink: 10, effectiveType: '4g', rtt: 50, saveData: false });
    const fields = collectSyncReport();
    expect(fields.downlink?.text).toBe('10.0 Mbps（估算）');
  });

  it('§5.3 GPU 有值时使用默认语义（非 na）', () => {
    const fakeGL = {
      getExtension: (name: string) => {
        if (name === 'WEBGL_debug_renderer_info') return { UNMASKED_RENDERER_WEBGL: 123 };
        if (name === 'WEBGL_lose_context') return { loseContext() {} };
        return null;
      },
      getParameter: () => 'ANGLE (NVIDIA GeForce RTX)',
    };
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = ((type: string) =>
      (type === 'webgl' || type === 'experimental-webgl' ? fakeGL : null)) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    try {
      const fields = collectSyncReport();
      expect(fields.gpu?.text).toBe('ANGLE (NVIDIA GeForce RTX)');
      expect(fields.gpu?.tone).toBe(null);
    } finally {
      HTMLCanvasElement.prototype.getContext = orig;
    }
  });
});

describe('collect 异步超时', () => {
  it('§6.1 异步字段 3 秒未返回降级为「不可用」', async () => {
    vi.useFakeTimers();
    defineNav('storage', { estimate: () => new Promise(() => {}) });

    const apply = vi.fn();
    loadAsyncReport(apply);

    await vi.advanceTimersByTimeAsync(3500);

    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({
        storageQuota: { text: '不可用', tone: 'na' },
        storageUsage: { text: '不可用', tone: 'na' },
        storageRate: { text: '不可用', tone: 'na' },
      }),
    );
  });
});
