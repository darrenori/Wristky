import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import FishingScene from '../components/game/FishingScene';
import PixelMascot from '../components/game/PixelMascot';
import PixelTimer from '../components/game/PixelTimer';
import SessionProgressBar from '../components/game/SessionProgressBar';
import { useSensor } from '../components/game/useSensor';
import { usePixelSound } from '../components/game/usePixelSound';
import { captureSignedMotionDirection, getFlexExtensionMeasurement } from '../components/game/flexExtensionAxis';
import { getHandPreference } from '../components/game/useLocalStorage';
import { getTargetSideDeviationAngle } from '../components/game/sideDeviation';
import { useLandscapeGameLayout } from '../components/game/useLandscapeGameLayout';
import { createPageUrl } from '../utils';

const ROUTINE_SESSION_KEY = 'wristcare_exercise_session_v2';
const ROUTINE_HISTORY_KEY = 'wristcare_exercise_history_v1';

const STEP_DEFS = [
  {
    key: 'flex-extension',
    title: 'Flexion & Extension',
    subtitle: 'Move slowly and smoothly. Hold at end range.',
    hint: 'Pain-free range only.',
    mode: 'reps',
    count: 10,
    holdSeconds: 4,
    orientation: 'landscape',
    accent: '#58a6ff',
    sceneTitle: 'CAST + REEL',
    guideLines: [
      'Hold the phone sideways like the measurement games.',
      'Move into extension first, then alternate with flexion.',
      'Hold each end range steadily before the rep counts.',
    ],
  },
  {
    key: 'radial-ulnar',
    title: 'Radial & Ulnar Deviation',
    subtitle: 'Controlled movement. Hold at outer range.',
    hint: 'Improves lateral mobility and joint lubrication.',
    mode: 'reps',
    count: 10,
    holdSeconds: 3,
    orientation: 'landscape',
    accent: '#f2c14e',
    sceneTitle: 'STEER THE LINE',
    guideLines: [
      'Keep the phone flat and the forearm supported.',
      'Alternate toward the thumb side and little-finger side.',
      'Move only at the wrist and hold each outer range.',
    ],
  },
  {
    key: 'pronation-supination',
    title: 'Pronation & Supination',
    subtitle: 'Rotate forearm: palm down, then palm up.',
    hint: 'You can rest the phone on a surface for this one.',
    mode: 'holds',
    count: 2,
    holdSeconds: 3,
    orientation: 'portrait',
    accent: '#2ee6c8',
    sceneTitle: 'ROLL THE REEL',
    guideLines: [
      'This screen stays portrait.',
      'Start palm down, then rotate to palm up.',
      'Hold each end position steadily before continuing.',
    ],
  },
];

const FLEX_TARGET_DEGREES = 16;
const SIDE_TARGET_DEGREES = 11;
const ROTATION_TARGET_DEGREES = 18;
const STABILITY_TOLERANCE = 7;
const AXIS_LOCK_THRESHOLD = 8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function normalizeHeadingDelta(delta) {
  return ((delta + 540) % 360) - 180;
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad2(seconds)}`;
}

function pulseHaptic(ms = 18) {
  try {
    window.navigator?.vibrate?.(ms);
  } catch {}
}

function formatHoldCountdown(ms) {
  const seconds = Math.max(0, ms) / 1000;
  return seconds >= 1 ? `${Math.ceil(seconds)}s` : `${seconds.toFixed(1)}s`;
}

function readSession() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ROUTINE_SESSION_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      status: parsed.status === 'complete' ? 'complete' : parsed.status === 'active' ? 'active' : 'idle',
      stepIndex: Number.isFinite(parsed.stepIndex) ? clamp(parsed.stepIndex, 0, STEP_DEFS.length - 1) : 0,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      completedAt: typeof parsed.completedAt === 'number' ? parsed.completedAt : null,
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps.slice(0, STEP_DEFS.length) : [],
      totalRepCount: Number.isFinite(parsed.totalRepCount) ? parsed.totalRepCount : 0,
      rotationHoldCount: Number.isFinite(parsed.rotationHoldCount) ? parsed.rotationHoldCount : 0,
    };
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    sessionStorage.setItem(ROUTINE_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(ROUTINE_SESSION_KEY);
  } catch {}
}

function buildIdleSession() {
  return {
    status: 'idle',
    stepIndex: 0,
    startedAt: null,
    completedAt: null,
    completedSteps: [],
    totalRepCount: 0,
    rotationHoldCount: 0,
  };
}

function buildNewSession() {
  return {
    status: 'active',
    stepIndex: 0,
    startedAt: Date.now(),
    completedAt: null,
    completedSteps: [],
    totalRepCount: 0,
    rotationHoldCount: 0,
  };
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ROUTINE_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((value) => typeof value === 'string'))] : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  try {
    localStorage.setItem(ROUTINE_HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

function getStreakCount(history, anchorDate = new Date()) {
  const set = new Set(history);
  let streak = 0;
  const cursor = new Date(anchorDate);

  while (set.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function registerCompletion(completedAt) {
  const dayKey = toDateKey(completedAt);
  const history = readHistory();
  const nextHistory = history.includes(dayKey) ? history : [...history, dayKey];
  writeHistory(nextHistory);
  return getStreakCount(nextHistory, new Date(completedAt));
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function HeaderPills({ orientation = 'Portrait' }) {
  return (
    <div style={styles.headerPillRow}>
      <div style={{ ...styles.headerPill, ...styles.bluePill }}>Exercise</div>
      <div style={{ ...styles.headerPill, ...styles.greenPill }}>{orientation}</div>
    </div>
  );
}

function SessionProgress({ current, total, label }) {
  const percent = clamp((current / total) * 100, 0, 100);
  return (
    <div style={styles.progressPanel}>
      <div style={styles.progressTopRow}>
        <span style={styles.progressLabel}>{label}</span>
        <span style={styles.progressValue}>
          {current}/{total}
        </span>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${percent}%` }} />
      </div>
    </div>
  );
}

