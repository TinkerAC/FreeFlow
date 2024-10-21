import React, {useEffect, useState} from "react";
import PropTypes from "prop-types";
import Track from "./Track.jsx";

export function Playlist({
                             filteredTracks = [],
                             addToNext = () => {
                             },
                             addToNextAndPlay = () => {
                             },
                         }) {
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    // 监听滚动事件，显示/隐藏返回顶部按钮
    useEffect(() => {
        const handleScroll = () => {
            console.log("滚动事件");
            if (window.scrollY > 0) {
                setShowScrollToTop(true);
                console.log("显示返回顶部按钮");
            } else {
                setShowScrollToTop(false);
                console.log("隐藏返回顶部按钮");
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // 滚动到页面顶部
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };


    return (
        <div className="mt-6 Playlist">
            <table className="w-full text-left table-fixed">
                <thead>
                <tr className="border-b border-gray-700">
                    <th className="py-2 w-8 text-center">#</th>
                    <th className="py-2 w-1/2">标题</th>
                    <th className="py-2 w-1/4 hidden md:table-cell">专辑</th>
                    <th className="py-2 w-1/6 hidden lg:table-cell">添加日期</th>
                    <th className="py-2 w-12">
                        <i className="fas fa-clock" aria-label="时长"></i>
                    </th>
                </tr>
                </thead>
                <tbody>

                {/* 动态渲染歌曲列表 */}
                {filteredTracks.length ? (
                    filteredTracks.map((track, index) => (
                        <Track
                            key={track.track_id}
                            track={track}
                            index={index}
                            addToNext={addToNext}
                            addToNextAndPlay={addToNextAndPlay}
                        />
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="text-center py-4 text-gray-400">
                            无曲目可显示
                        </td>
                    </tr>
                )}

                {/* 返回顶部按钮 */}

                {showScrollToTop && (
                    <button
                        className="scroll-to-top-button"
                        onClick={scrollToTop}
                        aria-label="返回顶部"
                    >
                        <i className="fas fa-arrow-up"></i>
                    </button>
                )}


                </tbody>
            </table>
        </div>
    );
}

Playlist.propTypes = {
    filteredTracks: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            title: PropTypes.string,
            artist: PropTypes.string,
            album: PropTypes.string,
            cover_src: PropTypes.string,
            created_at: PropTypes.string,
            duration: PropTypes.number,
            description: PropTypes.string,
        })
    ).isRequired,
    addToNext: PropTypes.func,
    addToNextAndPlay: PropTypes.func,
};
