import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const READABLE_FONT = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

const VIDEO_LIBRARY = {
  extension: new URL('../../../videos/1.mp4', import.meta.url).href,
  flexion: new URL('../../../videos/2.mp4', import.meta.url).href,
  radial: new URL('../../../videos/3.mp4', import.meta.url).href,
  ulnar: new URL('../../../videos/4.mp4', import.meta.url).href,
  circumduction: new URL('../../../videos/5.mp4', import.meta.url).href,
};

const GAME_INFO = {
  MeasureCircle: {
    title: 'Wrist rotation',
    icon: 'O',
    move: 'Rotate your wrist in one slow, comfortable circle.',
    setup: 'Rest your forearm on your knee or a table. Keep the elbow still and let only the wrist move.',
    goal: 'This spins the net and checks how smooth and complete your circle is.',
    steps: [
      'Rest the forearm and keep the elbow still.',
      'Draw one big smooth circle with the phone.',
      'Go slow. A smooth circle is better than a fast circle.',
    ],
    reminder: 'Stop if the motion feels painful.',
    videos: [{ label: 'Circumduction demo', src: VIDEO_LIBRARY.circumduction }],
    defaultVideo: 0,
  },
  MeasureFlexion: {
    title: 'Flexion',
    icon: 'FLEX',
    move: 'Follow the flexion demo from your neutral start position.',
    setup: 'Hold the phone sideways like the demo, support the forearm, and copy the flexion motion shown in the video.',
    goal: 'This reels the fish in and measures the flexion motion from your neutral starting angle.',
    steps: [
      'Keep the forearm supported and the phone turned sideways.',
      'Follow the flexion demo direction slowly and smoothly.',
      'Pause briefly at the furthest point, then tap DONE.',
    ],
    orientationNote: 'Hold the phone sideways before pressing START. The app uses that starting angle as neutral, so changing the phone position after you begin can affect the movement reading.',
    reminder: 'Move only as far as feels comfortable.',
    videos: [
      { label: 'Flexion demo', src: VIDEO_LIBRARY.flexion },
      { label: 'Extension demo', src: VIDEO_LIBRARY.extension },
    ],
    defaultVideo: 0,
  },
  MeasureExtension: {
    title: 'Extension',
    icon: 'EXT',
    move: 'Follow the extension demo from your neutral start position.',
    setup: 'Hold the phone sideways like the demo, keep the forearm supported, and copy the extension motion shown in the video.',
    goal: 'This casts the rod and measures the extension motion from your neutral starting angle.',
    steps: [
      'Keep the forearm supported and the phone turned sideways.',
      'Follow the extension demo direction slowly and smoothly.',
      'Pause briefly at the top, then tap DONE.',
    ],
    orientationNote: 'Hold the phone sideways before pressing START. The app uses that starting angle as neutral, so changing the phone position after you begin can affect the movement reading.',
    reminder: 'Do not force the wrist backward.',
    videos: [
      { label: 'Extension demo', src: VIDEO_LIBRARY.extension },
      { label: 'Flexion demo', src: VIDEO_LIBRARY.flexion },
    ],
    defaultVideo: 0,
  },
  MeasureRadial: {
    title: 'Radial deviation',
    icon: 'LEFT',
    move: 'Tilt the wrist toward the thumb side, matching the radial demo.',
    setup: 'Keep the forearm flat on the surface, keep the phone flat, and tilt only toward the thumb side slowly.',
    goal: 'This guides the fish and measures side tilt toward the thumb side.',
    steps: [
      'Keep the forearm and phone flat and steady.',
      'Tilt the wrist toward the thumb side only.',
      'Pause at the end point, then tap DONE.',
    ],
    orientationNote: 'Hold the phone sideways before pressing START. Keep the phone flat, because changing the phone position after you begin can affect the movement reading.',
    reminder: 'Try not to turn the whole forearm.',
    videos: [
      { label: 'Radial demo', src: VIDEO_LIBRARY.radial },
      { label: 'Ulnar demo', src: VIDEO_LIBRARY.ulnar },
    ],
    defaultVideo: 0,
  },
  MeasureUlnar: {
    title: 'Ulnar deviation',
    icon: 'RIGHT',
    move: 'Tilt the wrist toward the little-finger side, matching the ulnar demo.',
    setup: 'Keep the forearm flat on the surface, keep the phone flat, and tilt only toward the little-finger side slowly.',
    goal: 'This guides the fish and measures side tilt toward the little-finger side.',
    steps: [
      'Keep the forearm and phone flat and steady.',
      'Tilt the wrist toward the little-finger side only.',
      'Pause at the end point, then tap DONE.',
    ],
    orientationNote: 'Hold the phone sideways before pressing START. Keep the phone flat, because changing the phone position after you begin can affect the movement reading.',
    reminder: 'Try not to lift the elbow or shoulder.',
    videos: [
      { label: 'Ulnar demo', src: VIDEO_LIBRARY.ulnar },
      { label: 'Radial demo', src: VIDEO_LIBRARY.radial },
    ],
    defaultVideo: 0,
  },
  MeasureEndurance: {
    title: 'Steadiness hold',
    icon: 'HOLD',
    move: 'Keep the wrist still and level.',
    setup: 'Rest the elbow on a knee or table, hold the phone level, breathe normally, and try not to move.',
    goal: 'This checks how steady the wrist stays during a hold.',
    steps: [
      'Rest the forearm and hold the phone level.',
      'Breathe normally and keep still.',
      'Stay relaxed until the timer ends or DONE appears.',
    ],
    reminder: 'Small natural tremors are okay. Just stay as steady as you can.',
    videos: [],
    defaultVideo: 0,
  },
};

