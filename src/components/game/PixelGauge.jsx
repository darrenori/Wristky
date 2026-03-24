import React from 'react';

export default function PixelGauge({
  value = 0,
  label = '',
  color = '#3e8948',
  maxDegrees = 90,
}) {
  const width = 200;
  const height = 32;
  const centerX = width / 2;
  const range = width * 0.8;
  const needleX = Math.round(centerX + (value * range) / 2);
  const clampedX = Math.max(8, Math.min(width - 8, needleX));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {label && (
        <span
          style={{
            fontFamily: '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: '#f5e6c8',
          }}
        >
          {label}
        </span>
      )}

      <svg width={width} height={height} style={{ imageRendering: 'pixelated' }}>
        <rect x="8" y="12" width={width - 16} height="8" fill="#1a1a2e" shapeRendering="crispEdges" />
        <rect x="8" y="12" width={width - 16} height="4" fill="#2a2a4e" shapeRendering="crispEdges" />

        {value >= 0 ? (
          <rect
            x={centerX}
            y="12"
            width={Math.round((value * range) / 2)}
            height="8"
            fill={color}
            shapeRendering="crispEdges"
          />
        ) : (
          <rect
            x={centerX + Math.round((value * range) / 2)}
            y="12"
            width={Math.abs(Math.round((value * range) / 2))}
            height="8"
            fill={color}
            shapeRendering="crispEdges"
          />
        )}

        <rect x={centerX - 1} y="8" width="3" height="16" fill="#f4d35e" shapeRendering="crispEdges" />

        <rect x={clampedX - 2} y="6" width="5" height="20" fill="#ffffff" shapeRendering="crispEdges" />
        <rect x={clampedX - 1} y="4" width="3" height="2" fill="#ffff00" shapeRendering="crispEdges" />

        <rect x="4" y="8" width={width - 8} height="16" fill="none" stroke="#5C3317" strokeWidth="3" shapeRendering="crispEdges" />
      </svg>

      <span
        style={{
          fontFamily: '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
          fontSize: 18,
          fontWeight: 800,
          color: '#f4d35e',
          background: '#1a1a2e',
          padding: '4px 8px',
          border: '2px solid #5C3317',
        }}
      >
        {Math.round(value * maxDegrees)} deg
      </span>
    </div>
  );
}
