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

const TIMEOUT = 20000;
const MIN_MEASURE_MS = 9000;
const CIRCLE_BINS = 24;

const MSGS = [
  'Spin the net with one big wrist circle.',
  'Keep going. Draw a full, smooth circle.',
  'Nice rhythm. Keep the circle even.',
  'Almost done. Finish the circle slowly.',
];

function normalizeAngle(angle) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function calculateSmoothnessScore(points) {
  if (points.length <= 5) return 0;

  const angularDeltas = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = Math.atan2(points[index - 1].beta, points[index - 1].gamma);
    const current = Math.atan2(points[index].beta, points[index].gamma);
    angularDeltas.push(normalizeAngle(current - previous));
  }

  const mean = angularDeltas.reduce((sum, value) => sum + value, 0) / angularDeltas.length;
  const variance = angularDeltas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / angularDeltas.length;
  return Math.round(Math.max(0, Math.min(100, 100 - variance * 1000)));
}

export default function MeasureCircle() {
  const { orientation, calibrate } = useSensor();
  const { play } = usePixelSound();
  const [phase, setPhase] = useState('guide');
  const [mascotMsg, setMascotMsg] = useState(MSGS[0]);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT / 1000);
  const [circleProgress, setCircleProgress] = useState(0);
  const [smoothnessScore, setSmoothnessScore] = useState(0);
  const [trailPoints, setTrailPoints] = useState([]);
  const [netAngle, setNetAngle] = useState(0);
  const [ripples, setRipples] = useState([]);
  const [neutralProgress, setNeutralProgress] = useState(0);

  const baselineRef = useRef({ beta: 0, gamma: 0 });
  const samplesRef = useRef([]);
  const coverageBinsRef = useRef(new Set());
  const smoothnessScoreRef = useRef(0);
  const doneRef = useRef(false);
  const timeoutRef = useRef(null);
  const rafRef = useRef(null);
  const measureStartRef = useRef(0);

  const isPost = window.location.pathname.includes('MeasureCircle2') || window.location.href.includes('MeasureCircle2');
  const nextPage = isPost ? 'Results' : 'MeasureExtension';
  const exerciseContext = getExercisePageContext('MeasureCircle');
  const nextRoute = getExerciseNextRoute(exerciseContext, nextPage);
  const nextLabel = exerciseContext?.isLastStep ? 'FINISH' : isPost ? 'RESULTS' : 'NEXT';

  const startNeutral = useCallback(() => {
    doneRef.current = false;
    setPhase('neutral');
    setNeutralProgress(0);
    setTrailPoints([]);
    setCircleProgress(0);
    setSmoothnessScore(0);
    samplesRef.current = [];
    coverageBinsRef.current = new Set();
    smoothnessScoreRef.current = 0;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setNeutralProgress(Math.min(progress, 100));
      if (progress >= 100) clearInterval(interval);
    }, 80);

    calibrate(800, 4000).then((result) => {
      clearInterval(interval);
      setNeutralProgress(100);
      baselineRef.current = { beta: result.beta || 0, gamma: result.gamma || 0 };
      setTimeout(() => setPhase('measuring'), 400);
    });
  }, [calibrate]);

  useEffect(() => {
    if (phase !== 'measuring') return undefined;
    measureStartRef.current = Date.now();

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, (TIMEOUT - elapsed) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        finishMeasure();
        return;
      }
      timeoutRef.current = requestAnimationFrame(tick);
    };

    timeoutRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timeoutRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'measuring') return undefined;

    let lastTime = null;
    let sampleCount = 0;

    const loop = (ts) => {
      if (!lastTime) lastTime = ts;
      const dt = (ts - lastTime) / 1000;
      lastTime = ts;

      const beta = (orientation.rawBeta ?? orientation.beta ?? 0) - baselineRef.current.beta;
      const gamma = (orientation.rawGamma ?? orientation.gamma ?? 0) - baselineRef.current.gamma;

      samplesRef.current.push({ beta, gamma, time: ts });
      if (samplesRef.current.length > 80) samplesRef.current.shift();

      setTrailPoints((current) => [...current, { x: gamma, y: beta }].slice(-40));
      setNetAngle((current) => current + (gamma * 3 + beta * 3) * dt * 40);

      const sampleAngle = (Math.atan2(beta, gamma) + Math.PI * 2) % (Math.PI * 2);
      const angleBin = Math.min(CIRCLE_BINS - 1, Math.floor((sampleAngle / (Math.PI * 2)) * CIRCLE_BINS));
      coverageBinsRef.current.add(angleBin);
      setCircleProgress(Math.round((coverageBinsRef.current.size / CIRCLE_BINS) * 100));

      const points = samplesRef.current;
      const nextSmoothnessScore = calculateSmoothnessScore(points);
      smoothnessScoreRef.current = nextSmoothnessScore;
      setSmoothnessScore(nextSmoothnessScore);

      sampleCount += 1;
      if (sampleCount % 30 === 0) {
        const messageIndex = Math.min(Math.floor(sampleCount / 60), MSGS.length - 1);
        setMascotMsg(MSGS[messageIndex]);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, orientation]);

  const finishMeasure = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(timeoutRef.current);
    play('success');

    const finalSmoothnessScore = samplesRef.current.length > 5
      ? calculateSmoothnessScore(samplesRef.current)
      : smoothnessScoreRef.current;
    smoothnessScoreRef.current = finalSmoothnessScore;
    setSmoothnessScore(finalSmoothnessScore);

    setRipples([
      { id: 1, x: window.innerWidth * 0.5, y: window.innerHeight * 0.55 },
      { id: 2, x: window.innerWidth * 0.6, y: window.innerHeight * 0.6 },
    ]);

    const key = isPost ? 'smoothness_post' : 'smoothness_pre';
    saveGameResult(key, finalSmoothnessScore, exerciseContext);
    setPhase('done');
    setMascotMsg('Great catch. The net spin is complete.');
  }, [exerciseContext, isPost, play]);

  useEffect(() => {
    if (phase !== 'measuring' || doneRef.current) return undefined;
    const elapsed = Date.now() - measureStartRef.current;
    if (circleProgress < 90 || elapsed < MIN_MEASURE_MS) return undefined;

    const timer = setTimeout(() => finishMeasure(), 800);
    return () => clearTimeout(timer);
  }, [circleProgress, finishMeasure, phase]);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const centerX = width / 2;
  const centerY = height * 0.45;

  const fishPositions = trailPoints.length > 5
    ? [
        {
          x: centerX + trailPoints[Math.floor(trailPoints.length * 0.3)].x * 3,
          y: centerY + trailPoints[Math.floor(trailPoints.length * 0.3)].y * 3,
          color: '#F4A03A',
          size: 1,
        },
        {
          x: centerX + trailPoints[Math.floor(trailPoints.length * 0.6)].x * 3,
          y: centerY + trailPoints[Math.floor(trailPoints.length * 0.6)].y * 3,
          color: '#3AF4A0',
          size: 0.8,
        },
      ]
    : [];

  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <FishingScene
        stage="circle"
        showBobber={false}
        showFish={fishPositions}
        ripples={ripples}
        onRippleDone={(id) => setRipples((current) => current.filter((item) => item.id !== id))}
        rodAngle={netAngle % 40 - 20}
        waterLevel={0.5}
      />

      {phase === 'measuring' && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={width} height={height}>
          {trailPoints.length > 2 && trailPoints.map((point, index) => {
            if (index === 0) return null;
            const previous = trailPoints[index - 1];
            const alpha = index / trailPoints.length;
            return (
              <line
                key={index}
                x1={centerX + previous.x * 3}
                y1={centerY + previous.y * 3}
                x2={centerX + point.x * 3}
                y2={centerY + point.y * 3}
                stroke={`rgba(244,211,94,${alpha * 0.8})`}
                strokeWidth={3}
                strokeLinecap="square"
              />
            );
          })}
          <circle
            cx={centerX}
            cy={centerY}
            r={40}
            fill="none"
            stroke="rgba(244,211,94,0.3)"
            strokeWidth={3}
            strokeDasharray="8 8"
            transform={`rotate(${netAngle}, ${centerX}, ${centerY})`}
          />
        </svg>
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
            fontSize: 10,
            color: '#F4D35E',
            textShadow: '2px 2px 0 #000',
            background: 'rgba(0,0,0,0.6)',
            padding: '6px 14px',
            border: '3px solid #5C3317',
          }}
        >
          {isPost ? 'NET SPIN 2' : 'SPIN THE NET'}
        </div>

        {exerciseContext && (
          <SessionProgressBar
            current={exerciseContext.stepIndex + 1}
            total={exerciseContext.totalSteps}
            label="SMART EXERCISE"
            accent="#32d296"
          />
        )}

        {phase === 'measuring' && <PixelTimer seconds={timeLeft} maxSeconds={TIMEOUT / 1000} />}

        {phase === 'measuring' && (
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '3px solid #5C3317',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width={80} height={80} style={{ imageRendering: 'pixelated' }}>
              <circle cx={40} cy={40} r={34} fill="none" stroke="#2a2a4e" strokeWidth={8} />
              <circle
                cx={40}
                cy={40}
                r={34}
                fill="none"
                stroke="#F4D35E"
                strokeWidth={8}
                strokeDasharray={`${(circleProgress / 100) * 213.6} 213.6`}
                transform="rotate(-90 40 40)"
                strokeLinecap="square"
              />
              <text x="40" y="44" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="'Press Start 2P', monospace">
                {circleProgress}%
              </text>
            </svg>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#88ccff' }}>
              Smoothness: {smoothnessScore}
            </span>
            <span style={{ fontFamily: '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontSize: 15, fontWeight: 700, color: '#d9f4ff' }}>
              {Date.now() - measureStartRef.current < MIN_MEASURE_MS ? 'Keep drawing smooth circles' : 'Circle complete, finishing soon'}
            </span>
          </div>
        )}
      </div>

      <div className={phase === 'guide' ? 'flow-fixed-footer flow-guide-footer' : 'flow-fixed-footer'}>
        {phase === 'guide' && (
          <>
            <GameInstructionCard gamePage="MeasureCircle" />
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
                <p className="flow-status-label">
                  Hold still, finding neutral...
                </p>
                <div className="flow-progress-shell">
                  <div className="flow-progress-fill" style={{ width: `${neutralProgress}%` }} />
                </div>
              </div>
            )}
            {phase === 'done' && (
              <button
                className="pixel-btn pixel-btn-teal flow-cta"
                style={{ animation: 'celebrationPop 0.4s ease-out' }}
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
