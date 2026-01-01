import React from 'react';
import { useTranslation } from '../../hooks';

/**
 * ConversationThread - Affiche le fil de conversation d'un ticket
 * Gère les messages avec auteur, timestamps, statut read, et attachments
 * 
 * Structure d'un message dans conversation (JSONB array):
 * {
 *   id: string (UUID),
 *   author: 'admin' | 'creator' | 'client',
 *   author_address: string (eCash address complète),
 *   content: string,
 *   timestamp: string (ISO),
 *   attachments: [{ name, url, type }] (optionnel),
 *   read: boolean
 * }
 * 
 * @param {Array} messages - Array de messages du ticket.conversation
 * @param {string} currentUserRole - 'admin' | 'creator' | 'client' (pour style différencié)
 * @param {Function} onMarkAsRead - Callback pour marquer messages comme lus
 */
export const ConversationThread = ({ 
  messages = [], 
  currentUserRole,
  onMarkAsRead 
}) => {
  const { t } = useTranslation();

  // Marquer comme lus automatiquement si callback fourni
  React.useEffect(() => {
    if (messages && messages.length > 0 && onMarkAsRead && currentUserRole) {
      const unreadMessages = messages.filter(m => 
        !m.read && m.author !== currentUserRole
      );
      if (unreadMessages.length > 0) {
        onMarkAsRead(currentUserRole);
      }
    }
  }, [messages, currentUserRole, onMarkAsRead]);

  if (!messages || messages.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        fontStyle: 'italic'
      }}>
        {t('ticket.noMessages')}
      </div>
    );
  }

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return t('role.admin');
      case 'creator': return t('role.creator');
      case 'client': return t('role.client');
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#dc2626'; // red-600
      case 'creator': return '#0074e4'; // primary
      case 'client': return '#059669'; // green-600
      default: return 'var(--text-primary)';
    }
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateAddress = (address) => {
    if (!address || address.length < 20) return address;
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px 0'
    }}>
      {messages.map((message, index) => {
        const isCurrentUser = message.author === currentUserRole;
        const isUnread = !message.read && !isCurrentUser;

        return (
          <div
            key={message.id || index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
              gap: '4px'
            }}
          >
            {/* Header: Role + Address + Timestamp */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <span style={{
                fontWeight: '700',
                color: getRoleColor(message.author),
                textTransform: 'uppercase'
              }}>
                {getRoleLabel(message.author)}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {truncateAddress(message.author_address)}
              </span>
              <span>•</span>
              <span>{formatTimestamp(message.timestamp)}</span>
              {isUnread && (
                <span style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.65rem',
                  fontWeight: '700'
                }}>
                  NEW
                </span>
              )}
            </div>

            {/* Message Bubble */}
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: isCurrentUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              backgroundColor: isCurrentUser 
                ? 'var(--primary, #0074e4)' 
                : 'var(--bg-secondary, #f1f5f9)',
              color: isCurrentUser ? 'white' : 'var(--text-primary)',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              boxShadow: isUnread ? '0 0 0 2px var(--primary)' : 'none'
            }}>
              {message.content}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxWidth: '70%'
              }}>
                {message.attachments.map((attachment, attIndex) => (
                  <a
                    key={attIndex}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #e2e8f0)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  >
                    <span>📎</span>
                    <span style={{ fontWeight: '600' }}>{attachment.name}</span>
                    {attachment.type && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ({attachment.type})
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationThread;
