import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { profileContext } from '@renderer/core/electronContextApi';
import type { ProfileSummary } from '@src/shared/profile/profile';

export default function UserSettingsTab() {
  const userName = useSetting<string>('user.userName', '');
  const avatarPath = useSetting<string>('user.avatarPath', '');
  const [profiles, setProfiles] = React.useState<ProfileSummary[]>([]);
  const [activeProfileId, setActiveProfileId] = React.useState('');
  const [selectedProfileId, setSelectedProfileId] = React.useState('');
  const [newProfileName, setNewProfileName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [statusText, setStatusText] = React.useState('');

  const loadProfiles = React.useCallback(async () => {
    const [allProfiles, active] = await Promise.all([
      profileContext.listProfiles(),
      profileContext.getActiveProfile(),
    ]);
    setProfiles(allProfiles);
    setActiveProfileId(active.id);
    setSelectedProfileId(active.id);
  }, []);

  React.useEffect(() => {
    void loadProfiles().catch((error) => {
      setStatusText(`加载 Profile 失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    });
  }, [loadProfiles]);

  const handleCreateProfile = React.useCallback(async () => {
    const name = newProfileName.trim();
    if (!name) {
      setStatusText('请输入 Profile 名称');
      return;
    }
    setBusy(true);
    setStatusText('');
    try {
      const created = await profileContext.createProfile({ name });
      setNewProfileName('');
      setStatusText(`已创建 Profile: ${created.name}`);
      await loadProfiles();
      setSelectedProfileId(created.id);
    } catch (error) {
      setStatusText(`创建失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setBusy(false);
    }
  }, [loadProfiles, newProfileName]);

  const handleSwitchProfile = React.useCallback(async () => {
    if (!selectedProfileId || selectedProfileId === activeProfileId) {
      setStatusText('当前已是选中 Profile');
      return;
    }
    setBusy(true);
    setStatusText('');
    try {
      await profileContext.switchProfile(selectedProfileId);
      setStatusText('正在切换 Profile，应用即将重启...');
    } catch (error) {
      setStatusText(`切换失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
      setBusy(false);
    }
  }, [activeProfileId, selectedProfileId]);

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
          control={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={selectedProfileId}
                onChange={(event) => setSelectedProfileId(event.target.value)}
                style={{
                  height: 30,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 220,
                }}
                disabled={busy}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleSwitchProfile()}
                disabled={busy || !selectedProfileId || selectedProfileId === activeProfileId}
                style={{
                  height: 30,
                  borderRadius: 999,
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  background: 'rgb(var(--md-sys-color-primary))',
                  color: 'rgb(var(--md-sys-color-on-primary))',
                  padding: '0 12px',
                  cursor: 'pointer',
                }}
              >
                切换
              </button>
            </div>
          )}
          sub="切换后会自动重启应用并切换到该 Profile 的数据源"
        />

        <SettingRow
          label="新建 Profile"
          control={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newProfileName}
                onChange={(event) => setNewProfileName(event.target.value)}
                placeholder="输入 Profile 名称"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 220,
                }}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => void handleCreateProfile()}
                disabled={busy}
                style={{
                  height: 30,
                  borderRadius: 999,
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  background: 'rgba(var(--md-sys-color-surface-variant), .45)',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 12px',
                  cursor: 'pointer',
                }}
              >
                创建
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
