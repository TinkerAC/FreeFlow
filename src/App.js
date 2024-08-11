import React, { useEffect, useState } from 'react';
import HeadBar from './components/Headbar/Headbar';
import PlayerBar from './components/Playerbar/Playerbar';
import Musiclibrary from './components/Musiclibrary/Musiclibrary';
import './App.css';
import Maincontent from "./components/Maincontent/Maincontent";  // 确保引入全局样式

function App() {
    const [playlists, setPlaylists] = useState([]);

    useEffect(() => {
        const fetchPlaylists = async () => {
            const playlistsData = await window.electron.getPlaylists();
            setPlaylists(playlistsData);
        };

        fetchPlaylists();
    }, []);

    return (
        <div className="App">
            <HeadBar/>
            <div className="content-wrapper">
                <Musiclibrary className="MusicLibrary" libraryItems={playlists}/>
                <Maincontent className="MainContent"/>
            </div>
            <PlayerBar/>
        </div>
    );
}

export default App;
