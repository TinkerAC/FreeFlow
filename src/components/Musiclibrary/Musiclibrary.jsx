import React from 'react';
import './MusicLibrary.css';

const MusicLibrary = ({ libraryItems }) => {

    // 内部子组件 Item
    const Item = ({ imgSrc, altText, title, details }) => {
        return (
            <div className="item">
                <img src={imgSrc} alt={altText} className="album-cover" />
                <div className="item-info">
                    <p className="item-title">{title}</p>
                    <p className="item-details">{details}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="music-library rounded-lg">
            <div className="header">
                <i className="fas fa-bars icon"></i>
                <h1 className="title">音乐库</h1>
                <div className="actions">
                    <i className="fas fa-plus icon" onClick={() => window.electron.createPlaylist()}></i>
                    <i className="fas fa-arrow-right icon"></i>
                </div>
            </div>
            <div className="filters">
                <button className="filter-button">歌单</button>
                <button className="filter-button">专辑</button>
            </div>
            <div className="search-recent">
                <i className="fas fa-search icon"></i>
                <span className="recent">最近播放 <i className="fas fa-list icon"></i></span>
            </div>

            <div className="library-items">
                {libraryItems.map((item, index) => (
                    <Item
                        key={index}
                        imgSrc={item.imgSrc}
                        altText={item.title} // 使用 title 作为 altText 的默认值
                        title={item.title}
                        details={item.details}
                    />
                ))}
            </div>
        </div>
    );
};

export default MusicLibrary;
