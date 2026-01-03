import React, { useState } from 'react';
import HistoryList from '../features/token-management/components/HistoryList';

// Types
interface HistoryEntry {
  id: string;
  action_type: string;
  amount?: string;
  token_ticker?: string;
  created_at: string;
  tx_id?: string;
  details?: Record<string, unknown>;
}

interface HistoryCollapseProps {
  history?: HistoryEntry[];
  loadingHistory?: boolean;
  title?: string;
  compact?: boolean;
  filterFn?: ((entry: HistoryEntry) => boolean) | null;
}

/**
 * HistoryCollapse - Wrapper collapse pour l'affichage de l'historique
 */
const HistoryCollapse: React.FC<HistoryCollapseProps> = ({ 
  history = [], 
  loadingHistory = false, 
  title = '📜 Historique', 
  compact = true,
  filterFn = null
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  // Filtrer l'historique si une fonction de filtre est fournie
  const filteredHistory = filterFn ? history.filter(filterFn) : history;

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          marginBottom: isOpen ? '16px' : '0',
          transition: 'all 0.2s'
        }}
      >
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600', 
          color: '#1e293b', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {title}
          {filteredHistory.length > 0 && (
            <span style={{
              backgroundColor: 'var(--primary-color, #0074e4)',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '12px',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {filteredHistory.length}
            </span>
          )}
        </h3>
        
        {/* Icône de collapse */}
        <span style={{
          fontSize: '1.2rem',
          color: 'var(--text-secondary, #6b7280)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </button>

      {/* Contenu collapse */}
      {isOpen && (
        <div style={{
          animation: 'slideDown 0.2s ease-out'
        }}>
          {loadingHistory ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px', 
              color: '#94a3b8' 
            }}>
              ⏳ Chargement...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: 'var(--text-secondary, #6b7280)',
              fontSize: '0.9rem'
            }}>
              📭 Aucune entrée dans l'historique
            </div>
          ) : (
            <HistoryList history={filteredHistory} compact={compact} />
          )}
        </div>
      )}

      {/* Animation CSS */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default HistoryCollapse;
