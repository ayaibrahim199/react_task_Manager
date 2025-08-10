import React, { useState, useEffect } from 'react';
import { getSoundConfig, setSoundConfig } from '../lib/sound';

export default function SettingsModal({ isOpen, onClose, defaultRemind, onChangeDefaultRemind }) {
  const [wave, setWave] = useState('sine');
  const [volume, setVolume] = useState(0.25);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSoundConfig();
      setWave(cfg.wave);
      setVolume(cfg.volume);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onSave = () => {
    setSoundConfig({ wave, volume });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-card border border-gray-200 w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-gray-700">Default remind (min)</span>
            <input
              type="number"
              min="0"
              value={defaultRemind}
              onChange={(e)=> onChangeDefaultRemind(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full px-3 py-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">Used to pre-fill the reminder for new tasks.</p>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">Chime type</span>
              <select value={wave} onChange={(e)=>setWave(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded">
                <option value="sine">Soft (sine)</option>
                <option value="triangle">Warm (triangle)</option>
                <option value="square">Beep (square)</option>
                <option value="sawtooth">Alert (sawtooth)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Chime volume</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e)=>setVolume(Number(e.target.value))} className="mt-2 w-full" />
              <div className="text-xs text-gray-500">{Math.round(volume * 100)}%</div>
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
} 