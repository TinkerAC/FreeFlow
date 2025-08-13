// file: src/renderer/components/Playerbar/PlayerBar.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { DefaultCover } from '@components/static';
import PlayerController from '@renderer/core/controller/PlayerController';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import styles from './PlayerBar.module.css';
import clsx from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { ProgressBar } from '@components/Playerbar/ProgressBar';

import { useSetting } from '@components/Maincontent/SettingView/useSettings';
import '@components/Playerbar/ProgressBar/skins/Classic/ClassicBar';
import '@components/Playerbar/ProgressBar/skins/Neon/NeonBar';
import '@components/Playerbar/ProgressBar/skins/Waveform/WaveformBar';
import '@components/Playerbar/ProgressBar/skins/Knob/Knob';

type ProgressSkin = 'classic' | 'neon' | 'waveform' | 'knob';

const rootCva = cva(styles.root, {
  variants: {
    density: { compact: styles.density_compact, cozy: styles.density_cozy },
    elevated: { true: styles.elevated_true, false: '' },
  },
  defaultVariants: { density: 'cozy', elevated: false },
});

interface PlayerBarStyleProps extends VariantProps<typeof rootCva> {
  classNames?: Partial<{
    root: string; left: string; middle: string; right: string;
    title: string; artist: string; cover: string; icon: string;
  }>;
  unstyled?: boolean;
  styleVars?: React.CSSProperties & { ['--playerbar-bg']?: string; ['--icon-size']?: string };
}

export interface PlayerBarProps extends PlayerBarStyleProps {
  player: PlayerController | null;
  mainContentStack: MainContentViewStack;
  onToggleRightContent: () => void;
}

