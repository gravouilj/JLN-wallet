import { useState } from 'react';
import { Card, CardContent, Badge, Button, Textarea } from '../UI';

/**
 * AdminTicket - Carte de ticket individuel pour le système de support
 * 
 * Conforme au STYLING_GUIDE.md :
 * - Classes utilitaires (d-flex, gap-*, mb-*, p-*, rounded-*, etc.)
 * - Variables CSS pour les couleurs
 * - Architecture modulaire et réutilisable
 * 
 * Types de tickets :
 * - creator : Ticket créateur
 * - client : Ticket client classique
 * - report : Signalement de ferme/token
 * 
 * @param {Object} props
 * @param {Object} props.ticket - Données du ticket
 * @param {Function} props.onReply - Callback pour répondre
 * @param {Function} props.onClose - Callback pour fermer le ticket
 * @param {Function} props.onEscalate - Callback pour escalader la priorité
 * @param {Function} props.onUpdateStatus - Callback pour changer le statut
 * @param {boolean} props.processing - Indique si une action est en cours
 */
const AdminTicket = ({
  ticket,
  onReply,
  onClose,
  onEscalate,
  onUpdateStatus,
  processing = false
}) => {
  const [replyText, setReplyText] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Couleurs selon le statut
  const getStatusColor = (status) => {
    const colors = {
      open: { bg: '--ticket-open-bg', text: '--text-primary', icon: '🆕' },
      in_progress: { bg: '--ticket-progress-bg', text: '--text-warning', icon: '⏳' },
      resolved: { bg: '--ticket-resolved-bg', text: '--accent-success', icon: '✅' },
      closed: { bg: '--ticket-closed-bg', text: '--text-secondary', icon: '🔒' }
    };
    return colors[status] || colors.open;
  };

  // Couleurs selon la priorité
  const getPriorityColor = (priority) => {
    const colors = {
      low: { bg: 'var(--priority-low)', text: 'white', icon: '⬇️' },
      normal: { bg: 'var(--priority-normal)', text: 'white', icon: '➡️' },
      high: { bg: 'var(--priority-high)', text: 'white', icon: '⬆️' },
      urgent: { bg: 'var(--priority-urgent)', text: 'white', icon: '🚨' }
    };
    return colors[priority] || colors.normal;
  };

  // Icône selon le type
  const getTypeIcon = (type) => {
    const icons = {
      creator: '🌾',
      client: '👤',
      report: '🚨'
    };
    return icons[type] || '📋';
  };

  const statusColor = getStatusColor(ticket.status);
  const priorityColor = getPriorityColor(ticket.priority);
  const typeIcon = getTypeIcon(ticket.type);

  // Calculer le délai
  const getTimeRemaining = () => {
    if (!ticket.response_deadline) return null;
    const deadline = new Date(ticket.response_deadline);
    const now = new Date();
    const diff = deadline - now;
    
    if (diff < 0) return { text: 'Dépassé', color: 'var(--accent-danger)' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { text: `${days}j ${hours % 24}h`, color: 'var(--accent-success)' };
    if (hours > 12) return { text: `${hours}h`, color: 'var(--accent-warning)' };
    return { text: `${hours}h`, color: 'var(--accent-danger)' };
  };

  const timeRemaining = getTimeRemaining();

  const handleSendReply = async () => {
    if (!replyText.trim() || processing) return;
    
    await onReply?.(ticket.id, replyText);
    setReplyText('');
    setShowReplyForm(false);
  };

  // Messages visibles (derniers 3 ou tous si expanded)
  const visibleMessages = showFullHistory 
    ? ticket.messages 
    : (ticket.messages?.slice(-3) || []);

  return (
    <Card 
      className="admin-ticket-card"
      style={{
        borderLeft: ticket.status === 'open' 
          ? '4px solid var(--accent-primary)' 
          : '1px solid var(--border-primary)'
      }}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="d-flex justify-between align-start mb-4 pb-4" style={{
          borderBottom: '1px solid var(--border-primary)'
        }}>
          <div className="flex-1">
            {/* Type + Sujet */}
            <div className="d-flex align-center gap-2 mb-2">
              <span className="text-2xl">{typeIcon}</span>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {ticket.subject}
              </h3>
            </div>
            
            {/* Métadonnées */}
            <div className="d-flex align-center gap-3 text-xs text-secondary">
              <span>#{ticket.id.substring(0, 8)}</span>
              <span>📅 {new Date(ticket.created_at).toLocaleDateString()}</span>
              <span>👤 {ticket.created_by.substring(0, 10)}...</span>
              {ticket.profil_id && <span>🏡 Profil</span>}
              {ticket.token_id && <span>🪙 Token</span>}
            </div>
          </div>

          {/* Badges */}
          <div className="d-flex flex-column gap-2" style={{ alignItems: 'flex-end' }}>
            {/* Statut */}
            <Badge
              style={{
                backgroundColor: `var(${statusColor.bg})`,
                color: `var(${statusColor.text})`,
                padding: '4px 12px',
                fontSize: '0.8rem'
              }}
            >
              {statusColor.icon} {ticket.status.replace('_', ' ')}
            </Badge>

            {/* Priorité */}
            <Badge
              style={{
                backgroundColor: priorityColor.bg,
                color: priorityColor.text,
                padding: '4px 12px',
                fontSize: '0.8rem'
              }}
            >
              {priorityColor.icon} {ticket.priority}
            </Badge>

            {/* Catégorie */}
            <span className="text-xs px-2 py-1 rounded" style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}>
              {ticket.category}
            </span>
          </div>
        </div>

        {/* Délai de réponse */}
        {timeRemaining && (
          <div className="mb-4 p-3 rounded" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: `1px solid ${timeRemaining.color}`
          }}>
            <div className="d-flex align-center gap-2 text-sm">
              <span className="text-lg">⏰</span>
              <div className="flex-1">
                <strong style={{ color: timeRemaining.color }}>
                  Délai de réponse : {timeRemaining.text}
                </strong>
                {ticket.auto_action && (
                  <p className="text-xs text-secondary mt-1">
                    Action auto si dépassé : {ticket.auto_action === 'hide' ? '🙈 Masquer profil' : '⏸️ Suspendre'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Historique des messages */}
        {ticket.messages && ticket.messages.length > 0 && (
          <div className="mb-4">
            <div className="d-flex align-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-secondary">
                💬 Conversation ({ticket.messages.length} message{ticket.messages.length > 1 ? 's' : ''})
              </h4>
              {ticket.messages.length > 3 && (
                <button
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="text-xs text-primary cursor-pointer hover-opacity"
                >
                  {showFullHistory ? '🔼 Masquer' : '🔽 Voir tout'}
                </button>
              )}
            </div>

            <div className="d-flex flex-column gap-3">
              {visibleMessages.map((msg, index) => {
                const isAdmin = msg.author === 'admin';
                return (
                  <div
                    key={index}
                    className="p-3 rounded"
                    style={{
                      backgroundColor: isAdmin ? 'var(--info-light)' : 'var(--bg-secondary)',
                      border: `1px solid ${isAdmin ? 'var(--border-info)' : 'var(--border-primary)'}`,
                      marginLeft: isAdmin ? '0' : '20px',
                      marginRight: isAdmin ? '20px' : '0'
                    }}
                  >
                    <div className="d-flex align-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{
                        color: isAdmin ? 'var(--accent-primary)' : 'var(--text-primary)'
                      }}>
                        {isAdmin ? '🛡️ Admin' : `${msg.author === 'creator' ? '🌾' : '👤'} ${msg.author}`}
                      </span>
                      <span className="text-xs text-secondary">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm" style={{ 
                      color: 'var(--text-primary)',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </p>
                    
                    {/* Pièces jointes */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-primary)' }}>
                        <div className="d-flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-2 py-1 rounded hover-opacity"
                              style={{
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--accent-primary)',
                                textDecoration: 'none',
                                border: '1px solid var(--border-primary)'
                              }}
                            >
                              📎 {att.filename}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulaire de réponse */}
        {showReplyForm ? (
          <div className="mb-4 p-4 rounded" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)'
          }}>
            <label className="text-sm font-medium text-primary d-block mb-2">
              💬 Votre réponse
            </label>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Tapez votre message..."
              rows={4}
              style={{ marginBottom: '12px' }}
            />
            <div className="d-flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyText('');
                }}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={!replyText.trim() || processing}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
              >
                {processing ? '⏳ Envoi...' : '📤 Envoyer'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setShowReplyForm(true)}
            className="mb-4"
          >
            💬 Répondre
          </Button>
        )}

        {/* Actions */}
        <div className="d-flex gap-2 flex-wrap pt-4" style={{
          borderTop: '1px solid var(--border-primary)'
        }}>
          {/* Changer le statut */}
          {ticket.status === 'open' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUpdateStatus?.(ticket.id, 'in_progress')}
              disabled={processing}
            >
              ⏳ Prendre en charge
            </Button>
          )}
          
          {ticket.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus?.(ticket.id, 'resolved')}
              disabled={processing}
              style={{
                backgroundColor: 'var(--accent-success)',
                color: 'white'
              }}
            >
              ✅ Résolu
            </Button>
          )}

          {ticket.status === 'resolved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClose?.(ticket.id)}
              disabled={processing}
            >
              🔒 Fermer le ticket
            </Button>
          )}

          {/* Escalader la priorité */}
          {ticket.priority !== 'urgent' && ticket.status !== 'closed' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onEscalate?.(ticket.id)}
              disabled={processing}
            >
              🚨 Escalader
            </Button>
          )}

          {/* Rouvrir si fermé */}
          {ticket.status === 'closed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus?.(ticket.id, 'open')}
              disabled={processing}
            >
              🔓 Rouvrir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminTicket;
