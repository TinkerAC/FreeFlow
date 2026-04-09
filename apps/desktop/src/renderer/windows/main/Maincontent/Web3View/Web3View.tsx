import React from 'react';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';

export default function Web3View() {
  return (
    <ViewShell
      header={(
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgb(var(--md-sys-color-outline-variant))',
        }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Web3 已迁移</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              创作者上传、Pinata IPFS 存储和 NFT 铸造流程已迁移到独立的 Creators Workshop 窗口。
            </div>
          </div>
          <button
            onClick={() => window.mainApi.creatorsWorkshopApi.show()}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 999,
              border: '1px solid rgb(var(--md-sys-color-outline-variant))',
              background: 'rgb(var(--md-sys-color-primary))',
              color: 'rgb(var(--md-sys-color-on-primary))',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            打开 Creators Workshop
          </button>
        </div>
      )}
    >
      <div style={{ padding: 24, display: 'grid', gap: 16 }}>
        <section style={{
          padding: 20,
          borderRadius: 20,
          border: '1px solid rgba(var(--md-sys-color-outline-variant), 0.25)',
          background: 'rgb(var(--md-sys-color-surface-container))',
        }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>为什么迁移出去</div>
          <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.7 }}>
            创作者发布链路需要处理音频素材、封面、Pinata 配置、IPFS 上传、分账和合约铸造。
            这些流程比普通播放页复杂得多，放在独立窗口里更适合长时间编辑和状态跟踪。
          </div>
        </section>
      </div>
    </ViewShell>
  );
}
