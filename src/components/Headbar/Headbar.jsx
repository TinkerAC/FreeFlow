import React, {useEffect, useState} from 'react';
import './HeadBar.css'; // 引入组件样式

async function getSearchResults(searchTerm) {
    const results = await window.networkAPI.getSearchResults(searchTerm);
    console.log('前端收到的搜索结果:', results);
    return results;
}

export default function Headbar({
                                    onSwitchView,
                                    currentView,
                                    setSearchResults
                                }) {

    // 状态来存储搜索输入
    const [searchTerm, setSearchTerm] = useState('');

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


    // 占位符搜索方法
    const performSearch = (term) => {
        if (currentView !== 'searchResults') {
            onSwitchView('searchResults');
        }//如果当前视图不是搜索结果，则切换到搜索结果视图

        getSearchResults(term).then((results) => {
            setSearchResults(results);
        });
    };

    // 输入框变化处理函数
    const handleInputChange = (event) => {
        setSearchTerm(event.target.value);
    };

    return (
        <div className="headbar">
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
                <div className="user-icon">
                    <span>杨</span>
                </div>
                <div className="window-controls">
                    <span onClick={() => window.electronAPI.minimize()}>&#8722;</span>
                    <span onClick={() => window.electronAPI.maximize()}>&#9633;</span>
                    <span onClick={() => window.electronAPI.close()}>&times;</span>
                </div>
            </div>
        </div>
    );
}
