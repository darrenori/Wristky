import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import {
  METRIC_INFO,
  RESULT_BODY_FONT_FAMILY,
  RESULT_DISPLAY_FONT_FAMILY,
  formatMetricValue,
  formatSessionMeta,
  getMetricRatio,
  getMetricStatus,
  getMetricValue,
} from './results-utils';

const METRIC_ORDER = ['flexion', 'extension', 'radial', 'ulnar', 'smoothness_pre', 'smoothness_post', 'endurance'];

function buildMetricHistory(metricKey, sessions, limit = 5) {
  return sessions
    .filter((session) => session?.[metricKey] !== undefined && session?.[metricKey] !== null)
    .slice(0, limit)
    .map((session, index) => ({
      id: session.id || `${session.date || 'session'}-${index}`,
      label: index === 0 ? 'Latest saved' : formatSessionMeta(session.date),
      numericValue: getMetricValue(metricKey, session[metricKey]),
      displayValue: formatMetricValue(metricKey, session[metricKey]),
    }));
}

function formatDelta(metricKey, delta) {
  const info = METRIC_INFO[metricKey];
  if (!info) return '';
  return `${Math.round(Math.abs(delta))}${info.unit}`;
}

function getMetricInsight(metricKey, value, allResults, sessions) {
  const ratio = getMetricRatio(metricKey, value);
  const history = buildMetricHistory(metricKey, sessions);
  const currentNumericValue = getMetricValue(metricKey, value);
  const rankedMetrics = METRIC_ORDER
    .filter((key) => allResults?.[key] !== undefined && allResults?.[key] !== null)
    .map((key) => ({ key, ratio: getMetricRatio(key, allResults[key]) }))
    .sort((a, b) => a.ratio - b.ratio);
  const focusRank = rankedMetrics.findIndex((item) => item.key === metricKey);

  let heading = 'Keeping steady';
  let detail = 'This area is tracking close to the typical range today.';

  if (ratio < 0.45) {
    heading = focusRank === 0 ? 'Main focus area today' : 'Needs extra support';
    detail =
      focusRank === 0
        ? 'This is your weakest area in this session, so it is the best place to focus your exercises first.'
        : 'This area is well below the typical range today and would benefit from gentle, consistent work.';
  } else if (ratio < 0.7) {
    heading = focusRank === 0 ? 'Priority to work on' : 'Below your target';
    detail =
      focusRank === 0
        ? 'This is one of the tougher areas in today\'s screen. Give it a little extra attention in your routine.'
        : 'This area is below the typical range today, but steady daily practice could help bring it back up.';
  } else if (ratio < 0.9) {
    heading = 'Close to your target';
    detail = 'This area is a bit under the typical range today, so it is worth monitoring and keeping mobile.';
  } else {
    heading = 'One of your stronger areas';
    detail = 'This area is holding up well today. Keep moving it to maintain that result.';
  }

  let trend = 'Save a few more sessions to build a history for this area.';
  let previousEntry = null;

  if (history.length > 0 && currentNumericValue !== null) {
    previousEntry =
      Math.abs((history[0]?.numericValue ?? currentNumericValue) - currentNumericValue) <= 0.5
        ? history[1] ?? null
        : history[0];
  }

  if (previousEntry && currentNumericValue !== null) {
    const delta = currentNumericValue - previousEntry.numericValue;
    const threshold = METRIC_INFO[metricKey]?.unit === '%' ? 4 : 4;

    if (delta > threshold) {
      trend = `Up ${formatDelta(metricKey, delta)} from your last comparable result.`;
    } else if (delta < -threshold) {
      trend = `Down ${formatDelta(metricKey, delta)} from your last comparable result.`;
    } else {
      trend = 'Very close to your last comparable result.';
    }
  } else if (history.length > 0) {
    trend = 'Your latest saved result for this area is shown below.';
  }

  return {
    heading,
    detail,
    trend,
    history,
  };
}

