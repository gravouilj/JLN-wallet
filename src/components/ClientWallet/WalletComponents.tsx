import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * TokenBalanceCard - Affiche le solde d'un jeton avec indicateur de carburant
 */
export const TokenBalanceCard: React.FC<{
  profile: any;
  balance: string;
  xecBalance: number;
  hasGas: boolean;
}> = ({ profile, balance, xecBalance, hasGas }) => {
  const { t } = useTranslation();

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--primary-color, #0074e4) 0%, var(--primary-dark, #0056b3) 100%)',
      color: '#fff',
      padding: '24px',
      borderRadius: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Solde</div>
          <div style={{ fontSize: '36px', fontWeight: '700', marginTop: '4px' }}>
            {balance || '0'}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
            {profile.ticker || profile.name.substring(0, 3).toUpperCase()}
          </div>
        </div>
        
        {/* Gas Indicator */}
        <div style={{
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '600',
          backgroundColor: hasGas ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
          border: hasGas ? '1px solid rgba(76, 175, 80, 0.6)' : '1px solid rgba(244, 67, 54, 0.6)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '4px' }}>{hasGas ? '● Opérationnel' : '○ Faible'}</div>
          <div style={{ fontSize: '10px', opacity: 0.9 }}>{xecBalance.toFixed(2)} XEC</div>
        </div>
      </div>

      <div style={{ fontSize: '12px', opacity: 0.85 }}>
        {profile.name}
      </div>
    </div>
  );
};

/**
 * ReceiveZone - Zone de réception avec QR Code
 */
export const ReceiveZone: React.FC<{
  address: string;
  onCopy?: () => void;
}> = ({ address, onCopy }) => {
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '24px',
      backgroundColor: 'var(--bg-secondary, #f5f5f5)',
      borderRadius: '12px'
    }}>
      <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
        {t('wallet.scanToReceive') || 'Scannez ce code avec votre téléphone pour envoyer'}
      </p>
      
      {/* QR Code placeholder (component expects external QRCodeSVG) */}
      <div style={{
        width: '200px',
        height: '200px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '2px solid var(--primary-color, #0074e4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#999'
      }}>
        [QR Code]
      </div>

      <div style={{
        fontSize: '11px',
        color: '#666',
        wordBreak: 'break-all',
        textAlign: 'center',
        maxWidth: '280px',
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        fontFamily: 'monospace'
      }}>
        {address}
      </div>

      <button
        onClick={onCopy}
        style={{
          padding: '10px 20px',
          fontSize: '13px',
          fontWeight: '500',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: 'var(--primary-color, #0074e4)',
          color: '#fff',
          cursor: 'pointer'
        }}
      >
        📋 Copier l'adresse
      </button>
    </div>
  );
};

/**
 * GasIndicator - Indicateur discrètement visible du crédit réseau
 */
export const GasIndicator: React.FC<{
  balance: number;
  threshold?: number;
}> = ({ balance, threshold = 5.0 }) => {
  const hasGas = balance >= threshold;
  const isLow = balance >= 2 && balance < threshold;

  return (
    <div style={{
      fontSize: '10px',
      padding: '6px 10px',
      borderRadius: '12px',
      width: 'fit-content',
      fontWeight: '600',
      marginTop: '8px',
      backgroundColor: hasGas ? '#e8f5e9' : isLow ? '#fff3e0' : '#ffebee',
      color: hasGas ? '#2e7d32' : isLow ? '#e65100' : '#c62828'
    }}>
      {hasGas && '✓ Réseau opérationnel'}
      {isLow && '⚠ Crédit réseau faible'}
      {balance < 2 && '✕ Crédit réseau insuffisant'}
    </div>
  );
};

/**
 * ProfileDropdown - Sélecteur de profil/jeton
 */
export const ProfileDropdown: React.FC<{
  selected: any | null;
  options: any[];
  onSelect: (profile: any) => void;
}> = ({ selected, options, onSelect }) => {
  const { t } = useTranslation();

  return (
    <select
      value={selected?.id || 'hub'}
      onChange={(e) => {
        if (e.target.value === 'hub') {
          onSelect(null);
        } else {
          const profile = options.find(o => o.id === e.target.value);
          if (profile) onSelect(profile);
        }
      }}
      style={{
        padding: '8px 12px',
        fontSize: '14px',
        fontWeight: '500',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-primary, #fff)',
        color: 'var(--text-primary, #000)',
        cursor: 'pointer'
      }}
    >
      <option value="hub">🧺 {t('wallet.allTokens') || 'Hub - Tous mes jetons'}</option>
      {options.map(profile => (
        <option key={profile.id} value={profile.id}>
          {profile.name} ({profile.ticker})
        </option>
      ))}
    </select>
  );
};

/**
 * TabButton - Bouton de navigation entre onglets
 */
export const TabButton: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: active ? 'var(--primary-color, #0074e4)' : 'var(--bg-secondary, #f5f5f5)',
      color: active ? '#fff' : 'var(--text-secondary, #666)',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    {children}
  </button>
);

/**
 * TokenList - Liste des tokens avec balances
 */
export const TokenList: React.FC<{
  tokens: any[];
  loading?: boolean;
  onSelect: (token: any) => void;
}> = ({ tokens, loading = false, onSelect }) => {
  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
        borderRadius: '12px'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>
          🔍
        </div>
        <p style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>Scan en cours...</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '30px 20px',
        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
        borderRadius: '12px'
      }}>
        <p style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>Aucun jeton détecté</p>
        <p style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>
          Achetez des jetons depuis l'annuaire
        </p>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid var(--border-color, #ddd)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'var(--bg-primary, #fff)'
      }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary, #f5f5f5)' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>
              Ferme
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666' }}>
              Solde
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666', width: '70px' }}>
              Ticker
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, idx) => (
            <tr
              key={token.id}
              onClick={() => onSelect(token)}
              style={{
                cursor: 'pointer',
                borderTop: idx === 0 ? 'none' : '1px solid var(--border-color, #ddd)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f9f9f9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{token.name}</span>
                  {token.verified && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      🏡 Actif
                    </span>
                  )}
                </div>
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '15px', fontWeight: '600' }}>
                {token.balance || '...'}
              </td>
              <td style={{
                padding: '12px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--primary-color, #0074e4)',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)'
              }}>
                {token.ticker}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
