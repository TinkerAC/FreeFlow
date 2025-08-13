import { registerFamily } from './SkinSystem';

// —— 进度条家族 —— //
import { ClassicBar } from '@components/Playerbar/ProgressBar/skins/Classic/ClassicBar';
import { NeonBar }    from '@components/Playerbar/ProgressBar/skins/Neon/NeonBar';
import { WaveformBar }from '@components/Playerbar/ProgressBar/skins/Waveform/WaveformBar';
import { Knob }       from '@components/Playerbar/ProgressBar/skins/Knob/Knob';

registerFamily('progress', {
  classic: ClassicBar,
  neon: NeonBar,
  waveform: WaveformBar,
  knob: Knob,
});

// 以后你要扩展其它家族，照着加：
// registerFamily('button', { filled: FilledButton, ghost: GhostButton });