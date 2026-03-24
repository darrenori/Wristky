import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RESULT_BODY_FONT_FAMILY,
  RESULT_DISPLAY_FONT_FAMILY,
  buildTrendData,
} from './results-utils';

const panelStyle = {
  background: '#102038',
  border: '4px solid #5C3317',
  boxShadow: '4px 4px 0 #2d1b00',
};

function TrendTooltip({ active = false, payload = [], label = '' }) {
  if (!active || !payload?.length) return null;

  const risk = payload.find((item) => item.dataKey === 'risk')?.value;
  const smoothness = payload.find((item) => item.dataKey === 'smoothness')?.value;
  const entry = payload[0]?.payload;

  return (
    <div
      style={{
        ...panelStyle,
        padding: '14px 16px',
        maxWidth: 240,
      }}
    >
      <div
        style={{
          fontFamily: RESULT_DISPLAY_FONT_FAMILY,
          fontSize: 11,
          lineHeight: 1.8,
          color: '#fff4d6',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: RESULT_BODY_FONT_FAMILY,
          fontSize: 18,
          fontWeight: 800,
          color: '#ff7b8f',
          marginBottom: 4,
        }}
      >
        Risk: {risk}%
      </div>
      <div
        style={{
          fontFamily: RESULT_BODY_FONT_FAMILY,
          fontSize: 18,
          fontWeight: 800,
          color: '#49e488',
          marginBottom: 8,
        }}
      >
        Smoothness: {smoothness}%
      </div>
      {entry?.dateText && (
        <div
          style={{
            fontFamily: RESULT_BODY_FONT_FAMILY,
            fontSize: 15,
            lineHeight: 1.4,
            color: '#c8d8e8',
          }}
        >
          {entry.dateText}
        </div>
      )}
    </div>
  );
}

function SessionCard({ item }) {
  const riskColor =
    item.risk <= 20 ? '#7ef7a2' : item.risk <= 45 ? '#ffd166' : item.risk <= 65 ? '#ffb36b' : '#ff8e8e';

  return (
    <div
      style={{
        ...panelStyle,
        padding: '16px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: RESULT_DISPLAY_FONT_FAMILY,
            fontSize: 10,
            lineHeight: 1.8,
            color: '#F4D35E',
            marginBottom: 8,
          }}
        >
          {item.sessionTitle.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: RESULT_BODY_FONT_FAMILY,
            fontSize: 21,
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#f3f6ff',
            marginBottom: 4,
            textTransform: 'capitalize',
          }}
        >
          {item.hand.toLowerCase()} hand
        </div>
        <div
          style={{
            fontFamily: RESULT_BODY_FONT_FAMILY,
            fontSize: 15,
            color: '#b5c5db',
          }}
        >
          {item.dateText}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: RESULT_DISPLAY_FONT_FAMILY,
            fontSize: 8,
            lineHeight: 1.8,
            color: '#a9bdd8',
            marginBottom: 6,
          }}
        >
          RISK
        </div>
        <div
          style={{
            fontFamily: RESULT_BODY_FONT_FAMILY,
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 900,
            color: riskColor,
          }}
        >
          {item.risk}%
        </div>
      </div>
    </div>
  );
}

export default function TrendSection({
  sessions,
  title = 'Session trend',
  limit = undefined,
  showList = true,
}) {
  const trendData = buildTrendData(sessions, limit);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2
          style={{
            fontFamily: RESULT_DISPLAY_FONT_FAMILY,
            fontSize: 'clamp(15px, 4vw, 20px)',
            lineHeight: 1.9,
            color: '#fff4d6',
            margin: '0 0 8px',
          }}
        >
          {title.toUpperCase()}
        </h2>
        <p
          style={{
            fontFamily: RESULT_BODY_FONT_FAMILY,
            fontSize: 18,
            lineHeight: 1.55,
            color: '#c9d6ea',
            margin: 0,
          }}
        >
          The green line should stay high and smooth. The red line should stay lower.
        </p>
      </div>

      <div
        style={{
          ...panelStyle,
          padding: 20,
        }}
      >
        <div
          style={{
            fontFamily: RESULT_DISPLAY_FONT_FAMILY,
            fontSize: 10,
            lineHeight: 1.8,
            color: '#F4D35E',
            marginBottom: 14,
          }}
        >
          RISK % OVER TIME
        </div>

        {trendData.length === 0 ? (
          <div
            style={{
              background: '#0a1628',
              border: '2px solid #244a69',
              padding: 20,
              fontFamily: RESULT_BODY_FONT_FAMILY,
              fontSize: 18,
              lineHeight: 1.6,
              color: '#d4dff0',
            }}
          >
            No saved sessions yet. Finish one full measurement to start your trend.
          </div>
        ) : (
          <>
            <div
              style={{
                width: '100%',
                height: 260,
                background: '#0a1628',
                border: '2px solid #244a69',
                padding: '10px 6px 4px',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 12, right: 18, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(136, 164, 199, 0.18)" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    stroke="#88a4c7"
                    tick={{ fill: '#c8d8e8', fontFamily: RESULT_BODY_FONT_FAMILY, fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#88a4c7"
                    tick={{ fill: '#c8d8e8', fontFamily: RESULT_BODY_FONT_FAMILY, fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="risk"
                    stroke="#ff697f"
                    strokeWidth={4}
                    dot={{ r: 5, strokeWidth: 0, fill: '#ff697f' }}
                    activeDot={{ r: 7, strokeWidth: 3, stroke: '#ffffff', fill: '#ff697f' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="smoothness"
                    stroke="#3ddc84"
                    strokeWidth={4}
                    dot={{ r: 5, strokeWidth: 0, fill: '#3ddc84' }}
                    activeDot={{ r: 7, strokeWidth: 3, stroke: '#ffffff', fill: '#3ddc84' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap',
                marginTop: 10,
              }}
            >
              {[
                { label: 'Risk', color: '#ff697f' },
                { label: 'Smoothness', color: '#3ddc84' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: item.color,
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: RESULT_BODY_FONT_FAMILY,
                      fontSize: 16,
                      color: '#d9e2f1',
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showList && trendData.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {trendData.map((item) => (
            <SessionCard key={item.label} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
