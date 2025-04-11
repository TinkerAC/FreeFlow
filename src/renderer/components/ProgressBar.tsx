import React from 'react';
import { formatTime } from '@src/utils/timeUtils';

interface ProgressBarProps {
  value: number;                    // 当前进度秒数
  min: number;                      // 最小值（一般为0）
  max: number;                      // 最大值（歌曲时长）
  onChange: (newValue: number) => void;  // 当进度条变化时的回调
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, min, max, onChange }) => {
  // 计算进度百分比
  const progressPercentage = ((value - min) / (max - min)) * 100;

  // 处理 input range 的变化，调用传入的 onChange 回调更新进度
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  return (
    <div className="flex items-center w-full">
      {/* 当前进度时间 */}
      <span className="text-sm mx-2">{formatTime(value)}</span>
      {/* 自定义进度条容器 */}
      <div className="relative flex-grow h-2 bg-gray-800 rounded cursor-pointer">
        {/* 已播放部分 */}
        <div
          className="absolute h-full bg-blue-500 rounded"
          style={{ width: `${progressPercentage}%` }}
        />
        {/* 使用透明的 input range 捕获用户交互 */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step="1"
          onChange={handleChange}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      {/* 总时长 */}
      <span className="text-sm mx-2">{formatTime(max)}</span>
    </div>
  );
};

export default ProgressBar;