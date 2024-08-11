import React from 'react';
import './PlayerBar.css';  // 引入组件样式
import '@fortawesome/fontawesome-free/css/all.min.css';

function PlayerBar() {
    return (
        <div className="player-bar">
            <div className="left-section">
                <img src="https://placehold.co/50x50" alt="Album cover art" className="album-cover"/>
                <div className="song-info">
                    <div className="song-title">Theme of Mitsuha</div>
                    <div className="song-artist">RADWIMPS</div>
                </div>
                <i className="fas fa-check-circle icon-check"></i>
            </div>
            <div className="middle-section">
                <div>
                    <div className="playback-controls">
                        <i className="fas fa-random icon-green"></i>
                        <i className="fas fa-step-backward"></i>
                        <i className="fas fa-play-circle icon-play"></i>
                        <i className="fas fa-step-forward"></i>
                        <i className="fas fa-comment-dots"></i>
                    </div>
                    <div className="progress-bar">
                        <span className="current-time">0:01</span>
                        <input type="range" className="progress-slider"/>
                        <span className="total-time">4:06</span>
                    </div>
                </div>

            </div>
            <div className="right-section">
                <i className="fas fa-list"></i>
                <i className="fas fa-search"></i>
                <i className="fas fa-bars"></i>
                <i className="fas fa-expand"></i>
                <input type="range" className="volume-slider"/>
                <i className="fas fa-expand-arrows-alt"></i>
            </div>
        </div>
    );
}

export default PlayerBar;
