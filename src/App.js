import React, {useEffect, useState, useRef} from 'react';
import HeadBar from './components/Headbar/Headbar.js';
import PlayerBar from './components/Playerbar/Playerbar.js';
import Musiclibrary from './components/Musiclibrary/Musiclibrary.jsx';
import './App.css';
import Maincontent from "./components/Maincontent/Maincontent.jsx";
import {Player} from "./services/playerService.js";
import RightContent from "./components/RightContent/RightContent.jsx";

function App() {
    const [playlists, setPlaylists] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [audioSrc, setAudioSrc] = useState(''); // 音频文件路径
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [metaInfo, setMetaInfo] = useState({
        common: {
            title: '', artist: '', base64Cover: '',
        },
        format: {
            duration: 0,
        },
    });
    const [playbackMode, setPlaybackMode] = useState('loop');
    const audioRef = useRef(null);
    const playerRef = useRef(null);

    useEffect(() => {
        const fetchPlaylists = async () => {
            const playlistsData = await window.electron.getPlaylists();
            setPlaylists(playlistsData);
        };
        fetchPlaylists().then(r => console.log("Playlists fetched"));
    }, []);

    useEffect(() => {
        const initializePlayer = async () => {
            try {
                const initPlayerState = await window.playerAPI.getPlayerState();
                playerRef.current = new Player(audioRef);
                playerRef.current.fromJSON(initPlayerState);

                const initMetaInfo = await window.playerAPI.getMusicMetaInfo(playerRef.current.getCurrentFilePath());
                setMetaInfo(initMetaInfo);

                setAudioSrc(playerRef.current.getCurrentFilePath());
            } catch (error) {
                console.error("初始化播放器时出错：", error);
            }
        };

        initializePlayer();
    }, []);

    useEffect(() => {
        if (!playerRef.current) return;

        const updateCurrentTime = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        const audio = audioRef.current;
        if (audio && !audio.paused) {
            const interval = setInterval(updateCurrentTime, 1000);
            return () => clearInterval(interval);
        }
    }, [isPlaying]);

    const play = () => {
        audioRef.current.play();
        setIsPlaying(true);
    };

    const pause = () => {
        audioRef.current.pause();
        setIsPlaying(false);
    };

    const playNext = () => {
        const nextFilePath = playerRef.current.nextFilePath();
        if (nextFilePath) {
            setAudioSrc(nextFilePath);
            updateMetaInfo();
            setCurrentTime(0);
            setIsPlaying(false);
            audioRef.current.addEventListener('canplaythrough', () => {
                play();
            }, {once: true});
        }
    };

    const playPrevious = () => {
        const previousFilePath = playerRef.current.previousFilePath();
        if (previousFilePath) {
            setAudioSrc(previousFilePath);
            updateMetaInfo();
            setCurrentTime(0);
            setIsPlaying(false);
            audioRef.current.addEventListener('canplaythrough', () => {
                play();
            }, {once: true});
        }

    };

    const togglePlayPause = () => {
        if (audioRef.current.paused) {
            play();
        } else {
            pause();
        }
    };

    const updateMetaInfo = async () => {
        if (!playerRef.current) return;
        const metaInfo = await window.playerAPI.getMusicMetaInfo(playerRef.current.getCurrentFilePath());
        setMetaInfo(metaInfo);
    };

    const cyclePlaybackMode = () => {
        if (!playerRef.current) return;
        const modes = ['loop', 'repeat', 'shuffle'];
        const nextMode = modes[(modes.indexOf(playbackMode) + 1) % modes.length];
        setPlaybackMode(nextMode);
        playerRef.current.switchPlayMode(nextMode);
        console.log(`切换播放模式为: ${nextMode}`);

    };

    const addTracksToPlayQueue = (tracks) => {
        if (!playerRef.current) return;
        playerRef.current.addTracksToPlayQueue(tracks);
    }

    const replacePlayQueue = (tracks) => {
        if (!playerRef.current) return;
        playerRef.current.replacePlayQueue(tracks);
        console.log("tracks", tracks);
    }
    const playNewTrack = (track) => {
        if (!playerRef.current) return;
        playerRef.current.addTrackToNext(track);
        playNext();
    }//直接播放新的歌曲
    return (
        <div className="App h-full flex flex-col bg-black">
            <HeadBar className="sticky top-0 z-1000 w-full"/>
            <div className="grid grid-cols-[300px_auto_360px] gap-2 h-full w-full overflow-y-hidden">
                <Musiclibrary
                    className="h-full"
                    libraryItems={playlists}
                    selectedItem={selectedItem}
                    onSelectItem={setSelectedItem}
                />
                <Maincontent
                    className="h-full"
                    tracks={playlists[selectedItem] ? playlists[selectedItem].tracks : []}
                    onReplacePlayQueue={replacePlayQueue}
                    onAddTracksToPlayQueue={addTracksToPlayQueue}
                    playNewTrack={playNewTrack}
                />
                <RightContent
                    className="h-full"
                    playerRef={playerRef}

                />
            </div>
            <PlayerBar
                className="sticky bottom-0 z-1000 w-full"
                audioRef={audioRef}
                audioSrc={audioSrc}
                isPlaying={isPlaying}
                currentTime={currentTime}
                metaInfo={metaInfo}
                playbackMode={playbackMode}
                onPlayNext={playNext}
                onPlayPrevious={playPrevious}
                onTogglePlayPause={togglePlayPause}
                onCyclePlaybackMode={cyclePlaybackMode}
                setCurrentTime={setCurrentTime}
                setIsPlaying={setIsPlaying}
            />
        </div>
    )
}

export default App;
