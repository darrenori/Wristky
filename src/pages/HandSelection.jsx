import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import PixelMascot from '../components/game/PixelMascot';
import { getHandPreference, saveHandPreference } from '../components/game/useLocalStorage';
import { usePixelSound } from '../components/game/usePixelSound';

function HandCard({ side, label, emoji, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        maxWidth: 130,
        padding: '16px 8px',
        background: selected ? '#1a3a5c' : '#0e2040',
        border: selected ? '4px solid #F4D35E' : '4px solid #2a2a4e',
        boxShadow: selected ? '0 0 12px #F4D35E88, 4px 4px 0 #2d1b00' : '4px 4px 0 #0a0a20',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        transition: 'border 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: '#F4D35E',
          }}
        >
          OK
        </div>
      )}
      <div style={{ fontSize: 36 }}>{emoji}</div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          color: selected ? '#F4D35E' : '#aab',
        }}
      >
        {label}
      </div>
      <svg width={52} height={44} style={{ imageRendering: 'pixelated' }}>
        {(() => {
          const c = selected ? '#D4A96A' : '#8a7060';
          const dark = selected ? '#b8864a' : '#6a5040';
          const fingerXs = side === 'right' ? [12, 18, 24, 30] : [10, 16, 22, 28];
          const thumbX = side === 'right' ? 2 : 40;
          const palmX = side === 'right' ? 10 : 8;

          return (
            <>
              <rect x={palmX} y="18" width="30" height="22" fill={c} shapeRendering="crispEdges" />
              <rect x={palmX} y="18" width="30" height="3" fill={dark} shapeRendering="crispEdges" />
              {fingerXs.map((fx, i) => (
                <rect
                  key={i}
                  x={fx}
                  y={i === 1 || i === 2 ? 2 : 5}
                  width="6"
                  height={i === 1 || i === 2 ? 18 : 15}
                  fill={c}
                  shapeRendering="crispEdges"
                />
              ))}
              <rect x={thumbX} y="22" width="10" height="12" fill={c} shapeRendering="crispEdges" />
              <rect x={thumbX} y="22" width="10" height="3" fill={dark} shapeRendering="crispEdges" />
              <rect x={palmX + 3} y="22" width="22" height="14" fill="#222" shapeRendering="crispEdges" />
              <rect
                x={palmX + 5}
                y="24"
                width="18"
                height="10"
                fill={selected ? '#1e5799' : '#1a1a2e'}
                shapeRendering="crispEdges"
              />
            </>
          );
        })()}
      </svg>
    </button>
  );
}

