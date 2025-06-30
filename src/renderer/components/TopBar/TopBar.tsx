import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './TopBar.css';
import {
  configContext,
  searchContext,
  systemContext,
  windowControlContext,
} from '@renderer/core/electronContextApi';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import { debug } from '@components/static';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { OS } from '@main/core/enum/Platform';
import PlayerController from '@renderer/core/controller/PlayerController';

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
  /* refs */
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  /* state */
  const [platform, setPlatform] = useState<OS | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState('');
  const [localResults, setLocalResults] = useState<TrackEntity[]>([]);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  /* init */
  useEffect(() => {
    systemContext.getPlatform().then(setPlatform);
    configContext.getConfig('user_name').then((n: string) => setUserName(n));
  }, []);

  /* debounce local search */
  useEffect(() => {
    const t = setTimeout(() => {
      const kw = searchTerm.trim();
      if (kw) getLocalSearchResults(kw).then(setLocalResults);
      else setLocalResults([]);
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /* track rect */
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

  /* hide on outside click */
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

  /* network search */
  const performNetworkSearch = (term: string) => {
    const kw = term.trim();
    if (!kw) return;
    setLocalResults([]); // 收起
    if (mainContentViewStack.currentView !== View.SEARCH_RESULTS) {
      mainContentViewStack.navigate(View.SEARCH_RESULTS);
    }
    getSearchResults(kw).then(setSearchResults);
  };

  /* queue / play handlers */
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
      {/* Top bar */}
      <div className="top-bar sticky top-0 w-full z-50 bg-neutral-900/95 backdrop-blur-md text-gray-100">
        {platform === OS.MACOS && (
          <div id="traffic-lights">
            <button className="traffic-light close" onClick={windowControlContext.close} />
            <button className="traffic-light minimize" onClick={windowControlContext.minimize} />
            <button className="traffic-light maximize" onClick={windowControlContext.maximize} />
          </div>
        )}
        <div className="left-icons flex">
          <i className="fa-solid fa-arrow-left m-2 cursor-pointer" onClick={mainContentViewStack.goBack} />
          <i className="fa-solid fa-arrow-right m-2 cursor-pointer" onClick={mainContentViewStack.goForward} />
        </div>
        <div className="search-bar relative">
          <div className="home-icon icon text-gray-300">
            <i className="fa fa-home" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="想播放什么？"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performNetworkSearch(searchTerm)}
            onFocus={() => mainContentViewStack.currentView !== View.SEARCH_RESULTS && mainContentViewStack.navigate(View.SEARCH_RESULTS)}
            className="placeholder-gray-400 bg-neutral-800/60 focus:bg-neutral-700/60 transition-colors px-2 py-1 rounded text-gray-100 focus:outline-none w-64"
          />
        </div>
        <div className="right-icons text-gray-200">
          <button className="premium-btn" onClick={windowControlContext.openPreferenceWindow}>探索 Premium</button>
          <div className="icon"><i className="fa fa-bell" /></div>
          <div className="icon"><img src={debug} alt="Debug" sizes="24px" onClick={() => mainContentViewStack.navigate(View.DEBUG)} /></div>
          <div className="user-icon" onClick={() => mainContentViewStack.currentView !== View.PROFILE && mainContentViewStack.navigate(View.PROFILE)}>
            <span className="whitespace-nowrap overflow-hidden">{userName || '无'}</span>
          </div>
          {platform !== OS.MACOS && (
            <div className="window-controls">
              <span onClick={windowControlContext.minimize}>&#8722;</span>
              <span onClick={windowControlContext.maximize}>&#9633;</span>
              <span onClick={windowControlContext.close}>&times;</span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown */}
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
              className="fixed bg-neutral-900 text-gray-100 rounded shadow-lg max-h-72 overflow-y-auto border border-neutral-700/80 backdrop-blur-md no-scrollbar"
              style={{ top: dropdownRect.bottom + window.scrollY, left: dropdownRect.left + window.scrollX, width: dropdownRect.width, zIndex: 9999 }}
            >
              {localResults.map((track) => (
                <li key={track.id} className="px-3 py-1.5 hover:bg-neutral-800/80 flex items-center gap-3 cursor-pointer select-none" onClick={() => queueTrack(track)}>
                  <img src={track.cover_src} className="w-10 h-10 object-cover rounded" alt="cover" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-sm font-medium">{track.title}</span>
                    {track.artist && <span className="truncate block text-xs text-gray-400">{track.artist}</span>}
                  </div>
                  <button title="播放" className="text-gray-300 hover:text-primary transition-colors p-1" onClick={(e) => { e.stopPropagation(); playTrack(track); }}>
                    <i className="fa-solid fa-play text-xs" />
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