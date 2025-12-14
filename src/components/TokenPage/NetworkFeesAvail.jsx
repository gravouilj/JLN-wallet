import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../UI';

/**
 * NetworkFeesAvail - Affiche le solde XEC et la valeur estimée en devise
 */
const NetworkFeesAvail = ({ xecBalance = 0, fiatValue = '...', currency = 'EUR' }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent style={{ padding: '20px' }}>
        <div className="balance-container">
          {/* Colonne gauche : XEC */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>💎</span>
              <span className="balance-label">
                eCash (XEC)
              </span>
            </div>
            
            <div className="balance-value">
              {typeof xecBalance === 'number' ? xecBalance.toFixed(2) : xecBalance} XEC
            </div>
            
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Frais de réseau
            </div>
          </div>
          
          {/* Séparateur vertical */}
          <div className="balance-divider" />
          
          {/* Colonne droite : Valeur estimée */}
          <button
            onClick={() => navigate('/settings')}
            style={{
              flex: 1,
              textAlign: 'right',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)', 
              marginBottom: '12px', 
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '6px'
            }}>
              <span>💱</span>
              <span>Valeur estimée</span>
            </div>
            
            <div className="balance-fiat">
              {fiatValue && fiatValue !== '...' ? `${fiatValue} ${currency}` : '...'}
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkFeesAvail;
