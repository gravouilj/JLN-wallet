/**
 * Composant d'affichage de l'historique des actions sur les tokens
 * Affiche une liste d'entrées d'historique avec icônes, descriptions et liens blockchain
 */

import React from 'react';
import { Badge } from '../../../components/UI';

// Types
type ActionType = 'SEND' | 'AIRDROP' | 'MINT' | 'BURN' | 'CREATE' | 'IMPORT';
type BadgeVariant = 'primary' | 'success' | 'info' | 'danger' | 'warning' | 'neutral';

interface HistoryEntryDetails {
  recipient?: string;
  recipients_count?: number;
  mode?: string;
  ignore_creator?: boolean;
}

interface HistoryEntryData {
  id: string;
  action_type: ActionType;
  amount: string;
  token_ticker: string;
  created_at: string;
  tx_id?: string;
  details?: HistoryEntryDetails;
}

interface HistoryListProps {
  history: HistoryEntryData[];
  loading?: boolean;
  compact?: boolean;
  maxItems?: number;
  emptyMessage?: string;
}

/**
 * Formate une date en texte relatif (ex: "il y a 5 min")
 */
function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHour < 24) return `il y a ${diffHour}h`;
  if (diffDay < 7) return `il y a ${diffDay}j`;
  
  // Format date classique pour les dates anciennes
  return then.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Retourne l'icône correspondant au type d'action
 */
function getActionIcon(actionType: ActionType): string {
  const icons: Record<ActionType, string> = {
    SEND: '📤​',
    AIRDROP: '🎁',
    MINT: '🏭',
    BURN: '🔥',
    CREATE: '🔨',
    IMPORT: '📥'
  };
  return icons[actionType] || '📋';
}

/**
 * Retourne la couleur du badge selon le type d'action
 */
function getActionVariant(actionType: ActionType): BadgeVariant {
  const variants: Record<ActionType, BadgeVariant> = {
    SEND: 'primary',
    AIRDROP: 'success',
    MINT: 'info',
    BURN: 'danger',
    CREATE: 'warning',
    IMPORT: 'neutral'
  };
  return variants[actionType] || 'neutral';
}

/**
 * Génère une description lisible de l'action
 */
function getActionDescription(entry: HistoryEntryData): string {
  const { action_type, amount, token_ticker, details } = entry;

  switch (action_type) {
    case 'SEND':
      return `Envoi de ${amount} ${token_ticker}${details?.recipient ? ` à ${details.recipient.substring(0, 12)}...` : ''}`;
    case 'AIRDROP':
      // Correction : On affiche 'Distribution' et l'unité 'XEC' explicitement
      return `Distribution de ${amount} XEC${details?.recipients_count ? ` à ${details.recipients_count} bénéficiaires` : ''}`;
    case 'MINT':
      return `Émission de ${amount} ${token_ticker}`;
    case 'BURN':
      return `Destruction de ${amount} ${token_ticker}`;
    case 'CREATE':
      return `Création du token ${token_ticker}`;
    case 'IMPORT':
      return `Import du token ${token_ticker}`;
    default:
      return `Action ${action_type} sur ${token_ticker}`;
  }
}

interface HistoryEntryProps {
  entry: HistoryEntryData;
  compact?: boolean;
}

/**
 * Composant d'affichage d'une entrée d'historique
 */
const HistoryEntry: React.FC<HistoryEntryProps> = ({ entry, compact = false }) => {
  const icon = getActionIcon(entry.action_type);
  const description = getActionDescription(entry);
  const relativeTime = formatRelativeTime(entry.created_at);
  const explorerUrl = entry.tx_id 
    ? `https://explorer.e.cash/tx/${entry.tx_id}`
    : null;

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '0.9rem'
      }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', color: '#1e293b' }}>{description}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            {relativeTime}
            {explorerUrl && (
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ marginLeft: '8px', textDecoration: 'none' }}
                title="Voir sur l'explorateur"
              >
                🔍
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'start',
      gap: '16px',
      padding: '16px',
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#cbd5e1';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{
        fontSize: '2rem',
        lineHeight: 1,
        minWidth: '40px',
        textAlign: 'center'
      }}>
        {icon}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <span style={{
            fontWeight: '600',
            color: '#1e293b',
            fontSize: '1rem'
          }}>
            {description}
          </span>
          <Badge variant={getActionVariant(entry.action_type)}>
            {entry.action_type}
          </Badge>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.85rem',
          color: '#64748b',
          marginTop: '6px'
        }}>
          <span>⏰ {relativeTime}</span>
          {explorerUrl && (
            <>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                🔍 Voir la transaction
              </a>
            </>
          )}
        </div>

        {/* Détails supplémentaires si présents */}
        {entry.details && Object.keys(entry.details).length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#475569'
          }}>
            {entry.details.mode && <div>Mode: {entry.details.mode}</div>}
            {entry.details.ignore_creator !== undefined && (
              <div>Créateur ignoré: {entry.details.ignore_creator ? 'Oui' : 'Non'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Composant principal : Liste d'historique
 */
const HistoryList: React.FC<HistoryListProps> = ({ history = [], compact = false }) => {
  // Message si liste vide
  if (!history || history.length === 0) {
    return (
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.95rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📋</div>
        <div>Aucun historique pour le moment</div>
        <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#cbd5e1' }}>
          Les actions sur ce token apparaîtront ici
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? '8px' : '12px'
    }}>
      {history.map((entry) => (
        <HistoryEntry 
          key={entry.id} 
          entry={entry} 
          compact={compact}
        />
      ))}
    </div>
  );
};

export default HistoryList;
