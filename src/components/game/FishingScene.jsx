import React, { useEffect } from 'react';
import bassFish from '../../../images/Bass_Fish.svg';

// Water tile row
function WaterRow({ y, width, tileW = 32, speed = 2, color1 = '#1e5799', color2 = '#2463b0' }) {
  const sceneWidth = width || (typeof window !== 'undefined' ? window.innerWidth : 430);
  const n = Math.ceil(sceneWidth / tileW) + 4;
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        width: '200%',
        height: tileW / 2,
        display: 'flex',
        animation: `waterWave ${speed}s linear infinite`,
      }}
    >
      {Array.from({ length: n * 2 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: tileW,
            minWidth: tileW,
            height: '100%',
            background: i % 2 === 0 ? color1 : color2,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  );
}

// Pixel cloud
function Cloud({ style }) {
  return (
    <div style={{ position: 'absolute', ...style }}>
      <svg width="64" height="24" style={{ imageRendering: 'pixelated' }}>
        <rect x="16" y="8" width="32" height="16" fill="#e8e8e8" shapeRendering="crispEdges" />
        <rect x="8"  y="12" width="48" height="12" fill="#e8e8e8" shapeRendering="crispEdges" />
        <rect x="24" y="4"  width="16" height="8"  fill="#e8e8e8" shapeRendering="crispEdges" />
        <rect x="16" y="8" width="32" height="4" fill="#ffffff" shapeRendering="crispEdges" />
      </svg>
    </div>
  );
}

// Pixel dock plank
function Dock({ width, bottom }) {
  const planks = Math.ceil(width / 32);
  return (
    <div style={{ position: 'absolute', bottom, left: 0, width: '100%' }}>
      <div style={{ display: 'flex', width: '100%' }}>
        {Array.from({ length: planks }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 32, height: 16, minWidth: 32,
              background: i % 2 === 0 ? '#8B5E3C' : '#A0714F',
              borderRight: '2px solid #5C3317',
              imageRendering: 'pixelated',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', width: '100%' }}>
        {Array.from({ length: planks }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 32, height: 8, minWidth: 32,
              background: '#5C3317',
              borderRight: '2px solid #3d2210',
              imageRendering: 'pixelated',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Bobber
function Bobber({ x, y, animate = true }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        animation: animate ? 'bobberBounce 1.5s ease-in-out infinite' : 'none',
      }}
    >
      <svg width="16" height="20" style={{ imageRendering: 'pixelated' }}>
        <rect x="6" y="0" width="4" height="10" fill="#888888" shapeRendering="crispEdges" />
        <rect x="4" y="10" width="8" height="8" fill="#EE3333" shapeRendering="crispEdges" />
        <rect x="4" y="14" width="8" height="4" fill="#EEEEEE" shapeRendering="crispEdges" />
        <rect x="6" y="10" width="2" height="2" fill="#FF6666" shapeRendering="crispEdges" />
      </svg>
    </div>
  );
}

// Fish sprite
function PixelFish({ x, y, size = 1, flipped = false, opacity = 1, rotate = 0 }) {
  const width = Math.max(18, Math.round(28 * size));
  const height = Math.max(9, Math.round(14 * size));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: 'none',
        transform: `translate(-50%, -50%)${flipped ? ' scaleX(-1)' : ''}${rotate ? ` rotate(${rotate}deg)` : ''}`,
        transformOrigin: 'center center',
      }}
    >
      <img
        src={bassFish}
        alt=""
        aria-hidden="true"
        draggable="false"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          imageRendering: 'pixelated',
          opacity,
          filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.35))',
        }}
      />
    </div>
  );
}

