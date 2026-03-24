export const RESULT_DISPLAY_FONT_FAMILY = "'Press Start 2P', monospace";
export const RESULT_BODY_FONT_FAMILY = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
export const RESULT_FONT_FAMILY = RESULT_BODY_FONT_FAMILY;

export const METRIC_INFO = {
  flexion: {
    label: 'Flexion',
    shortLabel: 'Bend down',
    norm: 77.6,
    normRange: '65 to 85 deg',
    unit: 'deg',
    color: '#42c272',
    what: 'How far your wrist bends downward toward the inside of your forearm.',
    why: 'Helpful for gripping objects, holding utensils, typing, and lifting light items.',
    rehab: 'Rest your forearm on a table and gently bend the wrist down. Hold 15 to 20 seconds and repeat 3 times.',
    rehabName: 'Gentle flexion stretch',
  },
  extension: {
    label: 'Extension',
    shortLabel: 'Bend up',
    norm: 79.5,
    normRange: '65 to 85 deg',
    unit: 'deg',
    color: '#58a6ff',
    what: 'How far your wrist bends backward toward the top of your forearm.',
    why: 'Helpful for pushing up from a chair, reaching, writing, and carrying objects.',
    rehab: 'Place your palm on a wall or table and lean forward gently until you feel a mild stretch. Hold 15 to 20 seconds.',
    rehabName: 'Extension wall stretch',
  },
  radial: {
    label: 'Radial deviation',
    shortLabel: 'Thumb side',
    norm: 27.8,
    normRange: '20 to 35 deg',
    unit: 'deg',
    color: '#f2c14e',
    what: 'How far your wrist tilts toward the thumb side.',
    why: 'Helpful for guiding tools, turning handles, and steady hand positioning.',
    rehab: 'Keep the forearm supported and slowly tilt the wrist toward the thumb. Hold for 5 seconds and repeat 10 times.',
    rehabName: 'Thumb-side tilt',
  },
  ulnar: {
    label: 'Ulnar deviation',
    shortLabel: 'Little-finger side',
    norm: 33.4,
    normRange: '25 to 40 deg',
    unit: 'deg',
    color: '#b388ff',
    what: 'How far your wrist tilts toward the little-finger side.',
    why: 'Helpful for pouring, turning keys, and many household movements.',
    rehab: 'Keep the forearm supported and slowly tilt the wrist toward the little finger. Hold for 5 seconds and repeat 10 times.',
    rehabName: 'Little-finger tilt',
  },
  smoothness_pre: {
    label: 'Control before fatigue',
    shortLabel: 'Before activity',
    norm: 80,
    normRange: '75 to 100%',
    unit: '%',
    color: '#32d296',
    what: 'How steady and smooth the wrist movement was at the start of the session.',
    why: 'Smoother movement usually means better joint control and less shakiness.',
    rehab: 'Practice slow wrist circles with relaxed shoulders. Focus on smooth motion more than speed.',
    rehabName: 'Controlled circles',
  },
  smoothness_post: {
    label: 'Control after fatigue',
    shortLabel: 'After activity',
    norm: 80,
    normRange: '70 to 100%',
    unit: '%',
    color: '#ff7b72',
    what: 'How smooth the wrist movement stayed after the rest of the exercises.',
    why: 'Shows how well the wrist keeps control once it gets tired.',
    rehab: 'Use light resistance and repeat small circles slowly to build control under fatigue.',
    rehabName: 'Fatigue-control drill',
  },
  endurance: {
    label: 'Steadiness hold',
    shortLabel: 'Hold still',
    norm: 70,
    normRange: '65 to 100%',
    unit: '%',
    color: '#f59e63',
    what: 'How still your wrist stayed during the holding task.',
    why: 'Helpful for longer activities like holding a phone, carrying a bag, or using utensils.',
    rehab: 'Keep the wrist in a neutral position for 10 to 20 seconds while breathing steadily. Repeat 3 times.',
    rehabName: 'Neutral hold',
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getMetricValue(metricKey, rawValue) {
  if (rawValue === undefined || rawValue === null) return null;
  if (metricKey === 'extension') return Math.abs(rawValue);
  return Math.abs(rawValue);
}

export function formatMetricValue(metricKey, rawValue) {
  const info = METRIC_INFO[metricKey];
  const value = getMetricValue(metricKey, rawValue);
  if (!info || value === null) return '--';
  const rounded = info.unit === '%' ? Math.round(value) : Math.round(value);
  return `${rounded}${info.unit}`;
}

export function getMetricRatio(metricKey, rawValue) {
  const info = METRIC_INFO[metricKey];
  const value = getMetricValue(metricKey, rawValue);
  if (!info || value === null) return 0;
  return clamp(value / info.norm, 0, 1.2);
}

export function getMetricStatus(metricKey, rawValue) {
  const ratio = getMetricRatio(metricKey, rawValue);
  if (ratio >= 0.9) return { label: 'Within typical range', color: '#42c272' };
  if (ratio >= 0.7) return { label: 'Mildly limited', color: '#f2c14e' };
  if (ratio >= 0.45) return { label: 'Moderately limited', color: '#f59e63' };
  return { label: 'Needs attention', color: '#ff7b72' };
}

export function calculateOverallScore(results) {
  if (!results) return 0;
  const components = [
    clamp((results.flexion || 0) / METRIC_INFO.flexion.norm, 0, 1),
    clamp(Math.abs(results.extension || 0) / METRIC_INFO.extension.norm, 0, 1),
    clamp((results.radial || 0) / METRIC_INFO.radial.norm, 0, 1),
    clamp((results.ulnar || 0) / METRIC_INFO.ulnar.norm, 0, 1),
  ];
  const average = components.reduce((sum, value) => sum + value, 0) / components.length;
  return Math.round(average * 100);
}

export function calculateRiskPercent(results) {
  if (!results) return 0;
  const checks = [
    results.flexion !== undefined ? clamp((results.flexion || 0) / METRIC_INFO.flexion.norm, 0, 1) : null,
    results.extension !== undefined ? clamp(Math.abs(results.extension || 0) / METRIC_INFO.extension.norm, 0, 1) : null,
    results.radial !== undefined ? clamp((results.radial || 0) / METRIC_INFO.radial.norm, 0, 1) : null,
    results.ulnar !== undefined ? clamp((results.ulnar || 0) / METRIC_INFO.ulnar.norm, 0, 1) : null,
    results.smoothness_pre !== undefined ? clamp((results.smoothness_pre || 0) / METRIC_INFO.smoothness_pre.norm, 0, 1) : null,
    results.smoothness_post !== undefined ? clamp((results.smoothness_post || 0) / METRIC_INFO.smoothness_post.norm, 0, 1) : null,
    results.endurance !== undefined ? clamp((results.endurance || 0) / METRIC_INFO.endurance.norm, 0, 1) : null,
  ].filter((value) => value !== null);

  if (checks.length === 0) return 0;

  const average = checks.reduce((sum, value) => sum + value, 0) / checks.length;
  return Math.round((1 - average) * 100);
}

export function getRiskBand(riskPercent) {
  if (riskPercent <= 20) {
    return {
      label: 'Low risk',
      color: '#7ef7a2',
      border: '#2f8f5b',
      background: 'linear-gradient(180deg, rgba(14,65,45,0.98), rgba(8,36,27,0.98))',
      detail: 'Your screening results are close to typical ranges. Keep active and continue monitoring if symptoms change.',
    };
  }
  if (riskPercent <= 45) {
    return {
      label: 'Mild risk',
      color: '#ffd166',
      border: '#9d7b20',
      background: 'linear-gradient(180deg, rgba(70,56,15,0.98), rgba(38,29,7,0.98))',
      detail: 'Some stiffness or control changes are present. Gentle daily mobility work may help.',
    };
  }
  if (riskPercent <= 65) {
    return {
      label: 'Moderate risk',
      color: '#ffb36b',
      border: '#a55b26',
      background: 'linear-gradient(180deg, rgba(71,37,14,0.98), rgba(39,20,8,0.98))',
      detail: 'Several movements are reduced. A consistent home program or physiotherapy review may be useful.',
    };
  }
  return {
    label: 'Higher risk',
    color: '#ff8e8e',
    border: '#a83c4c',
    background: 'linear-gradient(180deg, rgba(68,20,28,0.98), rgba(34,12,18,0.98))',
    detail: 'More pronounced motion or control changes were detected. Consider discussing symptoms with a clinician.',
  };
}

export function formatSessionDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatSessionMeta(dateValue) {
  const date = new Date(dateValue);
  return `${formatSessionDate(dateValue)} | ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function buildTrendData(sessions, limit) {
  const selected = typeof limit === 'number' ? sessions.slice(0, limit) : sessions.slice();
  const ordered = selected.slice().reverse();

  return ordered.map((session, index) => ({
    index: index + 1,
    label: `#${index + 1}`,
    sessionTitle: `Session ${index + 1}`,
    hand: (session.hand || 'right').toUpperCase(),
    dateText: formatSessionMeta(session.date),
    risk: calculateRiskPercent(session),
    smoothness: Math.round(session.smoothness_post ?? session.smoothness_pre ?? 0),
    overall: calculateOverallScore(session),
    raw: session,
  }));
}
