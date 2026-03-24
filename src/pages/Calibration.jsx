import React, { useEffect, useRef, useState } from 'react';
import { createPageUrl } from '@/utils';
import PixelMascot from '../components/game/PixelMascot';
import { useSensor } from '../components/game/useSensor';
import { usePixelSound } from '../components/game/usePixelSound';

const READABLE_FONT = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

const MESSAGES = {
  permission: "I need to feel your phone's tilt. Please grant permission.",
  waiting: 'Place your wrist on the table with the palm down. Getting ready...',
  calibrating: 'Hold still while I find your neutral position.',
  success: "Perfect. Neutral found. Let's fish.",
  partial: 'Good enough. We can continue.',
  fallback: 'No sensors detected, so demo mode is ready.',
  denied: 'Sensor permission was denied, so demo mode will be used.',
};

export default function Calibration() {
  const { orientation, permissionState, requestPermission, calibrate, demoMode } = useSensor();
  const { play } = usePixelSound();

  const [phase, setPhase] = useState('start');
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [mascotMsg, setMascotMsg] = useState(MESSAGES.permission);

  const doneRef = useRef(false);

  useEffect(() => {
    if (permissionState === 'granted') {
      setPhase('countdown');
      setMascotMsg(MESSAGES.waiting);
    }
  }, [permissionState]);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setPhase('calibrating');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'calibrating') return undefined;

    doneRef.current = false;
    setMascotMsg(MESSAGES.calibrating);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((value) => Math.min(value + 8, 95));
    }, 64);

    const hardTimeout = setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearInterval(progressInterval);
      setProgress(100);

      const fallbackResult = { beta: 0, gamma: 0, quality: 'fallback' };
      sessionStorage.setItem('wrist_calibration', JSON.stringify(fallbackResult));
      setResult(fallbackResult);
      setPhase('done');
      setMascotMsg(MESSAGES.fallback);
      play('start');
    }, 5000);

    calibrate(800, 4500).then((calibrationResult) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearTimeout(hardTimeout);
      clearInterval(progressInterval);
      setProgress(100);

      sessionStorage.setItem('wrist_calibration', JSON.stringify(calibrationResult));
      setResult(calibrationResult);
      setPhase('done');

      if (calibrationResult.quality === 'success') {
        setMascotMsg(MESSAGES.success);
        play('success');
      } else if (calibrationResult.quality === 'partial') {
        setMascotMsg(MESSAGES.partial);
        play('start');
      } else {
        setMascotMsg(MESSAGES.fallback);
        play('start');
      }
    });

    return () => {
      clearTimeout(hardTimeout);
      clearInterval(progressInterval);
    };
  }, [phase, calibrate, play]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      setPhase('countdown');
      setMascotMsg(MESSAGES.denied);
    }
  };

  const proceed = () => {
    sessionStorage.setItem('wrist_session_marker', String(Date.now()));
    sessionStorage.removeItem('wrist_session_saved_marker');
    sessionStorage.setItem('wrist_results', JSON.stringify({}));
    play('start');
    window.location.href = createPageUrl('MeasureCircle');
  };

  const qualityColor =
    result?.quality === 'success' ? '#3e8948' : result?.quality === 'partial' ? '#f4d35e' : '#c0392b';

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        background: '#0a1628',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 18,
        padding: '20px 16px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: '#F4D35E',
          textShadow: '2px 2px 0 #5C3317',
          textAlign: 'center',
        }}
      >
        CALIBRATION
      </div>

      <div
        style={{
          width: 200,
          height: 200,
          background: '#1a1a2e',
          border: '4px solid #5C3317',
          boxShadow: '4px 4px 0 #2d1b00',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: '100%', background: '#2a2a5e' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, height: 2, width: '100%', background: '#2a2a5e' }} />

        <div
          style={{
            width: 32,
            height: 56,
            background: '#333',
            border: '3px solid #F4D35E',
            position: 'absolute',
            transform: `translate(${Math.round(orientation.gamma || 0) * 2}px, ${Math.round(orientation.beta || 0) * 2}px)`,
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 20,
              height: 32,
              background: '#1e5799',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 10, color: '#ffffff' }}>[]</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            border: '3px solid #3e8948',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          background: '#1a1a2e',
          border: '3px solid #5C3317',
          padding: '16px',
          width: '100%',
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        {phase === 'start' && (
          <>
            <p
              style={{
                fontFamily: READABLE_FONT,
                fontSize: 18,
                fontWeight: 700,
                color: '#f5e6c8',
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              We need motion sensors to measure your wrist movement.
            </p>
            <button
              className="pixel-btn pixel-btn-teal"
              style={{ fontFamily: READABLE_FONT, fontSize: 19, fontWeight: 800, width: '100%' }}
              onClick={handleRequestPermission}
            >
              ALLOW SENSORS
            </button>
          </>
        )}

        {phase === 'countdown' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p
              style={{
                fontFamily: READABLE_FONT,
                fontSize: 18,
                fontWeight: 700,
                color: '#f5e6c8',
                lineHeight: 1.5,
              }}
            >
              Starting in...
            </p>
            <div
              style={{
                fontSize: 48,
                fontFamily: "'Press Start 2P', monospace",
                color: '#F4D35E',
                textShadow: '4px 4px 0 #5C3317',
              }}
            >
              {countdown}
            </div>
          </div>
        )}

        {phase === 'calibrating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p
              style={{
                fontFamily: READABLE_FONT,
                fontSize: 18,
                fontWeight: 700,
                color: '#f5e6c8',
                lineHeight: 1.5,
              }}
            >
              Hold still...
            </p>
            <div style={{ width: '100%', height: 20, background: '#0a1628', border: '3px solid #5C3317', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#3e8948',
                  transition: 'width 0.1s',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: READABLE_FONT,
                fontSize: 18,
                fontWeight: 800,
                color: '#3e8948',
              }}
            >
              {progress}%
            </span>
          </div>
        )}

        {phase === 'done' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontFamily: READABLE_FONT,
                fontSize: 18,
                fontWeight: 800,
                color: qualityColor,
              }}
            >
              {result.quality === 'success' ? 'Ready to go' : result.quality === 'partial' ? 'Partial calibration' : 'Demo mode'}
            </div>
            {demoMode && (
              <p
                style={{
                  fontFamily: READABLE_FONT,
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#88ccff',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Mouse movement will simulate phone tilt.
              </p>
            )}
            <button
              className="pixel-btn pixel-btn-teal"
              style={{ fontFamily: READABLE_FONT, fontSize: 19, fontWeight: 800, width: '100%', marginTop: 4 }}
              onClick={proceed}
            >
              START FISHING
            </button>
          </div>
        )}
      </div>

      <PixelMascot message={mascotMsg} size={44} />

      {(phase === 'start' || phase === 'countdown') && (
        <button
          className="pixel-btn"
          style={{
            fontFamily: READABLE_FONT,
            fontSize: 16,
            fontWeight: 700,
            background: 'transparent',
            border: '2px solid #556677',
            color: '#556677',
            padding: '8px 16px',
          }}
          onClick={() => {
            const fallback = { beta: 0, gamma: 0, quality: 'fallback' };
            sessionStorage.setItem('wrist_calibration', JSON.stringify(fallback));
            setResult(fallback);
            setPhase('done');
            setMascotMsg(MESSAGES.fallback);
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  );
}
