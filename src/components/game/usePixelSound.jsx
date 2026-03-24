import { useRef, useState, useCallback, useEffect } from 'react';
import { getSettings, saveSettings } from './useLocalStorage';

let globalCtx = null;
let musicScheduled = false;
let musicStopFlag = false;
let musicLoopTimer = null;
let musicWanted = false;
let unlockListenersAttached = false;
const activeMusicNodes = new Set();
const MUSIC_TEMPO = 92;
const BEAT = 60 / MUSIC_TEMPO;

function getCtx() {
  const legacyWindow = /** @type {Window & { webkitAudioContext?: typeof AudioContext }} */ (window);
  const AudioContextCtor = window.AudioContext || legacyWindow.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('Web Audio is not supported in this browser.');
  }
  if (!globalCtx) globalCtx = new AudioContextCtor();
  if (globalCtx.state === 'suspended') globalCtx.resume();
  return globalCtx;
}

function clearMusicTimer() {
  if (musicLoopTimer) {
    clearTimeout(musicLoopTimer);
    musicLoopTimer = null;
  }
}

function registerMusicNode(osc, gain) {
  const node = { osc, gain };
  activeMusicNodes.add(node);
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch (e) {}
    activeMusicNodes.delete(node);
  };
  return node;
}

function stopMusicImmediately() {
  musicStopFlag = true;
  musicWanted = false;
  musicScheduled = false;
  clearMusicTimer();

  for (const node of Array.from(activeMusicNodes)) {
    try {
      node.gain.disconnect();
    } catch (e) {}
    try {
      node.osc.stop();
    } catch (e) {}
    try {
      node.osc.disconnect();
    } catch (e) {}
    activeMusicNodes.delete(node);
  }
}

function getHasUserActivation() {
  try {
    return Boolean(window.navigator?.userActivation?.hasBeenActive);
  } catch {
    return false;
  }
}

async function tryStartMusic() {
  if (!musicWanted || musicStopFlag || musicScheduled) return;

  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') return;

    musicScheduled = true;
    scheduleMusic(ctx, ctx.currentTime + 0.08, 0.052);
  } catch (e) {}
}

function attachUnlockListeners() {
  if (typeof window === 'undefined' || unlockListenersAttached) return;

  const unlock = () => {
    unlockListenersAttached = false;
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
    void tryStartMusic();
  };

  unlockListenersAttached = true;
  window.addEventListener('pointerdown', unlock, { capture: true, once: true });
  window.addEventListener('keydown', unlock, { capture: true, once: true });
  window.addEventListener('touchstart', unlock, { capture: true, once: true, passive: true });
}

function playTone(freq, duration, type = 'square', vol = 0.12, delay = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
  } catch (e) {}
}

