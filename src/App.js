import React, {useEffect, useState} from 'react';
import HeadBar from './components/Headbar/Headbar.js';
import PlayerBar from './components/Playerbar/Playerbar.js';
import Musiclibrary from './components/Musiclibrary/Musiclibrary.jsx';
import './App.css';
import Maincontent from "./components/Maincontent/Maincontent.jsx";
import {Player} from "./services/playerService.js";


function App() {
    const [playlists, setPlaylists] = useState([]);
    const [playerState, setPlayerState] = useState(new Player().toJSON());


    useEffect(() => {
        const fetchPlaylists = async () => {
            const playlistsData = await window.electron.getPlaylists();
            setPlaylists(playlistsData);
        };
        fetchPlaylists().then(r => console.log("Playlists fetched"));
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
