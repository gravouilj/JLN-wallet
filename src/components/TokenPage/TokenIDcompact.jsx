import React from 'react';

/**
 * TokenIDCompact - Affiche le Token ID de manière compacte avec actions copier/explorer
 * @param {string} tokenId - ID du token
 * @param {function} onCopy - Callback lors de la copie du Token ID
 */
const TokenIDCompact = ({ tokenId, onCopy }) => {
  const handleCopyTokenId = () => {
    navigator.clipboard.writeText(tokenId).then(
      () => onCopy && onCopy(true),
      () => onCopy && onCopy(false)
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'flex-start', 
      marginTop: '16px', 
      marginBottom: '8px', 
      paddingLeft: '16px',
      paddingRight: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
        borderRadius: '9999px',
        border: '1px solid var(--border-color, #e5e7eb)',
        width: '100%',
        maxWidth: '320px',
        transition: 'border-color 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-color, #0074e4)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)'}
      >
        <span style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          fontWeight: '700',
          color: 'var(--text-secondary, #6b7280)',
          letterSpacing: '0.05em',
          flexShrink: 0,
          userSelect: 'none'
        }}>
          ID
        </span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'center',
          userSelect: 'all'
        }}>
          {tokenId.substring(0, 8)}...{tokenId.substring(tokenId.length - 8)}
        </span>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderLeft: '1px solid var(--border-color, #e5e7eb)',
          paddingLeft: '8px'
        }}>
          <button
            onClick={handleCopyTokenId}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-secondary, #6b7280)',
              transition: 'all 0.2s',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover, #fff)';
              e.currentTarget.style.color = 'var(--primary-color, #0074e4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary, #6b7280)';
            }}
            title="Copier le Token ID"
          >
            📋
          </button>
          <a 
            href={`https://explorer.e.cash/tx/${tokenId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-secondary, #6b7280)',
              transition: 'all 0.2s',
              textDecoration: 'none',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover, #fff)';
              e.currentTarget.style.color = 'var(--primary-color, #0074e4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary, #6b7280)';
            }}
            title="Voir sur l'explorer eCash"
          >
            🔍
          </a>
        </div>
      </div>
    </div>
  );
};

export default TokenIDCompact;