function HubRow({ step, index, status, summary }) {
  const statusPalette = status === 'done'
    ? { bg: 'rgba(41, 163, 102, 0.18)', border: '#2da665', text: '#9ff0c8' }
    : status === 'current'
      ? { bg: 'rgba(88, 171, 255, 0.16)', border: '#61a8ff', text: '#cbe5ff' }
      : { bg: 'rgba(120, 141, 166, 0.12)', border: '#476079', text: '#8ba4be' };

  return (
    <div style={styles.hubRow}>
      <div style={styles.hubRowTop}>
        <div>
          <div style={styles.hubRowIndex}>{pad2(index + 1)}</div>
          <div style={styles.hubRowTitle}>{step.title}</div>
        </div>
        <div style={{ ...styles.statusChip, background: statusPalette.bg, borderColor: statusPalette.border, color: statusPalette.text }}>
          {status === 'done' ? 'Done' : status === 'current' ? 'Next' : 'Queued'}
        </div>
      </div>
      <div style={styles.hubMetaRow}>
        <span style={styles.hubMetaChip}>
          {step.mode === 'reps' ? `${step.count} reps` : `${step.count} holds`}
        </span>
        <span style={styles.hubMetaChip}>Hold {step.holdSeconds}s</span>
        <span style={styles.hubMetaChip}>
          {step.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
        </span>
      </div>
      <div style={styles.hubHint}>{step.hint}</div>
      {summary && <div style={styles.hubSummary}>{summary.label}</div>}
    </div>
  );
}

function StepChip({ children, active = false, accent = '#61a8ff' }) {
  return (
    <div
      style={{
        ...styles.stepChip,
        background: active ? accent : 'rgba(20, 38, 60, 0.92)',
        borderColor: active ? accent : '#36506a',
        color: active ? '#061523' : '#d8ecff',
        boxShadow: active ? `0 0 0 2px rgba(0,0,0,0.12), 0 0 22px ${accent}33` : 'none',
      }}
    >
      {children}
    </div>
  );
}

function RepDots({ total, filled, activeIndex }) {
  return (
    <div style={styles.repDotsRow}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          style={{
            ...styles.repDot,
            background: index < filled ? '#2db86f' : index === activeIndex ? '#69b4ff' : '#21384f',
            borderColor: index < filled ? '#7ef3b3' : index === activeIndex ? '#c8e6ff' : '#3d526a',
            boxShadow: index < filled ? '0 0 10px rgba(45,184,111,0.35)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

function ExerciseShell({
  step,
  stepIndex,
  totalSteps,
  currentLabel,
  holdLabel,
  hint,
  children,
  footer,
}) {
  return (
    <div style={styles.pageShell}>
      <div style={styles.ambientGlowTop} />
      <div style={styles.ambientGlowBottom} />
      <div style={styles.contentColumn}>
        <HeaderPills orientation={step.orientation === 'landscape' ? 'Landscape' : 'Portrait'} />
        <div style={styles.exerciseCard}>
          <SessionProgress current={stepIndex + 1} total={totalSteps} label="Session progress" />
          <div style={styles.exerciseTopMeta}>
            <div style={styles.exerciseMetaPill}>{currentLabel}</div>
            <div style={styles.exerciseMetaPill}>{holdLabel}</div>
          </div>
          <div style={styles.exerciseHeading}>{step.title}</div>
          <div style={styles.exerciseSubheading}>{step.subtitle}</div>
          <div style={styles.exerciseStage}>{children}</div>
          <div style={styles.exerciseHint}>{hint}</div>
          {footer}
        </div>
      </div>
    </div>
  );
}

function ExerciseGuidePanel({ step, onStart, buttonLabel = 'START', helperText = '' }) {
  return (
    <div style={styles.exerciseGuideCard}>
      <div style={styles.exerciseGuideEyebrow}>Watch Your Setup</div>
      <div style={styles.exerciseGuideTitle}>{step.title}</div>
      <div style={styles.exerciseGuideCopy}>{step.subtitle}</div>
      <div style={styles.exerciseGuideList}>
        {step.guideLines.map((line) => (
          <div key={line} style={styles.exerciseGuideLine}>
            <span style={styles.exerciseGuideBullet}>+</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
      {helperText && <div style={styles.exerciseGuideHelper}>{helperText}</div>}
      <button className="pixel-btn pixel-btn-teal flow-cta" style={styles.exerciseGuideButton} onClick={onStart}>
        {buttonLabel}
      </button>
    </div>
  );
}

function CalibrationStatus({ label, progress }) {
  return (
    <div className="flow-status-card">
      <p className="flow-status-label">{label}</p>
      <div className="flow-progress-shell">
        <div className="flow-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function LandscapeExerciseShell({
  layout,
  step,
  stepIndex,
  phase,
  mascotMessage,
  topContent = null,
  sceneTitle,
  scene,
  guideContent,
  activeContent,
}) {
  const showGuideOverlay = phase === 'guide' || phase === 'permission';
  const usePortraitGuideOverlay = showGuideOverlay && layout.isPortraitViewport;
  const compactHud = phase === 'active' || phase === 'done';
  const overlayRight = layout.panelWidth + (compactHud ? 54 : 40);

  return (
    <div style={layout.outerStyle}>
      {usePortraitGuideOverlay && (
        <div style={layout.portraitGuideOverlayStyle}>
          <div style={layout.portraitGuideCardStyle}>
            {guideContent}
          </div>
        </div>
      )}
      <div style={layout.stageStyle}>
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          {scene}

          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: overlayRight,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              pointerEvents: 'none',
            }}
          >
            <div style={styles.landscapeTitleBadge}>{sceneTitle}</div>
            <SessionProgressBar
              current={stepIndex + 1}
              total={STEP_DEFS.length}
              label="SMART EXERCISE"
              accent={step.accent}
              compact={compactHud}
            />
            {topContent}
          </div>

          {showGuideOverlay && !usePortraitGuideOverlay && (
            <div style={layout.guidePanelStyle}>
              <div
                ref={layout.guidePanelRef}
                {...layout.guidePanelHandlers}
                style={{
                  ...styles.landscapePanelScroller,
                  touchAction: layout.isPortraitViewport ? 'none' : 'pan-y',
                }}
              >
                {guideContent}
              </div>
            </div>
          )}

          {!showGuideOverlay && (
            <div
              ref={layout.actionPanelRef}
              {...layout.actionPanelHandlers}
              style={layout.actionPanelStyle}
            >
              <PixelMascot message={mascotMessage} size={34} fixedBubbleWidth={176} />
              {activeContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlexExtensionGraphic({ progress, target, holdActive, repsCompleted, totalReps }) {
  const sweepAngle = target === 'extension' ? -52 : 52;
  const handAngle = sweepAngle * progress;
  const activeArc = describeArc(150, 122, 62, 0, handAngle);
  const endpointX = 150 + Math.cos((handAngle * Math.PI) / 180) * 84;
  const endpointY = 122 + Math.sin((handAngle * Math.PI) / 180) * 84;

  return (
    <div style={styles.graphicWrap}>
      <svg viewBox="0 0 300 220" style={styles.graphicSvg}>
        <defs>
          <linearGradient id="flexStage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#12263c" />
            <stop offset="100%" stopColor="#18324f" />
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="264" height="184" rx="22" fill="url(#flexStage)" stroke="#36506a" strokeWidth="3" />
        <path d={describeArc(150, 122, 62, -52, 52)} fill="none" stroke="#274460" strokeWidth="16" strokeLinecap="round" />
        <path d={activeArc} fill="none" stroke={target === 'extension' ? '#61a8ff' : '#48d7b3'} strokeWidth="16" strokeLinecap="round" />
        <line x1="74" y1="122" x2="150" y2="122" stroke="#e7c9a1" strokeWidth="18" strokeLinecap="round" />
        <line x1="74" y1="122" x2="106" y2="122" stroke="#d5b187" strokeWidth="8" strokeLinecap="round" opacity="0.72" />
        <line
          x1="150"
          y1="122"
          x2={endpointX}
          y2={endpointY}
          stroke="#f2e6d5"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <circle cx="150" cy="122" r="11" fill="#e7c9a1" />
        <circle
          cx={endpointX}
          cy={endpointY}
          r={holdActive ? 12 : 8}
          fill={target === 'extension' ? '#61a8ff' : '#48d7b3'}
          style={holdActive ? { filter: 'drop-shadow(0 0 10px rgba(97,168,255,0.55))' } : undefined}
        />
        <path d="M 152 42 l 0 -14 l -8 8 M 152 42 l 0 -14 l 8 8" stroke="#61a8ff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 152 200 l 0 14 l -8 -8 M 152 200 l 0 14 l 8 -8" stroke="#48d7b3" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="164" y="46" fill="#61a8ff" fontSize="8" fontFamily="'Press Start 2P', monospace">EXT</text>
        <text x="164" y="204" fill="#48d7b3" fontSize="8" fontFamily="'Press Start 2P', monospace">FLEX</text>
      </svg>
      <div style={styles.directionRow}>
        <StepChip active={target === 'extension'} accent="#61a8ff">Extension</StepChip>
        <StepChip active={target === 'flexion'} accent="#48d7b3">Flexion</StepChip>
      </div>
      <RepDots total={totalReps} filled={repsCompleted} activeIndex={repsCompleted} />
    </div>
  );
}

function SideDeviationGraphic({ progress, target, holdActive, repsCompleted, totalReps }) {
  const direction = target === 'radial' ? -1 : 1;
  const phoneX = 150 + direction * progress * 66;
  const indicatorX = target === 'radial' ? 96 : 204;

  return (
    <div style={styles.graphicWrap}>
      <svg viewBox="0 0 300 220" style={styles.graphicSvg}>
        <defs>
          <linearGradient id="sideStage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#152a40" />
            <stop offset="100%" stopColor="#1d3552" />
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="264" height="184" rx="22" fill="url(#sideStage)" stroke="#36506a" strokeWidth="3" />
        <path d={describeArc(150, 168, 86, -136, -44)} fill="none" stroke="#274460" strokeWidth="16" strokeLinecap="round" />
        <line x1="80" y1="126" x2="220" y2="126" stroke="#3a5a79" strokeWidth="5" strokeDasharray="10 10" />
        <rect x={phoneX - 26} y="84" width="52" height="68" rx="14" fill="#e9f3fb" stroke="#36506a" strokeWidth="4" />
        <rect x={phoneX - 17} y="96" width="34" height="6" rx="2" fill="#9fc3e2" />
        <line x1="150" y1="126" x2={phoneX} y2="118" stroke="#9fd7ff" strokeWidth="8" strokeLinecap="round" />
        <path d={`M ${indicatorX} 58 l ${direction * 18} 0 l ${direction * -8} -8 M ${indicatorX} 58 l ${direction * 18} 0 l ${direction * -8} 8`} stroke={target === 'radial' ? '#61a8ff' : '#48d7b3'} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={phoneX} cy="118" r={holdActive ? 12 : 8} fill={target === 'radial' ? '#61a8ff' : '#48d7b3'} />
      </svg>
      <div style={styles.directionRow}>
        <StepChip active={target === 'radial'} accent="#61a8ff">Toward thumb</StepChip>
        <StepChip active={target === 'ulnar'} accent="#48d7b3">Toward pinky</StepChip>
      </div>
      <RepDots total={totalReps} filled={repsCompleted} activeIndex={repsCompleted} />
    </div>
  );
}

function RotationGraphic({ progress, targetIndex, holdActive }) {
  const isPalmDown = targetIndex === 0;
  const cardWidth = isPalmDown ? 104 - progress * 22 : 82 - progress * 18;
  const glow = holdActive ? 'drop-shadow(0 0 12px rgba(72,215,179,0.42))' : 'none';

  return (
    <div style={styles.graphicWrap}>
      <svg viewBox="0 0 300 220" style={styles.graphicSvg}>
        <defs>
          <linearGradient id="rotateStage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#12263c" />
            <stop offset="100%" stopColor="#1c3551" />
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="264" height="184" rx="22" fill="url(#rotateStage)" stroke="#36506a" strokeWidth="3" />
        <circle cx="150" cy="112" r="62" fill="none" stroke="#25435f" strokeWidth="16" />
        <path d={describeArc(150, 112, 62, -120, 120 * Math.max(progress, 0.08))} fill="none" stroke="#48d7b3" strokeWidth="16" strokeLinecap="round" />
        <rect
          x={150 - cardWidth / 2}
          y="78"
          width={cardWidth}
          height="68"
          rx="14"
          fill="#eef5fa"
          stroke="#36506a"
          strokeWidth="4"
          style={{ filter: glow }}
        />
        <rect x={150 - cardWidth / 2 + 12} y="90" width={Math.max(cardWidth - 24, 16)} height="8" rx="3" fill="#9fc3e2" />
        <path d="M 184 58 l 16 0 l -7 -7 M 184 58 l 16 0 l -7 7" stroke="#61a8ff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 116 166 l -16 0 l 7 -7 M 116 166 l -16 0 l 7 7" stroke="#48d7b3" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={styles.directionRow}>
        <StepChip active={targetIndex === 0} accent="#61a8ff">Palm down</StepChip>
        <StepChip active={targetIndex === 1} accent="#48d7b3">Palm up</StepChip>
      </div>
      <RepDots total={2} filled={targetIndex} activeIndex={targetIndex} />
    </div>
  );
}

function useOrientationRef(orientation) {
  const ref = useRef(orientation);

  useEffect(() => {
    ref.current = orientation;
  }, [orientation]);

  return ref;
}

function FlexExtensionStep({ stepIndex, onComplete }) {
  const step = STEP_DEFS[stepIndex];
  const { orientation, permissionState, requestPermission, calibrate, demoMode } = useSensor();
  const { play } = usePixelSound();
  const layout = useLandscapeGameLayout();
  const measuringHand = getHandPreference().measuring || 'right';
  const orientationRef = useOrientationRef(orientation);
  const baselineRef = useRef({ beta: 0, gamma: 0 });
  const axisLockRef = useRef(null);
  const directionLockRef = useRef(0);
  const targetDirectionRef = useRef(0);
  const directionCandidateRef = useRef({ sign: 0, since: 0 });
  const holdStartRef = useRef(0);
  const rafRef = useRef(null);
  const repsRef = useRef(0);
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);
  const calibratingRef = useRef(false);

  const [phase, setPhase] = useState('guide');
  const [statusText, setStatusText] = useState('Match the flexion and extension path, one hold at a time.');
  const [repsCompleted, setRepsCompleted] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holdLeftMs, setHoldLeftMs] = useState(step.holdSeconds * 1000);
  const [neutralProgress, setNeutralProgress] = useState(0);

  const target = repsCompleted % 2 === 0 ? 'extension' : 'flexion';

  useEffect(() => {
    repsRef.current = repsCompleted;
  }, [repsCompleted]);

  const recalibrateForTarget = useCallback(async ({ nextTarget, initial = false }) => {
    if (calibratingRef.current || completedRef.current) return false;
    calibratingRef.current = true;
    const granted = permissionState === 'granted' ? true : await requestPermission();
    if (!granted) {
      setPhase('permission');
      setStatusText('Motion access is needed for the exercise to count your holds.');
      calibratingRef.current = false;
      return false;
    }

    setPhase('calibrating');
    setStatusText(
      initial
        ? 'Hold neutral while we set your baseline.'
        : `Return to neutral so we can reset for ${nextTarget}.`
    );
    setNeutralProgress(0);

    let progressValue = 0;
    const interval = window.setInterval(() => {
      progressValue += 10;
      setNeutralProgress(Math.min(progressValue, 96));
    }, 90);

    const baseline = await calibrate(initial ? 900 : 700, initial ? 4500 : 3200);
    window.clearInterval(interval);
    setNeutralProgress(100);
    baselineRef.current = {
      beta: baseline.beta || 0,
      gamma: baseline.gamma || 0,
    };
    axisLockRef.current = null;
    directionLockRef.current = 0;
    targetDirectionRef.current = 0;
    directionCandidateRef.current = { sign: 0, since: 0 };
    holdStartRef.current = 0;
    setProgress(0);
    setHoldLeftMs(step.holdSeconds * 1000);
    if (initial) {
      startedAtRef.current = Date.now();
    }

    window.setTimeout(() => {
      setPhase('active');
      setStatusText(
        initial
          ? 'Start with extension and move smoothly into range.'
          : `Ease into ${nextTarget} and hold.`
      );
    }, 260);

    calibratingRef.current = false;
    play('start');
    return true;
  }, [calibrate, permissionState, play, requestPermission, step.holdSeconds]);

  const finishStep = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setPhase('done');
    play('success');
    pulseHaptic(30);
  }, [play]);

  const completeRep = useCallback(() => {
    if (completedRef.current) return;
    holdStartRef.current = 0;
    pulseHaptic(18);
    play('coin');

    const next = repsRef.current + 1;
    repsRef.current = next;
    setRepsCompleted(next);
    setHoldLeftMs(step.holdSeconds * 1000);

    if (next >= step.count) {
      finishStep();
    } else {
      const nextTarget = next % 2 === 0 ? 'extension' : 'flexion';
      setStatusText(`Return to neutral so we can reset for ${nextTarget}.`);
      window.setTimeout(() => {
        recalibrateForTarget({ nextTarget, initial: false });
      }, 140);
    }
  }, [finishStep, play, recalibrateForTarget, step.count, step.holdSeconds]);

  const startCalibration = useCallback(() => {
    recalibrateForTarget({ nextTarget: 'extension', initial: true });
  }, [recalibrateForTarget]);

  useEffect(() => {
    if (phase !== 'active') return undefined;

    const loop = () => {
      const current = orientationRef.current;
      const measurement = getFlexExtensionMeasurement({
        orientation: current,
        baseline: baselineRef.current,
        axisLock: axisLockRef.current,
        directionLock: directionLockRef.current,
        maxDegrees: 90,
        measuringHand,
      });
      axisLockRef.current = measurement.axisLock;
      directionLockRef.current = measurement.directionLock;

      if (!targetDirectionRef.current) {
        captureSignedMotionDirection({
          signedAngle: measurement.signedTargetAngle,
          directionRef: targetDirectionRef,
          candidateRef: directionCandidateRef,
        });
      }

      const targetDirection = targetDirectionRef.current;
      const normalizedProgress = targetDirection
        ? clamp((measurement.signedTargetAngle * targetDirection) / FLEX_TARGET_DEGREES, 0, 1.2)
        : 0;

      setProgress(clamp(normalizedProgress, 0, 1));

      if (targetDirection && normalizedProgress >= 1) {
        if (!holdStartRef.current) holdStartRef.current = Date.now();
        const elapsed = Date.now() - holdStartRef.current;
        const remaining = Math.max(0, step.holdSeconds * 1000 - elapsed);
        setHoldLeftMs(remaining);
        setStatusText(`Hold ${target} for ${formatHoldCountdown(remaining)}.`);

        if (remaining <= 80) completeRep();
      } else {
        holdStartRef.current = 0;
        setHoldLeftMs(step.holdSeconds * 1000);
        setStatusText(
          targetDirection
            ? target === 'extension'
              ? 'Ease into extension and hold.'
              : 'Ease into flexion and hold.'
            : `Move into ${target} to set this rep.`
        );
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [completeRep, measuringHand, orientationRef, phase, step.holdSeconds, target]);

  const bobberX = layout.sceneWidth * 0.58 + progress * layout.sceneWidth * 0.05;
  const bobberY = layout.sceneHeight * 0.49 - (target === 'extension' ? progress * layout.sceneHeight * 0.07 : 0);
  const biteOffset = Math.max(16, Math.min(24, layout.sceneWidth * 0.04));
  const fishPositionX = bobberX - biteOffset;
  const fishPositionY = bobberY + layout.sceneHeight * 0.01;
  const rodAngle = target === 'extension'
    ? -20 - progress * 24
    : -10 + progress * 26;

  return (
    <LandscapeExerciseShell
      layout={layout}
      step={step}
      stepIndex={stepIndex}
      phase={phase}
      mascotMessage={demoMode ? 'Demo mode is on. Move the cursor to simulate the wrist.' : statusText}
      sceneTitle={step.sceneTitle}
      topContent={
        <>
          {(phase === 'active' || phase === 'done') && (
            <div style={styles.landscapeHudRow}>
              <div style={styles.landscapeHudCard}>REP {Math.min(repsCompleted + 1, step.count)}/{step.count}</div>
              <div style={styles.landscapeHudCard}>
                {holdLeftMs < step.holdSeconds * 1000 ? `HOLD ${formatHoldCountdown(holdLeftMs)}` : `HOLD ${step.holdSeconds}s`}
              </div>
            </div>
          )}
          {phase === 'active' && (
            <PixelTimer seconds={holdLeftMs / 1000} maxSeconds={step.holdSeconds} color={step.accent} />
          )}
        </>
      }
      scene={(
        <>
          <FishingScene
            stage="extension"
            showBobber={phase !== 'guide'}
            showRod={phase !== 'guide'}
            showDockDecor={phase !== 'guide'}
            bobberX={bobberX}
            bobberY={bobberY}
            showFish={phase !== 'guide' && target === 'flexion' ? [{ x: fishPositionX, y: fishPositionY, size: 0.92, flipped: true }] : []}
            rodAngle={rodAngle}
            waterLevel={0.5}
            sceneWidth={layout.sceneWidth}
            sceneHeight={layout.sceneHeight}
          />
          {(phase === 'active' || phase === 'done') && (
            <div style={{ ...styles.landscapeStagePanel, right: layout.panelWidth + 108 }}>
              <FlexExtensionGraphic
                progress={progress}
                target={target}
                holdActive={holdLeftMs < step.holdSeconds * 1000}
                repsCompleted={repsCompleted}
                totalReps={step.count}
              />
            </div>
          )}
        </>
      )}
      guideContent={(
        <ExerciseGuidePanel
          step={step}
          onStart={startCalibration}
          buttonLabel={phase === 'permission' ? 'ENABLE MOTION' : 'START'}
          helperText={phase === 'permission' ? statusText : 'Same landscape setup as measurement.'}
        />
      )}
      activeContent={(
        <>
          {phase === 'calibrating' && <CalibrationStatus label="Hold still for calibration..." progress={neutralProgress} />}
          {phase === 'active' && (
            <div style={styles.landscapeCoachCard}>
              <div style={styles.landscapeCoachLabel}>PAIN-FREE RANGE</div>
              <div style={styles.landscapeCoachText}>{statusText}</div>
            </div>
          )}
          {phase === 'done' && (
            <>
              <div style={styles.landscapeCoachCard}>
                <div style={styles.landscapeCoachLabel}>STEP COMPLETE</div>
                <div style={styles.landscapeCoachText}>{step.count} guided reps complete.</div>
              </div>
              <button className="pixel-btn pixel-btn-teal flow-cta" onClick={() => onComplete({
                key: step.key,
                repCount: step.count,
                holdCount: 0,
                durationMs: Date.now() - startedAtRef.current,
                label: `${step.count} reps complete`,
              })}>
                NEXT
              </button>
            </>
          )}
        </>
      )}
    />
  );
}

function SideDeviationStep({ stepIndex, onComplete }) {
  const step = STEP_DEFS[stepIndex];
  const { orientation, permissionState, requestPermission, calibrate, demoMode } = useSensor();
  const { play } = usePixelSound();
  const layout = useLandscapeGameLayout();
  const orientationRef = useOrientationRef(orientation);
  const baselineRef = useRef({ alpha: 0, gamma: 0 });
  const holdStartRef = useRef(0);
  const rafRef = useRef(null);
  const repsRef = useRef(0);
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);
  const calibratingRef = useRef(false);
  const measuringHand = getHandPreference().measuring || 'right';

  const [phase, setPhase] = useState('guide');
  const [statusText, setStatusText] = useState('Steer left and right with smooth wrist-only motion.');
  const [repsCompleted, setRepsCompleted] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holdLeftMs, setHoldLeftMs] = useState(step.holdSeconds * 1000);
  const [neutralProgress, setNeutralProgress] = useState(0);

  const target = repsCompleted % 2 === 0 ? 'radial' : 'ulnar';

  useEffect(() => {
    repsRef.current = repsCompleted;
  }, [repsCompleted]);

  const finishStep = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setPhase('done');
    play('success');
    pulseHaptic(30);
  }, [play]);

  const completeRep = useCallback(() => {
    if (completedRef.current) return;
    holdStartRef.current = 0;
    pulseHaptic(18);
    play('coin');

    const next = repsRef.current + 1;
    repsRef.current = next;
    setRepsCompleted(next);
    setHoldLeftMs(step.holdSeconds * 1000);

    if (next >= step.count) {
      finishStep();
    } else {
      setStatusText(next % 2 === 0 ? 'Move toward your thumb and hold.' : 'Move toward your pinky and hold.');
    }
  }, [finishStep, play, step.count, step.holdSeconds]);

  const startCalibration = useCallback(async () => {
    if (calibratingRef.current || completedRef.current) return;
    calibratingRef.current = true;
    const granted = permissionState === 'granted' ? true : await requestPermission();
    if (!granted) {
      setPhase('permission');
      setStatusText('Motion access is needed for the exercise to count your holds.');
      calibratingRef.current = false;
      return;
    }

    setPhase('calibrating');
    setStatusText('Hold neutral while we set your baseline.');
    setNeutralProgress(0);
    let progressValue = 0;
    const interval = window.setInterval(() => {
      progressValue += 10;
      setNeutralProgress(Math.min(progressValue, 96));
    }, 90);
    const baseline = await calibrate(900, 4500);
    window.clearInterval(interval);
    setNeutralProgress(100);
    baselineRef.current = {
      alpha: baseline.alpha || 0,
      gamma: baseline.gamma || 0,
    };
    holdStartRef.current = 0;
    setProgress(0);
    setHoldLeftMs(step.holdSeconds * 1000);
    startedAtRef.current = Date.now();
    window.setTimeout(() => setPhase('active'), 260);
    setStatusText('Move toward your thumb and hold.');
    calibratingRef.current = false;
    play('start');
  }, [calibrate, permissionState, phase, play, requestPermission, step.holdSeconds]);

  useEffect(() => {
    if (phase !== 'active') return undefined;

    const loop = () => {
      const angle = getTargetSideDeviationAngle({
        orientation: orientationRef.current,
        baselineAlpha: baselineRef.current.alpha,
        baselineGamma: baselineRef.current.gamma,
        measuringHand,
        target,
        deadzone: 1.5,
        maxDegrees: 40,
      });

      const normalizedProgress = clamp(angle / SIDE_TARGET_DEGREES, 0, 1.2);
      setProgress(clamp(normalizedProgress, 0, 1));

      if (normalizedProgress >= 1) {
        if (!holdStartRef.current) holdStartRef.current = Date.now();
        const elapsed = Date.now() - holdStartRef.current;
        const remaining = Math.max(0, step.holdSeconds * 1000 - elapsed);
        setHoldLeftMs(remaining);
        setStatusText(`Hold ${target === 'radial' ? 'toward thumb' : 'toward pinky'} for ${Math.max(1, Math.ceil(remaining / 1000))}s.`);

        if (remaining <= 0) completeRep();
      } else {
        holdStartRef.current = 0;
        setHoldLeftMs(step.holdSeconds * 1000);
        setStatusText(target === 'radial' ? 'Move toward your thumb and hold.' : 'Move toward your pinky and hold.');
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [completeRep, measuringHand, orientationRef, phase, step.holdSeconds, target]);

  const bobberX = target === 'radial'
    ? layout.sceneWidth * 0.47 + progress * layout.sceneWidth * 0.18
    : layout.sceneWidth * 0.57 - progress * layout.sceneWidth * 0.18;
  const biteOffset = Math.max(18, Math.min(28, layout.sceneWidth * 0.045));
  const fishX = target === 'radial' ? bobberX - biteOffset : bobberX + biteOffset;

  return (
    <LandscapeExerciseShell
      layout={layout}
      step={step}
      stepIndex={stepIndex}
      phase={phase}
      mascotMessage={demoMode ? 'Demo mode is on. Move the cursor to simulate the wrist.' : statusText}
      sceneTitle={step.sceneTitle}
      topContent={
        <>
          {(phase === 'active' || phase === 'done') && (
            <div style={styles.landscapeHudRow}>
              <div style={styles.landscapeHudCard}>REP {Math.min(repsCompleted + 1, step.count)}/{step.count}</div>
              <div style={styles.landscapeHudCard}>
                {holdLeftMs < step.holdSeconds * 1000 ? `HOLD ${formatHoldCountdown(holdLeftMs)}` : `HOLD ${step.holdSeconds}s`}
              </div>
            </div>
          )}
          {phase === 'active' && (
            <PixelTimer seconds={holdLeftMs / 1000} maxSeconds={step.holdSeconds} color={step.accent} />
          )}
        </>
      }
      scene={(
        <>
          <FishingScene
            stage="radial"
            showBobber={phase !== 'guide'}
            showRod={false}
            showDockDecor={phase !== 'guide'}
            bobberX={bobberX}
            bobberY={layout.sceneHeight * 0.52}
            showFish={phase !== 'guide' ? [{ x: fishX, y: layout.sceneHeight * 0.515, size: 0.92, flipped: target === 'radial' }] : []}
            waterLevel={0.48}
            sceneWidth={layout.sceneWidth}
            sceneHeight={layout.sceneHeight}
          />
          {(phase === 'active' || phase === 'done') && (
            <div style={{ ...styles.landscapeStagePanel, right: layout.panelWidth + 108 }}>
              <SideDeviationGraphic
                progress={progress}
                target={target}
                holdActive={holdLeftMs < step.holdSeconds * 1000}
                repsCompleted={repsCompleted}
                totalReps={step.count}
              />
            </div>
          )}
        </>
      )}
      guideContent={(
        <ExerciseGuidePanel
          step={step}
          onStart={startCalibration}
          buttonLabel={phase === 'permission' ? 'ENABLE MOTION' : 'START'}
          helperText={phase === 'permission' ? statusText : 'Same landscape steering setup as measurement.'}
        />
      )}
      activeContent={(
        <>
          {phase === 'calibrating' && <CalibrationStatus label="Hold still for calibration..." progress={neutralProgress} />}
          {phase === 'active' && (
            <div style={styles.landscapeCoachCard}>
              <div style={styles.landscapeCoachLabel}>WRIST ONLY</div>
              <div style={styles.landscapeCoachText}>{statusText}</div>
            </div>
          )}
          {phase === 'done' && (
            <>
              <div style={styles.landscapeCoachCard}>
                <div style={styles.landscapeCoachLabel}>STEP COMPLETE</div>
                <div style={styles.landscapeCoachText}>{step.count} guided reps complete.</div>
              </div>
              <button className="pixel-btn pixel-btn-teal flow-cta" onClick={() => onComplete({
                key: step.key,
                repCount: step.count,
                holdCount: 0,
                durationMs: Date.now() - startedAtRef.current,
                label: `${step.count} reps complete`,
              })}>
                NEXT
              </button>
            </>
          )}
        </>
      )}
    />
  );
}

function RotationStep({ stepIndex, onComplete }) {
  const step = STEP_DEFS[stepIndex];
  const { orientation, permissionState, requestPermission, calibrate, demoMode } = useSensor();
  const { play } = usePixelSound();
  const orientationRef = useOrientationRef(orientation);
  const baselineRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const rotationLockRef = useRef(null);
  const holdStartRef = useRef(0);
  const rafRef = useRef(null);
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);
  const calibratingRef = useRef(false);

  const [phase, setPhase] = useState('guide');
  const [statusText, setStatusText] = useState('Rotate from palm down to palm up with a steady forearm.');
  const [targetIndex, setTargetIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holdLeftMs, setHoldLeftMs] = useState(step.holdSeconds * 1000);
  const [neutralProgress, setNeutralProgress] = useState(0);

  const finishStep = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setPhase('done');
    play('complete');
    pulseHaptic(36);
  }, [play]);

  const startCalibration = useCallback(async () => {
    if (calibratingRef.current || completedRef.current) return;
    calibratingRef.current = true;
    const granted = permissionState === 'granted' ? true : await requestPermission();
    if (!granted) {
      setPhase('permission');
      setStatusText('Motion access is needed for the exercise to count your holds.');
      calibratingRef.current = false;
      return;
    }

    setPhase('calibrating');
    setStatusText('Keep the phone palm down while we set your baseline.');
    setNeutralProgress(0);
    let progressValue = 0;
    const interval = window.setInterval(() => {
      progressValue += 10;
      setNeutralProgress(Math.min(progressValue, 96));
    }, 90);
    const baseline = await calibrate(900, 4500);
    window.clearInterval(interval);
    setNeutralProgress(100);
    baselineRef.current = {
      alpha: baseline.alpha || 0,
      beta: baseline.beta || 0,
      gamma: baseline.gamma || 0,
    };
    rotationLockRef.current = null;
    holdStartRef.current = 0;
    setTargetIndex(0);
    setProgress(0);
    setHoldLeftMs(step.holdSeconds * 1000);
    startedAtRef.current = Date.now();
    window.setTimeout(() => setPhase('active'), 260);
    setStatusText('Hold palm down and stay relaxed.');
    calibratingRef.current = false;
    play('start');
  }, [calibrate, permissionState, phase, play, requestPermission, step.holdSeconds]);

  useEffect(() => {
    if (phase !== 'active') return undefined;

    const loop = () => {
      const current = orientationRef.current;
      const betaDelta = (current.rawBeta ?? current.beta ?? 0) - baselineRef.current.beta;
      const gammaDelta = (current.rawGamma ?? current.gamma ?? 0) - baselineRef.current.gamma;
      const alphaDelta = normalizeHeadingDelta((current.rawAlpha ?? current.alpha ?? 0) - baselineRef.current.alpha);

      if (targetIndex === 0) {
        const stability = Math.hypot(betaDelta, gammaDelta * 0.9);
        const normalized = clamp(1 - stability / STABILITY_TOLERANCE, 0, 1);
        setProgress(normalized);

        if (stability <= STABILITY_TOLERANCE) {
          if (!holdStartRef.current) holdStartRef.current = Date.now();
          const elapsed = Date.now() - holdStartRef.current;
          const remaining = Math.max(0, step.holdSeconds * 1000 - elapsed);
          setHoldLeftMs(remaining);
          setStatusText(`Hold palm down for ${Math.max(1, Math.ceil(remaining / 1000))}s.`);

          if (remaining <= 0) {
            pulseHaptic(18);
            play('coin');
            holdStartRef.current = 0;
            setTargetIndex(1);
            setProgress(0);
            setHoldLeftMs(step.holdSeconds * 1000);
            setStatusText('Rotate toward palm up and hold.');
          }
        } else {
          holdStartRef.current = 0;
          setHoldLeftMs(step.holdSeconds * 1000);
          setStatusText('Hold palm down and stay relaxed.');
        }
      } else {
        if (!rotationLockRef.current) {
          const options = [
            { axis: 'alpha', value: alphaDelta },
            { axis: 'gamma', value: gammaDelta },
            { axis: 'beta', value: betaDelta },
          ].sort((left, right) => Math.abs(right.value) - Math.abs(left.value));

          if (Math.abs(options[0].value) >= AXIS_LOCK_THRESHOLD) {
            rotationLockRef.current = {
              axis: options[0].axis,
              sign: Math.sign(options[0].value) || 1,
            };
          }
        }

        let rotationValue = 0;
        if (rotationLockRef.current) {
          const activeValue = rotationLockRef.current.axis === 'alpha'
            ? alphaDelta
            : rotationLockRef.current.axis === 'gamma'
              ? gammaDelta
              : betaDelta;
          rotationValue = activeValue * rotationLockRef.current.sign;
        }

        const normalized = clamp(rotationValue / ROTATION_TARGET_DEGREES, 0, 1.2);
        setProgress(clamp(normalized, 0, 1));

        if (normalized >= 1) {
          if (!holdStartRef.current) holdStartRef.current = Date.now();
          const elapsed = Date.now() - holdStartRef.current;
          const remaining = Math.max(0, step.holdSeconds * 1000 - elapsed);
          setHoldLeftMs(remaining);
          setStatusText(`Hold palm up for ${Math.max(1, Math.ceil(remaining / 1000))}s.`);

          if (remaining <= 0) finishStep();
        } else {
          holdStartRef.current = 0;
          setHoldLeftMs(step.holdSeconds * 1000);
          setStatusText('Rotate toward palm up and hold.');
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [finishStep, orientationRef, phase, step.holdSeconds, targetIndex, play]);

  return (
    <ExerciseShell
      step={step}
      stepIndex={stepIndex}
      totalSteps={STEP_DEFS.length}
      currentLabel={targetIndex === 0 ? 'Palm down / 2' : 'Palm up / 2'}
      holdLabel={holdLeftMs < step.holdSeconds * 1000 ? `Hold ${formatHoldCountdown(holdLeftMs)}` : `Hold ${step.holdSeconds}s`}
      hint={step.hint}
      footer={
        <div style={styles.exerciseFooterText}>
          {demoMode ? 'Demo mode is on. Move your cursor to simulate motion.' : statusText}
        </div>
      }
    >
      {(phase === 'guide' || phase === 'permission') && (
        <ExerciseGuidePanel
          step={step}
          onStart={startCalibration}
          buttonLabel={phase === 'permission' ? 'ENABLE MOTION' : 'START'}
          helperText={phase === 'permission' ? statusText : 'This one stays portrait. Rest the phone if that helps you rotate cleanly.'}
        />
      )}
      {phase === 'calibrating' && <CalibrationStatus label="Hold still for calibration..." progress={neutralProgress} />}
      {(phase === 'active' || phase === 'done') && (
        <RotationGraphic
          progress={progress}
          targetIndex={targetIndex}
          holdActive={holdLeftMs < step.holdSeconds * 1000}
        />
      )}
      {phase === 'done' && (
        <button
          className="pixel-btn pixel-btn-teal"
          style={styles.largeButton}
          onClick={() => onComplete({
            key: step.key,
            repCount: 0,
            holdCount: 2,
            durationMs: Date.now() - startedAtRef.current,
            label: 'Palm down and palm up holds complete',
          })}
        >
          FINISH
        </button>
      )}
    </ExerciseShell>
  );
}

function CompletionView({ session, streakCount }) {
  const [stats, setStats] = useState({ reps: 0, time: 0, streak: 0 });
  const totalDuration = (session.completedAt || Date.now()) - (session.startedAt || Date.now());

  useEffect(() => {
    let frame = 0;
    const totalFrames = 36;

    const tick = () => {
      frame += 1;
      const t = frame / totalFrames;
      setStats({
        reps: Math.round(session.totalRepCount * t),
        time: Math.round(totalDuration * t),
        streak: Math.round(streakCount * t),
      });

      if (frame < totalFrames) {
        window.setTimeout(tick, 28);
      }
    };

    tick();
  }, [session.totalRepCount, streakCount, totalDuration]);

  useEffect(() => {
    const burst = () => confetti({
      particleCount: 80,
      spread: 72,
      startVelocity: 30,
      origin: { y: 0.15 },
      colors: ['#61a8ff', '#48d7b3', '#f7d66f', '#ffffff'],
    });

    burst();
    const timer = window.setTimeout(burst, 380);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div style={styles.pageShell}>
      <div style={styles.ambientGlowTop} />
      <div style={styles.ambientGlowBottom} />
      <div style={styles.contentColumn}>
        <HeaderPills orientation="Mixed" />
        <div style={styles.completeCard}>
          <div style={styles.completeBadge}>Session Complete</div>
          <div style={styles.completeCheck}>{'\u2713'}</div>
          <div style={styles.completeHeading}>Well done!</div>
          <div style={styles.completeSubheading}>Your exercise session is complete.</div>
          <div style={styles.completeStatsRow}>
            <div style={styles.completeStat}>
              <div style={styles.completeStatValue}>{stats.reps}</div>
              <div style={styles.completeStatLabel}>Total reps</div>
            </div>
            <div style={styles.completeStat}>
              <div style={styles.completeStatValue}>{formatDuration(stats.time)}</div>
              <div style={styles.completeStatLabel}>Total time</div>
            </div>
            <div style={styles.completeStat}>
              <div style={styles.completeStatValue}>{stats.streak}</div>
              <div style={styles.completeStatLabel}>Streak</div>
            </div>
          </div>
          <div style={styles.completeNote}>
            Includes {session.rotationHoldCount} rotation holds in the final exercise.
          </div>
          <div style={styles.completeButtons}>
            <button
              className="pixel-btn pixel-btn-teal"
              style={styles.largeButton}
              onClick={() => {
                clearSession();
                window.location.assign(createPageUrl('History'));
              }}
            >
              See Today&apos;s Progress
            </button>
            <button
              className="pixel-btn pixel-btn-blue"
              style={styles.largeButton}
              onClick={() => {
                clearSession();
                window.location.assign(createPageUrl('Welcome'));
              }}
            >
              Done For Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HubView({ session, onBegin, onResume, onRestart }) {
  const completedCount = session.completedSteps.filter(Boolean).length;
  const ctaLabel = session.status === 'active' ? 'Resume' : 'Begin';
  const ctaHandler = session.status === 'active' ? onResume : onBegin;

  return (
    <div style={styles.pageShell}>
      <div style={styles.ambientGlowTop} />
      <div style={styles.ambientGlowBottom} />
      <div style={styles.contentColumn}>
        <HeaderPills orientation="Mixed" />
        <div style={styles.hubCard}>
          <div style={styles.hubEyebrow}>Exercise Game</div>
          <div style={styles.hubHeading}>Session Hub</div>
          <div style={styles.hubSubheading}>
            Flexion-extension and radial-ulnar stay in the landscape game layout. Pronation-supination stays portrait.
          </div>
          <SessionProgress current={completedCount} total={STEP_DEFS.length} label="Session progress" />
          <div style={styles.hubRows}>
            {STEP_DEFS.map((step, index) => (
              <HubRow
                key={step.key}
                step={step}
                index={index}
                status={
                  index < completedCount
                    ? 'done'
                    : index === session.stepIndex && session.status === 'active'
                      ? 'current'
                      : completedCount === 0 && index === 0
                        ? 'current'
                        : 'queued'
                }
                summary={session.completedSteps[index]}
              />
            ))}
          </div>
          <button className="pixel-btn pixel-btn-teal" style={styles.largeButton} onClick={ctaHandler}>
            {ctaLabel}
          </button>
          {session.status === 'active' && (
            <button className="pixel-btn pixel-btn-blue" style={styles.largeButton} onClick={onRestart}>
              Restart Session
            </button>
          )}
          <button
            className="pixel-btn pixel-btn-wood"
            style={styles.smallExitButton}
            onClick={() => window.location.assign(createPageUrl('Welcome'))}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Exercises() {
  const { play } = usePixelSound();
  const [session, setSession] = useState(() => readSession() || buildIdleSession());
  const [view, setView] = useState(() => {
    const saved = readSession();
    return saved?.status === 'complete' ? 'complete' : 'hub';
  });
  const [streakCount, setStreakCount] = useState(() => getStreakCount(readHistory(), new Date()));
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
    writeSession(session);
  }, [session]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, session.stepIndex]);

  const beginSession = useCallback(() => {
    const next = buildNewSession();
    clearSession();
    setSession(next);
    setView('step');
    play('start');
  }, [play]);

  const resumeSession = useCallback(() => {
    if (sessionRef.current.status !== 'active') {
      beginSession();
      return;
    }
    setView('step');
    play('click');
  }, [beginSession, play]);

  const restartSession = useCallback(() => {
    clearSession();
    setSession(buildNewSession());
    setView('step');
    play('start');
  }, [play]);

  const finishExercise = useCallback((summary) => {
    const current = sessionRef.current;
    const nextCompletedSteps = [...current.completedSteps];
    nextCompletedSteps[current.stepIndex] = summary;

    const totalRepCount = nextCompletedSteps.reduce((sum, item) => sum + (item?.repCount || 0), 0);
    const rotationHoldCount = nextCompletedSteps.reduce((sum, item) => sum + (item?.holdCount || 0), 0);
    const isLastStep = current.stepIndex >= STEP_DEFS.length - 1;

    if (isLastStep) {
      const completedAt = Date.now();
      const nextSession = {
        ...current,
        status: 'complete',
        completedAt,
        completedSteps: nextCompletedSteps,
        totalRepCount,
        rotationHoldCount,
      };
      setSession(nextSession);
      setStreakCount(registerCompletion(completedAt));
      setView('complete');
      play('complete');
      return;
    }

    setSession({
      ...current,
      status: 'active',
      stepIndex: current.stepIndex + 1,
      completedSteps: nextCompletedSteps,
      totalRepCount,
      rotationHoldCount,
    });
    setView('step');
    play('success');
  }, [play]);

  if (view === 'complete' && session.status === 'complete') {
    return <CompletionView session={session} streakCount={streakCount} />;
  }

  if (view === 'hub') {
    return (
      <HubView
        session={session}
        onBegin={beginSession}
        onResume={resumeSession}
        onRestart={restartSession}
      />
    );
  }

  if (session.stepIndex === 0) {
    return <FlexExtensionStep stepIndex={0} onComplete={finishExercise} />;
  }

  if (session.stepIndex === 1) {
    return <SideDeviationStep stepIndex={1} onComplete={finishExercise} />;
  }

  return <RotationStep stepIndex={2} onComplete={finishExercise} />;
}

const styles = {
  pageShell: {
    minHeight: '100dvh',
    background: 'linear-gradient(180deg, #081425 0%, #0d2038 38%, #102a46 100%)',
    position: 'relative',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: '-16%',
    left: '-18%',
    width: '72vw',
    height: '42vh',
    background: 'radial-gradient(circle, rgba(97,168,255,0.24) 0%, rgba(97,168,255,0) 74%)',
    pointerEvents: 'none',
  },
  ambientGlowBottom: {
    position: 'absolute',
    right: '-22%',
    bottom: '-12%',
    width: '78vw',
    height: '40vh',
    background: 'radial-gradient(circle, rgba(72,215,179,0.18) 0%, rgba(72,215,179,0) 74%)',
    pointerEvents: 'none',
  },
  contentColumn: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 430,
    margin: '0 auto',
    padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px calc(20px + env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  headerPillRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerPill: {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid transparent',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  bluePill: {
    color: '#d8ebff',
    background: 'rgba(97, 168, 255, 0.18)',
    borderColor: 'rgba(97, 168, 255, 0.45)',
  },
  greenPill: {
    color: '#d8fff0',
    background: 'rgba(72, 215, 179, 0.16)',
    borderColor: 'rgba(72, 215, 179, 0.42)',
  },
  progressPanel: {
    display: 'grid',
    gap: 8,
  },
  progressTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    fontSize: 8,
    color: '#7fa2c5',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  progressValue: {
    fontSize: 8,
    color: '#d9ebff',
  },
  progressTrack: {
    width: '100%',
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    background: '#13273c',
    border: '2px solid #27425f',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #61a8ff 0%, #48d7b3 100%)',
    borderRadius: 999,
    transition: 'width 220ms ease',
  },
  exerciseGuideCard: {
    background: '#0d1b2e',
    backgroundImage:
      'repeating-linear-gradient(180deg, rgba(46, 85, 132, 0.08) 0px, rgba(46, 85, 132, 0.08) 4px, rgba(13, 27, 46, 0.08) 4px, rgba(13, 27, 46, 0.08) 8px)',
    border: '4px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    padding: 12,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: '100%',
    minWidth: 0,
    overflowX: 'hidden',
  },
  exerciseGuideEyebrow: {
    fontSize: 7,
    lineHeight: 1.8,
    color: '#2ee6c8',
    textTransform: 'uppercase',
  },
  exerciseGuideTitle: {
    fontSize: 12,
    lineHeight: 1.7,
    color: '#F4D35E',
    textShadow: '2px 2px 0 #5C3317',
  },
  exerciseGuideCopy: {
    fontSize: 8,
    lineHeight: 1.8,
    color: '#dce8f6',
  },
  exerciseGuideList: {
    display: 'grid',
    gap: 8,
  },
  exerciseGuideLine: {
    display: 'grid',
    gridTemplateColumns: '14px 1fr',
    gap: 8,
    alignItems: 'start',
    fontSize: 7,
    lineHeight: 1.8,
    color: '#f5e6c8',
  },
  exerciseGuideBullet: {
    color: '#F4D35E',
  },
  exerciseGuideHelper: {
    fontSize: 7,
    lineHeight: 1.8,
    color: '#9fd7ff',
  },
  exerciseGuideButton: {
    minHeight: 52,
    padding: '12px 14px',
    fontSize: 10,
    flexShrink: 0,
    marginTop: 'auto',
  },
  landscapePanelScroller: {
    flex: '1 1 auto',
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  landscapeGuideOverlay: {
    position: 'absolute',
    inset: 12,
    zIndex: 45,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  landscapeGuideScrollShell: {
    maxWidth: 'calc(100% - 24px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    pointerEvents: 'auto',
  },
  landscapeTitleBadge: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 8,
    color: '#F4D35E',
    textShadow: '2px 2px 0 #000',
    background: 'rgba(0,0,0,0.66)',
    padding: '5px 12px',
    border: '3px solid #5C3317',
  },
  landscapeHudRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
    padding: '0 8px',
    boxSizing: 'border-box',
  },
  landscapeHudCard: {
    background: 'rgba(8, 20, 38, 0.9)',
    border: '3px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    padding: '6px 8px',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 6,
    color: '#f4f0de',
    textShadow: '1px 1px 0 #000',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  landscapeStagePanel: {
    position: 'absolute',
    left: 18,
    right: 290,
    bottom: 14,
    maxWidth: 260,
    background: 'rgba(8, 20, 38, 0.86)',
    border: '3px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    padding: 6,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  landscapeCoachCard: {
    width: '100%',
    background: 'rgba(8, 20, 38, 0.92)',
    border: '3px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    padding: '10px 12px',
    display: 'grid',
    gap: 8,
  },
  landscapeCoachLabel: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 6.5,
    lineHeight: 1.8,
    color: '#88ccff',
  },
  landscapeCoachText: {
    fontSize: 7,
    lineHeight: 1.8,
    color: '#f4eadb',
  },
  hubCard: {
    background: '#102038',
    border: '4px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    borderRadius: 0,
    padding: 18,
    boxSizing: 'border-box',
    minWidth: 0,
    display: 'grid',
    gap: 16,
  },
  hubEyebrow: {
    fontSize: 8,
    color: '#83a6ca',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hubHeading: {
    fontSize: 18,
    lineHeight: 1.6,
    color: '#f5fbff',
  },
  hubSubheading: {
    fontSize: 9,
    lineHeight: 1.9,
    color: '#b4cee7',
    wordBreak: 'break-word',
  },
  hubRows: {
    display: 'grid',
    gap: 12,
  },
  hubRow: {
    background: '#0d1b2e',
    border: '3px solid #244a69',
    borderRadius: 0,
    padding: 14,
    boxSizing: 'border-box',
    minWidth: 0,
    display: 'grid',
    gap: 10,
  },
  hubRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  hubRowIndex: {
    fontSize: 7,
    color: '#84a7c8',
    marginBottom: 8,
  },
  hubRowTitle: {
    fontSize: 11,
    lineHeight: 1.7,
    color: '#f3f8ff',
    wordBreak: 'break-word',
  },
  statusChip: {
    flexShrink: 0,
    padding: '8px 10px',
    borderRadius: 999,
    border: '1px solid',
    fontSize: 7,
    letterSpacing: 0.5,
  },
  hubMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubMetaChip: {
    background: 'rgba(20, 38, 60, 0.92)',
    border: '1px solid #38526d',
    borderRadius: 999,
    color: '#d8ecff',
    fontSize: 7,
    padding: '7px 10px',
  },
  hubHint: {
    fontSize: 8,
    lineHeight: 1.8,
    color: '#9ebad5',
  },
  hubSummary: {
    fontSize: 8,
    lineHeight: 1.8,
    color: '#9ff0c8',
  },
  largeButton: {
    width: '100%',
    minHeight: 56,
    padding: '14px 18px',
    fontSize: 12,
    boxSizing: 'border-box',
  },
  smallExitButton: {
    width: '100%',
    minHeight: 48,
    padding: '12px 16px',
    fontSize: 10,
    boxSizing: 'border-box',
  },
  exerciseCard: {
    background: '#102038',
    border: '4px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    borderRadius: 0,
    padding: 18,
    boxSizing: 'border-box',
    minWidth: 0,
    display: 'grid',
    gap: 14,
  },
  exerciseTopMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseMetaPill: {
    padding: '9px 11px',
    borderRadius: 999,
    border: '1px solid #38526d',
    background: 'rgba(20, 38, 60, 0.92)',
    color: '#d8ecff',
    fontSize: 8,
    whiteSpace: 'nowrap',
  },
  exerciseHeading: {
    fontSize: 16,
    lineHeight: 1.6,
    color: '#f5fbff',
    wordBreak: 'break-word',
  },
  exerciseSubheading: {
    fontSize: 9,
    lineHeight: 1.9,
    color: '#b4cee7',
    wordBreak: 'break-word',
  },
  exerciseStage: {
    width: '100%',
    minHeight: 'clamp(220px, 36dvh, 312px)',
    borderRadius: 0,
    border: '3px solid #244a69',
    background: 'linear-gradient(180deg, rgba(13, 27, 46, 0.98) 0%, rgba(8, 20, 38, 0.98) 100%)',
    padding: 12,
    boxSizing: 'border-box',
    minWidth: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseHint: {
    background: 'rgba(17, 36, 57, 0.92)',
    border: '1px solid #2b4965',
    borderRadius: 16,
    padding: '12px 14px',
    color: '#d9e8f8',
    fontSize: 8,
    lineHeight: 1.9,
  },
  exerciseFooterText: {
    fontSize: 8,
    lineHeight: 1.9,
    color: '#98b6d2',
    textAlign: 'center',
  },
  graphicWrap: {
    width: '100%',
    display: 'grid',
    gap: 4,
    alignItems: 'center',
    justifyItems: 'stretch',
    minWidth: 0,
    overflow: 'hidden',
  },
  graphicSvg: {
    width: '100%',
    maxWidth: '100%',
    display: 'block',
  },
  directionRow: {
    display: 'flex',
    width: '100%',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  stepChip: {
    padding: '6px 8px',
    borderRadius: 999,
    border: '1px solid',
    fontSize: 6,
    letterSpacing: 0.4,
    minWidth: 0,
    transition: 'all 180ms ease',
  },
  repDotsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
    gap: 4,
    minWidth: 0,
  },
  repDot: {
    height: 10,
    borderRadius: 999,
    border: '1px solid',
    transition: 'all 180ms ease',
  },
  stageNotice: {
    width: '100%',
    minHeight: 230,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    gap: 14,
    padding: 24,
  },
  stageNoticeTitle: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  stageNoticeBody: {
    fontSize: 8,
    lineHeight: 2,
    color: '#d8ebff',
    maxWidth: 250,
  },
  inlineButton: {
    minHeight: 50,
    padding: '12px 18px',
    fontSize: 10,
  },
  completeCard: {
    background: '#102038',
    border: '4px solid #5C3317',
    boxShadow: '4px 4px 0 #2d1b00',
    borderRadius: 0,
    padding: 22,
    boxSizing: 'border-box',
    minWidth: 0,
    display: 'grid',
    gap: 16,
    textAlign: 'center',
  },
  completeBadge: {
    justifySelf: 'center',
    padding: '9px 12px',
    borderRadius: 999,
    border: '1px solid rgba(72,215,179,0.45)',
    background: 'rgba(72,215,179,0.14)',
    color: '#caffea',
    fontSize: 8,
  },
  completeCheck: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    justifySelf: 'center',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(180deg, #30c982 0%, #1e9d62 100%)',
    color: '#ffffff',
    fontSize: 40,
    boxShadow: '0 0 26px rgba(48,201,130,0.32)',
  },
  completeHeading: {
    fontSize: 18,
    lineHeight: 1.6,
    color: '#f7fcff',
  },
  completeSubheading: {
    fontSize: 9,
    lineHeight: 1.9,
    color: '#b8d1e9',
  },
  completeStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))',
    gap: 10,
  },
  completeStat: {
    borderRadius: 0,
    border: '3px solid #244a69',
    background: '#0d1b2e',
    padding: '16px 10px',
    display: 'grid',
    gap: 10,
  },
  completeStatValue: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#f5fbff',
  },
  completeStatLabel: {
    fontSize: 7,
    lineHeight: 1.8,
    color: '#97b5d0',
    textTransform: 'uppercase',
  },
  completeNote: {
    fontSize: 8,
    lineHeight: 1.8,
    color: '#9ff0c8',
  },
  completeButtons: {
    display: 'grid',
    gap: 10,
  },
};
