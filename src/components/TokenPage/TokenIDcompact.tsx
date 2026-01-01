import React from 'react';

/**
 * TokenIDCompact - Affiche le Token ID de manière compacte avec actions copier/explorer
 * Conforme au STYLING_GUIDE.md
 * 
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
    <div 
      className="token-id-container"
      style={{ 
        display: 'flex',
        justifyContent: 'center',
        marginTop: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-sm)',
        padding: '0 var(--spacing-md)'
      }}
    >
      <div 
        className="d-flex align-center gap-sm"
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '20px',
          border: '1px solid var(--border-primary)',
          width: 'fit-content',
          maxWidth: '100%',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 116, 228, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-primary)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span 
          className="text-xs text-secondary" 
          style={{
            textTransform: 'uppercase',
            fontWeight: '700',
            letterSpacing: '0.05em',
            userSelect: 'none'
          }}
        >
          ID
        </span>
        
        <button
          onClick={handleCopyTokenId}
          className="text-primary"
          style={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Cliquer pour copier le Token ID complet"
        >
          {tokenId.substring(0, 10)}...{tokenId.substring(tokenId.length - 10)}
        </button>

        <a 
          href={`https://explorer.e.cash/tx/${tokenId}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s',
            textDecoration: 'none',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          title="Voir sur l'explorer eCash"
        >
          🔍
        </a>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .token-id-container {
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TokenIDCompact;