import React from 'react';
import {
  RESULT_BODY_FONT_FAMILY,
  RESULT_DISPLAY_FONT_FAMILY,
  calculateRiskPercent,
  getRiskBand,
} from './results-utils';

const panelStyle = {
  background: '#102038',
  border: '4px solid #5C3317',
  boxShadow: '4px 4px 0 #2d1b00',
};

export default function OABanner({ results, hand, overallScore }) {
  if (!results) return null;

  const riskPercent = calculateRiskPercent(results);
  const band = getRiskBand(riskPercent);

  return (
    <section
      style={{
        ...panelStyle,
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 132px) minmax(0, 1fr)',
          gap: 18,
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: '#0a1628',
            border: `4px solid ${band.border}`,
            boxShadow: `0 0 0 3px rgba(255,255,255,0.04), 0 0 20px ${band.color}22`,
            minHeight: 132,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: RESULT_BODY_FONT_FAMILY,
                fontSize: 48,
                lineHeight: 1,
                fontWeight: 900,
                color: band.color,
              }}
            >
              {riskPercent}%
            </div>
            <div
              style={{
                fontFamily: RESULT_DISPLAY_FONT_FAMILY,
                fontSize: 8,
                lineHeight: 1.8,
                color: '#fff4d6',
                marginTop: 6,
              }}
            >
              RISK
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: RESULT_DISPLAY_FONT_FAMILY,
              fontSize: 9,
              lineHeight: 1.8,
              letterSpacing: '0.04em',
              color: '#F4D35E',
              marginBottom: 8,
            }}
          >
            SCREENING SUMMARY
          </div>
          <h2
            style={{
              fontFamily: RESULT_DISPLAY_FONT_FAMILY,
              fontSize: 'clamp(16px, 4.4vw, 22px)',
              lineHeight: 1.8,
              color: band.color,
              margin: '0 0 10px',
            }}
          >
            {band.label.toUpperCase()}
          </h2>
          <p
            style={{
              fontFamily: RESULT_BODY_FONT_FAMILY,
              fontSize: 18,
              lineHeight: 1.55,
              color: '#edf3ff',
              margin: 0,
            }}
          >
            {band.detail}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Overall mobility', value: `${overallScore}%` },
          { label: 'Measured hand', value: `${hand?.measuring || 'right'}` },
          { label: 'Focus', value: riskPercent <= 45 ? 'Maintain motion' : 'Build motion' },
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
                fontSize: 24,
                fontWeight: 900,
                color: '#ffffff',
                textTransform: item.label === 'Measured hand' ? 'capitalize' : 'none',
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
          padding: '14px 16px',
          fontFamily: RESULT_BODY_FONT_FAMILY,
          fontSize: 16,
          lineHeight: 1.55,
          color: '#d5deee',
        }}
      >
        Screening only, not a diagnosis. Consult a healthcare professional if pain, swelling,
        weakness, or stiffness persists.
      </div>
    </section>
  );
}
