import React, {useState} from "react";
import PropTypes from "prop-types";
import {formatTime, timeAgo} from "../../utils/timeUtils.js";

const Track = ({
                   track = {},
                   index = 0,
                   addToNext = (track) => {
                   },
                   addToNextAndPlay = (track) => {
                   },
               }) => {
    const [hovered, setHovered] = useState(false);

    const handlePlayClick = (e) => {
        e.stopPropagation();
        addToNextAndPlay(track);
    };

    return (
        <tr
            className={`${
                index === 0 ? "border-t border-gray-700" : ""
            } hover:bg-[#2A2A2A]`}
            onDoubleClick={() => addToNext(track)}
        >
            <td
                className="py-2 cursor-pointer text-center"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {hovered ? (
                    <i
                        className="fas fa-play cursor-pointer"
                        onClick={handlePlayClick}
                        aria-label="播放"
                    ></i>
                ) : (
                    index + 1
                )}
            </td>

            <td className="py-2 flex items-center overflow-hidden">
                <img
                    src={track?.cover_src || "./assets/default-cover.png"}
                    alt="Album cover"
                    className="w-10 h-10 mr-4 object-cover rounded flex-shrink-0"
                    loading="lazy"
                />
                <div className="overflow-hidden">
                    <div className="font-semibold hover:underline overflow-hidden text-ellipsis whitespace-nowrap">
                        {track?.title || "未知标题"}
                    </div>
                    <div className="text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                        {track?.artist || "未知艺术家"}
                    </div>
                </div>
            </td>

            {/* 专辑列 */}
            <td className="py-2 overflow-hidden text-ellipsis whitespace-nowrap hidden md:table-cell">
                {track?.album || "未知专辑"}
            </td>

            {/* 添加日期列 */}
            <td className="py-2 overflow-hidden text-ellipsis whitespace-nowrap hidden lg:table-cell">
                {track?.created_at ? timeAgo(track.created_at) : "未知时间"}
            </td>

            <td className="py-2 whitespace-nowrap text-right">
                {track?.duration ? formatTime(track.duration) : "未知时长"}
            </td>
        </tr>
    );
};

Track.propTypes = {
    track: PropTypes.shape({
        track_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        title: PropTypes.string,
        artist: PropTypes.string,
        album: PropTypes.string,
        cover_src: PropTypes.string,
        created_at: PropTypes.string,
        duration: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    index: PropTypes.number,
    addToNext: PropTypes.func,
    addToNextAndPlay: PropTypes.func,
};

export default Track;
