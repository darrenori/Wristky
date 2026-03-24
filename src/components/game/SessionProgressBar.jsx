import React from 'react';

export default function SessionProgressBar({
  current,
  total,
  label = 'SESSION PROGRESS',
  accent = '#2ee6c8',
  compact = false,
}) {
  const safeTotal = Math.max(total || 0, 1);
  const safeCurrent = Math.max(0, Math.min(current || 0, safeTotal));
  const percent = (safeCurrent / safeTotal) * 100;

  return (
    <div
      style={{
        width: `min(100%, ${compact ? 232 : 320}px)`,
        background: 'rgba(8, 20, 38, 0.92)',
        border: '3px solid #5C3317',
        boxShadow: '4px 4px 0 #2d1b00',
        padding: compact ? '8px 10px' : '10px 12px',
        display: 'grid',
        gap: compact ? 6 : 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: compact ? 6 : 7,
          lineHeight: 1.7,
          color: '#f4f0de',
          textShadow: '1px 1px 0 #000',
        }}
      >
        <span>{label}</span>
        <span style={{ color: accent }}>
          {safeCurrent}/{safeTotal}
        </span>
      </div>
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: compact ? 14 : 18,
          background: '#111a2a',
          border: '3px solid #244a69',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${accent} 0%, #3c7ee0 100%)`,
            height: '100%',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.16)',
          }}
        />
      </div>
    </div>
  );
}
