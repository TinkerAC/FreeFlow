import React from 'react';
import './HeadBar.css';  // 引入组件样式

function HeadBar() {
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
                <input type="text" placeholder="想播放什么？"/>
            </div>
            <div className="right-icons">
                <button className="premium-btn">探索 Premium</button>
                <div className="icon"><i className="fa fa-bell"></i></div>
                <div className="icon"><i className="fa fa-users"></i></div>
                <div className="user-icon">
                    <span>杨</span>
                </div>
                <div className="window-controls">
                    <span onClick={() => window.electron.minimize()}>&#8722;</span>
                    <span onClick={() => window.electron.maximize()}>&#9633;</span>
                    <span onClick={() => window.electron.close()}>&times;</span>
                </div>
            </div>
        </div>
    );
}

export default HeadBar;
