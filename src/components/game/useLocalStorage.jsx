import { calculateOverallScore } from '../results/results-utils';

// Local-only data persistence - no login required

const SESSIONS_KEY = 'wristcare_sessions';
const HAND_KEY = 'wristcare_hand';
const SETTINGS_KEY = 'wristcare_settings';

export function saveSession(sessionData) {
  const existing = getSessions();
  const newSession = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    ...sessionData,
  };
  const updated = [newSession, ...existing].slice(0, 100);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore storage-full errors for local-only persistence.
  }
  return newSession;
}

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getHandPreference() {
  try {
    return JSON.parse(localStorage.getItem(HAND_KEY) || '{"measuring":"right","dominant":"right"}');
  } catch {
    return { measuring: 'right', dominant: 'right' };
  }
}

export function saveHandPreference(pref) {
  localStorage.setItem(HAND_KEY, JSON.stringify(pref));
}

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"sfxOn":true,"musicOn":true}');
  } catch {
    return { sfxOn: true, musicOn: true };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function exportToCSV(sessions) {
  const headers = [
    'Date', 'Time', 'Hand Used', 'Dominant Hand',
    'Flexion (deg)', 'Extension (deg)', 'Radial Dev (deg)', 'Ulnar Dev (deg)',
    'Smoothness Pre (%)', 'Smoothness Post (%)', 'Endurance (%)',
    'Overall Score (%)', 'Calibration Quality',
  ];

  const rows = sessions.map((session) => {
    const date = new Date(session.date);
    const score = calculateOverallScore(session);

    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      session.hand || 'right',
      session.dominantHand || 'right',
      (session.flexion || 0).toFixed(1),
      Math.abs(session.extension || 0).toFixed(1),
      (session.radial || 0).toFixed(1),
      (session.ulnar || 0).toFixed(1),
      (session.smoothness_pre || 0).toFixed(0),
      (session.smoothness_post || 0).toFixed(0),
      (session.endurance || 0).toFixed(0),
      score,
      session.calibQuality || 'unknown',
    ];
  });

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `wristcare_export_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
