// file: src/renderer/components/TopBar/TopBar.tsx
import React, { useEffect, useState } from 'react';
import './TopBar.css';
import { configContext, searchContext, systemContext, windowControlContext } from '@main/app/electronContextApi';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import { debug } from '@components/static';
import { FusionSearchResult } from '@src/shared/domainModel/fusionSearchResult';

async function getSearchResults(searchTerm: string) {
  const results: FusionSearchResult = await searchContext.getSearchResults(searchTerm);
  console.log('前端收到的搜索结果:', results);
  return results;
}

interface TopBarProps {
  className?: string;
  setSearchResults: (results: FusionSearchResult) => void;
  mainContentViewStack: MainContentViewStack;
}

export default function TopBar({
                                 setSearchResults,
                                 mainContentViewStack,
                               }: TopBarProps) {
  // 平台信息
  const [platform, setPlatform] = useState<string | null>(null);
  // 搜索输入
  const [searchTerm, setSearchTerm] = useState('');
  // 用户名
  const [userName, setUserName] = useState('');


  // 获取平台
  useEffect(() => {
    systemContext.getPlatform().then((pf) => setPlatform(pf));
  }, []);

  // 获取用户名
  useEffect(() => {
    configContext.getConfig('user_name').then((name: string) => {
      setUserName(name);
    });
  }, []);

  // 防抖搜索
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchTerm) {
        performSearch(searchTerm);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // 执行搜索：先切到 searchResults，再拉取数据
  const performSearch = (term: string) => {
    if (mainContentViewStack.currentView !== View.SEARCH_RESULTS) {
      mainContentViewStack.navigate(View.SEARCH_RESULTS);
    }
    getSearchResults(term).then((res) => setSearchResults(res));
  };

  return (
    <div className={`top-bar sticky top-0 w-full`}>
      {/* macOS 红绿灯 */}
      {platform === 'darwin' && (
        <div id="traffic-lights">
          <button className="traffic-light close" onClick={() => windowControlContext.close()} />
          <button className="traffic-light minimize" onClick={() => windowControlContext.minimize()} />
          <button className="traffic-light maximize" onClick={() => windowControlContext.maximize()} />
        </div>
      )}

      <div className="left-icons flex">
        <i
          className="fa-solid fa-arrow-left m-2 cursor-pointer"
          onClick={() => mainContentViewStack.goBack()}
        ></i>
        <i
          className="fa-solid fa-arrow-right m-2 cursor-pointer"
          onClick={() => mainContentViewStack.goForward()}
        ></i>
      </div>

      <div className="search-bar">
        <div className="home-icon icon">
          <i className="fa fa-home"></i>
        </div>
        <input
          type="text"
          placeholder="想播放什么？"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => mainContentViewStack.navigate(View.SEARCH_RESULTS)}
        />
      </div>

      <div className="right-icons">
        <button className="premium-btn">探索 Premium</button>
        <div className="icon">
          <i className="fa fa-bell"></i>
        </div>
        <div className="icon">
          <img src={debug} alt={'Debug'} sizes="24px"
               onClick={() => {
                 mainContentViewStack.navigate(View.DEBUG);
               }}
          />
        </div>
        <div
          className="user-icon"
          onClick={() => {
            if (mainContentViewStack.currentView !== View.PROFILE) {
              mainContentViewStack.navigate(View.PROFILE);
            }
          }}
        >
          <span className="whitespace-nowrap overflow-hidden">
            {userName || '无'}
          </span>
        </div>

        {/* 非 macOS 窗口控制 */}
        {platform !== 'darwin' && (
          <div className="window-controls">
            <span onClick={() => windowControlContext.minimize()}>&#8722;</span>
            <span onClick={() => windowControlContext.maximize()}>&#9633;</span>
            <span onClick={() => windowControlContext.close()}>&times;</span>
          </div>
        )}
      </div>
    </div>
  );
}