import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { buildReport } from '../collect';
import { fmtTime } from '../detect';
import { GROUPS } from '../groups';
import type { GroupItemDef } from '../groups';
import type { Tone } from '../types';
import { useDeviceInfo } from '../useDeviceInfo';

function valueClass(item: GroupItemDef, tone: Tone): string {
  const cls = ['value'];
  if (item.pill) cls.push('pill');
  else if (tone === 'ok' || tone === 'bad' || tone === 'na') cls.push(tone);
  return cls.join(' ');
}

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function DeviceInfoPage() {
  const { fields, startedAt, online, refresh } = useDeviceInfo();

  // 底部 Toast（对齐设计稿 .toast：fixed 底部居中、深色、1.8s 自动消失）
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((t) => (t.show ? { ...t, show: false } : t));
    }, 1800);
  }, []);

  // 汇总条吸顶：测量页头高度，作为 .strip 的 sticky top 偏移（§5.1.4）
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setHeaderHeight(headerRef.current?.offsetHeight ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = JSON.stringify(buildReport(fields), null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('报告已复制到剪贴板');
      } else {
        const ok = fallbackCopy(text);
        showToast(ok ? '报告已复制到剪贴板' : '复制失败，请手动选择文本');
      }
    } catch {
      const ok = fallbackCopy(text);
      showToast(ok ? '报告已复制到剪贴板' : '复制失败，请手动选择文本');
    }
  }, [fields, showToast]);

  const handleExport = useCallback(() => {
    const text = JSON.stringify(buildReport(fields), null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const p = (n: number) => (n < 10 ? '0' + n : String(n));
    a.href = url;
    a.download =
      'device-info-' +
      d.getFullYear() +
      p(d.getMonth() + 1) +
      p(d.getDate()) +
      '-' +
      p(d.getHours()) +
      p(d.getMinutes()) +
      '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('已导出 JSON 文件');
  }, [fields, showToast]);

  const handleRefresh = useCallback(() => {
    refresh();
    showToast('已重新读取设备信息');
  }, [refresh, showToast]);

  return (
    <div className="page">
      <header className="app-header" ref={headerRef}>
        <div className="head-inner">
          <div className="brand">
            <div className="logo" aria-hidden>
              ▤
            </div>
            <div>
              <h1>设备信息</h1>
              <p>当前浏览器的运行时环境概览</p>
            </div>
          </div>
          <div className="actions">
            <button type="button" onClick={handleRefresh}>
              重新读取
            </button>
            <button type="button" onClick={handleExport}>
              导出 JSON
            </button>
            <button type="button" className="primary" onClick={handleCopy}>
              复制报告
            </button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="strip" style={{ top: headerHeight }}>
          <div className="item">
            <small>连接状态</small>
            <strong>
              <span className={`dot ${online ? 'on' : 'off'}`} aria-hidden />
              <span>{online ? '在线' : '离线'}</span>
            </strong>
          </div>
          <div className="divider" />
          <div className="item">
            <small>设备</small>
            <strong>{fields.deviceType?.text ?? '—'}</strong>
          </div>
          <div className="divider" />
          <div className="item">
            <small>系统</small>
            <strong>{fields.os?.text ?? '—'}</strong>
          </div>
          <div className="divider" />
          <div className="item">
            <small>浏览器</small>
            <strong>{fields.browser?.text ?? '—'}</strong>
          </div>
          <div className="divider" />
          <div className="item">
            <small>视口</small>
            <strong>{fields.viewport?.text ?? '—'}</strong>
          </div>
        </div>

        <main className="grid">
          {GROUPS.map((g) => (
            <section key={g.title} className="card">
              <div className="card-head">
                <span className="icon" aria-hidden>
                  {g.icon}
                </span>
                <div>
                  <h2>{g.title}</h2>
                  <p>{g.desc}</p>
                </div>
              </div>
              <div className="card-body">
                {g.items.map((it) => {
                  const fv = fields[it.key];
                  return (
                    <div key={it.key} className={`row${it.wide ? ' wide' : ''}`}>
                      <span className="label">{it.label}</span>
                      <span className={valueClass(it, fv?.tone ?? null)} data-key={it.key}>
                        {fv?.text ?? '…'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </main>

        <footer>
          <span>
            本页所有信息均由浏览器在本地实时读取并渲染，不经过任何服务器、不写入 Cookie、不发起网络请求。部分字段受浏览器权限策略限制，无法读取时统一显示「不可用」。
          </span>
          <span>生成时间 {fmtTime(startedAt)}</span>
        </footer>
      </div>

      <div className={toast.show ? 'toast show' : 'toast'} role="status">
        {toast.msg}
      </div>
    </div>
  );
}
