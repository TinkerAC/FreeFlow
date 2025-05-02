import React, { useEffect, useState } from 'react';
import Player from '@components/Player';
import { MainContentViewStack } from '@components/Maincontent/MainContentViewStack';

interface DebugViewProps {
  player: Player;
  mainContentStack: MainContentViewStack;
}

/**
 * 调试视图：实时监听 `player` 与 `mainContentStack` 的变动并渲染快照。
 *
 * - 组件会尝试订阅 `change` 事件（或自定义事件），若未实现事件总线则会在 props 引用改变时更新。
 * - 为避免直接引用导致的 UI 不刷新的问题，这里使用浅拷贝生成快照，确保 React 能检测到 state 变化。
 */
const DebugView: React.FC<DebugViewProps> = ({ player, mainContentStack }) => {
  // 快照 state，保持 UI 与数据同步
  const [playerSnapshot, setPlayerSnapshot] = useState(() => ({ ...player }));
  const [stackSnapshot, setStackSnapshot] = useState(() => ({ ...mainContentStack }));

  /* 监听 Player 变化 */
  useEffect(() => {
    const handlePlayerChange = () => setPlayerSnapshot({ ...player });

    // 优先使用事件驱动（假设 Player 继承自 EventEmitter / mitt 等）
    if (typeof (player as any).on === 'function') {
      (player as any).on('change', handlePlayerChange);
      return () => (player as any).off('change', handlePlayerChange);
    }

    // Fallback：props 引用若变化，仍同步一次
    setPlayerSnapshot({ ...player });
  }, [player]);

  /* 监听 MainContentViewStack 变化 */
  useEffect(() => {
    const handleStackChange = () => setStackSnapshot({ ...mainContentStack });

    if (typeof (mainContentStack as any).on === 'function') {
      (mainContentStack as any).on('change', handleStackChange);
      return () => (mainContentStack as any).off('change', handleStackChange);
    }

    setStackSnapshot({ ...mainContentStack });
  }, [mainContentStack]);

  return (
    <div className="w-full h-full flex flex-col gap-6 items-center justify-start p-6">
      {/* Player 信息 */}
      <div className="w-full md:w-1/2 bg-gray-100 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Player Debug Info</h2>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(playerSnapshot, null, 2)}
        </pre>
      </div>

      {/* Stack 信息 */}
      <div className="w-full md:w-1/2 bg-gray-100 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Main Content Stack Debug Info</h2>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(stackSnapshot, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DebugView;
