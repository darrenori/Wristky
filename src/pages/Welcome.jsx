import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import PixelMascot from '../components/game/PixelMascot';
import { usePixelSound } from '../components/game/usePixelSound';
import { getSessions } from '../components/game/useLocalStorage';

const READABLE_FONT = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const MASCOT_NAME = 'Ollie';
const HOME_INTRO_LINE = `Hi! I'm ${MASCOT_NAME}.`;
const HOME_LINES = [
  HOME_INTRO_LINE,
  'Ready to check your wrist?',
  'Nice and slow, okay?',
  'Small moves matter.',
  'Let us warm up first.',
  'You have got this.',
  'Log your progress!',
  'Easy circle. Not too fast.',
  'Gentle movement works best.',
];

function ToggleChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 42,
        minWidth: 96,
        padding: '10px 14px',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 8,
        lineHeight: 1.5,
        color: '#ffffff',
        background: active ? '#315fa8' : '#1a2840',
        border: `3px solid ${active ? '#5f95e6' : '#243750'}`,
        boxShadow: `0 4px 0 ${active ? '#17315d' : '#0d1624'}`,
        textShadow: '1px 2px 0 rgba(0,0,0,0.65)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function WelcomeScene() {
  return (
    <section
      style={{
        width: '100%',
        maxWidth: 520,
        border: '4px solid #5C3317',
        boxShadow: '4px 4px 0 #2d1b00',
        background: '#102038',
        padding: 6,
      }}
    >
      <svg
        viewBox="0 0 336 176"
        style={{ display: 'block', width: '100%', height: 'auto', imageRendering: 'pixelated' }}
      >
        <rect x="0" y="0" width="336" height="176" fill="#09172a" shapeRendering="crispEdges" />
        <rect x="0" y="18" width="336" height="24" fill="#0f2442" shapeRendering="crispEdges" />
        <rect x="0" y="42" width="336" height="26" fill="#16345a" shapeRendering="crispEdges" />
        <rect x="0" y="68" width="336" height="24" fill="#1c456f" shapeRendering="crispEdges" />
        <rect x="0" y="92" width="336" height="24" fill="#205983" shapeRendering="crispEdges" />
        <rect x="0" y="116" width="336" height="60" fill="#1b4b78" shapeRendering="crispEdges" />

        <rect x="270" y="10" width="24" height="24" fill="#f3df82" shapeRendering="crispEdges" />
        <rect x="274" y="14" width="16" height="16" fill="#fff4bb" shapeRendering="crispEdges" />

        {[
          [18, 12], [48, 22], [72, 16], [96, 30], [128, 12], [154, 20], [184, 14], [214, 28], [244, 18], [308, 48],
        ].map(([x, y], index) => (
          <rect key={index} x={x} y={y} width="2" height="2" fill="#ffffff" shapeRendering="crispEdges" />
        ))}

        <rect x="0" y="82" width="52" height="14" fill="#173255" shapeRendering="crispEdges" />
        <rect x="36" y="76" width="48" height="20" fill="#1a3a61" shapeRendering="crispEdges" />
        <rect x="74" y="80" width="72" height="16" fill="#21446d" shapeRendering="crispEdges" />
        <rect x="138" y="74" width="86" height="22" fill="#19385d" shapeRendering="crispEdges" />
        <rect x="214" y="78" width="60" height="18" fill="#21446d" shapeRendering="crispEdges" />
        <rect x="266" y="84" width="70" height="12" fill="#173255" shapeRendering="crispEdges" />

        <rect x="0" y="116" width="336" height="8" fill="#2a71a4" shapeRendering="crispEdges" />
        <rect x="0" y="124" width="336" height="10" fill="#24639a" shapeRendering="crispEdges" />
        <rect x="0" y="134" width="336" height="12" fill="#1f588d" shapeRendering="crispEdges" />
        <rect x="0" y="146" width="336" height="14" fill="#194876" shapeRendering="crispEdges" />
        <rect x="0" y="160" width="336" height="16" fill="#13365a" shapeRendering="crispEdges" />

        {[
          [10, 120, 28], [54, 126, 20], [92, 118, 24], [140, 124, 30], [190, 120, 22], [238, 126, 26], [284, 120, 24],
        ].map(([x, y, w], index) => (
          <rect key={index} x={x} y={y} width={w} height="4" fill="rgba(162,219,255,0.35)" shapeRendering="crispEdges" />
        ))}

        <rect x="0" y="130" width="214" height="16" fill="#8B5E3C" shapeRendering="crispEdges" />
        <rect x="0" y="146" width="214" height="8" fill="#5C3317" shapeRendering="crispEdges" />
        {Array.from({ length: 7 }).map((_, index) => (
          <rect
            key={index}
            x={index * 30 + 28}
            y="130"
            width="2"
            height="16"
            fill="#5C3317"
            shapeRendering="crispEdges"
          />
        ))}

        <rect x="18" y="154" width="12" height="22" fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="84" y="154" width="12" height="22" fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="150" y="154" width="12" height="22" fill="#5C3317" shapeRendering="crispEdges" />

        <rect x="26" y="92" width="8" height="38" fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="22" y="84" width="16" height="10" fill="#F4D35E" shapeRendering="crispEdges" />
        <rect x="24" y="86" width="12" height="6" fill="#fff1a3" shapeRendering="crispEdges" />
        <rect x="20" y="94" width="20" height="4" fill="#5C3317" shapeRendering="crispEdges" />

        <rect x="52" y="118" width="18" height="12" fill="#8B5E3C" shapeRendering="crispEdges" />
        <rect x="50" y="122" width="22" height="4" fill="#5C3317" shapeRendering="crispEdges" />

        <rect x="94" y="64" width="20" height="6" fill="#2d1b00" shapeRendering="crispEdges" />
        <rect x="88" y="70" width="32" height="4" fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="96" y="74" width="16" height="12" fill="#e3b07f" shapeRendering="crispEdges" />
        <rect x="99" y="78" width="3" height="3" fill="#2d1b00" shapeRendering="crispEdges" />
        <rect x="106" y="78" width="3" height="3" fill="#2d1b00" shapeRendering="crispEdges" />
        <rect x="92" y="86" width="24" height="18" fill="#2f6f61" shapeRendering="crispEdges" />
        <rect x="88" y="90" width="8" height="10" fill="#2f6f61" shapeRendering="crispEdges" />
        <rect x="116" y="88" width="10" height="8" fill="#2f6f61" shapeRendering="crispEdges" />
        <rect x="94" y="104" width="8" height="22" fill="#4c5f87" shapeRendering="crispEdges" />
        <rect x="104" y="104" width="8" height="22" fill="#4c5f87" shapeRendering="crispEdges" />
        <rect x="92" y="126" width="10" height="4" fill="#2d1b00" shapeRendering="crispEdges" />
        <rect x="104" y="126" width="10" height="4" fill="#2d1b00" shapeRendering="crispEdges" />
        <rect x="110" y="90" width="10" height="4" fill="#e3b07f" shapeRendering="crispEdges" />
        <rect x="118" y="92" width="10" height="4" fill="#e3b07f" shapeRendering="crispEdges" />

        <line x1="126" y1="93" x2="242" y2="74" stroke="#5C3317" strokeWidth="5" strokeLinecap="square" />
        <line x1="127" y1="91" x2="243" y2="72" stroke="#c79861" strokeWidth="2" strokeLinecap="square" />
        <line x1="241" y1="74" x2="268" y2="112" stroke="#d9f4ff" strokeWidth="1.5" strokeLinecap="square" />

        <rect x="264" y="108" width="10" height="8" fill="#e25454" shapeRendering="crispEdges" />
        <rect x="264" y="112" width="10" height="4" fill="#f2f5fa" shapeRendering="crispEdges" />

        <rect x="236" y="124" width="18" height="8" fill="#F4A03A" shapeRendering="crispEdges" />
        <rect x="246" y="120" width="14" height="16" fill="#F4A03A" shapeRendering="crispEdges" />
        <rect x="260" y="122" width="12" height="6" fill="#F4A03A" shapeRendering="crispEdges" />
        <rect x="260" y="130" width="12" height="6" fill="#F4A03A" shapeRendering="crispEdges" />
        <rect x="252" y="126" width="2" height="2" fill="#fff4d6" shapeRendering="crispEdges" />

        <rect x="228" y="138" width="38" height="4" fill="rgba(190,227,255,0.55)" shapeRendering="crispEdges" />
        <rect x="236" y="142" width="24" height="4" fill="rgba(190,227,255,0.35)" shapeRendering="crispEdges" />
      </svg>
    </section>
  );
}

