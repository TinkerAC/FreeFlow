import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import { useSetting } from '@renderer/core/config/SettingsContext';

export default function LibrarySettingsTab() {
  const scanPaths = useSetting<string[]>('library.scanPaths', []);
  const supportedFormats = useSetting<string[]>('library.supportedFormats', ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac']);

  return (
    <>
      <SettingsGroup title="音乐库" desc="扫描路径与支持格式">
        <SettingRow
          label="扫描路径（每行一个）"
          control={
            <textarea
              value={(scanPaths.value || []).join('\n')}
              onChange={(e) => {
                const list = e.target.value
                  .split(/[\n,;]+/)
                  .map(s => s.trim())
                  .filter(Boolean);
                scanPaths.setValue(list);
              }}
              placeholder="/Users/you/Music\n/D:/Music"
              rows={4}
              style={{
                width: 420,
                borderRadius: 12,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '8px 10px',
                resize: 'vertical',
              }}
            />
          }
        />
        <SettingRow
          label="支持格式（逗号分隔）"
          control={
            <input
              type="text"
              value={(supportedFormats.value || []).join(',')}
              onChange={(e) => {
                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                supportedFormats.setValue(arr);
              }}
              placeholder="mp3,flac,wav,m4a,ogg,aac"
              style={{
                height: 28,
                borderRadius: 999,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '0 10px',
                minWidth: 320,
              }}
            />
          }
        />
      </SettingsGroup>
    </>
  );
}
