import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { usePixelSound } from '../components/game/usePixelSound';

const READABLE_FONT = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

const STEPS = [
  {
    id: 'welcome',
    mascot: "Welcome, fisher. Let's set up your wrist position first.",
    title: 'Fishing position',
    summary: 'Sit beside a table and let the wrist hang freely off the edge.',
    desc: [
      'Sit beside a table.',
      'Rest the full forearm flat on the surface.',
      'Keep the palm facing down.',
      'Slide forward so the wrist hangs off the edge.',
    ],
    illustration: 'wrist_setup',
  },
  {
    id: 'rules',
    mascot: 'Only your wrist should move. Keep the elbow and shoulder still.',
    title: 'Wrist rules',
    summary: 'We want wrist motion only, without lifting the whole arm.',
    desc: [
      'Only the wrist moves during the games.',
      'Keep the elbow resting on the table.',
      'Keep the shoulder relaxed and still.',
      'Hold the phone firmly but comfortably.',
    ],
    illustration: 'elbow',
  },
  {
    id: 'phone',
    mascot: 'Hold the phone flat, like a fishing rod in your hand.',
    title: 'Hold phone',
    summary: 'Keep the phone steady in the measuring hand with the palm facing down.',
    desc: [
      'Hold the phone flat.',
      'Keep the palm facing down.',
      'Use the wrist to guide the phone.',
      'Keep the grip steady.',
    ],
    illustration: 'phone_hold',
  },
  {
    id: 'game',
    mascot: 'Your wrist is the fishing rod. Each game measures a different movement.',
    title: 'Game rules',
    summary: 'Each wrist movement maps to one fishing action so the flow is easy to remember.',
    desc: [
      'Circle movement spins the net.',
      'Extension casts the rod.',
      'Flexion reels the fish.',
      'Tilting side to side steers the hook.',
    ],
    illustration: 'fishing_controls',
  },
];

function WristSetupIllustration() {
  return (
    <svg width={220} height={110} style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="0" y="76" width="220" height="34" fill="#8B5E3C" shapeRendering="crispEdges" />
      <rect x="0" y="76" width="220" height="6" fill="#A0714F" shapeRendering="crispEdges" />
      <rect x="26" y="58" width="124" height="22" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="26" y="58" width="124" height="4" fill="#E8C080" shapeRendering="crispEdges" />
      <rect x="148" y="62" width="30" height="18" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="176" y="56" width="36" height="26" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="180" y="46" width="6" height="14" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="188" y="44" width="6" height="16" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="196" y="46" width="6" height="14" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="204" y="48" width="5" height="12" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="194" y="34" width="4" height="14" fill="#F4D35E" shapeRendering="crispEdges" />
      <rect x="188" y="34" width="16" height="4" fill="#F4D35E" shapeRendering="crispEdges" />
    </svg>
  );
}

function ElbowIllustration() {
  return (
    <svg width={220} height={110} style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="0" y="78" width="220" height="32" fill="#8B5E3C" shapeRendering="crispEdges" />
      <rect x="0" y="78" width="220" height="6" fill="#A0714F" shapeRendering="crispEdges" />
      <rect x="18" y="56" width="36" height="22" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="14" y="52" width="44" height="30" fill="none" stroke="#3e8948" strokeWidth="3" shapeRendering="crispEdges" />
      <rect x="54" y="60" width="100" height="18" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="154" y="54" width="36" height="24" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="154" y="32" width="36" height="20" fill="#D4A96A" opacity="0.42" shapeRendering="crispEdges" />
    </svg>
  );
}

function PhoneHoldIllustration() {
  return (
    <svg width={220} height={110} style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="72" y="20" width="76" height="52" fill="#333" shapeRendering="crispEdges" />
      <rect x="76" y="24" width="68" height="44" fill="#1a3a5c" shapeRendering="crispEdges" />
      <rect x="100" y="74" width="20" height="4" fill="#555" shapeRendering="crispEdges" />
      <rect x="84" y="30" width="52" height="30" fill="#1e5799" shapeRendering="crispEdges" />
      <rect x="102" y="36" width="4" height="18" fill="#F4D35E" shapeRendering="crispEdges" />
      <rect x="92" y="43" width="24" height="4" fill="#F4D35E" shapeRendering="crispEdges" />
      <rect x="48" y="40" width="24" height="34" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="148" y="40" width="24" height="34" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="52" y="34" width="8" height="12" fill="#D4A96A" shapeRendering="crispEdges" />
      <rect x="148" y="34" width="8" height="12" fill="#D4A96A" shapeRendering="crispEdges" />
    </svg>
  );
}

