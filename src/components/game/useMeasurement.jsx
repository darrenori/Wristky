import { useState, useEffect, useRef, useCallback } from 'react';
import { useSensor } from './useSensor';

const TIMEOUT = 25000;
const DEADZONE = 2; // degrees

export function useMeasurement({ onComplete, maxAngle = 90 }) {
  const { orientation, calibrate, permissionState } = useSensor();
  const [phase, setPhase] = useState('neutral'); // neutral|measuring|done
  const [neutralBaseline, setNeutralBaseline] = useState({ beta: 0, gamma: 0 });
  const [peak, setPeak] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT / 1000);
  const [neutralProgress, setNeutralProgress] = useState(0);

  // Damped needle physics
  const needleRef = useRef(0);
  const needleVelRef = useRef(0);
  const SPRING = 8;
  const DAMPING = 0.7;
  const lastTimeRef = useRef(null);

  const baselineRef = useRef({ beta: 0, gamma: 0 });
  const peakRef = useRef(0);
  const timeoutRef = useRef(null);
  const rafRef = useRef(null);
  const doneRef = useRef(false);

  // Phase 1: measure neutral (0.8s)
  const startNeutral = useCallback(() => {
    setPhase('neutral');
    setNeutralProgress(0);
    doneRef.current = false;

    calibrate(800, 4000).then(res => {
      baselineRef.current = { beta: res.beta, gamma: res.gamma };
      setNeutralBaseline({ beta: res.beta, gamma: res.gamma });
      setPhase('measuring');
      startTimeout();
    });

    // Animate neutral progress
    let prog = 0;
    const iv = setInterval(() => {
      prog += 12;
      setNeutralProgress(Math.min(prog, 100));
      if (prog >= 100) clearInterval(iv);
    }, 96);
  }, [calibrate]);

  const startTimeout = useCallback(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, (TIMEOUT - elapsed) / 1000);
      setTimeRemaining(remaining);
      if (remaining <= 0 && !doneRef.current) {
        finish();
        return;
      }
      timeoutRef.current = requestAnimationFrame(tick);
    };
    timeoutRef.current = requestAnimationFrame(tick);
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(timeoutRef.current);
    setPhase('done');
    onComplete && onComplete(peakRef.current);
  }, [onComplete]);

  // Update needle with damped physics
  useEffect(() => {
    if (phase !== 'measuring') return;

    const loop = (timestamp) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      const rawBeta = (orientation.beta || 0) - baselineRef.current.beta;
      const rawGamma = (orientation.gamma || 0) - baselineRef.current.gamma;
      // Use beta for flex/ext, gamma for radial/ulnar
      const input = Math.abs(rawBeta) > Math.abs(rawGamma) ? rawBeta : rawGamma;
      const deadzoned = Math.abs(input) < DEADZONE ? 0 : input;

      needleVelRef.current += (deadzoned - SPRING * needleRef.current - DAMPING * needleVelRef.current) * dt * 60;
      needleRef.current += needleVelRef.current * dt;
      needleRef.current = Math.max(-maxAngle, Math.min(maxAngle, needleRef.current));

      const clamped = needleRef.current;
      setCurrentAngle(clamped);

      if (Math.abs(clamped) > Math.abs(peakRef.current)) {
        peakRef.current = clamped;
        setPeak(clamped);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, orientation, maxAngle]);

  // Expose raw for special use (circle, endurance)
  const rawRelative = {
    beta: (orientation.beta || 0) - baselineRef.current.beta,
    gamma: (orientation.gamma || 0) - baselineRef.current.gamma,
  };

  return {
    phase,
    neutralProgress,
    neutralBaseline,
    currentAngle,
    peak,
    timeRemaining,
    rawRelative,
    startNeutral,
    finish,
    orientation,
  };
}