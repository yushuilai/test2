/**
 * 设计稿 / 业务规则缺口回归（AI 测试工程师）
 * 这些用例在实现修复前应当失败，用于锁定「与设计稿/规则不符」的行为。
 * 依据：design/rules.md §5.3、§6.2、§8.3。
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectSyncReport } from '../collect';
import { DeviceInfoPage } from '../pages/DeviceInfoPage';

function defineNav(key: string, value: unknown) {
  Object.defineProperty(window.navigator, key, { value, configurable: true, writable: true });
}

beforeEach(() => {
  for (const k of ['getBattery', 'userAgentData', 'mediaDevices', 'connection', 'languages']) {
    try {
      Reflect.deleteProperty(window.navigator, k);
    } catch {
      /* ignore */
    }
  }
  defineNav(
    'userAgent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  );
  defineNav('language', 'zh-CN');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('§6.2 失败不阻塞：扩展 API 同步抛错时不得中断整页', () => {
  it('TC-DEG-12 电池 getBattery 同步抛错仅降级电池字段', () => {
    defineNav('getBattery', () => {
      throw new Error('battery blocked');
    });
    expect(() => render(<DeviceInfoPage />)).not.toThrow();
  });

  it('TC-DEG-13 UA-CH getHighEntropyValues 同步抛错仅降级架构/型号', () => {
    defineNav('userAgentData', {
      platform: 'Windows',
      getHighEntropyValues: () => {
        throw new Error('uach blocked');
      },
    });
    expect(() => render(<DeviceInfoPage />)).not.toThrow();
  });

  it('TC-DEG-14 enumerateDevices 同步抛错不得影响页面', () => {
    defineNav('mediaDevices', {
      enumerateDevices: () => {
        throw new Error('media blocked');
      },
    });
    expect(() => render(<DeviceInfoPage />)).not.toThrow();
  });
});

describe('§5.3 缺失语义色：「不可用」一律中性灰（na）', () => {
  it('TC-COLOR-04 系统语言为空时「不可用」应为 na', () => {
    defineNav('language', '');
    defineNav('languages', []);
    const f = collectSyncReport();
    expect(f.language).toEqual({ text: '不可用', tone: 'na' });
  });

  it('TC-COLOR-05 时区取值异常时「不可用」应为 na', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue(
      { timeZone: '' } as Intl.ResolvedDateTimeFormatOptions,
    );
    const f = collectSyncReport();
    expect(f.timezone).toEqual({ text: '不可用', tone: 'na' });
  });

  it('TC-COLOR-06 渲染内核无法识别时「不可用」应为 na', () => {
    defineNav('userAgent', 'curl/8.0');
    const f = collectSyncReport();
    expect(f.engine).toEqual({ text: '不可用', tone: 'na' });
  });

  it('TC-COLOR-07 有效连接类型缺失时「不可用」应为 na', () => {
    defineNav('connection', { effectiveType: '', downlink: 10, rtt: 50, saveData: false });
    const f = collectSyncReport();
    expect(f.effectiveType).toEqual({ text: '不可用', tone: 'na' });
  });
});
