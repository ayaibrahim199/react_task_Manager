let audioContext = null;
let unlocked = false;
const CONFIG_KEY = 'soundConfig';

let soundConfig = (() => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const wave = ['sine','triangle','square','sawtooth'].includes(parsed.wave) ? parsed.wave : 'sine';
    const volume = Number(parsed.volume);
    return { wave, volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.25 };
  } catch {
    return { wave: 'sine', volume: 0.25 };
  }
})();

export function getSoundConfig() {
  return { ...soundConfig };
}

export function setSoundConfig(next) {
  const wave = ['sine','triangle','square','sawtooth'].includes(next?.wave) ? next.wave : soundConfig.wave;
  const vol = Number.isFinite(Number(next?.volume)) ? Math.min(1, Math.max(0, Number(next.volume))) : soundConfig.volume;
  soundConfig = { wave, volume: vol };
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(soundConfig)); } catch {}
  return soundConfig;
}

export function isSoundEnabled() {
  return !!audioContext && unlocked;
}

export async function enableSound() {
  try {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    // Create a very short silent buffer to unlock on iOS/Safari if needed
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

export function playReminderChime() {
  try {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') {
      // Best-effort resume; may be ignored without user gesture on some browsers
      audioContext.resume?.();
    }
    if (!unlocked) {
      // If user never enabled sound explicitly, bail (autoplay policies)
      return false;
    }
    const now = audioContext.currentTime;

    const gain = audioContext.createGain();
    const base = Math.max(0.02, Math.min(1, soundConfig.volume));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(base, now + 0.01);

    const osc = audioContext.createOscillator();
    osc.type = soundConfig.wave;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.18);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.35);

    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    return true;
  } catch {
    return false;
  }
} 