function noteToFreq(noteName) {
  if (!noteName) return null;

  const match = /^([A-G])([#b]?)(-?\d)$/.exec(noteName);
  if (!match) return null;

  const [, letter, accidental, octaveText] = match;
  const semitones = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let semitone = semitones[letter];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;

  const octave = Number(octaveText);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * (2 ** ((midi - 69) / 12));
}

function scheduleNote(ctx, startTime, duration, frequency, {
  type = 'triangle',
  volume = 0.03,
  attack = 0.01,
  sustain = 0.82,
  release = 0.05,
  detune = 0,
} = {}) {
  if (!frequency) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (detune) osc.detune.setValueAtTime(detune, startTime);

  const peakTime = startTime + attack;
  const releaseStart = Math.max(peakTime, startTime + duration * sustain);
  const stopTime = startTime + duration + release;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, peakTime);
  gain.gain.setValueAtTime(volume * 0.9, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  registerMusicNode(osc, gain);
  osc.start(startTime);
  osc.stop(stopTime + 0.01);
}

function scheduleChord(ctx, startTime, duration, notes, options = {}) {
  notes.forEach((noteName, index) => {
    const frequency = noteToFreq(noteName);
    scheduleNote(ctx, startTime, duration, frequency, {
      ...options,
      detune: index === 0 ? -2 : index === notes.length - 1 ? 2 : 0,
    });
  });
}

const SOUNDTRACK_BARS = [
  {
    chord: ['C4', 'E4', 'G4', 'B4'],
    bass: [
      ['C2', 0, 1.5],
      ['G2', 2, 1],
      ['B2', 3.25, 0.5],
    ],
    arp: ['C4', 'E4', 'G4', 'B4', 'G4', 'E4', 'D4', 'E4'],
    lead: ['E5', null, 'G5', 'A5', 'G5', 'E5', 'D5', 'C5'],
  },
  {
    chord: ['A3', 'C4', 'E4', 'G4'],
    bass: [
      ['A2', 0, 1.5],
      ['E2', 2, 1],
      ['G2', 3.25, 0.5],
    ],
    arp: ['A3', 'C4', 'E4', 'G4', 'E4', 'C4', 'B3', 'C4'],
    lead: ['C5', null, 'E5', 'G5', 'E5', 'C5', 'B4', 'A4'],
  },
  {
    chord: ['F3', 'A3', 'C4', 'E4'],
    bass: [
      ['F2', 0, 1.5],
      ['C3', 2, 1],
      ['E3', 3.25, 0.5],
    ],
    arp: ['F3', 'A3', 'C4', 'E4', 'C4', 'A3', 'G3', 'A3'],
    lead: ['A4', null, 'C5', 'E5', 'C5', 'A4', 'G4', 'E4'],
  },
  {
    chord: ['G3', 'B3', 'D4', 'F4'],
    bass: [
      ['G2', 0, 1.5],
      ['D3', 2, 1],
      ['F3', 3.25, 0.5],
    ],
    arp: ['G3', 'B3', 'D4', 'F4', 'D4', 'B3', 'A3', 'B3'],
    lead: ['B4', null, 'D5', 'F5', 'D5', 'B4', 'A4', 'G4'],
  },
  {
    chord: ['A3', 'C4', 'E4', 'G4'],
    bass: [
      ['A2', 0, 1.5],
      ['E2', 2, 1],
      ['G2', 3.25, 0.5],
    ],
    arp: ['A3', 'C4', 'E4', 'G4', 'E4', 'C4', 'B3', 'C4'],
    lead: ['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5'],
  },
  {
    chord: ['F3', 'A3', 'C4', 'E4'],
    bass: [
      ['F2', 0, 1.5],
      ['C3', 2, 1],
      ['E3', 3.25, 0.5],
    ],
    arp: ['F3', 'A3', 'C4', 'E4', 'C4', 'A3', 'G3', 'A3'],
    lead: ['A4', null, 'C5', 'E5', 'C5', 'A4', 'G4', 'E4'],
  },
  {
    chord: ['D3', 'F3', 'A3', 'C4'],
    bass: [
      ['D2', 0, 1.5],
      ['A2', 2, 1],
      ['C3', 3.25, 0.5],
    ],
    arp: ['D3', 'F3', 'A3', 'C4', 'A3', 'F3', 'E3', 'F3'],
    lead: ['F4', null, 'A4', 'C5', 'A4', 'F4', 'E4', 'D4'],
  },
  {
    chord: ['G3', 'B3', 'D4', 'A4'],
    bass: [
      ['G2', 0, 1.5],
      ['D3', 2, 1],
      ['A2', 3.25, 0.5],
    ],
    arp: ['G3', 'B3', 'D4', 'A4', 'D4', 'B3', 'A3', 'B3'],
    lead: ['B4', 'D5', 'G5', 'A5', 'G5', 'D5', 'B4', 'A4'],
  },
];

function scheduleMusic(ctx, startTime, vol = 0.07) {
  if (musicStopFlag) return;

  SOUNDTRACK_BARS.forEach((bar, barIndex) => {
    if (musicStopFlag) return;
    const barStart = startTime + barIndex * BEAT * 4;

    scheduleChord(ctx, barStart, BEAT * 3.8, bar.chord, {
      type: 'sine',
      volume: vol * 0.11,
      attack: 0.03,
      sustain: 0.94,
      release: 0.2,
    });

    bar.bass.forEach(([noteName, beatOffset, beatLength]) => {
      scheduleNote(ctx, barStart + beatOffset * BEAT, beatLength * BEAT, noteToFreq(noteName), {
        type: 'triangle',
        volume: vol * 0.34,
        attack: 0.01,
        sustain: 0.82,
        release: 0.08,
      });
    });

    bar.arp.forEach((noteName, index) => {
      scheduleNote(ctx, barStart + index * BEAT * 0.5, BEAT * 0.38, noteToFreq(noteName), {
        type: 'square',
        volume: vol * 0.12,
        attack: 0.004,
        sustain: 0.68,
        release: 0.03,
      });
    });

    bar.lead.forEach((noteName, index) => {
      if (!noteName) return;
      scheduleNote(ctx, barStart + index * BEAT * 0.5, BEAT * 0.44, noteToFreq(noteName), {
        type: 'triangle',
        volume: vol * 0.26,
        attack: 0.01,
        sustain: 0.7,
        release: 0.05,
      });
    });
  });

  const totalDuration = SOUNDTRACK_BARS.length * BEAT * 4;
  clearMusicTimer();
  musicLoopTimer = setTimeout(() => {
    if (!musicStopFlag) {
      scheduleMusic(ctx, ctx.currentTime + 0.06, vol);
    }
  }, Math.max(0, (totalDuration - 0.12) * 1000));
}

export function usePixelSound() {
  const settings = getSettings();
  const [sfxOn, setSfxOn] = useState(settings.sfxOn !== false);
  const [musicOn, setMusicOn] = useState(settings.musicOn !== false);
  const sfxOnRef = useRef(settings.sfxOn !== false);

  useEffect(() => {
    if (musicOn) {
      musicStopFlag = false;
      musicWanted = true;

      if (getHasUserActivation()) {
        void tryStartMusic();
      } else {
        attachUnlockListeners();
      }
      return undefined;
    }

    stopMusicImmediately();
    return undefined;
  }, [musicOn]);

  const toggleSfx = useCallback(() => {
    setSfxOn((current) => {
      const next = !current;
      sfxOnRef.current = next;
      saveSettings({ ...getSettings(), sfxOn: next });
      return next;
    });
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicOn((current) => {
      const next = !current;
      if (!next) stopMusicImmediately();
      if (next) {
        musicWanted = true;
        void tryStartMusic();
      }
      saveSettings({ ...getSettings(), musicOn: next });
      return next;
    });
  }, []);

  const play = useCallback((name) => {
    if (!sfxOnRef.current) return;
    const p = (f, d, t = 'square', v = 0.12, dl = 0) => playTone(f, d, t, v, dl);
    switch (name) {
      case 'splash':
        p(220, 0.08, 'sawtooth', 0.1, 0);
        p(180, 0.12, 'sawtooth', 0.1, 0.05);
        p(140, 0.15, 'sawtooth', 0.08, 0.1);
        break;
      case 'cast':
        p(330, 0.1, 'square', 0.1, 0);
        p(440, 0.1, 'square', 0.1, 0.1);
        p(660, 0.15, 'square', 0.12, 0.2);
        break;
      case 'bite':
        p(500, 0.06, 'square', 0.12, 0);
        p(600, 0.06, 'square', 0.12, 0.07);
        break;
      case 'bobber':
        p(440, 0.05, 'sine', 0.15, 0);
        p(554, 0.08, 'sine', 0.12, 0.06);
        break;
      case 'success':
        p(523, 0.12, 'square', 0.1, 0);
        p(659, 0.12, 'square', 0.1, 0.13);
        p(784, 0.12, 'square', 0.1, 0.26);
        p(1047, 0.25, 'square', 0.12, 0.39);
        break;
      case 'tick':
      case 'click':
        p(440, 0.05, 'square', 0.08);
        break;
      case 'complete':
        p(523, 0.1, 'square', 0.1, 0);
        p(659, 0.1, 'square', 0.1, 0.1);
        p(784, 0.1, 'square', 0.1, 0.2);
        p(1047, 0.15, 'square', 0.12, 0.3);
        p(1319, 0.3, 'square', 0.12, 0.45);
        break;
      case 'start':
        p(262, 0.1, 'square', 0.1, 0);
        p(330, 0.1, 'square', 0.1, 0.1);
        p(392, 0.15, 'square', 0.1, 0.2);
        break;
      case 'coin':
        p(784, 0.08, 'square', 0.1, 0);
        p(1047, 0.1, 'square', 0.12, 0.09);
        break;
      case 'blip':
        p(392, 0.06, 'square', 0.08, 0);
        p(523, 0.06, 'square', 0.08, 0.07);
        break;
      case 'error':
        p(220, 0.15, 'sawtooth', 0.1, 0);
        p(180, 0.2, 'sawtooth', 0.1, 0.15);
        break;
      default:
        break;
    }
  }, []);

  return {
    sfxOn,
    musicOn,
    toggleSfx,
    toggleMusic,
    play,
    stopMusic: stopMusicImmediately,
    muted: !sfxOn,
    toggleMute: toggleSfx,
  };
}
