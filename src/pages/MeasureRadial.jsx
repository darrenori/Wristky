import React, { useState, useEffect, useRef, useCallback } from 'react';
import FishingScene from '../components/game/FishingScene';
import PixelMascot from '../components/game/PixelMascot';
import PixelTimer from '../components/game/PixelTimer';
import PixelGauge from '../components/game/PixelGauge';
import GameInstructionCard from '../components/game/GameInstructionCard';
import SessionProgressBar from '../components/game/SessionProgressBar';
import { useSensor } from '../components/game/useSensor';
import { usePixelSound } from '../components/game/usePixelSound';
import { getMeasuringHand, getTargetSideDeviationAngle } from '../components/game/sideDeviation';
import {
  clearExerciseFlow,
  getExerciseNextRoute,
  getExercisePageContext,
  saveGameResult,
} from '../components/game/exerciseFlow';
import { useLandscapeGameLayout } from '../components/game/useLandscapeGameLayout';

const TIMEOUT = 25000;
const MIN_MEASURE_MS = 6500;
const MAX_DEG = 40;
const NORMATIVE = 27.8;

const MSGS = [
  'Keep the phone flat and tilt toward your thumb side.',
  'Good. Move only at the wrist, not the forearm.',
  'Great steering. Keep the thumb-side tilt smooth.',
  'Nice radial deviation.',
];