export default function MetricDetailCard({ metricKey, value, animate, sessions = [], allResults = null }) {
  const [expanded, setExpanded] = useState(false);
  const [fillPercent, setFillPercent] = useState(0);

  const info = METRIC_INFO[metricKey];
  const ratio = info && value !== undefined ? getMetricRatio(metricKey, value) : 0;
  const status = info && value !== undefined ? getMetricStatus(metricKey, value) : { label: '', color: '#ffffff' };
  const displayValue = info && value !== undefined ? formatMetricValue(metricKey, value) : '--';
  const barTarget = Math.round(Math.min(100, ratio * 100));
  const insight = info && value !== undefined ? getMetricInsight(metricKey, value, allResults, sessions) : null;

  useEffect(() => {
    if (!animate) {
      setFillPercent(0);
      return undefined;
    }

    const timer = setTimeout(() => setFillPercent(barTarget), 120);
    return () => clearTimeout(timer);
  }, [animate, barTarget]);

  if (!info || value === undefined) return null;

  return (
    <article
      style={{
        background: '#102038',
        border: `4px solid ${expanded ? info.color : '#5C3317'}`,
        boxShadow: '4px 4px 0 #2d1b00',
        padding: 18,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 8,
                lineHeight: 1.8,
                color: info.color,
                marginBottom: 8,
              }}
            >
              {info.shortLabel.toUpperCase()}
            </div>
            <h3
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 28,
                lineHeight: 1.15,
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 8px',
              }}
            >
              {info.label}
            </h3>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 17,
                lineHeight: 1.55,
                color: '#d5e0f1',
                margin: 0,
              }}
            >
              {info.what}
            </p>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 34,
                lineHeight: 1,
                fontWeight: 900,
                color: '#ffffff',
                marginBottom: 8,
              }}
            >
              {displayValue}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 12px',
                background: `${status.color}20`,
                border: `2px solid ${status.color}55`,
                color: status.color,
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {status.label}
            </div>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: 16,
            background: '#0a1628',
            border: '2px solid #244a69',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '83%',
              width: 2,
              background: 'rgba(255,255,255,0.45)',
            }}
          />
          <div
            style={{
              width: `${fillPercent}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${info.color}, ${status.color})`,
              transition: animate ? 'width 700ms ease-out' : 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontFamily: RESULT_BODY_FONT_FAMILY,
              fontSize: 15,
              color: '#d2dcef',
            }}
          >
            Typical range: {info.normRange}
          </div>
          <div
            style={{
              fontFamily: RESULT_DISPLAY_FONT_FAMILY,
              fontSize: 8,
              lineHeight: 1.8,
              color: '#fff4d6',
            }}
          >
            {expanded ? 'HIDE DETAILS' : 'MORE DETAILS'}
          </div>
        </div>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: '2px solid #244a69',
            display: 'grid',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Your result', value: displayValue, color: '#ffffff' },
              { label: 'Typical range', value: info.normRange, color: '#d4f5df' },
              { label: 'Status', value: status.label, color: status.color },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: '#0a1628',
                  border: '2px solid #244a69',
                  padding: '14px 16px',
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
                  {item.label.toUpperCase()}
                </div>
                <div
                  style={{
                    fontFamily: RESULT_BODY_FONT_FAMILY,
                    fontSize: 22,
                    lineHeight: 1.2,
                    fontWeight: 900,
                    color: item.color,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: '#0a1628',
              border: '2px solid #244a69',
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 8,
                lineHeight: 1.8,
                color: info.color,
                marginBottom: 8,
              }}
            >
              WHY IT MATTERS
            </div>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 17,
                lineHeight: 1.6,
                color: '#d7def0',
                margin: 0,
              }}
            >
              {info.why}
            </p>
          </div>

          {insight && (
            <div
              style={{
                background: '#0a1628',
                border: '2px solid #244a69',
                padding: '16px 18px',
                display: 'grid',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                  fontSize: 8,
                  lineHeight: 1.8,
                  color: status.color,
                }}
              >
                FEEDBACK
              </div>
              <div
                style={{
                  fontFamily: RESULT_BODY_FONT_FAMILY,
                  fontSize: 22,
                  lineHeight: 1.2,
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                {insight.heading}
              </div>
              <p
                style={{
                  fontFamily: RESULT_BODY_FONT_FAMILY,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: '#d7def0',
                  margin: 0,
                }}
              >
                {insight.detail}
              </p>
              <p
                style={{
                  fontFamily: RESULT_BODY_FONT_FAMILY,
                  fontSize: 16,
                  lineHeight: 1.55,
                  color: '#9fd4ff',
                  margin: 0,
                }}
              >
                {insight.trend}
              </p>
            </div>
          )}

          <div
            style={{
              background: `${info.color}14`,
              border: `2px solid ${info.color}66`,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 8,
                lineHeight: 1.8,
                color: info.color,
                marginBottom: 8,
              }}
            >
              EXERCISE: {info.rehabName.toUpperCase()}
            </div>
            <p
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 17,
                lineHeight: 1.6,
                color: '#e8ecf8',
                margin: 0,
              }}
            >
              {info.rehab}
            </p>
          </div>

          <div
            style={{
              background: '#0a1628',
              border: '2px solid #244a69',
              padding: '16px 18px',
              display: 'grid',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                  fontSize: 8,
                  lineHeight: 1.8,
                  color: '#F4D35E',
                }}
              >
                RECENT HISTORY
              </div>
              <button
                type="button"
                onClick={() => window.location.assign(createPageUrl('History'))}
                className="pixel-btn"
                style={{
                  background: '#3c7ee0',
                  color: '#ffffff',
                  border: '3px solid #1f4f98',
                  boxShadow: '0 4px 0 #102b57',
                  padding: '10px 12px',
                  fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                  fontSize: 7,
                  lineHeight: 1.8,
                }}
              >
                OPEN LOGBOOK
              </button>
            </div>

            {insight?.history?.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {insight.history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      background: '#102038',
                      border: '2px solid #244a69',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: RESULT_BODY_FONT_FAMILY,
                        fontSize: 15,
                        lineHeight: 1.5,
                        color: '#d5e0f1',
                      }}
                    >
                      {entry.label}
                    </div>
                    <div
                      style={{
                        fontFamily: RESULT_BODY_FONT_FAMILY,
                        fontSize: 20,
                        lineHeight: 1.1,
                        fontWeight: 900,
                        color: '#ffffff',
                      }}
                    >
                      {entry.displayValue}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontFamily: RESULT_BODY_FONT_FAMILY,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: '#d7def0',
                  margin: 0,
                }}
              >
                No saved history for this area yet. Finish more sessions to compare this metric over time.
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
