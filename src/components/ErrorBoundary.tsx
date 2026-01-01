import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary caught:', error);
    console.error('📋 Error Info:', errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '2px solid #f55',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#d00'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#a00' }}>❌ Erreur d'affichage</h2>
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              Détails de l'erreur (cliquez pour voir)
            </summary>
            <pre style={{
              margin: '10px 0',
              overflow: 'auto',
              backgroundColor: '#fff',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#f55',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
