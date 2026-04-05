import React from 'react';

export default function Slider({
                                 value, min = 0, max = 100, step = 1, onChange, width = 240,
                               }: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  width?: number
}) {
  return (
    <input
      type="range"
      min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width }}
      className="settings-slider"
    />
  );
}