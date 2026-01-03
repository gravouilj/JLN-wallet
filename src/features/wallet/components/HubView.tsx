import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useEcashBalance, useEcashWallet } from '../../../hooks/useEcashWallet';
import { useWalletScan } from '../../../hooks/useWalletScan';
import { WalletToken } from '../../../atoms';
import { deriveTicker } from '../utils/formatTokenBalance';

interface Profile {
  id: string;
  name: string;
  tokenId: string;
  ticker?: string;
  protocol?: string;
  verified?: boolean;
  [key: string]: unknown;
}

interface TokenBalances {
  [tokenId: string]: string;
}

interface HubViewProps {
  onProfileSelect: (profile: Profile) => void;
  onCopyAddress: () => void;
}

/**
 * Hub View - Shows all tokens when no specific token is selected
 * Extracted from ClientWalletPage to reduce complexity
 */
export const HubView: React.FC<HubViewProps> = ({ 
  onProfileSelect, 
  onCopyAddress 
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address } = useEcashWallet();
  const { balance, loading: balanceLoading } = useEcashBalance();
  const { myTokens, tokenBalances, scanLoading } = useWalletScan();

  return (
    <div className="hub-view">
      {/* QR Code Section */}
      {address && (
        <div 
          className="hub-qr-section" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '16px',
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: 'var(--bg-secondary, #f5f5f5)',
            borderRadius: '12px'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            📥 {t('wallet.receive') || 'Recevoir'}
          </h3>
          <QRCodeSVG
            value={address}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin={true}
            style={{ cursor: 'pointer', borderRadius: '8px' }}
            onClick={onCopyAddress}
          />
          <p 
            className="break-all text-xs text-center select-all" 
            style={{ 
              fontSize: '0.7rem',
              color: 'var(--text-secondary, #666)',
              wordBreak: 'break-all',
              userSelect: 'all',
              maxWidth: '240px',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-primary, #fff)',
              borderRadius: '6px',
              margin: 0
            }}
          >
            {address}
          </p>
          <button 
            className="copy-btn"
            onClick={onCopyAddress}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid var(--primary-color, #0074e4)',
              backgroundColor: 'var(--bg-primary, #fff)',
              color: 'var(--primary-color, #0074e4)'
            }}
          >
            📋 {t('common.copy') || 'Copier'}
          </button>
        </div>
      )}

      {/* Token Table Section */}
      <div className="hub-token-section">
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🌾 {t('wallet.myTokens') || 'Mes jetons fermiers'}
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '400', 
            color: '#666',
            backgroundColor: 'var(--bg-secondary, #f5f5f5)',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {myTokens.length}
          </span>
        </h3>

        {scanLoading ? (
          <ScanLoadingState />
        ) : myTokens.length === 0 ? (
          <EmptyTokensState onNavigateToDirectory={() => navigate('/')} />
        ) : (
          <TokensTable 
            tokens={myTokens} 
            tokenBalances={tokenBalances} 
            onSelect={onProfileSelect} 
          />
        )}

        {/* Network Fuel Indicator */}
        <NetworkFuelIndicator 
          balance={balance} 
          loading={balanceLoading} 
          onClick={() => navigate('/settings')} 
        />
      </div>
    </div>
  );
};

// Sub-components

const ScanLoadingState: React.FC = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: '40px 20px',
    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
    borderRadius: '12px'
  }}>
    <div style={{ 
      fontSize: '32px', 
      marginBottom: '16px',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      🔍
    </div>
    <p style={{ marginBottom: '8px', color: '#666', fontSize: '15px', fontWeight: '500' }}>
      Scan en cours...
    </p>
    <p style={{ color: '#999', fontSize: '13px' }}>
      Analyse des profils pour détecter vos jetons
    </p>
  </div>
);

interface EmptyTokensStateProps {
  onNavigateToDirectory: () => void;
}

const EmptyTokensState: React.FC<EmptyTokensStateProps> = ({ onNavigateToDirectory }) => (
  <div style={{ 
    textAlign: 'center', 
    padding: '30px 20px',
    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
    borderRadius: '12px'
  }}>
    <p style={{ marginBottom: '8px', color: '#666', fontSize: '15px', fontWeight: '500' }}>
      🔍 Scan terminé
    </p>
    <p style={{ marginBottom: '16px', color: '#999', fontSize: '13px' }}>
      Aucun jeton détecté dans ce portefeuille.
    </p>
    <p style={{ marginBottom: '16px', color: '#666', fontSize: '13px' }}>
      Achetez des jetons depuis l'annuaire ou demandez à un producteur de vous en envoyer.
    </p>
    <button 
      onClick={onNavigateToDirectory}
      style={{
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '8px',
        cursor: 'pointer',
        border: '1px solid var(--primary-color, #0074e4)',
        backgroundColor: 'var(--primary-color, #0074e4)',
        color: '#fff'
      }}
    >
      🗂️ Parcourir l'annuaire
    </button>
  </div>
);

interface TokensTableProps {
  tokens: WalletToken[];
  tokenBalances: TokenBalances;
  onSelect: (profile: Profile) => void;
}

const TokensTable: React.FC<TokensTableProps> = ({ tokens, tokenBalances, onSelect }) => {
  // Convert WalletToken to Profile for onSelect callback
  const handleSelect = (token: WalletToken) => {
    const profile: Profile = {
      id: token.profileId || token.tokenId,
      name: token.name,
      tokenId: token.tokenId,
      ticker: token.ticker,
      verified: token.verified,
    };
    onSelect(profile);
  };

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
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>
              Ferme
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#666' }}>
              Solde
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#666', width: '80px' }}>
              Ticker
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, index) => (
            <tr 
              key={token.tokenId} 
              onClick={() => handleSelect(token)}
              style={{ 
                cursor: 'pointer',
                borderTop: index === 0 ? 'none' : '1px solid var(--border-color, #ddd)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f9f9f9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: '500' }}>
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
                    }} title="Jeton actif dans l'annuaire du site">
                      🏡 Actif dans l'annuaire
                    </span>
                  )}
                </div>
              </td>
              <td style={{ 
                padding: '14px 12px',
                textAlign: 'right',
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--text-primary, #000)'
              }}>
                {tokenBalances[token.tokenId] !== undefined 
                  ? tokenBalances[token.tokenId] 
                  : '...'
                }
              </td>
              <td style={{ 
                padding: '14px 12px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--primary-color, #0074e4)',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '6px'
              }}>
                {token.ticker || deriveTicker(undefined, token.name)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface NetworkFuelIndicatorProps {
  balance: number;
  loading: boolean;
  onClick: () => void;
}

const NetworkFuelIndicator: React.FC<NetworkFuelIndicatorProps> = ({ balance, loading, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      marginTop: '20px',
      padding: '14px 16px',
      backgroundColor: 'var(--bg-secondary, #f5f5f5)',
      borderRadius: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      border: '1px solid var(--border-color, #ddd)'
    }}
    title="Carburant réseau nécessaire pour envoyer des jetons"
  >
    <div>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>
        ⛽ Carburant Réseau
      </div>
      <div style={{ fontSize: '11px', color: '#999' }}>
        XEC · Nécessaire pour les transactions
      </div>
    </div>
    <div style={{ fontSize: '18px', fontWeight: '600' }}>
      {loading ? '...' : Number(balance).toFixed(2)} XEC
    </div>
  </div>
);

export default HubView;