function FishingControlsIllustration() {
  return (
    <svg width={220} height={110} style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="94" y="28" width="32" height="48" fill="#333" shapeRendering="crispEdges" />
      <rect x="98" y="32" width="24" height="40" fill="#1e5799" shapeRendering="crispEdges" />
      <text x="82" y="20" fill="#F4D35E" fontSize="8" fontFamily="'Press Start 2P', monospace">
        CAST
      </text>
      <text x="82" y="104" fill="#88ccff" fontSize="8" fontFamily="'Press Start 2P', monospace">
        REEL
      </text>
      <text x="8" y="52" fill="#3e8948" fontSize="8" fontFamily="'Press Start 2P', monospace">
        LEFT
      </text>
      <text x="154" y="52" fill="#c0392b" fontSize="8" fontFamily="'Press Start 2P', monospace">
        RIGHT
      </text>
    </svg>
  );
}

const ILLUSTRATIONS = {
  wrist_setup: <WristSetupIllustration />,
  elbow: <ElbowIllustration />,
  phone_hold: <PhoneHoldIllustration />,
  fishing_controls: <FishingControlsIllustration />,
};

export default function Tutorial() {
  const [step, setStep] = useState(0);
  const { play } = usePixelSound();

  const current = STEPS[step];

  const next = () => {
    play('tick');
    if (step < STEPS.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    play('start');
    window.location.href = createPageUrl('Calibration');
  };

  const back = () => {
    play('tick');
    if (step === 0) {
      window.location.href = createPageUrl('HandSelection');
      return;
    }

    setStep((value) => value - 1);
  };

  return (
    <div
      className="flow-page-shell"
      style={{
        background: '#0a1628',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 16,
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <button className="pixel-btn pixel-btn-blue flow-back-btn" onClick={back}>
          BACK
        </button>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c8d8e8' }}>
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {STEPS.map((_, index) => (
          <div
            key={index}
            style={{
              width: index === step ? 18 : 8,
              height: 8,
              background: index === step ? '#F4D35E' : index < step ? '#3e8948' : '#2a2a4e',
              border: '2px solid #5C3317',
              transition: 'width 0.2s',
            }}
          />
        ))}
      </div>

      <section
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#102038',
          border: '4px solid #5C3317',
          boxShadow: '4px 4px 0 #2d1b00',
          padding: '18px 16px',
          display: 'grid',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 11,
              lineHeight: 1.8,
              color: '#F4D35E',
              textShadow: '2px 2px 0 #5C3317',
              marginBottom: 8,
            }}
          >
            {current.title.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: READABLE_FONT,
              fontSize: 18,
              lineHeight: 1.5,
              color: '#dbe8f8',
              fontWeight: 800,
            }}
          >
            {current.summary}
          </div>
        </div>

        <div
          style={{
            background: '#1a3a5c',
            border: '3px solid #244a69',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {ILLUSTRATIONS[current.illustration]}
        </div>

        <div
          style={{
            background: '#0a1628',
            border: '3px solid #A0714F',
            padding: '14px',
            display: 'grid',
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              lineHeight: 1.8,
              color: '#F4D35E',
            }}
          >
            QUICK CHECKLIST
          </div>
          {current.desc.map((line, index) => (
            <div
              key={line}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr',
                gap: 10,
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#2ee6c8',
                  border: '2px solid #127564',
                  color: '#062030',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                }}
              >
                {index + 1}
              </div>
              <div
                style={{
                  fontFamily: READABLE_FONT,
                  fontSize: 17,
                  lineHeight: 1.45,
                  color: '#f5e6c8',
                  fontWeight: 700,
                }}
              >
                {line}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flow-fixed-footer">
        <button className="pixel-btn pixel-btn-teal flow-cta" onClick={next}>
          {step < STEPS.length - 1 ? 'NEXT' : 'START'}
        </button>
      </div>
    </div>
  );
}
