import React, { useState, useEffect, useRef, useCallback } from 'react';
import FishingScene from '../components/game/FishingScene';
import PixelMascot from '../components/game/PixelMascot';
import PixelTimer from '../components/game/PixelTimer';
import PixelGauge from '../components/game/PixelGauge';
import GameInstructionCard from '../components/game/GameInstructionCard';
import SessionProgressBar from '../components/game/SessionProgressBar';
import { useSensor } from '../components/game/useSensor';
import { usePixelSound } from '../components/game/usePixelSound';
import { captureSignedMotionDirection, getFlexExtensionMeasurement } from '../components/game/flexExtensionAxis';
import { getHandPreference } from '../components/game/useLocalStorage';
import {
  clearExerciseFlow,
  getExerciseNextRoute,
  getExercisePageContext,
  saveGameResult,
} from '../components/game/exerciseFlow';
import { useLandscapeGameLayout } from '../components/game/useLandscapeGameLayout';

const TIMEOUT = 25000;
const MIN_MEASURE_MS = 6500;
const MAX_DEG = 90;
const NORMATIVE = 79.5;

const MSGS = [
  'Cast the rod. Follow the extension demo from neutral.',
  'Move slowly and keep the forearm steady.',
  'Pause at your comfortable end range for a moment.',
  'Great extension. The cast is complete.',
];

export default function MeasureExtension() {
  const { orientation, calibrate } = useSensor();
  const { play } = usePixelSound();
  const layout = useLandscapeGameLayout();
  const [phase, setPhase] = useState('guide');
  const showPortraitGuideOverlay = phase === 'guide' && layout.isPortraitViewport;
  const [mascotMsg, setMascotMsg] = useState(MSGS[0]);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT / 1000);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [peakAngle, setPeakAngle] = useState(0);
  const [rodAngle, setRodAngle] = useState(-20);
  const [ripples, setRipples] = useState([]);
  const [neutralProgress, setNeutralProgress] = useState(0);
  const [canFinish, setCanFinish] = useState(false);

  const baselineRef = useRef({ beta: 0, gamma: 0 });
  const axisLockRef = useRef(null);
  const directionLockRef = useRef(0);
  const targetDirectionRef = useRef(0);
  const directionCandidateRef = useRef({ sign: 0, since: 0 });
  const peakRef = useRef(0);
  const needleRef = useRef(0);
  const doneRef = useRef(false);
  const measuringHandRef = useRef(getHandPreference().measuring || 'right');
  const timeoutRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const measureStartRef = useRef(0);
  const exerciseContext = getExercisePageContext('MeasureExtension');
  const nextRoute = getExerciseNextRoute(exerciseContext, 'MeasureFlexion');
  const nextLabel = exerciseContext?.isLastStep ? 'FINISH' : 'NEXT';

  const startNeutral = useCallback(() => {
    doneRef.current = false;
    setPhase('neutral');
    setNeutralProgress(0);
    setPeakAngle(0);
    peakRef.current = 0;
    axisLockRef.current = null;
    directionLockRef.current = 0;
    targetDirectionRef.current = 0;
    directionCandidateRef.current = { sign: 0, since: 0 };
    setCurrentAngle(0);
    setRodAngle(-20);
      setCanFinish(false);

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
    setCanFinish(false);

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

      const measurement = getFlexExtensionMeasurement({
        orientation,
        baseline: baselineRef.current,
        axisLock: axisLockRef.current,
        directionLock: directionLockRef.current,
        maxDegrees: MAX_DEG,
        measuringHand: measuringHandRef.current,
      });
      axisLockRef.current = measurement.axisLock;
      directionLockRef.current = measurement.directionLock;
      captureSignedMotionDirection({
        signedAngle: measurement.signedTargetAngle,
        directionRef: targetDirectionRef,
        candidateRef: directionCandidateRef,
      });

      const directedAngle = targetDirectionRef.current
        ? Math.max(0, measurement.signedTargetAngle * targetDirectionRef.current)
        : 0;

      needleRef.current = needleRef.current * 0.72 + directedAngle * 0.28;
      needleRef.current = Math.max(0, Math.min(MAX_DEG, needleRef.current));

      const angle = needleRef.current;
      setCurrentAngle(angle);

      if (angle > peakRef.current) {
        peakRef.current = angle;
        setPeakAngle(angle);
      }

      if (!canFinish && Date.now() - measureStartRef.current >= MIN_MEASURE_MS && peakRef.current >= 12) {
        setCanFinish(true);
      }

      setRodAngle(-20 + (angle / MAX_DEG) * -30);
      rafRef.current = requestAnimationFrame(loop);
    };

    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canFinish, orientation, phase]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(timeoutRef.current);
    play('cast');

    setRipples([{ id: Date.now(), x: layout.sceneWidth * 0.6, y: layout.sceneHeight * 0.52 }]);

    saveGameResult('extension', peakRef.current, exerciseContext);
    setPhase('done');
    setMascotMsg(`Rod cast. Peak extension: ${Math.round(peakRef.current)} deg (target: ${NORMATIVE} deg).`);
  }, [exerciseContext, layout.sceneHeight, layout.sceneWidth, play]);

  const completionRatio = peakAngle / NORMATIVE;
  const normColor = completionRatio >= 0.8 ? '#3e8948' : completionRatio >= 0.5 ? '#f4d35e' : '#c0392b';
  const showActiveScene = phase === 'measuring' || phase === 'done';

  return (
    <div style={layout.outerStyle}>
      {showPortraitGuideOverlay && (
        <div style={layout.portraitGuideOverlayStyle}>
          <div style={layout.portraitGuideCardStyle}>
            <GameInstructionCard
              gamePage="MeasureExtension"
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
            stage="extension"
            showBobber={phase === 'done'}
            showRod={showActiveScene}
            showDockDecor={showActiveScene}
            ripples={ripples}
            onRippleDone={(id) => setRipples((current) => current.filter((item) => item.id !== id))}
            rodAngle={rodAngle}
            waterLevel={0.5}
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
                fontSize: 10,
                color: '#F4D35E',
                textShadow: '2px 2px 0 #000',
                background: 'rgba(0,0,0,0.6)',
                padding: '6px 14px',
                border: '3px solid #5C3317',
              }}
            >
              CAST THE ROD
            </div>

            {exerciseContext && (
              <SessionProgressBar
                current={exerciseContext.stepIndex + 1}
                total={exerciseContext.totalSteps}
                label="SMART EXERCISE"
                accent="#58a6ff"
              />
            )}

            {phase === 'measuring' && (
              <>
                <PixelTimer seconds={timeLeft} maxSeconds={TIMEOUT / 1000} />
                <div style={{ background: 'rgba(0,0,0,0.7)', border: '3px solid #5C3317', padding: '8px 12px' }}>
                  <PixelGauge value={currentAngle / MAX_DEG} label="EXTENSION" color="#2c5ea8" maxDegrees={MAX_DEG} />
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
                  EXTENSION
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
                    gamePage="MeasureExtension"
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
                      <p className="flow-status-label">Hold still like the demo...</p>
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
          )}
        </div>
      </div>
    </div>
  );
}