function PixelBoat({ x, y, scale = 1, flipped = false, rocking = false, rockAmount = 0.2 }) {
  const width = Math.round(128 * scale);
  const height = Math.round(72 * scale);
  const clampedRock = Math.max(0, Math.min(1, rockAmount));
  const rockAngle = `${(1.5 + clampedRock * 5).toFixed(2)}deg`;
  const rockRise = `${(1 + clampedRock * 4).toFixed(2)}px`;
  const rockDuration = `${(3.7 - clampedRock * 1.6).toFixed(2)}s`;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: 'none',
        transform: `translate(-50%, -50%)${flipped ? ' scaleX(-1)' : ''}`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          animation: rocking ? 'boatRock 3.4s ease-in-out infinite' : 'none',
          animationDuration: rockDuration,
          transformOrigin: '50% 72%',
          '--boat-rock-angle': rockAngle,
          '--boat-rock-rise': rockRise,
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox="0 0 128 72"
          style={{
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.35))',
          }}
          shapeRendering="crispEdges"
        >
          <rect x="8" y="58" width="18" height="2" fill="#7bc4ff" opacity="0.55" />
          <rect x="96" y="60" width="16" height="2" fill="#7bc4ff" opacity="0.45" />
          <rect x="18" y="42" width="68" height="4" fill="#b77a44" />
          <rect x="14" y="46" width="76" height="8" fill="#7a431d" />
          <rect x="10" y="54" width="84" height="8" fill="#5b2c11" />
          <rect x="18" y="62" width="68" height="4" fill="#2d1609" />
          <rect x="28" y="38" width="16" height="4" fill="#6a3b19" />
          <rect x="34" y="41" width="8" height="5" fill="#8b5e3c" />
          <rect x="23" y="16" width="18" height="4" fill="#4d280f" />
          <rect x="27" y="12" width="10" height="4" fill="#4d280f" />
          <rect x="26" y="20" width="10" height="9" fill="#efc08c" />
          <rect x="28" y="24" width="2" height="2" fill="#20150e" />
          <rect x="32" y="24" width="2" height="2" fill="#20150e" />
          <rect x="29" y="29" width="4" height="2" fill="#d39d6a" />
          <rect x="24" y="30" width="14" height="12" fill="#3f7c76" />
          <rect x="21" y="31" width="3" height="8" fill="#efc08c" />
          <rect x="38" y="31" width="7" height="4" fill="#efc08c" />
          <rect x="24" y="42" width="5" height="8" fill="#657db5" />
          <rect x="31" y="42" width="5" height="8" fill="#657db5" />
          <rect x="23" y="50" width="6" height="2" fill="#2b1d16" />
          <rect x="31" y="50" width="6" height="2" fill="#2b1d16" />
          <rect x="44" y="33" width="10" height="3" fill="#9f7446" />
          <line x1="52" y1="34" x2="108" y2="24" stroke="#8B5E3C" strokeWidth="4" />
          <line x1="53" y1="33" x2="108" y2="23" stroke="#c08a57" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

function BoatLine({ boat, bobberX, bobberY }) {
  if (!boat || bobberX === undefined || bobberY === undefined) return null;

  const scale = boat.scale || 1;
  const tipX = boat.x + 44 * scale;
  const tipY = boat.y - 12 * scale;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <line
        x1={tipX}
        y1={tipY}
        x2={bobberX}
        y2={bobberY}
        stroke="#111111"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}

// Pixel barrel
function Barrel({ x, y }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <svg width={24} height={32} style={{ imageRendering: 'pixelated' }}>
        <rect x="2"  y="0"  width="20" height="32" fill="#8B5E3C" shapeRendering="crispEdges" />
        <rect x="0"  y="4"  width="24" height="4"  fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="0"  y="14" width="24" height="4"  fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="0"  y="24" width="24" height="4"  fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="4"  y="0"  width="16" height="2"  fill="#A0714F" shapeRendering="crispEdges" />
        <rect x="4"  y="30" width="16" height="2"  fill="#A0714F" shapeRendering="crispEdges" />
      </svg>
    </div>
  );
}

// Pixel lantern
function Lantern({ x, y, lit = true }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <svg width={16} height={32} style={{ imageRendering: 'pixelated' }}>
        <rect x="6" y="0" width="4" height="6" fill="#888" shapeRendering="crispEdges" />
        <rect x="2" y="6" width="12" height="16" fill={lit ? '#F4D35E' : '#888'} shapeRendering="crispEdges" />
        <rect x="0" y="8" width="16" height="2"  fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="0" y="18" width="16" height="2" fill="#5C3317" shapeRendering="crispEdges" />
        <rect x="2" y="22" width="12" height="4" fill="#5C3317" shapeRendering="crispEdges" />
        {lit && <rect x="4" y="8" width="8" height="10" fill="#FFEE88" shapeRendering="crispEdges" opacity="0.6" />}
      </svg>
    </div>
  );
}

// Pixel fishing rod
function FishingRod({ x, y, angle = -20 }) {
  const radians = (angle * Math.PI) / 180;
  const rodLen = 64;
  const tipX = x + rodLen * Math.cos(radians);
  const tipY = y + rodLen * Math.sin(radians);
  return (
    <svg
      style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <line x1={x} y1={y} x2={tipX} y2={tipY} stroke="#8B5E3C" strokeWidth="4" strokeLinecap="square" />
      <line x1={x + 2} y1={y} x2={tipX + 2} y2={tipY} stroke="#A0714F" strokeWidth="2" />
    </svg>
  );
}

