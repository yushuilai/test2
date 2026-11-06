import { useCallback, useEffect, useState } from 'react';
import { collectSyncReport, loadAsyncReport } from './collect';
import { detectOrientation } from './detect';
import type { FieldMap } from './types';

export interface DeviceInfoState {
  fields: FieldMap;
  startedAt: Date;
  online: boolean;
  refresh: () => void;
}

export function useDeviceInfo(): DeviceInfoState {
  const [fields, setFields] = useState<FieldMap>({});
  const [startedAt, setStartedAt] = useState<Date>(() => new Date());
  const [online, setOnline] = useState<boolean>(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  const apply = useCallback((patch: FieldMap) => {
    setFields((prev) => ({ ...prev, ...patch }));
  }, []);

  const refresh = useCallback(() => {
    setStartedAt(new Date());
    const sync = collectSyncReport();
    setFields(sync);
    setOnline(sync.online?.text === '在线');
    loadAsyncReport(apply);
  }, [apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      apply({ online: { text: '在线', tone: 'ok' } });
    };
    const onOffline = () => {
      setOnline(false);
      apply({ online: { text: '离线', tone: 'bad' } });
    };
    const onResize = () => {
      const oriType =
        (window.screen && window.screen.orientation && window.screen.orientation.type) || '';
      apply({
        viewport: { text: `${window.innerWidth} × ${window.innerHeight} px`, tone: null },
        orientation: { text: detectOrientation(oriType, window.innerWidth, window.innerHeight), tone: null },
      });
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('resize', onResize);
    };
  }, [apply]);

  return { fields, startedAt, online, refresh };
}
