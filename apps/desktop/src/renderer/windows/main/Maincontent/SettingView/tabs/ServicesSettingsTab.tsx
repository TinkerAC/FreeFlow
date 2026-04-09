import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import Switch from '../controls/Switch';
import Segmented from '../controls/Segmented';
import { useSetting } from '@renderer/core/config/SettingsContext';

export default function ServicesSettingsTab() {
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const bbsSid = useSetting<string>('services.hifiniCookie.bbs_sid', '');
  const bbsToken = useSetting<string>('services.hifiniCookie.bbs_token', '');
  const youtubeCookie = useSetting<string>('services.youtubeMusic.cookie', '');
  const youtubeVisitor = useSetting<string>('services.youtubeMusic.visitorData', '');
  const aiEnabled = useSetting<boolean>('services.ai.enabled', false);
  const aiProvider = useSetting<'gemini'>('services.ai.provider', 'gemini');
  const aiKey = useSetting<string>('services.ai.geminiApiKey', '');
  const aiModel = useSetting<string>('services.ai.geminiModel', 'gemini-1.5-flash');
  const [ytSyncing, setYtSyncing] = React.useState(false);
  const [ytMessage, setYtMessage] = React.useState('');

  const youtubeCookiePreview = React.useMemo(() => {
    const raw = youtubeCookie.value?.trim?.() ?? '';
    if (!raw) return '未配置';
    return raw.length > 48 ? `${raw.slice(0, 48)}…` : raw;
  }, [youtubeCookie.value]);

  const youtubeVisitorPreview = React.useMemo(() => {
    const raw = youtubeVisitor.value?.trim?.() ?? '';
    if (!raw) return '未配置';
    return raw.length > 32 ? `${raw.slice(0, 32)}…` : raw;
  }, [youtubeVisitor.value]);

  const openYouTubeLoginWindow = async () => {
    try {
      await window.mainApi.youtubeMusicApi.openLoginWindow();
      setYtMessage('已打开 YouTube Music 登录窗口，请在新窗口完成登录。');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      setYtMessage(`打开登录窗口失败：${msg}`);
    }
  };

  const syncYouTubeCredentials = async () => {
    setYtSyncing(true);
    try {
      const result = await window.mainApi.youtubeMusicApi.syncCredentials();
      if (result?.cookie !== undefined) youtubeCookie.setValue(result.cookie ?? '');
      if (result?.visitorData !== undefined) youtubeVisitor.setValue(result.visitorData ?? '');
      if (result?.cookie) {
        setYtMessage('已同步 Cookie 并写入设置。');
      } else {
        setYtMessage('未获取到 Cookie，请确认已在登录窗口完成登录后重试。');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      setYtMessage(`同步失败：${msg}`);
    } finally {
      setYtSyncing(false);
    }
  };

  const clearYouTubeCredentials = () => {
    youtubeCookie.setValue('');
    youtubeVisitor.setValue('');
    setYtMessage('已清除 YouTube Music 凭据。');
  };

  return (
    <>
      <SettingsGroup title="Web2.5 后端" desc="SIWE 登录与 Pinata 上传由服务端统一控制">
        <SettingRow
          label="后端地址"
          sub="例如 http://localhost:8787"
          control={(
            <input
              type="text"
              value={web25BaseUrl.value}
              onChange={(e) => web25BaseUrl.setValue(e.target.value)}
              placeholder="http://localhost:8787"
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
          )}
        />
      </SettingsGroup>

      <SettingsGroup title="服务" desc="HiFiNi Cookie & YouTube Music">
        <SettingRow
          label="bbs_sid"
          control={(
            <input
              type="text"
              value={bbsSid.value}
              onChange={(e) => bbsSid.setValue(e.target.value)}
              placeholder="粘贴 bbs_sid"
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
          )}
        />
        <SettingRow
          label="bbs_token"
          control={(
            <input
              type="text"
              value={bbsToken.value}
              onChange={(e) => bbsToken.setValue(e.target.value)}
              placeholder="粘贴 bbs_token"
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
          )}
        />
        <SettingRow
          label="YouTube 登录"
          sub="打开登录窗口并同步 Cookie 到设置"
          control={(
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={openYouTubeLoginWindow}
                  style={{
                    height: 28,
                    padding: '0 14px',
                    borderRadius: 999,
                    background: 'rgb(var(--md-sys-color-primary))',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >打开登录窗口
                </button>
                <button
                  onClick={syncYouTubeCredentials}
                  disabled={ytSyncing}
                  style={{
                    height: 28,
                    padding: '0 14px',
                    borderRadius: 999,
                    background: ytSyncing ? 'rgba(var(--md-sys-color-primary), .25)' : 'rgba(var(--md-sys-color-primary), .12)',
                    color: 'rgb(var(--md-sys-color-primary))',
                    border: '1px solid rgba(var(--md-sys-color-primary), .35)',
                    cursor: ytSyncing ? 'wait' : 'pointer',
                  }}
                >{ytSyncing ? '同步中…' : '同步 Cookie'}</button>
                <button
                  onClick={clearYouTubeCredentials}
                  style={{
                    height: 28,
                    padding: '0 14px',
                    borderRadius: 999,
                    background: 'rgba(var(--md-sys-color-error), .15)',
                    color: 'rgb(var(--md-sys-color-error))',
                    border: '1px solid rgba(var(--md-sys-color-error), .35)',
                    cursor: 'pointer',
                  }}
                >清除
                </button>
              </div>
              <div style={{ fontSize: 12, opacity: .8 }}>
                {ytMessage || `当前 Cookie：${youtubeCookiePreview}｜VISITOR_DATA：${youtubeVisitorPreview}`}
              </div>
            </div>
          )}
        />
        <SettingRow
          label="Cookie"
          sub="如需手动粘贴，请保持原始格式"
          control={(
            <textarea
              value={youtubeCookie.value}
              onChange={(e) => youtubeCookie.setValue(e.target.value)}
              rows={3}
              placeholder="例如 VISITOR_INFO1_LIVE=...; SID=..."
              style={{
                borderRadius: 12,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '8px 12px',
                minWidth: 320,
                resize: 'vertical',
              }}
            />
          )}
        />
        <SettingRow
          label="VISITOR_DATA"
          sub="用于部分受限接口，通常可在同步时自动提取"
          control={(
            <input
              type="text"
              value={youtubeVisitor.value}
              onChange={(e) => youtubeVisitor.setValue(e.target.value)}
              placeholder="例如 CgtoZ3Y0b1J0X1ZpSg=="
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
          )}
        />
      </SettingsGroup>

      <SettingsGroup title="AI" desc="LLM 清洗搜索标题（需要重启生效）">
        <SettingRow
          label="启用 AI 清洗"
          sub="在聚合搜索结果中使用 LLM 解析标题/歌手"
          control={<Switch checked={!!aiEnabled.value} onChange={aiEnabled.setValue} />}
        />
        <SettingRow
          label="提供方"
          sub="当前仅支持 Gemini"
          control={(
            <Segmented<'gemini'>
              value={aiProvider.value}
              onChange={aiProvider.setValue}
              options={[{ label: 'Gemini', value: 'gemini' }]}
            />
          )}
        />
        <SettingRow
          label="API Key"
          sub="仅保存在本地设置（不会上传）"
          control={(
            <input
              type="password"
              value={aiKey.value}
              onChange={(e) => aiKey.setValue(e.target.value)}
              placeholder="粘贴你的 Gemini API Key"
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
          )}
        />
        <SettingRow
          label="模型"
          sub="例如 gemini-1.5-flash 或 1.5-pro"
          control={(
            <input
              type="text"
              value={aiModel.value}
              onChange={(e) => aiModel.setValue(e.target.value)}
              placeholder="gemini-1.5-flash"
              style={{
                height: 28,
                borderRadius: 999,
                background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                padding: '0 10px',
                minWidth: 220,
              }}
            />
          )}
        />
      </SettingsGroup>
    </>
  );
}
