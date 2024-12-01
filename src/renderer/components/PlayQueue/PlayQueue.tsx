import React from 'react';


interface PlayQueueProps {
  currentTrack: any;
  nextTracks: any[];
  clearQueue: () => void;
}

export default function PlayQueue({ currentTrack = {}, nextTracks = [], clearQueue }: PlayQueueProps) {

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          <span className="active-tab">队列</span>
          <span>最近播放</span>
        </div>
        <i className="fas fa-times text-gray-400 cursor-pointer"
           title={'清空队列'}
           onClick={() => clearQueue()}
        ></i>
      </div>

      {/* 当前播放曲目 */}
      <div className="mb-4">
        <h2 className="text-lg mb-2">当前播放</h2>

        {(currentTrack && !currentTrack.isEmpty) ?
          (<div className="flex items-center space-x-4">
            <img
              src={currentTrack.cover_src || '../assets/default-cover.png'}
              alt={`Album cover of ${currentTrack.title || 'unknown'}`}
              className="w-12 h-12"
            />
            <div>
              <div className="current-song">{currentTrack?.title || 'unknown title'}</div>
              <div>{currentTrack.artist || 'unknown artist'}</div>
            </div>

          </div>) : (
            <div className="text-gray-400">暂无播放曲目</div>)
        }
      </div>

      {/* 下一首曲目列表 */}
      <div>
        <h2 className="text-lg mb-2">下一首歌来自：已点赞的歌曲</h2>
        <div className="space-y-4">
          {nextTracks.map((track, index) => (
            <div key={index} className="flex items-center space-x-4">
              <img
                src={track.cover_src || '../assets/default-cover.png'}
                alt={`Album cover of ${track?.title || 'unknown'}`}
                className="w-12 h-12"
              />
              <div>
                <div>{track?.title || 'unknown title'}</div>
                <div>{track?.artist || 'unknown artist'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
