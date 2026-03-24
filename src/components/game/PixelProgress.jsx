import React from 'react';

// Shows lit lanterns as progress
export default function PixelProgress({ current, total, label = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {label && (
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#f5e6c8' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <svg key={i} width={14} height={26} style={{ imageRendering: 'pixelated' }}>
            {/* Post */}
            <rect x="5" y="0" width="4" height="6" fill="#888" shapeRendering="crispEdges" />
            {/* Lantern body */}
            <rect x="1" y="6" width="12" height="14" fill={i < current ? '#F4D35E' : '#444'} shapeRendering="crispEdges" />
            <rect x="0" y="8" width="14" height="2" fill="#5C3317" shapeRendering="crispEdges" />
            <rect x="0" y="16" width="14" height="2" fill="#5C3317" shapeRendering="crispEdges" />
            {/* Glow */}
            {i < current && (
              <rect x="3" y="8" width="8" height="8" fill="#FFEE88" shapeRendering="crispEdges" opacity="0.6" />
            )}
            <rect x="1" y="20" width="12" height="4" fill="#5C3317" shapeRendering="crispEdges" />
          </svg>
        ))}
      </div>
    </div>
  );
}
