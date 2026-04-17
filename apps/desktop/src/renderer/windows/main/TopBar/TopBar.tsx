// file: src/renderer/components/TopBar/TopBar.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './TopBar.module.css';
import { configContext, searchContext, systemContext, windowControlContext } from '@renderer/core/electronContextApi';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import PlayerController from '@renderer/core/controller/PlayerController';
import clsx from 'clsx';
import { OS } from '@src/shared/OS';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import CreatorsWorkshopButton from '@renderer/windows/main/TopBar/CreatorsWorkshopButton';

async function getSearchResults(searchTerm: string, safeMode: boolean = false) {
  return searchContext.getSearchResults(searchTerm, safeMode);
}

async function getLocalSearchResults(searchTerm: string) {
  return searchContext.localSearch(searchTerm);
}

interface TopBarProps {
  setSearchResults: (results: FusionSearchResult) => void;
  player: PlayerController | null;
}

export default function TopBar({ setSearchResults, player }: TopBarProps) {
  const navigation = useNavigation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const [platform, setPlatform] = useState<OS | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState('');
  const [localResults, setLocalResults] = useState<TrackEntity[]>([]);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    systemContext.getPlatform().then(setPlatform);
    // 新设置系统：从 Settings 读取 user.userName
    configContext.get('user.userName').then((n: string) => setUserName(n as string));
  }, []);

  // 本地即时搜索（去抖）
  useEffect(() => {
    const t = setTimeout(() => {
      const kw = searchTerm.trim();
      if (kw) getLocalSearchResults(kw).then(setLocalResults);
      else setLocalResults([]);
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // 定位下拉
  useEffect(() => {
    if (!localResults.length) return;
    const update = () => inputRef.current && setDropdownRect(inputRef.current.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [localResults.length]);

  // 点击外部关闭
  useEffect(() => {
    if (!localResults.length) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setLocalResults([]);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [localResults.length]);

  const performNetworkSearch = (term: string, safeMode: boolean = false) => {
    const kw = term.trim();
    if (!kw) return;
    setLocalResults([]);
    navigation.push(ViewType.SEARCH_RESULTS);
    getSearchResults(kw, safeMode).then(setSearchResults);
  };

  const queueTrack = (t: TrackEntity) => {
    if (!player) return;
    player.addTrackToNext(t);
    setSearchTerm('');
    setLocalResults([]);
  };
  const playTrack = (t: TrackEntity) => {
    if (!player) return;
    player.addTrackToNextAndPlay(t);
    setSearchTerm('');
    setLocalResults([]);
  };

  return (
    <>
      <div className={styles.root}>
        {/* 左：返回/前进（含 macOS 交通灯） */}
        {platform === OS.MACOS ? (
          <div className={clsx(styles.left, styles.nodrag)}>
            <div className={styles.traffic}>
              <button className={clsx(styles.light, styles.close)} onClick={() => windowControlContext.close()} />
              <button className={clsx(styles.light, styles.min)} onClick={() => windowControlContext.minimize()} />
              <button className={clsx(styles.light, styles.max)} onClick={() => windowControlContext.maximize()} />
            </div>
            <button
              className={styles.iconBtn}
              title="后退"
              onClick={() => navigation.goBack()}
              disabled={!navigation.canGoBack}
            >
              <i className="fa-solid fa-arrow-left" />
            </button>
            <button
              className={styles.iconBtn}
              title="前进"
              onClick={() => navigation.goForward()}
              disabled={!navigation.canGoForward}
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        ) : (
          <div className={styles.left}>
            <button
              className={styles.iconBtn}
              title="后退"
              onClick={() => navigation.goBack()}
              disabled={!navigation.canGoBack}
            >
              <i className="fa-solid fa-arrow-left" />
            </button>
            <button
              className={styles.iconBtn}
              title="前进"
              onClick={() => navigation.goForward()}
              disabled={!navigation.canGoForward}
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        {/* 中：搜索框 */}
        <div className={styles.center}>
          <div className={clsx(styles.search, (isInputFocused && isShiftPressed) && styles.searchSafeMode)}>
            <i className={clsx('fa-solid fa-magnifying-glass', styles.searchIcon)} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              placeholder={isShiftPressed && isInputFocused ? '安全搜索链上音乐...' : '搜索链上音乐'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performNetworkSearch(searchTerm, e.shiftKey)}
              onFocus={() => {
                setIsInputFocused(true);
                navigation.push(ViewType.SEARCH_RESULTS);
              }}
              onBlur={() => setIsInputFocused(false)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* 右：操作（Premium / 设置 / 调试 / 用户 / 窗口控件） */}
        <div className={clsx(styles.right, styles.nodrag)}>
          {/*用于弹出创作者工作台的按钮*/}
          <CreatorsWorkshopButton />

          {/*齿轮按钮 -> SettingsView */}
          <button
            className={styles.iconBtn}
            title="设置"
            onClick={() => navigation.push(ViewType.SETTINGS)}
          >
            <i className="fa-solid fa-gear" />
          </button>

          <button className={styles.iconBtn} title="调试" onClick={() => navigation.push(ViewType.DEBUG)}>
            <i className="fa-solid fa-bug" />
          </button>

          <div
            className={styles.userBadge}
            title={userName || '无'}
            onClick={() => navigation.push(ViewType.PROFILE)}
          >
            {userName ? userName[0]?.toUpperCase() : '无'}
          </div>

          {platform !== OS.MACOS && (
            <div className={styles.winCtrl}>
              <div className={styles.winBtn} title="最小化"
                   onClick={() => windowControlContext.minimize()}>&#8722;</div>
              <div className={styles.winBtn} title="最大化"
                   onClick={() => windowControlContext.maximize()}>&#9633;</div>
              <div className={styles.winBtn} title="关闭" onClick={() => windowControlContext.close()}>&times;</div>
            </div>
          )}
        </div>
      </div>

      {/* 下拉建议（Portal） */}
      {createPortal(
        <AnimatePresence>
          {localResults.length > 0 && dropdownRect && (
            <motion.ul
              key="dropdown"
              ref={dropdownRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className={styles.dropdown}
              style={{
                top: dropdownRect.bottom + window.scrollY,
                left: dropdownRect.left + window.scrollX,
                width: dropdownRect.width,
              }}
            >
              {localResults.map((track) => (
                <li
                  key={track.id}
                  className={styles.dropdownItem}
                  onClick={() => queueTrack(track)}
                >
                  <img src={track.cover_src} className={styles.dropdownCover} alt="cover" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className={styles.dropdownTitle} title={track.title}>{track.title}</span>
                    {track.artist && <span className={styles.dropdownSub} title={track.artist}>{track.artist}</span>}
                  </div>
                  <button
                    title="播放"
                    className={clsx(styles.iconBtn, styles.playBtn)}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track);
                    }}
                  >
                    <i className="fa-solid fa-play" />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
