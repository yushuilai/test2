/**
 * 缺陷复现用例（AI 测试工程师）
 *
 * 这两条用例断言的是「按业务规则应当成立」的行为，当前实现会失败，用于锁定缺陷：
 *  - BUG-02：电池 level 非有限数值时输出 `NaN%`，违反 AC-02 / §5.2「禁止出现 NaN」红线。
 *  - BUG-03：storage.estimate() 返回缺少 quota/usage 的对象时，被当作 0 展示为 `0 B`，
 *            违反 §1.1.4「无法读取必须给出明确可解释状态」与 §3.6 降级规则。
 *
 * 修复后这两条用例应转绿；若行为被有意调整，请同步更新规则文档与用例。
 */
import { describe, expect, it } from 'vitest';
import { loadAsyncReport } from '../collect';
import type { FieldMap } from '../types';

function defineNav(key: string, value: unknown) {
  Object.defineProperty(window.navigator, key, { value, configurable: true, writable: true });
}

async function collectAsync(): Promise<FieldMap> {
  const fields: FieldMap = {};
  loadAsyncReport((patch) => Object.assign(fields, patch));
  await new Promise((resolve) => setTimeout(resolve, 50));
  return fields;
}

describe('BUG-02 / AC-02 电池电量不得输出 NaN', () => {
  it('TC-BUG02-01 level 为非有限数值时降级为「不可用」', async () => {
    defineNav('getBattery', () =>
      Promise.resolve({
        level: Number.NaN,
        charging: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    );
    const fields = await collectAsync();
    expect(fields.batteryLevel?.text).toBe('不可用');
    expect(fields.batteryLevel?.tone).toBe('na');
  });
});

describe('BUG-03 / §3.6 存储配额与已用空间缺失时不得伪造 0 B', () => {
  it('TC-BUG03-01 estimate() 未返回 quota/usage 时三项均降级为「不可用」', async () => {
    defineNav('storage', { estimate: () => Promise.resolve({}) });
    const fields = await collectAsync();
    expect(fields.storageQuota?.text).toBe('不可用');
    expect(fields.storageUsage?.text).toBe('不可用');
    expect(fields.storageRate?.text).toBe('不可用');
  });
});
