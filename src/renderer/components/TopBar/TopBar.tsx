import React, { useEffect, useState } from 'react';
import './TopBar.css';
import { FusionSearchResult } from '@src/shared/types';
import { configContext, platformContext, searchContext, windowControlContext } from '@main/app/electronContextApi';


async function getSearchResults(searchTerm: string) {
  const results: FusionSearchResult = await searchContext.getSearchResults(searchTerm);
  console.log('前端收到的搜索结果:', results);
  return results;
}


interface TopBarProps {
  className?: string;
  onSwitchView: (view: string) => void;
  currentView: string;
  setSearchResults: (results: FusionSearchResult) => void;
}


export default function TopBar({
                                 onSwitchView,
                                 currentView,
                                 setSearchResults,
                               }: TopBarProps) {

  const [platform, setPlatform] = useState<string | null>(null); // 状态来存储平台信息
  // 状态来存储搜索输入
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState(''); // 用户名

  useEffect(() => {
    // 获取平台信息
    platformContext.getPlatform().then((platform: string) => {
      setPlatform(platform);
    });
  }, []);


  // 防抖动搜索方法
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchTerm) {
        performSearch(searchTerm); // 调用搜索方法
      }
    }, 500); // 设置防抖动时间为 300 毫秒

    // 清除超时以避免多余的搜索调用
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]); // 当 searchTerm 变化时触发

  useEffect(() => {
    // 获取用户名
    configContext.getConfig('user_name').then((name: string) => {
      setUserName(name);
    });
  }, []);


  // 占位符搜索方法
  const performSearch = (term: string) => {
    if (currentView !== 'searchResults') {
      onSwitchView('searchResults');
    }//如果当前视图不是搜索结果，则切换到搜索结果视图

    getSearchResults(term).then((results) => {
      setSearchResults(results);
    });
  };

  // 输入框变化处理函数
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className={`top-bar sticky top-0  w-full`}>

      {platform === 'darwin' && (
        <div id="traffic-lights">
          <button className="traffic-light close"
                  onClick={() => windowControlContext.close()}
          ></button>
          <button className="traffic-light minimize"
                  onClick={() => windowControlContext.minimize()}
          ></button>
          <button className="traffic-light maximize"
                  onClick={() => windowControlContext.maximize()}
          ></button>
        </div>)}


      <div className="left-icons">
        <div className="icon">...</div>
        <div className="icon">{'<'}</div>
        <div className="icon">{'>'}</div>
      </div>
      <div className="search-bar">
        <div className="home-icon icon">
          <i className="fa fa-home"></i>
        </div>
        <input
          type="text"
          placeholder="想播放什么？"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => onSwitchView('searchResults')}
        />
      </div>
      <div className="right-icons">
        <button className="premium-btn">探索 Premium</button>
        <div className="icon">
          <i className="fa fa-bell"></i>
        </div>
        <div className="icon">
          <i className="fa fa-users"></i>
        </div>
        <div className="user-icon"
             onClick={
               () => {
                 if (currentView !== 'profile') {
                   onSwitchView('profile');
                 }
               }
             }
        >
                    <span className="whitespace-nowrap overflow-hidden"
                    >{
                      userName || '无'
                    }</span>
        </div>
        {/*show if the platformContext is not macOS*/}
        {platform !== 'darwin' && (
          <div className="window-controls">
            <span onClick={() => windowControlContext.minimize()}>&#8722;</span>
            <span onClick={() => windowControlContext.maximize()}>&#9633;</span>
            <span onClick={() => windowControlContext.close()}>&times;</span>
          </div>)}


      </div>
    </div>
  );
}

