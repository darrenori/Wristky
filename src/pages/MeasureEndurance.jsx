import React, { useState, useEffect, useRef, useCallback } from 'react';
import FishingScene from '../components/game/FishingScene';
import PixelMascot from '../components/game/PixelMascot';
import PixelTimer from '../components/game/PixelTimer';
import GameInstructionCard from '../components/game/GameInstructionCard';
import SessionProgressBar from '../components/game/SessionProgressBar';
import { useSensor } from '../components/game/useSensor';
import { usePixelSound } from '../components/game/usePixelSound';
import {
  clearExerciseFlow,
  getExerciseNextRoute,
  getExercisePageContext,
  saveGameResult,
} from '../components/game/exerciseFlow';

const HOLD_TIME = 18000;
const MIN_MEASURE_MS = 10000;

const MSGS = [
  'Keep the boat steady and your wrist level.',
  'Nice and steady. Hold your position for the boat.',
  'Stay calm. The water is still and you are nearly done.',
  'Excellent control. That was a smooth steady hold.',
];

export default function MeasureEndurance() {
  const { orientation, calibrate } = useSensor();
  const { play } = usePixelSound();
  const [phase, setPhase] = useState('guide');
  const [mascotMsg, setMascotMsg] = useState(MSGS[0]);
  const [timeLeft, setTimeLeft] = useState(HOLD_TIME / 1000);
  const [steadiness, setSteadiness] = useState(100);
  const [neutralProgress, setNeutralProgress] = useState(0);
  const [canFinish, setCanFinish] = useState(false);
  const [resultScore, setResultScore] = useState(0);
  const [ripples, setRipples] = useState([]);

  const baselineRef = useRef({ beta: 0, gamma: 0 });
  const steadinessSamplesRef = useRef([]);
  const doneRef = useRef(false);
  const timeoutRef = useRef(null);
  const rafRef = useRef(null);
  const measureStartRef = useRef(0);
  const exerciseContext = getExercisePageContext('MeasureEndurance');
  const nextRoute = getExerciseNextRoute(exerciseContext, 'MeasureCircle2');
  const nextLabel = exerciseContext?.isLastStep ? 'FINISH' : 'NEXT';

  const startNeutral = useCallback(() => {
    doneRef.current = false;
    setPhase('neutral');
    setNeutralProgress(0);
    setSteadiness(100);
    setResultScore(0);
    steadinessSamplesRef.current = [];

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setNeutralProgress(Math.min(progress, 100));
      if (progress >= 100) clearInterval(interval);
    }, 80);

    calibrate(800, 4000).then((result) => {
      clearInterval(interval);
      baselineRef.current = { beta: result.beta || 0, gamma: result.gamma || 0 };
      setTimeout(() => {
        setPhase('measuring');
        play('cast');
      }, 400);
    });
  }, [calibrate, play]);

  useEffect(() => {
    if (phase !== 'measuring') return undefined;
    measureStartRef.current = Date.now();
    setCanFinish(false);

    const start = Date.now();
    let messageIndex = 0;

    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, (HOLD_TIME - elapsed) / 1000);
      setTimeLeft(remaining);

      const nextMessageIndex = Math.min(Math.floor(elapsed / 4000), MSGS.length - 1);
      if (nextMessageIndex !== messageIndex) {
        messageIndex = nextMessageIndex;
        setMascotMsg(MSGS[messageIndex]);
      }

      if (remaining <= 0 && !doneRef.current) {
        finish();
        return;
      }
      timeoutRef.current = requestAnimationFrame(tick);
    };

    timeoutRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timeoutRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'measuring') return undefined;

    const loop = () => {
      const beta = (orientation.rawBeta ?? orientation.beta ?? 0) - baselineRef.current.beta;
      const gamma = (orientation.rawGamma ?? orientation.gamma ?? 0) - baselineRef.current.gamma;
      const motion = Math.sqrt(beta * beta + gamma * gamma);

      steadinessSamplesRef.current.push(motion);
      if (steadinessSamplesRef.current.length > 30) steadinessSamplesRef.current.shift();

      const averageMotion = steadinessSamplesRef.current.reduce((sum, value) => sum + value, 0) / steadinessSamplesRef.current.length;
      const score = Math.max(0, Math.min(100, 100 - averageMotion * 4));
      setSteadiness(Math.round(score));

      if (Date.now() - measureStartRef.current >= MIN_MEASURE_MS) {
        setCanFinish(true);
      }

      if (motion > 8 && Math.random() < 0.05) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setRipples((current) => [
          ...current.slice(-3),
          {
            id: Date.now(),
            x: width * (0.45 + Math.random() * 0.15),
            y: height * (0.5 + Math.random() * 0.05),
          },
        ]);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [orientation, phase]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(timeoutRef.current);

    const averageSteadiness = steadinessSamplesRef.current.length > 0
      ? Math.max(0, 100 - (steadinessSamplesRef.current.reduce((sum, value) => sum + value, 0) / steadinessSamplesRef.current.length) * 4)
      : 50;
    const roundedScore = Math.round(averageSteadiness);

    setResultScore(roundedScore);
    play(roundedScore > 70 ? 'success' : 'bite');

    saveGameResult('endurance', roundedScore, exerciseContext);
    setPhase('done');
    setMascotMsg(roundedScore > 70 ? 'Rock solid. One final net spin is next.' : 'Nice patience. One final net spin is next.');
  }, [exerciseContext, play]);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const instability = phase === 'measuring'
    ? (100 - steadiness) / 100
    : phase === 'done'
      ? (100 - resultScore) / 100
      : 0.18;
  const boatRockAmount = Math.max(0.18, Math.min(1, instability));

  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <FishingScene
        stage="endurance"
        showBobber
        showRod={false}
        showDock={false}
        bobberX={width * 0.58}
        bobberY={height * 0.5}
        showFish={[]}
        ripples={ripples}
        onRippleDone={(id) => setRipples((current) => current.filter((item) => item.id !== id))}
        waterLevel={0.48}
        boat={{
          x: width * 0.34,
          y: height * 0.43,
          scale: Math.max(0.92, Math.min(width / 360, 1.18)),
          rocking: true,
          rockAmount: boatRockAmount,
        }}
      />

      {phase === 'measuring' && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 16,
            background: 'rgba(0,0,0,0.7)',
            border: '3px solid #5C3317',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#88ccff' }}>STEADY</span>
          <svg width={20} height={80} style={{ imageRendering: 'pixelated' }}>
            <rect x="0" y="0" width="20" height="80" fill="#1a1a2e" shapeRendering="crispEdges" />
            <rect
              x="2"
              y={80 - (steadiness / 100) * 76}
              width="16"
              height={(steadiness / 100) * 76}
              fill={steadiness > 70 ? '#3e8948' : steadiness > 40 ? '#f4d35e' : '#c0392b'}
              shapeRendering="crispEdges"
            />
            <rect x="0" y="0" width="20" height="80" fill="none" stroke="#5C3317" strokeWidth="2" />
          </svg>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#F4D35E' }}>
            {steadiness}%
          </span>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: '#F4D35E',
            textShadow: '2px 2px 0 #000',
            background: 'rgba(0,0,0,0.6)',
            padding: '6px 14px',
            border: '3px solid #5C3317',
          }}
        >
          HOLD STILL
        </div>

        {exerciseContext && (
          <SessionProgressBar
            current={exerciseContext.stepIndex + 1}
            total={exerciseContext.totalSteps}
            label="SMART EXERCISE"
            accent="#f59e63"
          />
        )}

        {phase === 'measuring' && (
          <PixelTimer seconds={timeLeft} maxSeconds={HOLD_TIME / 1000} color="#88ccff" />
        )}

        {phase === 'done' && (
          <div
            style={{
              background: 'rgba(0,0,0,0.85)',
              border: '4px solid #3e8948',
              padding: '12px 20px',
              textAlign: 'center',
              animation: 'celebrationPop 0.4s ease-out',
            }}
          >
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#3e8948', marginBottom: 6 }}>
              ENDURANCE
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#fff' }}>
              {resultScore}%
            </div>
          </div>
        )}
      </div>

      <div className={phase === 'guide' ? 'flow-fixed-footer flow-guide-footer' : 'flow-fixed-footer'}>
        {phase === 'guide' && (
          <>
            <GameInstructionCard gamePage="MeasureEndurance" />
            <button className="pixel-btn pixel-btn-teal flow-cta" onClick={() => { play('start'); setPhase('intro'); }}>
              START
            </button>
          </>
        )}
        {phase !== 'guide' && (
          <>
            <PixelMascot message={mascotMsg} size={40} />
            {phase === 'intro' && (
              <button className="pixel-btn pixel-btn-teal flow-cta" onClick={startNeutral}>
                START
              </button>
            )}
            {phase === 'neutral' && (
              <div className="flow-status-card">
                <p className="flow-status-label">Setting up...</p>
                <div className="flow-progress-shell">
                  <div className="flow-progress-fill" style={{ width: `${neutralProgress}%` }} />
                </div>
              </div>
            )}
            {phase === 'measuring' && (
              <button className="pixel-btn pixel-btn-blue flow-cta" onClick={finish} disabled={!canFinish}>
                {canFinish ? 'DONE' : 'WAIT'}
              </button>
            )}
            {phase === 'done' && (
              <button
                className="pixel-btn pixel-btn-teal flow-cta"
                onClick={() => {
                  play('start');
                  if (exerciseContext?.isLastStep) clearExerciseFlow();
                  window.location.href = nextRoute;
                }}
              >
                {nextLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
