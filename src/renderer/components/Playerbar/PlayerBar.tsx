// file: src/renderer/components/Playerbar/PlayerBar.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { DefaultCover } from '@components/static';
import PlayerController from '@renderer/core/controller/PlayerController';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import styles from './PlayerBar.module.css';
import clsx from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { ProgressBar } from '@components/Playerbar/ProgressBar';

import { useSetting } from '@renderer/core/config/SettingsContext';
import '@components/Playerbar/ProgressBar/skins/Classic/ClassicBar';
import '@components/Playerbar/ProgressBar/skins/Neon/NeonBar';
import '@components/Playerbar/ProgressBar/skins/Waveform/WaveformBar';
import '@components/Playerbar/ProgressBar/skins/Knob/Knob';

type ProgressSkin = 'classic' | 'neon' | 'waveform' | 'knob';

const VALID_SKINS: ReadonlyArray<ProgressSkin> = ['classic', 'neon', 'waveform', 'knob'];

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
  onToggleRightContent: () => void;
}

export default function PlayerBar({
                                    player, onToggleRightContent,
                                    density, elevated, classNames, unstyled = false, styleVars,
                                  }: PlayerBarProps) {
  if (!player) return null;
  const track = player.playQueue.currentTrack;

  // 进度条皮肤（实时）
  const { value: skinPref } = useSetting<ProgressSkin>('audio.progressSkin', 'classic');
  const skin: ProgressSkin = VALID_SKINS.includes(skinPref as ProgressSkin) ? (skinPref as ProgressSkin) : 'classic';

  // ── 音量弹层 ──────────────────────────────────────────────────
  const [showVol, setShowVol] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const volBtnWrapRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 清除隐藏定时器
  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  // 启动隐藏定时器（1.5秒后自动隐藏）
  const startHideTimer = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);
      // 等待淡出动画完成后再真正隐藏
      setTimeout(() => {
        setShowVol(false);
        setIsFadingOut(false);
      }, 150); // 与 CSS fadeOut 动画时长一致
    }, 1500); // 1.5秒后自动隐藏
  };

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
      clearHideTimer(); // 清理定时器
    };
  }, [showVol]);

  // 更细分的音量图标：静音 / 极低 / 低-中 / 高
  // v === 0            → xmark（静音）
  // 0 < v ≤ 0.2        → off（无声波，表示极低但非静音）
  // 0.2 < v ≤ 0.6      → low（单声波）
  // v > 0.6            → high（双声波）
  const volIcon = useMemo(() => {
    const v = player.volume ?? 0;
    if (v === 0) return 'fa-volume-xmark';
    if (v <= 0.2) return 'fa-volume-off';
    if (v <= 0.6) return 'fa-volume-low';
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

  const navigation = useNavigation();

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
                buffered={((): Array<{ start: number; end: number }> => {
                  try {
                    const a = player.audio as HTMLAudioElement;
                    const dur = track?.duration || a.duration || 0;
                    const out: Array<{ start: number; end: number }> = [];
                    const br = a?.buffered;
                    if (!br || !dur || !Number.isFinite(dur)) return out;
                    for (let i = 0; i < br.length; i++) {
                      const s = Math.max(0, br.start(i));
                      const e = Math.min(dur, br.end(i));
                      if (e > s) out.push({ start: s, end: e });
                    }
                    return out;
                  } catch {
                    return [];
                  }
                })()}
                styleVars={{
                  ['--pg-base' as unknown as string]: 'var(--md-sys-color-surface-variant)',
                  ['--pg-fill' as unknown as string]: 'var(--md-sys-color-primary)',
                  ['--pg-thumb' as unknown as string]: 'var(--md-sys-color-primary)',
                  // 使用更浅的中性颜色，以与已播放部分形成明显对比
                  ['--pg-buffer' as unknown as string]: 'var(--md-sys-color-outline-variant)',
                }}
              />
            </div>
          </div>
        </div>

        {/* 右：工具 */}
        <div className={rightCls}>
          {/* 播放模式优先显示在右侧第一个 */}
          <i className={iconCls} title="播放模式：循环/单曲/随机" onClick={() => player.cyclePlaybackMode()}>
            <span className={clsx('fas',
              player.playbackMode === 'shuffle' ? 'fa-shuffle' :
                player.playbackMode === 'repeat' ? 'fa-repeat' :
                  'fa-rotate-right', /* 循环 */
            )} />
          </i>
          <i className={iconCls} onClick={onToggleRightContent} title="播放列表"><span className="fas fa-list" /></i>
          <i className={iconCls} onClick={() => navigation.push(ViewType.LYRIC)} title="歌词"><span
            className="fas fa-align-center" /></i>

          {/* 音量按钮锚点 */}
          <div 
            className={styles.volWrap} 
            ref={volBtnWrapRef}
            onMouseEnter={clearHideTimer}
            onMouseLeave={startHideTimer}
          >
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

          <i
            className={iconCls}
            onClick={() => window.mainApi.miniPlayerApi.toggle()}
            title="迷你播放器开关"
            aria-label="迷你播放器开关"
          >
            <span className="fas fa-window-restore" />
          </i>
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
              className={`${styles.volPopover} ${isFadingOut ? styles.fadeOut : ''}`}
              style={{
                width: POP_W,
                left: Math.round(left),
                top: Math.round(anchorRect.top - GAP),
                transform: 'translateY(-100%)',
              } as React.CSSProperties}
              role="dialog"
              aria-label="音量调节"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={clearHideTimer}
              onMouseLeave={startHideTimer}
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
