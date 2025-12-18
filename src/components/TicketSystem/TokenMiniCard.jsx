import React from 'react';
import { useTranslation } from '../../hooks';

/**
 * TokenMiniCard - Affiche les informations essentielles d'un token dans un ticket
 * Utilisé dans TicketDetailModal pour donner le contexte au support
 * 
 * @param {Object} tokenInfo - Informations du token { tokenId, ticker, name, balance, holders }
 * @param {boolean} compact - Mode compact (1 ligne)
 */
export const TokenMiniCard = ({ tokenInfo, compact = false }) => {
  const { t } = useTranslation();

  if (!tokenInfo || !tokenInfo.tokenId) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e5e7eb)',
        color: 'var(--text-secondary, #64748b)',
        fontSize: '0.875rem',
        fontStyle: 'italic'
      }}>
        {t('ticket.noTokenLinked')}
      </div>
    );
  }

  const { ticker, name, balance, holders } = tokenInfo;

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
        borderRadius: '6px',
        fontSize: '0.875rem'
      }}>
        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
          ${ticker}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>•</span>
        <span style={{ color: 'var(--text-primary)' }}>{name}</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'var(--bg-secondary, #f1f5f9)',
      borderRadius: '12px',
      border: '1px solid var(--border-color, #e5e7eb)'
    }}>
      {/* Header: Ticker + Name */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <span style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            color: 'var(--primary)'
          }}>
            ${ticker}
          </span>
          <span style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            {name}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        {/* Balance */}
        {balance !== undefined && balance !== null && (
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              {t('token.balance')}
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              {balance.toLocaleString()}
            </div>
          </div>
        )}

        {/* Holders */}
        {holders !== undefined && holders !== null && (
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              {t('token.holders')}
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              {holders.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* TokenID (truncated) */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-color, #e5e7eb)'
      }}>
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {tokenInfo.tokenId.substring(0, 16)}...{tokenInfo.tokenId.substring(tokenInfo.tokenId.length - 8)}
        </div>
      </div>
    </div>
  );
};

export default TokenMiniCard;
