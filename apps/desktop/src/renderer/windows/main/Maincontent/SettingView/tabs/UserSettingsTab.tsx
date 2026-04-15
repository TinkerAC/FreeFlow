import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { profileContext } from '@renderer/core/electronContextApi';
import type { ProfileSummary } from '@src/shared/profile/profile';

export default function UserSettingsTab() {
  const userName = useSetting<string>('user.userName', '');
  const avatarPath = useSetting<string>('user.avatarPath', '');
  const [activeProfile, setActiveProfile] = React.useState<ProfileSummary | null>(null);
  const [statusText, setStatusText] = React.useState('');

  const loadProfile = React.useCallback(async () => {
    const profile = await profileContext.getActiveProfile();
    setActiveProfile(profile);
  }, []);

  React.useEffect(() => {
    void loadProfile().catch((error) => {
      setStatusText(`加载 Profile 失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    });
  }, [loadProfile]);

  const handleExitToGuide = React.useCallback(async () => {
    setStatusText('');
    try {
      await profileContext.exitToGuide();
    } catch (error) {
      setStatusText(`退出到引导失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    }
  }, []);

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

      <SettingsGroup title="Profile" desc="每个 Profile 使用独立数据库与本地设置">
        <SettingRow
          label="当前 Profile"
          sub="切换钱包或 Profile 需要退出到引导界面"
          control={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  minWidth: 220,
                  color: 'rgb(var(--md-sys-color-on-surface))',
                }}
              >
                {activeProfile ? `${activeProfile.name} (${activeProfile.id})` : '加载中...'}
              </span>
              <button
                type="button"
                onClick={() => void handleExitToGuide()}
                style={{
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  background: 'rgb(var(--md-sys-color-primary))',
                  color: 'rgb(var(--md-sys-color-on-primary))',
                  padding: '0 12px',
                  cursor: 'pointer',
                }}
              >
                返回引导
              </button>
            </div>
          )}
        />

        {statusText && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: 'rgb(var(--md-sys-color-on-surface-variant))',
            }}
          >
            {statusText}
          </div>
        )}
      </SettingsGroup>
    </>
  );
}
