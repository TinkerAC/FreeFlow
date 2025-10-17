
import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import Slider from '../controls/Slider';
import { useSetting } from '@renderer/core/config/SettingsContext';

export default function PlaybackSettingsTab() {
  const volume = useSetting<number>('audio.volume', 0.8);

  return (
    <>
      <SettingsGroup title="播放" desc="默认音量">
        <SettingRow
          label="默认音量"
          sub={`${Math.round(volume.value * 100)}%`}
          control={<Slider value={volume.value} min={0} max={1} step={0.01} onChange={volume.setValue} />}
        />
      </SettingsGroup>
    </>
  );
}
