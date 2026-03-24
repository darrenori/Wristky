import React from 'react';
import { createPageUrl } from '@/utils';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App render failed:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          background: 'linear-gradient(180deg, #081426 0%, #0d2038 42%, #102a46 100%)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#102038',
            border: '4px solid #5C3317',
            boxShadow: '4px 4px 0 #2d1b00',
            padding: 20,
            display: 'grid',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              lineHeight: 1.8,
              color: '#F4D35E',
              textShadow: '2px 2px 0 #5C3317',
            }}
          >
            OOPS
          </div>

          <div
            style={{
              fontFamily: '"Avenir Next", "Segoe UI", Arial, sans-serif',
              fontSize: 18,
              lineHeight: 1.4,
              fontWeight: 700,
              color: '#f5fbff',
            }}
          >
            Something went wrong while loading the app.
          </div>

          <div
            style={{
              fontFamily: '"Avenir Next", "Segoe UI", Arial, sans-serif',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#b9d0e6',
            }}
          >
            Try reloading first. If that still fails, head back to the home screen.
          </div>

          <button
            type="button"
            className="pixel-btn pixel-btn-teal"
            style={{ width: '100%', minHeight: 58, fontSize: 11 }}
            onClick={() => window.location.reload()}
          >
            RELOAD
          </button>

          <button
            type="button"
            className="pixel-btn pixel-btn-blue"
            style={{ width: '100%', minHeight: 54, fontSize: 10 }}
            onClick={() => window.location.assign(createPageUrl('Welcome'))}
          >
            GO HOME
          </button>
        </div>
      </div>
    );
  }
}
