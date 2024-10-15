import React, { useState, useEffect } from "react";
import ColorThief from "colorthief"; // 使用 color-thief 来提取主色调
import { formatTime, timeAgo } from "../../utils/timeUtils.js";
import "./PlaylistView.css";

const Track = ({
    track = {},
    index = 0,
    addToNext = (track) => {},
    addToNextAndPlay = (track) => {},
}) => {
    const [hovered, setHovered] = useState(false); // Track 鼠标悬停状态

    return (
        <tr
            className={`${index === 0 ? "border-t border-gray-700" : ""} hover:bg-[#2A2A2A]`}
            onDoubleClick={() => addToNext(track)}
        >
            <td
                className="py-2 cursor-pointer"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {hovered ? (
                    <i
                        className="fas fa-play"
                        onClick={() => {
                            addToNextAndPlay(track);
                        }}
                    ></i>
                ) : (
                    index + 1
                )}
            </td>

            <td className="py-2 flex items-center">
                <img
                    src={track?.cover_src || "./assets/default-cover.png"}
                    alt="Album cover"
                    className="w-10 h-10 mr-4"
                />
                <div>
                    <div className="whitespace-nowrap">{track?.title || "未知标题"}</div>
                    <div className="text-gray-400 whitespace-nowrap">{track?.artist || "未知艺术家"}</div>
                </div>
            </td>

            <td className="py-2 whitespace-nowrap">{track?.album || "未知专辑"}</td>

            <td className="py-2 whitespace-nowrap">
                {track?.added_at ? timeAgo(track.added_at) : "未知时间"}
            </td>

            <td className="py-2 whitespace-nowrap">
                {track?.duration ? formatTime(track.duration) : "未知时长"}
            </td>
        </tr>
    );
};

export function Playlist({
    tracks = [],
    addToNext = () => {},
    addToNextAndPlay = () => {},
}) {
    return (
        <div className="mt-6 Playlist"> {/* 增加 Playlist 类名 */}
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
                                addToNext={addToNext}
                                addToNextAndPlay={addToNextAndPlay}
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
    playListInfo = { title: "未知歌单", creater: "未知创建者", tracks: [] },
    onReplacePlayQueue = () => {},
    addToNext = () => {},
    addToNextAndPlay = () => {}
}) {
    const coverImage = playListInfo?.tracks?.[0]?.cover_src || "./assets/default-cover.png";
    const [backgroundColor, setBackgroundColor] = useState("#333"); // 默认背景色

    // 提取封面主色调
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = coverImage;

        img.onload = () => {
            const colorThief = new ColorThief();
            try {
                const result = colorThief.getColor(img);
                setBackgroundColor(`rgb(${result[0]}, ${result[1]}, ${result[2]})`);
            } catch (error) {
                console.error("无法提取主色调", error);
            }
        };

        img.onerror = () => {
            console.error("图片加载失败");
        };
    }, [coverImage]);

    return (
        <div
            className="p-4 relative w-full h-full Playlist" // 增加 Playlist 类名
            style={{
                background: `linear-gradient(to bottom, ${backgroundColor}, #000)`,
                overflowY: "scroll"
            }}
        >
            <div className="relative z-10 flex items-center mb-6">
                <img
                    src={coverImage}
                    alt="Playlist cover"
                    className="w-48 h-48 rounded-lg"
                />
                <div className="ml-6">
                    <h2 className="text-lg">歌单</h2>
                    <h1 className="sm:text-lg lg:text-6xl font-bold mt-2">
                        {playListInfo?.title || "未知歌单"}
                    </h1>
                    <p className="mt-2">
                        {playListInfo?.creater || "未知创建者"} •{" "}
                        {playListInfo?.tracks?.length || 0} 首歌曲
                    </p>
                </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center relative z-10 mb-4">
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

            {/* 播放列表 */}
            <Playlist
                tracks={playListInfo?.tracks || []}
                addToNext={addToNext}
                addToNextAndPlay={addToNextAndPlay}
            />
        </div>
    );
}
