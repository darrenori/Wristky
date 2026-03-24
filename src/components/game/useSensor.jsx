import { useState, useEffect, useRef, useCallback } from 'react';

const INITIAL_ORIENTATION = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  rawAlpha: 0,
  rawBeta: 0,
  rawGamma: 0,
};

export function useSensor() {
  const [orientation, setOrientation] = useState(INITIAL_ORIENTATION);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown'); // unknown|granted|denied
  const smoothRef = useRef({ beta: 0, gamma: 0 });
  const rawRef = useRef({ beta: 0, gamma: 0, alpha: 0 });
  const listenersAttached = useRef(false);

  const attachListeners = useCallback(() => {
    if (listenersAttached.current) return;
    if (!('DeviceOrientationEvent' in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    const handler = (e) => {
      const b = e.beta ?? 0;
      const g = e.gamma ?? 0;
      const a = e.alpha ?? 0;
      // Exponential smoothing
      smoothRef.current.beta = smoothRef.current.beta * 0.6 + b * 0.4;
      smoothRef.current.gamma = smoothRef.current.gamma * 0.6 + g * 0.4;
      rawRef.current = { beta: b, gamma: g, alpha: a };
      setOrientation({
        alpha: a,
        beta: smoothRef.current.beta,
        gamma: smoothRef.current.gamma,
        rawAlpha: a,
        rawBeta: b,
        rawGamma: g,
      });
    };
    window.addEventListener('deviceorientation', handler, true);
    listenersAttached.current = true;
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  const requestPermission = useCallback(async () => {
    const orientationEvent = /** @type {{ requestPermission?: () => Promise<'granted' | 'denied'> } | undefined} */ (
      window.DeviceOrientationEvent
    );
    if (
      orientationEvent &&
      typeof orientationEvent.requestPermission === 'function'
    ) {
      try {
        const result = await orientationEvent.requestPermission();
        if (result === 'granted') {
          setPermissionState('granted');
          attachListeners();
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } catch (e) {
        setPermissionState('denied');
        return false;
      }
    }
    // Android / Desktop — auto granted
    setPermissionState('granted');
    attachListeners();
    return true;
  }, [attachListeners]);

  // Auto-attach on Android/Desktop
  useEffect(() => {
    const orientationEvent = /** @type {{ requestPermission?: () => Promise<'granted' | 'denied'> } | undefined} */ (
      window.DeviceOrientationEvent
    );
    if (
      orientationEvent &&
      typeof orientationEvent.requestPermission !== 'function'
    ) {
      setPermissionState('granted');
      const cleanup = attachListeners();
      return cleanup;
    }
  }, [attachListeners]);

  const calibrate = useCallback((durationMs = 800, timeoutMs = 5000) => {
    return new Promise((resolve) => {
      const samples = [];
      const start = Date.now();
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearInterval(interval);
        clearTimeout(hardTimeout);
        resolve(result);
      };

      const hardTimeout = setTimeout(() => {
        const avg = samples.length > 0
          ? {
              alpha: samples.reduce((s, v) => s + (v.alpha ?? 0), 0) / samples.length,
              beta: samples.reduce((s, v) => s + v.beta, 0) / samples.length,
              gamma: samples.reduce((s, v) => s + v.gamma, 0) / samples.length,
              quality: 'partial',
            }
          : { alpha: 0, beta: 0, gamma: 0, quality: 'fallback' };
        finish(avg);
      }, timeoutMs);

      const interval = setInterval(() => {
        samples.push({ ...rawRef.current });
        if (Date.now() - start >= durationMs && samples.length >= 8) {
          finish({
            alpha: samples.reduce((s, v) => s + (v.alpha ?? 0), 0) / samples.length,
            beta: samples.reduce((s, v) => s + v.beta, 0) / samples.length,
            gamma: samples.reduce((s, v) => s + v.gamma, 0) / samples.length,
            quality: 'success',
          });
        }
      }, 50);
    });
  }, []);

  // Demo/simulator mode: if no sensor, use mouse movement
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!isSupported && permissionState === 'granted') setDemoMode(true);
  }, [isSupported, permissionState]);

  useEffect(() => {
    if (!demoMode) return;
    const handler = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const gx = ((e.clientX - cx) / cx) * 30;
      const gy = ((e.clientY - cy) / cy) * 30;
      smoothRef.current.beta = gy;
      smoothRef.current.gamma = gx;
      setOrientation({ alpha: gx, beta: gy, gamma: gx, rawAlpha: gx, rawBeta: gy, rawGamma: gx });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [demoMode]);

  return {
    orientation,
    isSupported,
    permissionState,
    requestPermission,
    calibrate,
    demoMode,
    rawRef,
  };
}
