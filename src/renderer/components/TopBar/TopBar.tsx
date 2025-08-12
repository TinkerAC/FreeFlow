// file: src/renderer/components/TopBar/TopBar.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './TopBar.module.css';
import { configContext, searchContext, systemContext, windowControlContext } from '@renderer/core/electronContextApi';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import { debug } from '@components/static';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { OS } from '@main/core/enum/Platform';
import PlayerController from '@renderer/core/controller/PlayerController';
import clsx from 'clsx';
import { applyMaterialYou } from '@renderer/theme/MaterialYou';

async function getSearchResults(searchTerm: string) {
  return searchContext.getSearchResults(searchTerm);
}

async function getLocalSearchResults(searchTerm: string) {
  return searchContext.localSearch(searchTerm);
}

interface TopBarProps {
  setSearchResults: (results: FusionSearchResult) => void;
  mainContentViewStack: MainContentViewStack;
  player: PlayerController;
}

export default function TopBar({ setSearchResults, mainContentViewStack, player }: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const [platform, setPlatform] = useState<OS | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState('');
  const [localResults, setLocalResults] = useState<TrackEntity[]>([]);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    systemContext.getPlatform().then(setPlatform);
    configContext.getConfig('user_name').then((n: string) => setUserName(n));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const kw = searchTerm.trim();
      if (kw) getLocalSearchResults(kw).then(setLocalResults);
      else setLocalResults([]);
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

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

  const performNetworkSearch = (term: string) => {
    const kw = term.trim();
    if (!kw) return;
    setLocalResults([]);
    if (mainContentViewStack.currentView !== View.SEARCH_RESULTS) {
      mainContentViewStack.navigate(View.SEARCH_RESULTS);
    }
    getSearchResults(kw).then(setSearchResults);
  };

  const queueTrack = (t: TrackEntity) => {
    player.addTrackToNext(t);
    setSearchTerm('');
    setLocalResults([]);
  };
  const playTrack = (t: TrackEntity) => {
    player.addTrackToNextAndPlay(t);
    setSearchTerm('');
    setLocalResults([]);
  };

  return (
    <>
      <div className={styles.root}>
        {/* macOS 交通灯 */}
        {platform === OS.MACOS && (
          <div className={clsx(styles.left, styles.nodrag)}>
            <div className={styles.traffic}>
              <button className={clsx(styles.light, styles.close)} onClick={windowControlContext.close} />
              <button className={clsx(styles.light, styles.min)} onClick={windowControlContext.minimize} />
              <button className={clsx(styles.light, styles.max)} onClick={windowControlContext.maximize} />
            </div>
            <button className={styles.iconBtn} title="后退" onClick={mainContentViewStack.goBack}>
              <i className="fa-solid fa-arrow-left" />
            </button>
            <button className={styles.iconBtn} title="前进" onClick={mainContentViewStack.goForward}>
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        {/* 左侧（Windows / 其他平台） */}
        {platform !== OS.MACOS && (
          <div className={styles.left}>
            <button className={styles.iconBtn} title="后退" onClick={mainContentViewStack.goBack}>
              <i className="fa-solid fa-arrow-left" />
            </button>
            <button className={styles.iconBtn} title="前进" onClick={mainContentViewStack.goForward}>
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        {/* 中间：搜索 */}
        <div className={styles.center}>
          <div className={styles.search}>
            <i className={`fa fa-home ${styles.nodrag}`} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              placeholder="想播放什么？"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performNetworkSearch(searchTerm)}
              onFocus={() => mainContentViewStack.currentView !== View.SEARCH_RESULTS && mainContentViewStack.navigate(View.SEARCH_RESULTS)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* 右侧：操作区 */}
        <div className={clsx(styles.right, styles.nodrag)}>
          <button className={styles.primaryBtn} onClick={windowControlContext.openPreferenceWindow}>
            探索 Premium
          </button>

          <input
            type="color"
            onChange={(e) => applyMaterialYou(e.target.value, document.documentElement.getAttribute('data-theme') as any || 'dark')}
          />
          <button className={styles.iconBtn} title="调试"
                  onClick={() => mainContentViewStack.navigate(View.DEBUG)}>
            <img src={debug} alt="Debug" width={16} height={16} />
          </button>

          <div className={styles.userBadge}
               title={userName || '无'}
               onClick={() => mainContentViewStack.currentView !== View.PROFILE && mainContentViewStack.navigate(View.PROFILE)}>
            {userName ? userName[0]?.toUpperCase() : '无'}
          </div>

          {platform !== OS.MACOS && (
            <div className={styles.winCtrl}>
              <div className={styles.winBtn} title="最小化" onClick={windowControlContext.minimize}>&#8722;</div>
              <div className={styles.winBtn} title="最大化" onClick={windowControlContext.maximize}>&#9633;</div>
              <div className={styles.winBtn} title="关闭" onClick={windowControlContext.close}>&times;</div>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown：本地检索建议（Portal） */}
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
                <li key={track.id}
                    className={styles.dropdownItem}
                    onClick={() => queueTrack(track)}>
                  <img src={track.cover_src} className={styles.dropdownCover} alt="cover" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className={styles.dropdownTitle} title={track.title}>{track.title}</span>
                    {track.artist && <span className={styles.dropdownSub} title={track.artist}>{track.artist}</span>}
                  </div>
                  <button title="播放" className={clsx(styles.iconBtn, styles.playBtn)}
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(track);
                          }}>
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
