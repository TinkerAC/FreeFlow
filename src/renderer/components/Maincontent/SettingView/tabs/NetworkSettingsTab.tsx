
import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import { useSetting } from '@renderer/core/config/SettingsContext';

export default function NetworkSettingsTab() {
  const networkPort = useSetting<number>('network.port', 29321);
  const cacheTime = useSetting<number>('cache.cacheTime', 3600);

  return (
    <>
      <SettingsGroup title="网络" desc="本地端口">
        <SettingRow
          label="服务端口"
          sub="重启后生效"
          control={(
            <input
              type="number"
              min={1}
              max={65535}
              value={networkPort.value}
              onChange={(e) => networkPort.setValue(Number(e.target.value))}
              style={{
                height: 28,
                borderRadius: 999,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '0 10px',
                width: 120,
              }}
            />
          )}
        />
      </SettingsGroup>

      <SettingsGroup title="缓存" desc="磁盘缓存时间（秒）">
        <SettingRow
          label="缓存时间"
          control={(
            <input
              type="number"
              min={0}
              step={60}
              value={cacheTime.value}
              onChange={(e) => cacheTime.setValue(Number(e.target.value))}
              style={{
                height: 28,
                borderRadius: 999,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '0 10px',
                width: 160,
              }}
            />
          )}
        />
      </SettingsGroup>
    </>
  );
}
