/**
 * Chronik WebSocket Connection Indicator
 * Shows real-time connection status with visual feedback
 */

import { useChronikWebSocket } from '../../hooks/useChronikWebSocket';
import '../styles/layout.css';

export const ChronikConnectionIndicator = () => {
  const { isConnected, lastError, reconnectAttempts } = useChronikWebSocket();

  // Don't show if connected and no errors (clean UI)
  if (isConnected && !lastError) {
    return null;
  }

  return (
    <div className={`chronik-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="status-dot" />
      <span className="status-text">
        {isConnected ? (
          'Temps réel actif'
        ) : lastError ? (
          <>
            <span className="error-icon">⚠️</span> {lastError}
            {reconnectAttempts > 0 && ` (tentative ${reconnectAttempts})`}
          </>
        ) : (
          'Connexion en cours...'
        )}
      </span>
    </div>
  );
};

export default ChronikConnectionIndicator;
