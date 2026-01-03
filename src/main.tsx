import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Application Error:', error, errorInfo);
    this.state = { hasError: true, error, errorInfo };
    this.forceUpdate();
  }

  render() {
    if (this.state.hasError) {
      if (this.state.error || this.state.errorInfo) {
        console.error('🚨 [ErrorBoundary] Render error:', this.state.error, this.state.errorInfo);
      }
      return (
        <div style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ color: '#d32f2f' }}>🚨 Application Error</h1>
          <h2>Something went wrong</h2>
          <details style={{ 
            whiteSpace: 'pre-wrap',
            background: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            marginTop: '20px',
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
              Error Details (click to expand)
            </summary>
            <p><strong>Error:</strong></p>
            <pre style={{ color: '#d32f2f' }}>{this.state.error ? this.state.error.toString() : 'Aucune erreur capturée.'}</pre>
            <p><strong>Stack Trace:</strong></p>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {this.state.errorInfo?.componentStack || (this.state.error?.stack || 'Aucune stack disponible.')}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            🔄 Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

// Render with Error Boundary
try {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('🚨 Fatal Error during render:', error);
  document.getElementById('root').innerHTML = `
    <div style="padding: 40px; font-family: system-ui, -apple-system, sans-serif;">
      <h1 style="color: #d32f2f;">🚨 Fatal Error</h1>
      <p>The application failed to initialize.</p>
      <pre style="background: #f5f5f5; padding: 20px; border-radius: 8px; overflow: auto;">
        ${error.toString()}
      </pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
        🔄 Reload Application
      </button>
    </div>
  `;
}