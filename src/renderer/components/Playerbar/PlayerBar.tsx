import React from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { DefaultCover } from '@components/static';
import PlayerController from '@renderer/core/controller/PlayerController';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import styles from './PlayerBar.module.css';
import { cva, type VariantProps } from 'class-variance-authority';
import { ClassicBar, NeonBar, WaveformBar } from '@components/Playerbar/ProgressBar';
// 任选一个皮肤：

const rootCva = cva(styles.root, {
  variants: {
    density: { compact: styles.density_compact, cozy: styles.density_cozy },
    elevated: { true: styles.elevated_true, false: '' },
  },
  defaultVariants: { density: 'cozy', elevated: false },
});

interface PlayerBarStyleProps extends VariantProps<typeof rootCva> {
  classNames?: Partial<{
    root: string;
    left: string;
    middle: string;
    right: string;
    title: string;
    artist: string;
    cover: string;
    icon: string;
  }>;
  unstyled?: boolean;
  /** 可用来覆盖 CSS 变量，例如 --playerbar-bg、--icon-size */
  styleVars?: React.CSSProperties & { ['--playerbar-bg']?: string; ['--icon-size']?: string };
}

export interface PlayerBarProps extends PlayerBarStyleProps {
  player: PlayerController | null;
  mainContentStack: MainContentViewStack;
  onToggleRightContent: () => void;
}

export default function PlayerBar({
                                    player,
                                    mainContentStack,
                                    onToggleRightContent,
                                    styleVars,
                                  }: PlayerBarProps) {
  if (!player) return null;
  const track = player.playQueue.currentTrack;

  return (
    <div className={styles.root} style={styleVars}>
      {/* 左：封面 + 曲目信息 */}
      <div className={styles.left}>
        <img src={track?.cover_src || DefaultCover} alt="album cover" className={styles.cover} />
        <div className={styles.meta}>
          <div className={styles.title}>{track?.title || '未知标题'}</div>
          <div className={styles.artist}>{track?.artist || '未知艺术家'}</div>
        </div>
        {player.isLoading && (
          <div className={styles.spinner}><i className="fas fa-spinner fa-spin" /></div>
        )}
      </div>

      {/* 中：控制 + 进度（对齐版） */}
      <div className={styles.middle}>
        <div className={styles.middleInner}>
          <div className={styles.controls}>
            <i className={styles.iconButton} title="循环/随机/顺序" onClick={() => player.cyclePlaybackMode()}>
              <span
                className={'fas ' + (player.playbackMode === 'loop' ? 'fa-redo' : player.playbackMode === 'shuffle' ? 'fa-random' : 'fa-sync')} />
            </i>
            <i className={styles.iconButton} onClick={() => player.playPrevious()} title="上一首">
              <span className="fas fa-step-backward" />
            </i>
            <i className={styles.iconButton} onClick={() => player.togglePlayPause()}
               title={player.isPlaying ? '暂停' : '播放'}>
              <span className={'fas ' + (player.isPlaying ? 'fa-pause' : 'fa-play')} />
            </i>
            <i className={styles.iconButton} onClick={() => player.playNext()} title="下一首">
              <span className="fas fa-step-forward" />
            </i>
          </div>
          <div className={styles.progress}>
            {/*<ProgressBar*/}
            {/*  skin="classic"                    // "classic" | "neon" | "waveform" | "knob"*/}
            {/*  value={player.currentTime}*/}
            {/*  min={0}*/}
            {/*  max={track?.duration || 0}*/}
            {/*  onChange={(val) => player.setCurrentTime(val)}*/}

            {/*/>*/}

            <WaveformBar value={
              player.currentTime
            } max={
              track?.duration || 0
            } onChange={
              (val) => player.setCurrentTime(val)
            }>

            </WaveformBar>
          </div>
        </div>
      </div>

      {/* 右：列表/搜索/过滤/歌词/音量/全屏 */}
      <div className={styles.right}>
        <i className={styles.iconButton} onClick={onToggleRightContent} title="播放列表"><span
          className="fas fa-list" /></i>
        <i className={styles.iconButton} title="搜索"><span className="fas fa-search" /></i>
        <i className={styles.iconButton} title="播放所有歌曲"><span className="fas fa-filter" /></i>
        <i className={styles.iconButton} onClick={() => mainContentStack.navigate(View.LYRIC)} title="歌词"><span
          className="fas fa-align-center" /></i>
        <input type="range" className={styles.volume} min={0} max={1} step={0.01} value={player.volume}
               onChange={(e) => {
                 const v = parseFloat(e.target.value);
                 if (!isNaN(v)) player.setVolume(v);
               }} />
        {document.fullscreenElement ? (
          <i className={styles.iconButton} onClick={() => document.exitFullscreen?.()} title="退出全屏"><span
            className="fas fa-compress" /></i>
        ) : (
          <i className={styles.iconButton} onClick={() => document.documentElement.requestFullscreen?.()}
             title="进入全屏"><span
            className="fas fa-expand" /></i>
        )}
      </div>
    </div>
  );
}