import React, { useEffect, useRef, useState } from 'react';
import chromeicon from '../../../images/chromeicon_transparent.png';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function PixelMascot({
  message = '',
  animated = true,
  size = 64,
  bubble = Boolean(message),
  containerStyle = {},
  bubbleStyle = {},
  messageStyle = {},
  animateMessageChange = false,
  fixedBubbleWidth = null,
}) {
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [messagePhase, setMessagePhase] = useState('idle');
  const timersRef = useRef([]);
  const showBubble = Boolean(displayedMessage) && bubble;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const spriteRenderSize = Math.max(42, Math.round(size * 1.04));
  const spriteColumnWidth = Math.max(54, spriteRenderSize);
  const baseBubbleWidth = 132;
  const charWidth = 7.25;
  const dynamicBubbleWidth = clamp(
    baseBubbleWidth + Math.max(0, displayedMessage.trim().length - 8) * charWidth,
    164,
    Math.max(164, Math.min(332, viewportWidth - spriteColumnWidth - 42))
  );
  const bubbleWidth = fixedBubbleWidth ?? dynamicBubbleWidth;
  const containerWidth = Math.min(
    viewportWidth - 18,
    bubbleWidth + spriteColumnWidth + 28
  );

  useEffect(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    if (!animateMessageChange || message === displayedMessage) {
      setDisplayedMessage(message);
      setMessagePhase('idle');
      return undefined;
    }

    setMessagePhase('fading-out');
    timersRef.current.push(window.setTimeout(() => {
      setDisplayedMessage(message);
      setMessagePhase('fading-in');
      timersRef.current.push(window.setTimeout(() => {
        setMessagePhase('idle');
      }, 300));
    }, 260));

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [animateMessageChange, message]);

  return (
    <>
      <style>
        {`
          @keyframes mascotFloat {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-3px) scale(1.01); }
          }

          @keyframes bubblePop {
            0% { transform: translateY(2px); opacity: 0.95; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>

      <div
        style={{
          display: showBubble ? 'grid' : 'inline-flex',
          gridTemplateColumns: showBubble ? `${Math.max(54, Math.round(size * 1.02))}px minmax(0, 1fr)` : undefined,
          alignItems: 'center',
          columnGap: 12,
          width: showBubble ? containerWidth : 'auto',
          maxWidth: showBubble ? '100%' : 'none',
          paddingLeft: showBubble ? 12 : 0,
          paddingRight: showBubble ? 12 : 0,
          paddingBottom: showBubble ? 2 : 0,
          overflow: 'visible',
          position: 'relative',
          isolation: 'isolate',
          zIndex: 3,
          ...containerStyle,
        }}
      >
        <div
          style={{
            animation: animated ? 'mascotFloat 1.8s ease-in-out infinite' : 'none',
            flexShrink: 0,
            transformOrigin: 'center bottom',
            justifySelf: 'start',
            alignSelf: 'end',
            position: 'relative',
            zIndex: 4,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <img
            src={chromeicon}
            alt=""
            aria-hidden="true"
            draggable="false"
            style={{
              display: 'block',
              width: spriteRenderSize,
              height: spriteRenderSize,
              objectFit: 'contain',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 4px 0 rgba(43,29,22,0.35))',
            }}
          />
        </div>

        {showBubble && (
          <div
            key={message}
            style={{
              background: '#FFF9E8',
              backgroundImage:
                'linear-gradient(180deg, rgba(255,250,237,1) 0%, rgba(248,239,218,1) 100%), repeating-linear-gradient(180deg, rgba(148,113,78,0.08) 0px, rgba(148,113,78,0.08) 2px, rgba(255,249,232,0) 2px, rgba(255,249,232,0) 6px)',
              border: '3px solid #5C3317',
              borderRadius: 16,
              padding: '15px 18px 18px',
              position: 'relative',
              flex: '1 1 auto',
              width: bubbleWidth,
              minWidth: 0,
              maxWidth: '100%',
              minHeight: 68,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 0 #2B1D16, inset 0 -2px 0 rgba(181,138,88,0.18)',
              animation: 'bubblePop 160ms ease-out',
              zIndex: 3,
              ...bubbleStyle,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -11,
                bottom: 16,
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderRight: '11px solid #5C3317',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: -7,
                bottom: 17,
                width: 0,
                height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderRight: '9px solid #FFF9E8',
              }}
            />

            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 'clamp(8px, 1.95vw, 9px)',
                fontWeight: 400,
                lineHeight: 1.65,
                letterSpacing: '0.02em',
                color: '#2B1D16',
                margin: 0,
                textWrap: 'pretty',
                width: '100%',
                opacity: messagePhase === 'fading-out' ? 0 : 1,
                transition: `opacity ${messagePhase === 'fading-in' ? 300 : 220}ms ease`,
                ...messageStyle,
              }}
            >
              {displayedMessage}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