// Ripple effect
function Ripple({ x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 20,
        top: y - 10,
        width: 40,
        height: 20,
        borderRadius: '50%',
        border: '3px solid #88ccff',
        animation: 'rippleExpand 0.9s ease-out forwards',
        pointerEvents: 'none',
      }}
    />
  );
}

// ===== MAIN SCENE =====
export default function FishingScene({
  showBobber = true,
  showRod = true,
  showDock = true,
  showDockDecor = true,
  bobberX = undefined,
  bobberY = undefined,
  showFish = [],
  ripples = [],
  onRippleDone = undefined,
  overlayContent = null,
  stage = 'idle',
  rodAngle = -20,
  waterLevel = 0.55,
  sceneWidth = undefined,
  sceneHeight = undefined,
  boat = null,
}) {
  const W = sceneWidth || window.innerWidth;
  const H = sceneHeight || window.innerHeight;
  const waterY = Math.round(H * waterLevel);
  const dockHeight = 24;
  const dockTop = H - dockHeight;

  const bx = bobberX !== undefined ? bobberX : W * 0.6;
  const by = bobberY !== undefined ? bobberY : waterY - 8;
  const rodAnchorX = W * 0.25;
  const rodAnchorY = H - 48;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#1a3a5c',
      }}
    >
      {/* Sky gradient (pixel bands) */}
      {[
        { t: 0,    h: H * 0.08, c: '#0a1628' },
        { t: H * 0.08, h: H * 0.1, c: '#0d1f3c' },
        { t: H * 0.18, h: H * 0.1, c: '#122751' },
        { t: H * 0.28, h: H * 0.1, c: '#1a3a5c' },
        { t: H * 0.38, h: H * 0.1, c: '#1a4a6e' },
      ].map((b, i) => (
        <div key={i} style={{ position: 'absolute', top: b.t, left: 0, width: '100%', height: b.h, background: b.c }} />
      ))}

      {/* Stars (small pixel dots) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 23 + 5) % 35}%`,
            width: 2, height: 2,
            background: '#ffffff',
            opacity: 0.6 + (i % 4) * 0.1,
          }}
        />
      ))}

      {/* Clouds */}
      <Cloud style={{ top: H * 0.06, left: '15%', animation: 'cloudFloat 40s linear infinite' }} />
      <Cloud style={{ top: H * 0.12, left: '60%', animation: 'cloudFloat 60s linear infinite 15s', transform: 'scale(0.7)' }} />

      {/* Horizon glow */}
      <div style={{
        position: 'absolute',
        top: waterY - 24,
        left: 0,
        width: '100%',
        height: 24,
        background: 'linear-gradient(to bottom, #1a4a6e, #1e5799)',
      }} />

      {/* Water rows */}
      <WaterRow y={waterY} width={W} tileW={32} speed={2.5} color1="#1e5799" color2="#2463b0" />
      <WaterRow y={waterY + 16} width={W} tileW={32} speed={3.5} color1="#1a4a8a" color2="#1e5799" />
      <WaterRow y={waterY + 32} width={W} tileW={32} speed={4.5} color1="#163d78" color2="#1a4a8a" />
      <WaterRow y={waterY + 48} width={W} tileW={32} speed={2.0} color1="#122f60" color2="#163d78" />
      {waterY + 64 < H && <div style={{ position: 'absolute', top: waterY + 64, left: 0, width: '100%', height: H - waterY - 64, background: '#0e2448' }} />}

      {/* Fish swimming in water */}
      {showFish.map((f, i) => (
        <PixelFish key={i} {...f} />
      ))}

      {boat && showBobber && <BoatLine boat={boat} bobberX={bx} bobberY={by} />}
      {boat && <PixelBoat {...boat} />}

      {/* Dock */}
      {showDock && <Dock width={W} bottom={0} />}

      {/* Dock props */}
      {showDock && showDockDecor && (
        <>
          <Lantern x={W * 0.05} y={dockTop - 32} lit={true} />
          <Barrel x={W * 0.1} y={dockTop - 32} />
          <Barrel x={W * 0.145} y={dockTop - 32} />
        </>
      )}

      {/* Ripples */}
      {ripples.map((r, i) => (
        <Ripple key={r.id} x={r.x} y={r.y} onDone={() => onRippleDone && onRippleDone(r.id)} />
      ))}

      {/* Fishing rod */}
      {showRod && (
        <FishingRod
          x={rodAnchorX}
          y={rodAnchorY}
          angle={rodAngle}
        />
      )}

      {/* Bobber */}
      {showBobber && (
        <Bobber x={bx} y={by} animate={stage === 'endurance' || stage === 'idle'} />
      )}

      {/* Overlay */}
      {overlayContent && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}
        >
          {overlayContent}
        </div>
      )}
    </div>
  );
}
