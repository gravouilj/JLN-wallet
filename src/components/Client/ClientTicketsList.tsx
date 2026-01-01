import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, InfoBox, Stack } from '../UI';
import { supabase } from '../../services/supabaseClient';

/**
 * ClientTicketsList - Liste des tickets créés par le client
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Affiche tous les tickets du client avec leur statut et permet d'accéder aux détails.
 * 
 * @param {Object} props
 * @param {String} props.walletAddress - Adresse du wallet client
 * @param {Function} props.onTicketClick - Callback au clic sur un ticket
 */
const ClientTicketsList = ({ walletAddress, onTicketClick }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, closed

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

  // Emoji par catégorie
  const categoryEmojis = {
    question: '❓',
    bug: '🐛',
    feature: '✨',
    payment: '💳',
    account: '👤',
    support: '🆘',
    report: '⚠️',
    partnership: '🤝'
  };

  // Charger les tickets
  useEffect(() => {
    if (walletAddress) {
      loadTickets();
    }
  }, [walletAddress]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_messages(count)
        `)
        .eq('created_by', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'open') return ['open', 'in_progress'].includes(ticket.status);
    if (filter === 'closed') return ['resolved', 'closed'].includes(ticket.status);
    return true;
  });

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

  // Compter les messages
  const getMessageCount = (ticket) => {
    return ticket.ticket_messages?.[0]?.count || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-secondary">Chargement de vos tickets...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing="md">
      {/* En-tête avec filtres */}
      <Card>
        <CardContent className="p-6">
          <div className="d-flex justify-between align-center mb-4">
            <h2 className="text-xl font-bold mb-0" style={{ color: 'var(--text-primary)' }}>
              🎫 Mes tickets
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTickets}
            >
              🔄 Actualiser
            </Button>
          </div>

          {/* Filtres */}
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tous ({tickets.length})
            </Button>
            <Button
              variant={filter === 'open' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('open')}
            >
              En cours ({tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length})
            </Button>
            <Button
              variant={filter === 'closed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('closed')}
            >
              Fermés ({tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des tickets */}
      {filteredTickets.length === 0 ? (
        <InfoBox type="info" icon="💡">
          {filter === 'all' 
            ? "Vous n'avez pas encore créé de ticket. Utilisez le formulaire ci-dessus pour contacter le support."
            : `Aucun ticket ${filter === 'open' ? 'en cours' : 'fermé'}.`
          }
        </InfoBox>
      ) : (
        <Stack spacing="sm">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent 
                className="p-4"
                style={{ cursor: 'pointer' }}
                onClick={() => onTicketClick?.(ticket)}
              >
                <div className="d-flex justify-between align-center mb-2">
                  <div className="d-flex align-center gap-2">
                    <span style={{ fontSize: '1.25rem' }}>
                      {categoryEmojis[ticket.category] || '📝'}
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {ticket.subject}
                    </strong>
                  </div>
                  <Badge variant={statusColors[ticket.status] || 'secondary'}>
                    {statusLabels[ticket.status] || ticket.status}
                  </Badge>
                </div>

                {ticket.description && (
                  <p 
                    className="text-sm mb-2" 
                    style={{ 
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {ticket.description}
                  </p>
                )}

                <div className="d-flex align-center gap-3 text-sm text-secondary">
                  <span>📅 {formatDate(ticket.created_at)}</span>
                  <span>•</span>
                  <span>
                    {ticket.type === 'client' && !ticket.profile_id ? '👨‍💼 Support' : '🌾 Créateur'}
                  </span>
                  {getMessageCount(ticket) > 0 && (
                    <>
                      <span>•</span>
                      <span>💬 {getMessageCount(ticket)} message{getMessageCount(ticket) > 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>

                {/* Indicateur de priorité */}
                {ticket.priority === 'urgent' && (
                  <div className="mt-2">
                    <Badge variant="danger">🔴 URGENT</Badge>
                  </div>
                )}
                {ticket.priority === 'high' && (
                  <div className="mt-2">
                    <Badge variant="warning">🟠 Haute priorité</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Info */}
      <InfoBox type="info" icon="💡">
        <strong>Astuce :</strong> Cliquez sur un ticket pour voir les détails et la conversation complète.
      </InfoBox>
    </Stack>
  );
};

export default ClientTicketsList;
