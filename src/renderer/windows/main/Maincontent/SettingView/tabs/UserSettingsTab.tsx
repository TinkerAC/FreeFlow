import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import { useSetting } from '@renderer/core/config/SettingsContext';

export default function UserSettingsTab() {
  const userName = useSetting<string>('user.userName', '');
  const avatarPath = useSetting<string>('user.avatarPath', '');

  return (
    <>
      <SettingsGroup title="用户" desc="基础资料">
        <SettingRow
          label="用户名"
          control={(
            <input
              type="text"
              value={userName.value}
              onChange={(e) => userName.setValue(e.target.value)}
              placeholder="输入昵称"
              style={{
                height: 28,
                borderRadius: 999,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '0 10px',
                minWidth: 200,
              }}
            />
          )}
        />
        <SettingRow
          label="头像路径"
          sub="可在个人中心中上传头像；此处为只读预览"
          control={(
            <input
              type="text"
              value={avatarPath.value}
              readOnly
              style={{
                height: 28,
                borderRadius: 999,
                background: 'rgba(var(--md-sys-color-surface-variant), .25)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '0 10px',
                minWidth: 320,
                opacity: .8,
              }}
            />
          )}
        />
      </SettingsGroup>
    </>
  );
}