export default function MeasureRadial() {
  const { orientation, calibrate } = useSensor();
  const { play } = usePixelSound();
  const layout = useLandscapeGameLayout();
  const [phase, setPhase] = useState('guide');
  const showPortraitGuideOverlay = phase === 'guide' && layout.isPortraitViewport;
  const [mascotMsg, setMascotMsg] = useState(MSGS[0]);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT / 1000);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [peakAngle, setPeakAngle] = useState(0);
  const [hookX, setHookX] = useState(0);
  const [neutralProgress, setNeutralProgress] = useState(0);
  const [canFinish, setCanFinish] = useState(false);

  const baselineRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const measuringHandRef = useRef(getMeasuringHand());
  const peakRef = useRef(0);
  const needleRef = useRef(0);
  const doneRef = useRef(false);
  const timeoutRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const measureStartRef = useRef(0);
  const exerciseContext = getExercisePageContext('MeasureRadial');
  const nextRoute = getExerciseNextRoute(exerciseContext, 'MeasureUlnar');
  const nextLabel = exerciseContext?.isLastStep ? 'FINISH' : 'NEXT';

  const startNeutral = useCallback(() => {
    doneRef.current = false;
    setPhase('neutral');
    setMascotMsg(MSGS[0]);
    setNeutralProgress(0);
    setCurrentAngle(0);
    setPeakAngle(0);
    setHookX(0);
    setCanFinish(false);
    peakRef.current = 0;
    needleRef.current = 0;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setNeutralProgress(Math.min(progress, 100));
      if (progress >= 100) clearInterval(interval);
    }, 80);

    calibrate(1000, 4500).then((res) => {
      clearInterval(interval);
      setNeutralProgress(100);
      baselineRef.current = { alpha: res.alpha || 0, beta: res.beta || 0, gamma: res.gamma || 0 };
      setTimeout(() => setPhase('measuring'), 400);
    });
  }, [calibrate]);

  useEffect(() => {
    if (phase !== 'measuring') return undefined;
    measureStartRef.current = Date.now();
    setCanFinish(false);
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'measuring') return undefined;

    const start = Date.now();
    const tick = () => {
      const remaining = Math.max(0, (TIMEOUT - (Date.now() - start)) / 1000);
      setTimeLeft(remaining);
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

    const loop = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      lastTsRef.current = ts;

      const targetAngle = getTargetSideDeviationAngle({
        orientation,
        baselineAlpha: baselineRef.current.alpha,
        baselineGamma: baselineRef.current.gamma,
        measuringHand: measuringHandRef.current,
        target: 'radial',
        deadzone: 1.5,
        maxDegrees: MAX_DEG,
      });

      needleRef.current = needleRef.current * 0.72 + targetAngle * 0.28;
      needleRef.current = Math.max(0, Math.min(MAX_DEG, needleRef.current));

      const angle = needleRef.current;
      setCurrentAngle(angle);
      setHookX(angle / MAX_DEG);

      if (angle > peakRef.current) {
        peakRef.current = angle;
        setPeakAngle(angle);
      }

      const elapsed = Date.now() - measureStartRef.current;
      if (elapsed >= MIN_MEASURE_MS && peakRef.current >= 8) {
        setCanFinish(true);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, orientation]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(timeoutRef.current);
    play('bite');

    saveGameResult('radial', peakRef.current, exerciseContext);
    setPhase('done');
    setMascotMsg(`Radial done. Peak: ${Math.round(peakRef.current)} deg.`);
  }, [exerciseContext, play]);

  const pct = peakAngle / NORMATIVE;
  const normColor = pct >= 0.8 ? '#3e8948' : pct >= 0.5 ? '#f4d35e' : '#c0392b';
  const W = layout.sceneWidth;
  const H = layout.sceneHeight;
  const biteOffset = Math.max(18, Math.min(28, W * 0.045));
  const bobberX = W * 0.48 + hookX * W * 0.18;
  const fishX = bobberX - biteOffset;

  return (
    <div style={layout.outerStyle}>
      {showPortraitGuideOverlay && (
        <div style={layout.portraitGuideOverlayStyle}>
          <div style={layout.portraitGuideCardStyle}>
            <GameInstructionCard
              gamePage="MeasureRadial"
              rotatedModal={false}
              style={{ minHeight: 0, maxWidth: 'none', marginInline: 0, overflowY: 'visible' }}
            />
            <div style={layout.portraitGuideFooterStyle}>
              <button className="pixel-btn pixel-btn-teal flow-cta" onClick={() => { play('start'); setPhase('intro'); }}>
                START
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={layout.stageStyle}>
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <FishingScene
            stage="radial"
            showBobber
            showRod={false}
            showDockDecor={phase === 'measuring' || phase === 'done'}
            bobberX={bobberX}
            bobberY={H * 0.52}
            showFish={phase === 'measuring' ? [{ x: fishX, y: H * 0.515, size: 0.92, flipped: true }] : []}
            waterLevel={0.48}
            sceneWidth={layout.sceneWidth}
            sceneHeight={layout.sceneHeight}
          />

          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: layout.overlayRight,
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
              RADIAL
            </div>
            {exerciseContext && (
              <SessionProgressBar
                current={exerciseContext.stepIndex + 1}
                total={exerciseContext.totalSteps}
                label="SMART EXERCISE"
                accent="#f2c14e"
              />
            )}
            {phase === 'measuring' && (
              <>
                <PixelTimer seconds={timeLeft} maxSeconds={TIMEOUT / 1000} />
                <div style={{ background: 'rgba(0,0,0,0.7)', border: '3px solid #5C3317', padding: '8px 12px' }}>
                  <PixelGauge value={currentAngle / MAX_DEG} label="RADIAL" color="#f4d35e" maxDegrees={MAX_DEG} />
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 7,
                      color: '#F4D35E',
                      textAlign: 'center',
                      marginTop: 6,
                    }}
                  >
                    PEAK: {Math.round(peakAngle)} deg
                  </div>
                </div>
              </>
            )}
            {phase === 'done' && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.85)',
                  border: `4px solid ${normColor}`,
                  padding: '12px 20px',
                  textAlign: 'center',
                  animation: 'celebrationPop 0.4s ease-out',
                }}
              >
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: normColor, marginBottom: 6 }}>
                  RADIAL
                </div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#fff' }}>
                  {Math.round(peakAngle)} deg
                </div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#888', marginTop: 4 }}>
                  norm: {NORMATIVE} deg
                </div>
              </div>
            )}
          </div>

          {!showPortraitGuideOverlay && (
            <div
              ref={phase === 'guide' ? layout.guidePanelRef : layout.actionPanelRef}
              {...(phase === 'guide' ? layout.guidePanelHandlers : layout.actionPanelHandlers)}
              style={phase === 'guide' ? layout.guidePanelStyle : layout.actionPanelStyle}
            >
              {phase === 'guide' && (
                <>
                  <GameInstructionCard
                    gamePage="MeasureRadial"
                    style={{ minHeight: 0, maxWidth: 'none', marginInline: 0, overflowY: 'visible' }}
                  />
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
                      <p className="flow-status-label">Hold flat and still...</p>
                      <div className="flow-progress-shell">
                        <div className="flow-progress-fill" style={{ width: `${neutralProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {phase === 'measuring' && (
                    <button
                      className="pixel-btn pixel-btn-blue flow-cta"
                      onClick={finish}
                      disabled={!canFinish}
                    >
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
          )}
        </div>
      </div>
    </div>
  );
}
