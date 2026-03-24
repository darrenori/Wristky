import React from 'react';
import { createPageUrl } from '@/utils';

export default function PageNotFound() {
  return (
    <div style={{
      width: '100%', minHeight: '100dvh',
      background: '#0a1628',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 32, color: '#F4D35E',
        textShadow: '4px 4px 0 #5C3317',
      }}>
        404
      </div>
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 10, color: '#888',
        textAlign: 'center', lineHeight: 2,
      }}>
        The fish got away...<br />
        Page not found!
      </div>
      <button
        onClick={() => window.location.href = createPageUrl('Welcome')}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          background: '#F4D35E',
          color: '#2d1b00',
          border: '4px solid #c9a72e',
          boxShadow: '0 4px 0 #8b7020',
          padding: '12px 24px',
          cursor: 'pointer',
        }}
      >
        🏠 GO HOME
      </button>
    </div>
  );
}