export default function PlayerBar({
                                    player, mainContentStack, onToggleRightContent,
                                    density, elevated, classNames, unstyled = false, styleVars,
                                  }: PlayerBarProps) {
  if (!player) return null;
  const track = player.playQueue.currentTrack;

  // 进度条皮肤（实时）
  const { value: skinPref } = useSetting<ProgressSkin>('audio.progressSkin', 'classic');
  const skin: ProgressSkin = (['classic', 'neon', 'waveform', 'knob'] as const).includes(skinPref as any) ? skinPref : 'classic';

  // ── 音量弹层 ──────────────────────────────────────────────────
  const [showVol, setShowVol] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const volBtnWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVol) return;
    const update = () => {
      const el = volBtnWrapRef.current;
      if (el) setAnchorRect(el.getBoundingClientRect());
    };
    const onDown = (e: MouseEvent) => {
      if (!volBtnWrapRef.current?.contains(e.target as Node)) setShowVol(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowVol(false);
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('scroll', update, true);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [showVol]);

  // ★ 修正：Font Awesome v6 没有 'fa-volume'，只用三档图标
  const volIcon = useMemo(() => {
    const v = player.volume ?? 0;
    if (v === 0) return 'fa-volume-xmark';
    if (v <= 0.5) return 'fa-volume-low';
    return 'fa-volume-high';
  }, [player.volume]);

  const rootCls = unstyled ? classNames?.root : clsx(rootCva({ density, elevated }), classNames?.root);
  const leftCls = unstyled ? classNames?.left : clsx(styles.left, classNames?.left);
  const middleCls = unstyled ? classNames?.middle : clsx(styles.middle, classNames?.middle);
  const rightCls = unstyled ? classNames?.right : clsx(styles.right, classNames?.right);

  const titleCls = unstyled ? classNames?.title : clsx(styles.title, classNames?.title);
  const artistCls = unstyled ? classNames?.artist : clsx(styles.artist, classNames?.artist);
  const coverCls = unstyled ? classNames?.cover : clsx(styles.cover, classNames?.cover);
  const iconCls = unstyled ? classNames?.icon : clsx(styles.iconButton, classNames?.icon);

  return (
    <>
      <div className={rootCls} style={styleVars}>
        {/* 左：封面 + 信息 */}
        <div className={leftCls}>
          <img src={track?.cover_src || DefaultCover}
               referrerPolicy="no-referrer"
               alt="album cover" className={coverCls} />
          <div className={styles.meta}>
            <div className={titleCls}>{track?.title || '未知标题'}</div>
            <div className={artistCls}>{track?.artist || '未知艺术家'}</div>
          </div>
          {player.isLoading && <div className={styles.spinner}><i className="fas fa-spinner fa-spin" /></div>}
        </div>

        {/* 中：控制 + 进度 */}
        <div className={middleCls}>
          <div className={styles.middleInner}>
            <div className={styles.controls}>
              <i className={iconCls} title="循环/随机/顺序" onClick={() => player.cyclePlaybackMode()}>
                <span
                  className={'fas ' + (player.playbackMode === 'loop' ? 'fa-redo' : player.playbackMode === 'shuffle' ? 'fa-random' : 'fa-sync')} />
              </i>
              <i className={iconCls} onClick={() => player.playPrevious()} title="上一首"><span
                className="fas fa-step-backward" /></i>
              <i className={iconCls} onClick={() => player.togglePlayPause()}
                 title={player.isPlaying ? '暂停' : '播放'}>
                <span className={'fas ' + (player.isPlaying ? 'fa-pause' : 'fa-play')} />
              </i>
              <i className={iconCls} onClick={() => player.playNext()} title="下一首"><span
                className="fas fa-step-forward" /></i>
            </div>

            <div className={styles.progress}>
              <ProgressBar
                skin={skin}
                value={player.currentTime}
                min={0}
                max={track?.duration || 0}
                onChange={(v: number) => player.setCurrentTime(v)}
                styleVars={{
                  ['--pg-base' as any]: 'var(--md-sys-color-surface-variant)',
                  ['--pg-fill' as any]: 'var(--md-sys-color-primary)',
                  ['--pg-thumb' as any]: 'var(--md-sys-color-primary)',
                }}
              />
            </div>
          </div>
        </div>

        {/* 右：工具 */}
        <div className={rightCls}>
          <i className={iconCls} onClick={onToggleRightContent} title="播放列表"><span className="fas fa-list" /></i>
          <i className={iconCls} title="搜索"><span className="fas fa-search" /></i>
          <i className={iconCls} title="播放所有歌曲"><span className="fas fa-filter" /></i>
          <i className={iconCls} onClick={() => mainContentStack.navigate(View.LYRIC)} title="歌词"><span
            className="fas fa-align-center" /></i>

          {/* 音量按钮锚点 */}
          <div className={styles.volWrap} ref={volBtnWrapRef}>
            <i
              className={iconCls}
              title="音量"
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setAnchorRect(r);
                setShowVol((v) => !v);
              }}
              aria-expanded={showVol}
              aria-haspopup="true"
              aria-label="音量"
            >
              <span className={clsx('fas', volIcon)} />
            </i>
          </div>

          {document.fullscreenElement ? (
            <i className={iconCls} onClick={() => document.exitFullscreen?.()} title="退出全屏"><span
              className="fas fa-compress" /></i>
          ) : (
            <i className={iconCls} onClick={() => document.documentElement.requestFullscreen?.()} title="进入全屏"><span
              className="fas fa-expand" /></i>
          )}
        </div>
      </div>

      {/* ── Portal：音量弹层（正上方 + 水平居中） ───────────────────── */}
      {showVol && anchorRect && createPortal(
        (() => {
          const POP_W = 64;  // ↙ 与 CSS 一致
          const GAP = 10;
          let left = anchorRect.left + anchorRect.width / 2 - POP_W / 2;
          left = Math.max(8, Math.min(left, window.innerWidth - POP_W - 8));
          return (
            <div
              className={styles.volPopover}
              style={{
                width: POP_W,
                left: Math.round(left),
                top: Math.round(anchorRect.top - GAP),
                transform: 'translateY(-100%)',
              } as React.CSSProperties}
              role="dialog"
              aria-label="音量调节"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.volSliderBox}>
                <input
                  className={styles.volSlider}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) player.setVolume(v);
                  }}
                />
              </div>
              <div className={styles.volValue}>{Math.round((player.volume ?? 0) * 100)}%</div>
            </div>
          );
        })(),
        document.body,
      )}
    </>
  );
}