import React, { useState } from 'react';
import { useTranslation } from '../../../hooks';
import { Button, Input, Stack } from '../../../components/UI';
import { TokenMiniCard } from './TokenMiniCard';
import { ProfileMiniCard } from './ProfileMiniCard';
import { ConversationThread } from './ConversationThread';

/**
 * TicketDetailModal - Modal complet pour afficher et gérer un ticket
 * Affiche le contexte (token, profile), la conversation, et permet de répondre
 * 
 * @param {Object} ticket - Ticket complet avec conversation array
 * @param {string} currentUserRole - 'admin' | 'creator' | 'client'
 * @param {Function} onClose - Callback pour fermer la modal
 * @param {Function} onSendMessage - Callback pour envoyer un message (content, attachments)
 * @param {Function} onMarkAsRead - Callback pour marquer messages lus
 * @param {Function} onResolve - Callback pour résoudre le ticket (admin/creator uniquement)
 * @param {Function} onReopen - Callback pour réouvrir un ticket résolu
 * @param {Function} onClose - Callback pour clore définitivement (admin uniquement)
 * @param {Function} onEscalate - Callback pour escalader vers admin (creator uniquement)
 */
export const TicketDetailModal = ({
  ticket,
  currentUserRole,
  onClose,
  onSendMessage,
  onMarkAsRead,
  onResolve,
  onReopen,
  onCloseTicket,
  onEscalate
}) => {
  const { t } = useTranslation();
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  // Debug
  console.log('🎫 TicketDetailModal render:', {
    hasTicket: !!ticket,
    ticketId: ticket?.id,
    conversation: ticket?.conversation?.length || 0,
    currentUserRole
  });

  if (!ticket) {
    console.warn('⚠️ TicketDetailModal: Pas de ticket fourni');
    return null;
  }

  const canReply = ['open', 'awaiting_reply', 'in_progress'].includes(ticket.status);
  const canResolve = (currentUserRole === 'admin' || currentUserRole === 'creator') && 
                     ['open', 'awaiting_reply', 'in_progress'].includes(ticket.status);
  const canReopen = ticket.status === 'resolved' && currentUserRole !== 'client';
  const canClose = currentUserRole === 'admin' && ticket.status === 'resolved';
  const canEscalate = currentUserRole === 'creator' && 
                      ticket.type === 'creator_client' && 
                      ['open', 'in_progress'].includes(ticket.status);

  const handleSendReply = async () => {
    if (!replyContent.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(replyContent.trim(), []); // TODO: attachments
      setReplyContent('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: { bg: '#dbeafe', color: '#1e40af', label: 'Ouvert' },
      awaiting_reply: { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
      in_progress: { bg: '#e0e7ff', color: '#4338ca', label: 'En cours' },
      resolved: { bg: '#d1fae5', color: '#065f46', label: 'Résolu' },
      closed: { bg: '#f3f4f6', color: '#374151', label: 'Clôturé' }
    };

    const style = styles[status] || styles.open;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '0.75rem',
        fontWeight: '700',
        textTransform: 'uppercase'
      }}>
        {style.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    if (!priority || priority === 'normal') return null;

    const styles = {
      high: { emoji: '🔴', label: 'Haute', color: '#dc2626' },
      urgent: { emoji: '🚨', label: 'Urgente', color: '#991b1b' }
    };

    const style = styles[priority];
    if (!style) return null;

    return (
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: `${style.color}20`,
        color: style.color,
        fontSize: '0.75rem',
        fontWeight: '700'
      }}>
        <span>{style.emoji}</span>
        <span>{style.label}</span>
      </span>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div 
        style={{
          backgroundColor: 'var(--bg-primary, white)',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-color, #e5e7eb)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0,
              flex: 1
            }}>
              {ticket.subject}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '16px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Status + Priority + Type */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              {ticket.type || 'N/A'}
            </span>
          </div>
        </div>

        {/* CONTENT (scrollable) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          <Stack spacing="lg">
            {/* CONTEXT: Token + Profile */}
            <div>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}>
                Contexte
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                {ticket.token_id && ticket.metadata?.tokenInfo && (
                  <TokenMiniCard tokenInfo={ticket.metadata.tokenInfo} />
                )}
                {ticket.profile_id && (
                  <ProfileMiniCard profileId={ticket.profile_id} />
                )}
                {!ticket.token_id && !ticket.profile_id && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontStyle: 'italic'
                  }}>
                    Aucun contexte disponible
                  </div>
                )}
              </div>
            </div>

            {/* CONVERSATION */}
            <div>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}>
                Conversation
              </h3>
              
              <div style={{
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '12px',
                padding: '16px',
                minHeight: '200px'
              }}>
                <ConversationThread
                  messages={ticket.conversation || []}
                  currentUserRole={currentUserRole}
                  onMarkAsRead={onMarkAsRead}
                />
              </div>
            </div>

            {/* REPLY FORM */}
            {canReply && (
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px'
                }}>
                  Répondre
                </h3>
                
                <Stack spacing="md">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Écrivez votre réponse ici..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '0.875rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-input, white)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  
                  <Button
                    variant="primary"
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || sending}
                  >
                    {sending ? 'Envoi...' : 'Envoyer la réponse'}
                  </Button>
                </Stack>
              </div>
            )}
          </Stack>
        </div>

        {/* FOOTER: Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {canResolve && (
            <Button variant="success" onClick={onResolve}>
              ✓ Résoudre
            </Button>
          )}
          {canReopen && (
            <Button variant="secondary" onClick={onReopen}>
              ↻ Réouvrir
            </Button>
          )}
          {canClose && (
            <Button variant="danger" onClick={onCloseTicket}>
              🔒 Clôturer
            </Button>
          )}
          {canEscalate && (
            <Button variant="warning" onClick={onEscalate}>
              ⬆️ Escalader
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
