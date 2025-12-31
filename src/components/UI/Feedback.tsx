import React from 'react';
import { Badge } from './Badge';

// --- InfoBox ---
interface InfoBoxProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: string;
  onDismiss?: () => void;
  className?: string;
}

export const InfoBox: React.FC<InfoBoxProps> = ({ type = 'info', title, children, icon, onDismiss, className = '' }) => {
  const styles = {
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#dcfce7', border: '#16a34a', text: '#166534', icon: '✅' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '❌' }
  };
  const style = styles[type] || styles.info;
  
  return (
    <div 
      className={className}
      style={{
        padding: '1rem',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: '8px',
        color: style.text,
        marginBottom: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon || style.icon}</span>
        <div style={{ flex: 1 }}>
          {title && <p style={{ fontWeight: 600, marginBottom: '0.5rem', margin: 0 }}>{title}</p>}
          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{children}</div>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss} 
            style={{ 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer', 
              fontSize: '1.5rem', 
              color: style.text,
              opacity: 0.7,
              padding: '0 0.25rem',
              lineHeight: 1,
              flexShrink: 0
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// --- StatusBadge ---
interface StatusBadgeProps {
  status: string;
  type?: 'verification' | 'profil' | 'report';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'verification', className = '' }) => {
  const verificationStyles: Record<string, any> = {
    none: { bg: '#f3f4f6', text: '#6b7280', label: '📋 Aucun badge' },
    pending: { bg: '#fef3c7', text: '#92400e', label: '⏳ En attente' },
    info_requested: { bg: '#dbeafe', text: '#1e40af', label: '💬 Info demandée' },
    verified: { bg: '#dcfce7', text: '#166534', label: '✅ Vérifié' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: '🚫 Refusé' }
  };
  
  const profilStatusStyles: Record<string, any> = {
    draft: { bg: '#f3f4f6', text: '#6b7280', label: '📝 Brouillon' },
    active: { bg: '#dcfce7', text: '#166534', label: '✅ Public' },
    suspended: { bg: '#fef3c7', text: '#92400e', label: '⏸️ Suspendu' },
    banned: { bg: '#fee2e2', text: '#991b1b', label: '🛑 Banni' },
    deleted: { bg: '#fee2e2', text: '#991b1b', label: '🗑️ Supprimé' }
  };
  
  const reportStatusStyles: Record<string, any> = {
    pending: { bg: '#fef3c7', text: '#92400e', label: '⏳ En attente' },
    investigating: { bg: '#dbeafe', text: '#1e40af', label: '🔍 En examen' },
    resolved: { bg: '#dcfce7', text: '#166534', label: '✅ Résolu' },
    ignored: { bg: '#f3f4f6', text: '#6b7280', label: '⏭️ Ignoré' }
  };
  
  const styles = type === 'verification' ? verificationStyles : 
                 type === 'profil' ? profilStatusStyles : reportStatusStyles;
  
  const style = styles[status] || { bg: '#f3f4f6', text: '#6b7280', label: status };
  
  // @ts-expect-error - Badge component expects different style prop type
  return <Badge className={className} style={{ backgroundColor: style.bg, color: style.text }}>{style.label}</Badge>;
};

// --- MessageThread ---
interface Message {
  author: string;
  message: string;
  timestamp: string;
}

interface MessageThreadProps {
  messages: Message[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ messages = [], loading = false, emptyMessage = 'Aucun message', className = '' }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        <p>Chargement des messages...</p>
      </div>
    );
  }
  
  if (!messages || messages.length === 0) {
    return <InfoBox type="info">{emptyMessage}</InfoBox>;
  }
  
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
      {messages.map((msg, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.author === 'admin' ? 'flex-end' : msg.author === 'system' ? 'center' : 'flex-start' }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            maxWidth: '85%',
            backgroundColor: msg.author === 'admin' ? '#3b82f6' : msg.author === 'system' ? '#f3f4f6' : '#fff',
            color: msg.author === 'admin' ? '#fff' : '#1f2937',
            border: msg.author === 'admin' ? 'none' : '1px solid #e5e7eb',
            fontStyle: msg.author === 'system' ? 'italic' : 'normal',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            wordBreak: 'break-word'
          }}>
            {msg.message}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem', fontStyle: 'italic' }}>
            {new Date(msg.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
};