function DemoVideo({ clip }) {
  if (!clip) return null;

  return (
    <div
      style={{
        background: '#081220',
        border: '3px solid #2ab4a0',
        padding: 10,
      }}
    >
      <video
        key={clip.src}
        controls
        playsInline
        preload="metadata"
        style={{
          width: '100%',
          maxHeight: '62dvh',
          display: 'block',
          background: '#000',
          border: '2px solid #163c54',
          objectFit: 'contain',
        }}
      >
        <source src={clip.src} type="video/mp4" />
        Your browser does not support video playback.
      </video>

      <div
        style={{
          fontFamily: READABLE_FONT,
          fontSize: 16,
          fontWeight: 800,
          color: '#d9fff7',
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        {clip.label}
      </div>
    </div>
  );
}

function VideoModal({ clip, onClose, rotated = false }) {
  if (!clip || typeof document === 'undefined') return null;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 430;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 932;
  const sceneWidth = Math.max(viewportWidth, viewportHeight);
  const sceneHeight = Math.min(viewportWidth, viewportHeight);

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 240,
        background: 'rgba(4, 10, 20, 0.86)',
        overflow: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        style={rotated ? {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: sceneWidth,
          height: sceneHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 14px',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center center',
        } : {
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 14px',
        }}
      >
        <div
          style={{
            width: 'min(100%, 420px)',
            maxHeight: rotated ? 'calc(100% - 8px)' : '86dvh',
            overflowY: 'auto',
            background: '#102038',
            border: '4px solid #5C3317',
            boxShadow: '4px 4px 0 #2d1b00',
            padding: 14,
            display: 'grid',
            gap: 12,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
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
              DEMO VIDEO
            </div>
            <button
              type="button"
              className="pixel-btn pixel-btn-blue"
              style={{ minHeight: 36, fontSize: 8, padding: '8px 10px' }}
              onClick={onClose}
            >
              CLOSE
            </button>
          </div>

          <DemoVideo clip={clip} />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function SectionLabel({ children, color = '#F4D35E' }) {
  return (
    <div
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 8,
        lineHeight: 1.8,
        color,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, text }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          lineHeight: 1.8,
          color: '#8ea5bf',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: READABLE_FONT,
          fontSize: 17,
          lineHeight: 1.5,
          color: '#e4edf8',
          fontWeight: 700,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function GameInstructionCard({ gamePage, style, rotatedModal = undefined }) {
  const info = GAME_INFO[gamePage] || GAME_INFO.MeasureFlexion;
  const videoOptions = info.videos || [];
  const [activeVideoIndex, setActiveVideoIndex] = useState(info.defaultVideo || 0);
  const [showVideo, setShowVideo] = useState(false);
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 430;
  const compactWidth = viewportWidth <= 390;
  const compact = viewportHeight <= 820 || compactWidth;
  const veryCompact = viewportHeight <= 740;
  const ultraCompact = viewportHeight <= 680;
  const bodyFontSize = ultraCompact ? 14 : veryCompact ? 15 : 16;
  const detailFontSize = ultraCompact ? 14 : veryCompact ? 15 : 17;
  const sectionFontSize = ultraCompact ? 7 : 8;
  const panelPadding = ultraCompact ? '9px 11px' : veryCompact ? '10px 12px' : '12px 14px';
  const autoRotatedLandscapeModal = viewportHeight > viewportWidth
    && ['MeasureExtension', 'MeasureFlexion', 'MeasureRadial', 'MeasureUlnar'].includes(gamePage);
  const shouldRotateModal = rotatedModal ?? autoRotatedLandscapeModal;

  useEffect(() => {
    setActiveVideoIndex(info.defaultVideo || 0);
    setShowVideo(false);
  }, [gamePage, info.defaultVideo]);

  const activeClip = useMemo(
    () => videoOptions[activeVideoIndex] || null,
    [activeVideoIndex, videoOptions]
  );

  return (
    <div
      className="game-instruction-card"
      style={{
        padding: ultraCompact ? '14px 14px' : '16px 16px',
        display: 'grid',
        gap: ultraCompact ? 8 : 10,
        minHeight: 0,
        ...style,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: sectionFontSize,
            lineHeight: 1.8,
            color: '#2ee6c8',
            marginBottom: 6,
          }}
        >
          {info.icon}
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: veryCompact ? 10 : 11,
            lineHeight: 1.8,
            color: '#F4D35E',
            textShadow: '2px 2px 0 #5C3317',
          }}
        >
          {info.title.toUpperCase()}
        </div>
      </div>

      {activeClip && (
        <div
          style={{
            background: '#13243b',
            border: '3px solid #244a69',
            padding: panelPadding,
            display: 'grid',
            gap: veryCompact ? 8 : 10,
          }}
        >
          <SectionLabel>WATCH FIRST</SectionLabel>
          <div
            style={{
              fontFamily: READABLE_FONT,
              fontSize: bodyFontSize,
              lineHeight: 1.45,
              color: '#dbe8f8',
              fontWeight: 700,
            }}
          >
            Open the demo if you want to see the motion before starting.
          </div>
          {videoOptions.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {videoOptions.map((clip, index) => (
                <button
                  key={clip.label}
                  type="button"
                  onClick={() => setActiveVideoIndex(index)}
                  style={{
                    background: activeVideoIndex === index ? '#2ab4a0' : '#122437',
                    color: activeVideoIndex === index ? '#06131d' : '#d6e6f7',
                    border: `2px solid ${activeVideoIndex === index ? '#8ef5e6' : '#244a69'}`,
                    padding: veryCompact ? '7px 9px' : '8px 10px',
                    fontFamily: READABLE_FONT,
                    fontSize: veryCompact ? 13 : 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {clip.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="pixel-btn pixel-btn-blue"
            style={{
              width: '100%',
              minHeight: ultraCompact ? 40 : 44,
              fontSize: ultraCompact ? 7 : veryCompact ? 8 : 9,
              letterSpacing: 0.4,
            }}
            onClick={() => setShowVideo(true)}
          >
            WATCH DEMO
          </button>
        </div>
      )}

      <div
        style={{
          background: '#13243b',
          border: '3px solid #244a69',
          padding: panelPadding,
          display: 'grid',
          gap: veryCompact ? 10 : 12,
        }}
      >
        <SectionLabel>WHAT TO DO</SectionLabel>
        <InfoRow label="MOVE" text={info.move} />
        <InfoRow label="SET UP" text={info.setup} />
      </div>

      <div
        style={{
          background: '#0a1628',
          border: '3px solid #A0714F',
          padding: panelPadding,
          display: 'grid',
          gap: veryCompact ? 8 : 10,
        }}
      >
        <SectionLabel>QUICK STEPS</SectionLabel>
        {info.steps.map((step, index) => (
          <div
            key={step}
            style={{
              display: 'grid',
              gridTemplateColumns: '30px 1fr',
              gap: 10,
              alignItems: 'start',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                background: '#F4D35E',
                border: '2px solid #8b7020',
                color: '#2d1b00',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: veryCompact ? 8 : 9,
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                fontFamily: READABLE_FONT,
                fontSize: detailFontSize,
                lineHeight: 1.45,
                color: '#f4eadb',
                fontWeight: 700,
              }}
            >
              {step}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'rgba(244,211,94,0.08)',
          border: '2px solid rgba(244,211,94,0.32)',
          padding: veryCompact ? '9px 11px' : '10px 12px',
        }}
      >
        <SectionLabel color="#EBC89B">TIP</SectionLabel>
        <div
          style={{
            fontFamily: READABLE_FONT,
            fontSize: bodyFontSize,
            lineHeight: 1.45,
            color: '#fff4d6',
            fontWeight: 700,
          }}
        >
          {info.reminder}
        </div>
      </div>

      {info.orientationNote && (
        <div
          style={{
            background: 'rgba(46, 230, 200, 0.08)',
            border: '2px solid rgba(46, 230, 200, 0.3)',
            padding: veryCompact ? '9px 11px' : '10px 12px',
          }}
        >
          <SectionLabel color="#8ef5e6">BEFORE START</SectionLabel>
          <div
            style={{
              fontFamily: READABLE_FONT,
              fontSize: bodyFontSize,
              lineHeight: 1.45,
              color: '#d9fff7',
              fontWeight: 700,
            }}
          >
            {info.orientationNote}
          </div>
        </div>
      )}

      <div
        style={{
          background: '#0a1628',
          border: '2px solid #244a69',
          padding: veryCompact ? '9px 11px' : '10px 12px',
        }}
      >
        <SectionLabel color="#8ea5bf">GAME GOAL</SectionLabel>
        <div
          style={{
            fontFamily: READABLE_FONT,
            fontSize: bodyFontSize,
            lineHeight: 1.45,
            color: '#dce8f6',
            fontWeight: 700,
          }}
        >
          {info.goal}
        </div>
      </div>
      {showVideo && <VideoModal clip={activeClip} onClose={() => setShowVideo(false)} rotated={shouldRotateModal} />}
    </div>
  );
}
