import React from 'react';

export default function PixelTimer({ seconds, maxSeconds = 25, color = undefined }) {
  const pct = Math.max(0, seconds / maxSeconds);
  const W = 160;
  const fillW = Math.round(pct * (W - 8));
  const barColor = color || (pct > 0.5 ? '#3e8948' : pct > 0.25 ? '#f4d35e' : '#c0392b');
  const safeSeconds = Math.max(0, seconds);
  const label = safeSeconds >= 1 ? `${Math.ceil(safeSeconds)}s` : `${safeSeconds.toFixed(1)}s`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={W} height={20} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="0" width={W} height="20" fill="#1a1a2e" shapeRendering="crispEdges" />
        <rect x="4" y="4" width={fillW} height="12" fill={barColor} shapeRendering="crispEdges" />
        <rect x="0" y="0" width={W} height="20" fill="none" stroke="#5C3317" strokeWidth="3" shapeRendering="crispEdges" />
      </svg>
      <span style={{
        fontFamily: '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: 20,
        fontWeight: 800,
        color: barColor,
      }}>
        {label}
      </span>
    </div>
  );
}
