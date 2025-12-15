import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, InfoBox, Stack } from '../UI';
import { supabase } from '../../services/supabaseClient';

/**
 * SupportTab - Système de support et communication avec l'équipe
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Permet de :
 * - Créer et gérer des tickets de support
 * - Communiquer directement avec l'équipe admin
 * - Consulter ses signalements et y répondre
 * 
 * @param {Object} props
 * @param {String} props.profilid - ID du profil de créateur
 * @param {Object} props.existingProfiles - Profil de créateur actuel
 * @param {Function} props.onCreateTicket - Callback création ticket
 */
const SupportTab = ({ profilid, existingProfiles, onCreateTicket }) => {
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Badge colors par statut
  const statusColors = {
    open: 'primary',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'secondary'
  };

  // Labels par statut
  const statusLabels = {
    open: 'Ouvert',
    in_progress: 'En cours',
    resolved: 'Résolu',
    closed: 'Fermé'
  };

  // Charger les tickets de l'utilisateur
  useEffect(() => {
    if (profilid) {
      loadMyTickets();
    }
  }, [profilid]);

  const loadMyTickets = async () => {
    try {
      setLoadingTickets(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('creator_id', profilid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyTickets(data || []);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Envoyer un message direct à l'admin
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profilid) return;

    try {
      setSendingMessage(true);
      
      // Créer un ticket "question" par défaut pour le message
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          creator_id: profilid,
          subject: 'Message direct',
          category: 'question',
          priority: 'normal',
          status: 'open'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Ajouter le message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'creator',
          message: newMessage.trim()
        });

      if (messageError) throw messageError;

      setNewMessage('');
      await loadMyTickets();

      alert('Message envoyé avec succès !');
    } catch (error) {
      console.error('Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Stack spacing="md">
      {/* En-tête avec bouton nouveau ticket */}
      <Card>
        <CardContent className="p-6">
          <div className="d-flex justify-between align-center mb-4">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                💬 Support & Communication
              </h2>
              <p className="text-sm text-secondary mb-0">
                Posez vos questions ou signalez un problème à l'équipe
              </p>
            </div>
            <Button
              variant="primary"
              onClick={onCreateTicket}
            >
              ✉️ Nouveau ticket
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mes tickets */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            📋 Mes tickets de support
          </h3>

          {loadingTickets ? (
            <div className="text-center py-4">
              <p className="text-secondary">Chargement...</p>
            </div>
          ) : myTickets.length === 0 ? (
            <InfoBox type="info" icon="💡">
              <strong>Aucun ticket pour le moment</strong><br />
              Créez un ticket pour poser une question ou signaler un problème.
            </InfoBox>
          ) : (
            <Stack spacing="sm">
              {myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)',
                    transition: 'box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="d-flex justify-between align-center mb-2">
                    <div className="d-flex align-center gap-2">
                      <span style={{ fontSize: '1.25rem' }}>
                        {ticket.category === 'bug' ? '🐛' : 
                         ticket.category === 'feature' ? '✨' : 
                         ticket.category === 'question' ? '❓' : '💬'}
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {ticket.subject}
                      </strong>
                    </div>
                    <Badge variant={statusColors[ticket.status] || 'secondary'}>
                      {statusLabels[ticket.status] || ticket.status}
                    </Badge>
                  </div>

                  <div className="d-flex align-center gap-3 text-sm text-secondary mb-2">
                    <span>📅 {formatDate(ticket.created_at)}</span>
                    <span>•</span>
                    <span>
                      Catégorie: <strong>{ticket.category}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Priorité: <strong>{ticket.priority}</strong>
                    </span>
                  </div>

                  {ticket.description && (
                    <p 
                      className="text-sm mb-2" 
                      style={{ 
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5'
                      }}
                    >
                      {ticket.description}
                    </p>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Navigation vers détails ticket (à implémenter)
                      console.log('Voir ticket', ticket.id);
                    }}
                  >
                    Voir les détails
                  </Button>
                </div>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Message direct à l'équipe */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            ✍️ Envoyer un message rapide
          </h3>
          <p className="text-sm text-secondary mb-4">
            Posez une question rapide sans créer de ticket formel
          </p>

          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message ici..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />

          <div className="d-flex justify-end mt-3">
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? 'Envoi...' : '📤 Envoyer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations utiles */}
      <InfoBox type="info" icon="💡">
        <strong>Temps de réponse :</strong> Notre équipe s'efforce de répondre dans les 24-48h 
        pour les tickets normaux, et sous 4h pour les urgences. Les messages directs reçoivent 
        généralement une réponse plus rapide.
      </InfoBox>
    </Stack>
  );
};

export default SupportTab;
