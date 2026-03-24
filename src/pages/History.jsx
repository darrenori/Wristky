import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { usePixelSound } from '../components/game/usePixelSound';
import { exportToCSV, getSessions } from '../components/game/useLocalStorage';
import TrendSection from '../components/results/TrendSection';
import {
  RESULT_BODY_FONT_FAMILY,
  RESULT_DISPLAY_FONT_FAMILY,
} from '../components/results/results-utils';

const screenStyle = /** @type {import('react').CSSProperties} */ ({
  width: '100%',
  minHeight: '100dvh',
  overflowY: 'auto',
  backgroundColor: '#081426',
  backgroundImage:
    'linear-gradient(180deg, rgba(15,37,64,0.95) 0%, rgba(8,20,38,0.98) 100%), repeating-linear-gradient(180deg, rgba(44,90,145,0.14) 0px, rgba(44,90,145,0.14) 4px, rgba(8,20,38,0.12) 4px, rgba(8,20,38,0.12) 8px)',
  paddingBottom: 32,
});

const panelStyle = {
  background: '#102038',
  border: '4px solid #5C3317',
  boxShadow: '4px 4px 0 #2d1b00',
};

function HeaderButton({ label, onClick, tone = 'secondary' }) {
  const styles = {
    primary: {
      background: '#2ee6c8',
      color: '#081426',
      border: '4px solid #127564',
      boxShadow: '0 4px 0 #0d5548',
    },
    secondary: {
      background: '#3c7ee0',
      color: '#ffffff',
      border: '4px solid #1f4f98',
      boxShadow: '0 4px 0 #102b57',
    },
    danger: {
      background: '#d94a3b',
      color: '#ffffff',
      border: '4px solid #9f2f24',
      boxShadow: '0 4px 0 #641e16',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-btn"
      style={{
        ...styles[tone],
        padding: '12px 16px',
        fontFamily: RESULT_DISPLAY_FONT_FAMILY,
        fontSize: 9,
        lineHeight: 1.7,
        minHeight: 48,
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({ label, onClick, tone = 'primary' }) {
  const styles = {
    primary: {
      background: '#2ee6c8',
      color: '#081426',
      border: '4px solid #127564',
      boxShadow: '0 4px 0 #0d5548',
    },
    secondary: {
      background: '#3c7ee0',
      color: '#ffffff',
      border: '4px solid #1f4f98',
      boxShadow: '0 4px 0 #102b57',
    },
    danger: {
      background: '#d94a3b',
      color: '#ffffff',
      border: '4px solid #9f2f24',
      boxShadow: '0 4px 0 #641e16',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-btn"
      style={{
        ...styles[tone],
        width: '100%',
        padding: '14px 16px',
        fontFamily: RESULT_DISPLAY_FONT_FAMILY,
        fontSize: 9,
        lineHeight: 1.8,
        minHeight: 54,
      }}
    >
      {label}
    </button>
  );
}

export default function History() {
  const { play } = usePixelSound();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  return (
    <div style={screenStyle}>
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: '20px 18px 32px',
          display: 'grid',
          gap: 20,
        }}
      >
        <header
          style={{
            ...panelStyle,
            padding: '20px 18px',
            display: 'grid',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 9,
                lineHeight: 1.8,
                color: '#a9bdd8',
                marginBottom: 10,
              }}
            >
              MY LOGBOOK
            </div>
            <h1
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 'clamp(18px, 5vw, 28px)',
                lineHeight: 1.7,
                color: '#fff4d6',
                margin: '0 0 10px',
              }}
            >
              SAVED WRIST SESSIONS
            </h1>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 19,
                lineHeight: 1.55,
                color: '#d0dcec',
                margin: 0,
                maxWidth: 680,
              }}
            >
              Review your trend, export a copy, or clear saved data on this device.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <HeaderButton
              label="BACK"
              onClick={() => {
                play('tick');
                window.location.assign(createPageUrl('Welcome'));
              }}
            />
            <HeaderButton
              label="EXPORT CSV"
              tone="primary"
              onClick={() => {
                if (sessions.length === 0) return;
                exportToCSV(sessions);
                play('success');
              }}
            />
          </div>
        </header>

        <TrendSection sessions={sessions} title="Session trend" />

        <section
          style={{
            ...panelStyle,
            padding: 20,
            display: 'grid',
            gap: 14,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 'clamp(14px, 4vw, 18px)',
                lineHeight: 1.9,
                color: '#fff4d6',
                margin: '0 0 8px',
              }}
            >
              QUICK ACTIONS
            </h2>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 18,
                lineHeight: 1.55,
                color: '#d0dcec',
                margin: 0,
              }}
            >
              Start a new screening, export your records, or remove saved sessions from this device.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            <ActionButton
              label="NEW TEST"
              onClick={() => {
                play('start');
                window.location.assign(createPageUrl('HandSelection'));
              }}
            />
            <ActionButton
              label="EXPORT"
              tone="secondary"
              onClick={() => {
                if (sessions.length === 0) return;
                exportToCSV(sessions);
                play('success');
              }}
            />
            <ActionButton
              label="CLEAR DATA"
              tone="danger"
              onClick={() => {
                if (!window.confirm('Delete all saved sessions from this device?')) return;
                localStorage.removeItem('wristcare_sessions');
                setSessions([]);
                play('error');
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
