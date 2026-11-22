import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ELORA Crash caught by ErrorBoundary]:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0B0A09',
            color: '#FAF8F5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#151413',
              border: '1px solid rgba(255, 106, 0, 0.4)',
              borderRadius: '28px',
              padding: '2.5rem',
              textAlign: 'center',
              boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255, 106, 0, 0.15)',
                color: '#FF6A00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                fontSize: '28px',
              }}
            >
              ⚠️
            </div>
            <h1 style={{ color: '#FAF8F5', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Récupération automatique ELORA
            </h1>
            <p style={{ color: '#A39D93', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Une erreur inattendue s'est produite lors de l'exécution :
            </p>
            <pre
              style={{
                background: '#0B0A09',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '1rem',
                borderRadius: '16px',
                fontSize: '0.75rem',
                color: '#F87171',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem',
                maxHeight: '160px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(135deg, #FF6A00 0%, #EE5A24 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.85rem 2rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(255, 106, 0, 0.35)',
              }}
            >
              Réinitialiser le cache et recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
