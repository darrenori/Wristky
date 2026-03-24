import React, { useEffect, useMemo, useState } from 'react';
import { createPageUrl } from '@/utils';
import { usePixelSound } from '../components/game/usePixelSound';
import { getHandPreference, getSessions, saveSession } from '../components/game/useLocalStorage';
import OABanner from '../components/results/OABanner';
import MetricDetailCard from '../components/results/MetricDetailCard';
import TrendSection from '../components/results/TrendSection';
import {
  RESULT_BODY_FONT_FAMILY,
  RESULT_DISPLAY_FONT_FAMILY,
  calculateOverallScore,
  formatMetricValue,
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

function SummaryCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: '#0a1628',
        border: '2px solid #244a69',
        padding: '16px 16px 14px',
      }}
    >
      <div
        style={{
          fontFamily: RESULT_DISPLAY_FONT_FAMILY,
          fontSize: 8,
          lineHeight: 1.8,
          color: '#a9bdd8',
          marginBottom: 8,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: RESULT_BODY_FONT_FAMILY,
          fontSize: 32,
          lineHeight: 1.1,
          fontWeight: 900,
          color: accent || '#ffffff',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({ label, tone = 'primary', onClick }) {
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
    outline: {
      background: '#102038',
      color: '#fff4d6',
      border: '4px solid #A0714F',
      boxShadow: '0 4px 0 #5C3317',
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
        minHeight: 56,
      }}
    >
      {label}
    </button>
  );
}

export default function Results() {
  const { play } = usePixelSound();
  const [results, setResults] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [hand, setHand] = useState({ measuring: 'right', dominant: 'right' });
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    play('complete');

    const rawResults = sessionStorage.getItem('wrist_results');
    const handPref = getHandPreference();
    const handSession = JSON.parse(sessionStorage.getItem('wrist_hand') || 'null');
    const resolvedHand = handSession || handPref;
    setHand(resolvedHand);

    if (rawResults) {
      const parsed = JSON.parse(rawResults);
      setResults(parsed);

      const sessionMarker = sessionStorage.getItem('wrist_session_marker') || rawResults;
      const savedMarker = sessionStorage.getItem('wrist_session_saved_marker');

      if (savedMarker !== sessionMarker) {
        saveSession({
          ...parsed,
          hand: resolvedHand.measuring,
          dominantHand: resolvedHand.dominant,
          calibQuality: parsed.calibQuality || 'unknown',
        });
        sessionStorage.setItem('wrist_session_saved_marker', sessionMarker);
      }
    }

    setSessions(getSessions());
    const timer = setTimeout(() => setAnimating(true), 180);
    return () => clearTimeout(timer);
  }, [play]);

  const overallScore = useMemo(() => calculateOverallScore(results), [results]);

  const summaryCards = useMemo(() => {
    if (!results) return [];
    return [
      {
        label: 'ROM side to side',
        value: `${formatMetricValue('radial', results.radial)} / ${formatMetricValue('ulnar', results.ulnar)}`,
        accent: '#ffe08a',
      },
      {
        label: 'ROM bend and reach',
        value: `${formatMetricValue('flexion', results.flexion)} / ${formatMetricValue('extension', results.extension)}`,
        accent: '#8fc5ff',
      },
      {
        label: 'Control before activity',
        value: formatMetricValue('smoothness_pre', results.smoothness_pre),
        accent: '#7ef7a2',
      },
      {
        label: 'Control after activity',
        value: formatMetricValue('smoothness_post', results.smoothness_post),
        accent: '#ff9aa8',
      },
      {
        label: 'Steadiness hold',
        value: formatMetricValue('endurance', results.endurance),
        accent: '#ffc58a',
      },
      {
        label: 'Overall mobility',
        value: `${overallScore}%`,
        accent: '#ffffff',
      },
    ];
  }, [overallScore, results]);

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
              WRIST REPORT
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
              TODAY&apos;S WRIST SUMMARY
            </h1>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 19,
                lineHeight: 1.55,
                color: '#d0dcec',
                margin: 0,
                textTransform: 'capitalize',
              }}
            >
              {new Date().toLocaleDateString()} | {hand.measuring || 'right'} hand | results saved on this device
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <HeaderButton
              label="HOME"
              onClick={() => {
                play('tick');
                window.location.assign(createPageUrl('Welcome'));
              }}
            />
            <HeaderButton
              label="LOGBOOK"
              tone="primary"
              onClick={() => {
                play('click');
                window.location.assign(createPageUrl('History'));
              }}
            />
          </div>
        </header>

        {!results ? (
          <section
            style={{
              ...panelStyle,
              padding: 24,
              display: 'grid',
              gap: 18,
            }}
          >
            <h2
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 'clamp(14px, 4vw, 18px)',
                lineHeight: 1.9,
                color: '#fff4d6',
                margin: 0,
              }}
            >
              NO MEASUREMENT DATA FOUND
            </h2>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 18,
                lineHeight: 1.6,
                color: '#d0dcec',
                margin: 0,
              }}
            >
              Start a new wrist screening to generate your report and session trend.
            </p>
            <div style={{ maxWidth: 300 }}>
              <ActionButton
                label="NEW TEST"
                onClick={() => {
                  play('start');
                  window.location.assign(createPageUrl('HandSelection'));
                }}
              />
            </div>
          </section>
        ) : (
          <>
            <OABanner results={results} hand={hand} overallScore={overallScore} />

            <section
              style={{
                ...panelStyle,
                padding: 20,
                display: 'grid',
                gap: 12,
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
                  KEY NUMBERS
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
                  Your main wrist scores are shown first. More detail is below.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {summaryCards.map((item) => (
                  <SummaryCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    accent={item.accent}
                  />
                ))}
              </div>
            </section>

            <TrendSection sessions={sessions} title="Session trend" limit={6} />

            <section style={{ display: 'grid', gap: 12 }}>
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
                  DETAILED BREAKDOWN
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
                  Open any card for tailored feedback, recent history in that area, and a suggested home exercise.
                </p>
              </div>

              <MetricDetailCard metricKey="flexion" value={results.flexion} animate={animating} sessions={sessions} allResults={results} />
              <MetricDetailCard metricKey="extension" value={results.extension} animate={animating} sessions={sessions} allResults={results} />
              <MetricDetailCard metricKey="radial" value={results.radial} animate={animating} sessions={sessions} allResults={results} />
              <MetricDetailCard metricKey="ulnar" value={results.ulnar} animate={animating} sessions={sessions} allResults={results} />
              <MetricDetailCard metricKey="smoothness_pre" value={results.smoothness_pre} animate={animating} sessions={sessions} allResults={results} />
              <MetricDetailCard metricKey="smoothness_post" value={results.smoothness_post} animate={animating} sessions={sessions} allResults={results} />
              <MetricDetailCard metricKey="endurance" value={results.endurance} animate={animating} sessions={sessions} allResults={results} />
            </section>

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
                  NEXT STEPS
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
                  Continue with exercises, run another test, or open the full logbook.
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
                  label="EXERCISES"
                  onClick={() => {
                    play('start');
                    window.location.assign(createPageUrl('Exercises'));
                  }}
                />
                <ActionButton
                  label="NEW TEST"
                  tone="secondary"
                  onClick={() => {
                    play('start');
                    window.location.assign(createPageUrl('HandSelection'));
                  }}
                />
                <ActionButton
                  label="LOGBOOK"
                  tone="outline"
                  onClick={() => {
                    play('click');
                    window.location.assign(createPageUrl('History'));
                  }}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
