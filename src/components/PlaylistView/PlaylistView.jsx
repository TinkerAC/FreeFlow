import React, {useState} from "react";
import {formatTime, timeAgo} from "../../utils/timeUtils.js";

const Track = ({
                   track = {},
                   index = 0,
                   onAddTracksToPlayQueue = ([]) => {
                   },
                   playNewTrack = (track) => {
                   }
               }) => {
    const [hovered, setHovered] = useState(false); // Track mouse hover state

    return (
        <tr
            className={`${index === 0 ? 'border-t border-gray-700' : ''} hover:bg-[#2A2A2A]`}
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
                        onClick={() => playNewTrack(track)}
                    ></i>
                ) : (
                    index + 1
                )}
            </td>

            <td className="py-2 flex items-center">
                <img
                    src={track?.cover_src || 'path/to/default-cover.jpg'}
                    alt="Album cover"
                    className="w-10 h-10 mr-4"
                />
                <div>
                    <div>{track?.title || '未知标题'}</div>
                    <div className="text-gray-400">{track?.artist || '未知艺术家'}</div>
                </div>
            </td>

            <td className="py-2">{track?.album || '未知专辑'}</td>

            <td className="py-2">{track?.added_at ? timeAgo(track.added_at) : '未知时间'}</td>

            <td className="py-2">{track?.duration ? formatTime(track.duration) : '未知时长'}</td>
        </tr>
    );
};

export function Playlist({
                             tracks = [],
                             onAddTracksToPlayQueue = () => {
                             },
                             playNewTrack = () => {
                             }
                         }) {
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
                {tracks.length > 0 ? (
                    tracks.map((track, index) => (
                        <Track
                            key={index}
                            track={track}
                            index={index}
                            onAddTracksToPlayQueue={onAddTracksToPlayQueue}
                            playNewTrack={playNewTrack}
                        />
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="text-center py-4">
                            无曲目可显示
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

export function PlaylistView({
                                 playListInfo = {title: '未知歌单', creater: '未知创建者', tracks: []},
                                 onReplacePlayQueue = () => {
                                 },
                                 onAddTracksToPlayQueue = () => {
                                 },
                                 playNewTrack = () => {
                                 }
                             }) {

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
                            {playListInfo?.title || '未知歌单'}
                        </h1>
                        <p className="mt-2">{[playListInfo?.creater || '未知创建者']} • {playListInfo?.tracks?.length || 0}首歌曲</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center mt-6">
                <button
                    className="bg-green-500 p-4 rounded-full text-2xl mr-4"
                    onClick={() => onReplacePlayQueue(playListInfo?.tracks || [])}
                >
                    <i className="fas fa-play"></i>
                </button>
                <button className="text-2xl mr-4">
                    <i className="fas fa-random"></i>
                </button>
                <button className="text-2xl">
                    <i className="fas fa-download"></i>
                </button>
            </div>
            <Playlist
                tracks={playListInfo?.tracks || []}
                onAddTracksToPlayQueue={onAddTracksToPlayQueue}
                playNewTrack={playNewTrack}
            />
        </div>
    );
}