export default function HandSelection() {
  const { play } = usePixelSound();
  const [measuringHand, setMeasuringHand] = useState('right');
  const [dominantHand, setDominantHand] = useState('right');
  const [step, setStep] = useState('dominant');

  useEffect(() => {
    const pref = getHandPreference();
    setMeasuringHand(pref.measuring || 'right');
    setDominantHand(pref.dominant || 'right');
  }, []);

  const handleContinue = () => {
    play('start');
    saveHandPreference({ measuring: measuringHand, dominant: dominantHand });
    sessionStorage.setItem('wrist_hand', JSON.stringify({ measuring: measuringHand, dominant: dominantHand }));
    window.location.href = createPageUrl('Tutorial');
  };

  const mascotMsg =
    step === 'dominant'
      ? 'Which is your DOMINANT hand? The one you write with!'
      : 'Now, which wrist are we MEASURING today?';

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
        paddingBottom: 120,
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <button
          className="pixel-btn pixel-btn-blue"
          style={{
            fontSize: 9,
            minHeight: 42,
            padding: '10px 14px',
            color: '#ffffff',
            background: '#3c7ee0',
            border: '4px solid #1f4f98',
            boxShadow: '0 4px 0 #102b57, 0 0 12px rgba(60,126,224,0.35)',
          }}
          onClick={() => {
            play('tick');
            window.location.href = createPageUrl('Welcome');
          }}
        >
          BACK
        </button>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c8d8e8' }}>
          {step === 'dominant' ? '1/2' : '2/2'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['dominant', 'measuring'].map((s, i) => (
          <div
            key={s}
            style={{
              width: s === step ? 20 : 10,
              height: 10,
              background: s === step ? '#F4D35E' : step === 'measuring' && i === 0 ? '#3e8948' : '#2a2a4e',
              border: '2px solid #5C3317',
              transition: 'width 0.2s',
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: '#F4D35E',
            textShadow: '2px 2px 0 #5C3317',
            marginBottom: 6,
          }}
        >
          {step === 'dominant' ? 'DOMINANT HAND' : 'HAND TO MEASURE'}
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 6,
            color: '#88ccff',
            lineHeight: 2,
          }}
        >
          {step === 'dominant' ? 'Which hand do you write with?' : 'Which wrist are we testing today?'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 300, justifyContent: 'center' }}>
        {step === 'dominant' ? (
          <>
            <HandCard side="left" label="LEFT" emoji="L" selected={dominantHand === 'left'} onClick={() => { play('click'); setDominantHand('left'); }} />
            <HandCard side="right" label="RIGHT" emoji="R" selected={dominantHand === 'right'} onClick={() => { play('click'); setDominantHand('right'); }} />
          </>
        ) : (
          <>
            <HandCard side="left" label="LEFT" emoji="L" selected={measuringHand === 'left'} onClick={() => { play('click'); setMeasuringHand('left'); }} />
            <HandCard side="right" label="RIGHT" emoji="R" selected={measuringHand === 'right'} onClick={() => { play('click'); setMeasuringHand('right'); }} />
          </>
        )}
      </div>

      <div
        style={{
          background: '#1a1a2e',
          border: '3px solid #5C3317',
          padding: '10px 14px',
          width: '100%',
          maxWidth: 300,
        }}
      >
        {step === 'dominant' ? (
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#88ccff', lineHeight: 2 }}>
            Dominant hand: {dominantHand.toUpperCase()}
            <br />
            Non-dominant: {dominantHand === 'left' ? 'RIGHT' : 'LEFT'}
            <br />
            This helps compare your results to the correct reference values.
          </p>
        ) : (
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#88ccff', lineHeight: 2 }}>
            Measuring: {measuringHand.toUpperCase()} wrist
            <br />
            {measuringHand === dominantHand ? '(dominant side)' : '(non-dominant side)'}
            <br />
            You can measure both sides separately.
          </p>
        )}
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PixelMascot message={mascotMsg} size={40} />
      </div>

      <div
        style={{
          position: 'fixed',
          left: 16,
          right: 16,
          bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 360,
          margin: '0 auto',
          zIndex: 30,
          paddingTop: 12,
          paddingBottom: 4,
          background:
            'linear-gradient(to top, rgba(8,20,38,0.98) 0%, rgba(15,37,64,0.95) 58%, rgba(15,37,64,0.74) 82%, rgba(15,37,64,0) 100%), repeating-linear-gradient(180deg, rgba(44,90,145,0.16) 0px, rgba(44,90,145,0.16) 4px, rgba(8,20,38,0.12) 4px, rgba(8,20,38,0.12) 8px)',
        }}
      >
        {step === 'dominant' ? (
          <button
            className="pixel-btn pixel-btn-teal"
            style={{
              fontSize: 'clamp(12px, 3.6vw, 14px)',
              width: '100%',
              minHeight: 64,
              background: '#2ee6c8',
              color: '#ffffff',
              border: '4px solid #127564',
              boxShadow: '0 6px 0 #0d5548, 0 0 20px rgba(46,230,200,0.55)',
              padding: '16px 20px',
              textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
              letterSpacing: 0.6,
              lineHeight: 1.5,
              borderRadius: 0,
            }}
            onClick={() => {
              play('blip');
              setStep('measuring');
            }}
          >
            NEXT
          </button>
        ) : (
          <button
            className="pixel-btn pixel-btn-green"
            style={{
              fontSize: 'clamp(12px, 3.6vw, 14px)',
              width: '100%',
              minHeight: 64,
              background: '#48b85a',
              color: '#ffffff',
              border: '4px solid #245d2d',
              boxShadow: '0 6px 0 #1a3d1e, 0 0 20px rgba(72,184,90,0.5)',
              padding: '16px 20px',
              textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
              letterSpacing: 0.6,
              lineHeight: 1.5,
              borderRadius: 0,
            }}
            onClick={handleContinue}
          >
            START TUTORIAL!
          </button>
        )}
      </div>
    </div>
  );
}
