//
// ------------------------------
// File: src/renderer/components/SearchResultView/TabNav.tsx
// ------------------------------
import React from 'react';

export type TabKey = 'popular' | 'tracks' | 'playlists';

interface TabNavProps {
  activeTab: TabKey;
  onTabChange: (key: TabKey) => void;
}

const labels: Record<TabKey, string> = {
  popular: '热门',
  tracks: '歌曲',
  playlists: '歌单',
};

function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="flex space-x-4 border-b pb-2">
      {Object.entries(labels).map(([key, label]) => {
        const k = key as TabKey;
        const isActive = k === activeTab;
        return (
          <button
            key={k}
            onClick={() => onTabChange(k)}
            className={`px-3 py-1 text-lg transition-colors ${isActive ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-blue-400'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default TabNav;