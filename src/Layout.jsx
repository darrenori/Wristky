import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'relative',
        background: '#0a1628',
        imageRendering: 'pixelated',
      }}
    >
      <style>{`
        /* Scanline overlay for retro effect */
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
          z-index: 9999;
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a2e; }
        ::-webkit-scrollbar-thumb { background: #5C3317; }

        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      {children}
    </div>
  );
}