function TitleBlock() {
  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 'clamp(24px, 8vw, 34px)',
          lineHeight: 1.35,
          color: '#F4D35E',
          textShadow: '4px 4px 0 #5C3317',
        }}
      >
        Wristky
      </div>

      <div
        style={{
          fontFamily: READABLE_FONT,
          fontSize: 16,
          lineHeight: 1.45,
          color: '#9ec7ff',
          fontWeight: 700,
          letterSpacing: '0.18em',
        }}
      >
        Measure . Move . Recover
      </div>
    </div>
  );
}

export default function Welcome() {
  const { sfxOn, musicOn, toggleSfx, toggleMusic, play } = usePixelSound();
  const [sessionCount, setSessionCount] = useState(0);
  const [homeLine, setHomeLine] = useState(HOME_INTRO_LINE);

  useEffect(() => {
    setSessionCount(getSessions().length);
  }, []);

  useEffect(() => {
    const pickLine = (previous) => {
      const rotationPool = HOME_LINES.filter((line) => line !== HOME_INTRO_LINE);
      if (rotationPool.length === 0) return HOME_INTRO_LINE;
      let nextLine = previous;
      while (nextLine === previous) {
        nextLine = rotationPool[Math.floor(Math.random() * rotationPool.length)];
      }
      return nextLine;
    };

    const initialTimer = window.setTimeout(() => {
      setHomeLine((current) => pickLine(current));
    }, 3200);
    const interval = window.setInterval(() => {
      setHomeLine((current) => pickLine(current));
    }, 7000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        overflowY: 'auto',
        backgroundColor: '#081426',
        backgroundImage:
          'linear-gradient(180deg, rgba(12,29,52,0.98) 0%, rgba(8,20,38,1) 100%), repeating-linear-gradient(180deg, rgba(44,90,145,0.08) 0px, rgba(44,90,145,0.08) 4px, rgba(8,20,38,0.08) 4px, rgba(8,20,38,0.08) 8px)',
        padding: '22px 18px calc(26px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          maxWidth: 404,
          margin: '0 auto',
          display: 'grid',
          gap: 14,
          justifyItems: 'center',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <ToggleChip active={musicOn} label="MUSIC" onClick={toggleMusic} />
          <ToggleChip active={sfxOn} label="SFX" onClick={toggleSfx} />
        </div>

        <WelcomeScene />
        <TitleBlock />

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <PixelMascot
            message={homeLine}
            size={50}
            containerStyle={{ maxWidth: 368 }}
            bubbleStyle={{ minHeight: 72, padding: '16px 18px' }}
            messageStyle={{ textAlign: 'left' }}
            animateMessageChange
            fixedBubbleWidth={246}
          />
        </div>

        <div style={{ display: 'grid', gap: 12, width: '100%' }}>
          <button
            type="button"
            className="pixel-btn pixel-btn-teal"
            style={{
              width: '100%',
              minHeight: 74,
              fontSize: 12,
              letterSpacing: 0.9,
              boxShadow: '0 6px 0 #0d5548, 0 0 20px rgba(46,230,200,0.42)',
            }}
            onClick={() => {
              play('start');
              window.location.href = createPageUrl('HandSelection');
            }}
          >
            START FISHING
          </button>

          <button
            type="button"
            className="pixel-btn pixel-btn-blue"
            style={{
              width: '100%',
              minHeight: 64,
              fontSize: 9,
              letterSpacing: 0.55,
            }}
            onClick={() => {
              play('start');
              window.location.href = createPageUrl('Exercises');
            }}
          >
            {sessionCount > 0 ? 'SMART EXERCISES' : 'GENERAL EXERCISES'}
          </button>

          <button
            type="button"
            className="pixel-btn pixel-btn-wood"
            style={{
              width: '100%',
              minHeight: 64,
              fontSize: 9,
              letterSpacing: 0.55,
            }}
            onClick={() => {
              play('click');
              window.location.href = createPageUrl('History');
            }}
          >
            MY LOGBOOK {sessionCount > 0 ? `(${sessionCount})` : ''}
          </button>
        </div>

      </div>
    </div>
  );
}
