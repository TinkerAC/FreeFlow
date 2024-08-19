import React, {useEffect, useState} from "react";
import {formatTime, timeAgo} from "../../utils/timeUtils.js";

const Track = ({track, index, onAddTracksToPlayQueue, playNewTrack}) => {
    const [metadata, setMetadata] = useState(null);
    const [hovered, setHovered] = useState(false); // 记录鼠标是否悬停在歌曲的编号上

    useEffect(() => {
        const fetchMetadata = async () => {
            const data = await window.playerAPI.getMusicMetaInfo(track.file_path);
            setMetadata(data);
        };

        fetchMetadata();
    }, [track.file_path]);

    if (!metadata) {
        return null; // 或者显示一个加载指示器
    }

    return (
        <tr
            className={`${index === 0 ? 'border-t border-gray-700' : ''} 
            hover:bg-[#2A2A2A]

            
            `}

            key={index}
            onDoubleClick={() => onAddTracksToPlayQueue([track])}

        >
            <td
                className="py-2 cursor-pointer"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {hovered ? (
                    <i
                        className="fas fa-play"
                        onClick={() => playNewTrack([track])} // 使用箭头函数包装，确保只在点击时触发
                    ></i>
                ) : (
                    index + 1
                )}
            </td>

            <td className="py-2 flex items-center">
                <img
                    src={metadata.common.base64Cover}
                    alt="Album cover"
                    className="w-10 h-10 mr-4"
                />
                <div>
                    <div>{metadata.common.title}</div>
                    <div className="text-gray-400">{metadata.common.artist}</div>
                </div>
            </td>

            <td className="py-2">{metadata.common.album}</td>

            <td className="py-2">{timeAgo(track.added_at)}</td>

            <td className="py-2">{formatTime(metadata.format.duration)}</td>
        </tr>
    );
};

export default Track;


export const Playlist = ({tracks, onAddTracksToPlayQueue, playNewTrack}) => {

    const [selectedTrack, setSelectedTrack] = useState(null);

    return (
        <div className="mt-6">
            <table className="w-full text-left">
                <thead>
                <tr className="border-b border-gray-700">
                    <th className="py-2">#</th>
                    <th className="py-2">标题</th>
                    <th className="py-2">专辑</th>
                    <th className="py-2">添加日期</th>
                    <th className="py-2">
                        <i className="fas fa-clock"></i>
                    </th>
                </tr>
                </thead>
                <tbody>
                {tracks.map((track, index) => (
                    <Track key={index}
                           track={track}
                           index={index}
                           onAddTracksToPlayQueue={onAddTracksToPlayQueue}
                           playNewTrack={playNewTrack}

                    />
                ))}
                </tbody>
            </table>
        </div>
    );
};

export const PlaylistView = ({tracks, onReplacePlayQueue, onAddTracksToPlayQueue, playNewTrack}) => {
    return (
        <div className="p-4 overflow-y-auto">
            <div className="bg-gradient-to-b from-purple-700 to-purple-900 p-8 rounded-lg">
                <div className="flex items-center">
                    <img
                        src="https://placehold.co/200x200"
                        alt="Playlist cover"
                        className="w-48 h-48 rounded-lg"
                    />
                    <div className="ml-6">
                        <h2 className="text-lg">歌单</h2>
                        <h1 className="sm:text-lg lg:text-6xl font-bold mt-2">
                            已点赞的歌曲
                        </h1>
                        <p className="mt-2">杨珠 • 121 首歌曲</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center mt-6">
                <button className="bg-green-500 p-4 rounded-full text-2xl mr-4"
                        onClick={() => onReplacePlayQueue(tracks)}>
                    <i className="fas fa-play"></i>
                </button>
                <button className="text-2xl mr-4">
                    <i className="fas fa-random"></i>
                </button>
                <button className="text-2xl">
                    <i className="fas fa-download"></i>
                </button>
            </div>
            <Playlist tracks={tracks}
                      onAddTracksToPlayQueue={onAddTracksToPlayQueue}
                      playNewTrack={playNewTrack}
            />
        </div>
    );
};
