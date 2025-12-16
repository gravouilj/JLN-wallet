import { useState, useEffect } from 'react';
import { Tabs, Button, Card, CardContent } from '../UI';
import AdminTicket from './AdminTicket';
import SearchFilters from '../SearchFilters';
import { supabase } from '../../services/supabaseClient';

/**
 * AdminTicketSystem - Système complet de gestion des tickets
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Gère 3 types de tickets :
 * - Tickets Créateurs : Support agriculteurs
 * - Tickets Clients : Support utilisateurs
 * - Signalements : Reports de fermes/tokens
 * 
 * @param {Object} props
 * @param {Function} props.onNotification - Callback pour afficher des notifications
 */
const AdminTicketSystem = ({ onNotification, onTicketsChange }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Charger les tickets
  useEffect(() => {
    loadTickets();
  }, [activeTab]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          messages:ticket_messages(*)
        `)
        .order('created_at', { ascending: false });

      // Filtrer par onglet
      if (activeTab === 'creators') {
        // Tickets créateur→admin uniquement (sans token_id)
        query = query.eq('type', 'creator').is('token_id', null);
      } else if (activeTab === 'clients') {
        query = query.eq('type', 'client');
      } else if (activeTab === 'reports') {
        query = query.eq('type', 'report');
      } else {
        // Vue "all" : exclure les tickets client→créateur
        query = query.or('type.neq.creator,and(type.eq.creator,token_id.is.null)');
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
      
      // Notifier le parent du changement
      if (onTicketsChange) {
        onTicketsChange();
      }
    } catch (err) {
      console.error('Erreur chargement tickets:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors du chargement des tickets' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Répondre à un ticket
  const handleReply = async (ticketId, content) => {
    setProcessing(ticketId);
    try {
      // Ajouter le message
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          author: 'admin',
          author_address: 'admin', // À remplacer par l'adresse admin
          content,
          visible_to: ['admin', 'creator', 'client']
        });

      if (error) throw error;

      // Mettre à jour le statut si c'était "open"
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket?.status === 'open') {
        await handleUpdateStatus(ticketId, 'in_progress');
      }

      onNotification?.({ 
        type: 'success', 
        message: 'Réponse envoyée avec succès' 
      });
      
      await loadTickets();
    } catch (err) {
      console.error('Erreur envoi réponse:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors de l\'envoi de la réponse' 
      });
    } finally {
      setProcessing(null);
    }
  };

  // Fermer un ticket
  const handleClose = async (ticketId) => {
    setProcessing(ticketId);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      onNotification?.({ 
        type: 'success', 
        message: 'Ticket fermé' 
      });
      
      await loadTickets();
    } catch (err) {
      console.error('Erreur fermeture ticket:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors de la fermeture' 
      });
    } finally {
      setProcessing(null);
    }
  };

  // Escalader la priorité
  const handleEscalate = async (ticketId) => {
    setProcessing(ticketId);
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      const priorities = ['low', 'normal', 'high', 'urgent'];
      const currentIndex = priorities.indexOf(ticket.priority);
      const newPriority = priorities[Math.min(currentIndex + 1, priorities.length - 1)];

      const { error } = await supabase
        .from('tickets')
        .update({ priority: newPriority })
        .eq('id', ticketId);

      if (error) throw error;

      onNotification?.({ 
        type: 'success', 
        message: `Priorité escaladée à ${newPriority}` 
      });
      
      await loadTickets();
    } catch (err) {
      console.error('Erreur escalade priorité:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors de l\'escalade' 
      });
    } finally {
      setProcessing(null);
    }
  };

  // Changer le statut
  const handleUpdateStatus = async (ticketId, newStatus) => {
    setProcessing(ticketId);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      onNotification?.({ 
        type: 'success', 
        message: `Statut changé : ${newStatus}` 
      });
      
      await loadTickets();
    } catch (err) {
      console.error('Erreur changement statut:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors du changement de statut' 
      });
    } finally {
      setProcessing(null);
    }
  };

  // Filtrer les tickets
  const filteredTickets = tickets.filter(ticket => {
    // Recherche textuelle
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchSubject = ticket.subject?.toLowerCase().includes(query);
      const matchId = ticket.id?.toLowerCase().includes(query);
      const matchCreator = ticket.created_by?.toLowerCase().includes(query);
      if (!matchSubject && !matchId && !matchCreator) return false;
    }

    // Filtre statut
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;

    // Filtre priorité
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;

    // Filtre type
    if (filterType !== 'all' && ticket.type !== filterType) return false;

    return true;
  });

  // Compter les tickets par onglet
  const ticketCounts = {
    all: tickets.length,
    creators: tickets.filter(t => t.type === 'creator').length,
    clients: tickets.filter(t => t.type === 'client').length,
    reports: tickets.filter(t => t.type === 'report').length
  };

  // Compter les tickets non traités (ni fermés ni résolus)
  const unreadCounts = {
    all: tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
    creators: tickets.filter(t => t.type === 'creator' && t.status !== 'closed' && t.status !== 'resolved').length,
    clients: tickets.filter(t => t.type === 'client' && t.status !== 'closed' && t.status !== 'resolved').length,
    reports: tickets.filter(t => t.type === 'report' && t.status !== 'closed' && t.status !== 'resolved').length
  };

  return (
    <div className="admin-ticket-system">
      {/* Onglets */}
      <Tabs
        tabs={[
          { 
            id: 'all', 
            label: `📋 Tous (${ticketCounts.all}) ${unreadCounts.all > 0 ? '🔴' : ''}` 
          },
          { 
            id: 'creators', 
            label: `🌾 Créateurs (${ticketCounts.creators}) ${unreadCounts.creators > 0 ? '🔴' : ''}` 
          },
          { 
            id: 'clients', 
            label: `👤 Clients (${ticketCounts.clients}) ${unreadCounts.clients > 0 ? '🔴' : ''}` 
          },
          { 
            id: 'reports', 
            label: `🚨 Signalements (${ticketCounts.reports}) ${unreadCounts.reports > 0 ? '🔴' : ''}` 
          }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Filtres */}
      <div className="mt-4 mb-5">
        <SearchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Rechercher un ticket par sujet, ID, ou créateur..."
          filters={[
            {
              id: 'status',
              label: 'Tous les statuts',
              icon: '📊',
              value: filterStatus,
              options: [
                { value: 'open', label: 'Ouverts' },
                { value: 'in_progress', label: 'En cours' },
                { value: 'resolved', label: 'Résolus' },
                { value: 'closed', label: 'Fermés' }
              ],
              onChange: setFilterStatus
            },
            {
              id: 'priority',
              label: 'Toutes les priorités',
              icon: '⚡',
              value: filterPriority,
              options: [
                { value: 'low', label: 'Basse' },
                { value: 'normal', label: 'Normale' },
                { value: 'high', label: 'Haute' },
                { value: 'urgent', label: 'Urgente' }
              ],
              onChange: setFilterPriority
            },
            {
              id: 'type',
              label: 'Tous les types',
              icon: '🏷️',
              value: filterType,
              options: [
                { value: 'creator', label: 'Créateur' },
                { value: 'client', label: 'Client' },
                { value: 'report', label: 'Signalement' }
              ],
              onChange: setFilterType
            }
          ]}
          hasActiveFilters={
            searchQuery || 
            filterStatus !== 'all' || 
            filterPriority !== 'all' ||
            filterType !== 'all'
          }
          onClearAll={() => {
            setSearchQuery('');
            setFilterStatus('all');
            setFilterPriority('all');
            setFilterType('all');
          }}
        />
      </div>

      {/* Liste des tickets */}
      {loading ? (
        <div className="text-center p-8 text-secondary">
          ⏳ Chargement des tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-secondary">
              {searchQuery ? 'Aucun ticket trouvé pour cette recherche.' : 'Aucun ticket à afficher.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-4">
          {filteredTickets.map(ticket => (
            <AdminTicket
              key={ticket.id}
              ticket={ticket}
              onReply={handleReply}
              onClose={handleClose}
              onEscalate={handleEscalate}
              onUpdateStatus={handleUpdateStatus}
              processing={processing === ticket.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTicketSystem;
