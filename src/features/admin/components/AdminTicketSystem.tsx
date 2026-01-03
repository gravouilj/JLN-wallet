import { useState, useEffect } from 'react';
import { Button, Card, CardContent, Input } from '../../../components/UI';
import { TicketDetailModal } from '../../support/components';
import { getTickets, addMessageToTicket, markMessagesAsRead, resolveTicket, reopenTicket, closeTicket } from '../../../services/ticketService';
import { filterAdminTickets, searchTickets, sortTickets, getUnreadCount } from '../../../utils/smartFilters';
import { useTranslation } from '../../../hooks';

/**
 * AdminTicketSystem - Système complet de gestion des tickets (REFACTORISÉ Phase 2)
 * 
 * Nouvelles fonctionnalités:
 * - Smart filters: À traiter, En cours, Résolus 7j, Archivés
 * - TicketDetailModal avec conversation complète
 * - Utilise ticketService au lieu de requêtes Supabase directes
 * - Support nouveau schéma: admin_creator, admin_client, creator_client, report
 * 
 * @param {Object} props
 * @param {Function} props.onNotification - Callback pour afficher des notifications
 * @param {Function} props.onTicketsChange - Callback après changement tickets
 */
const AdminTicketSystem = ({ onNotification, onTicketsChange }) => {
  const { t } = useTranslation();
  
  // États
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('actionable');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Chargement initial
  useEffect(() => {
    loadTickets();
  }, []);

  // Debug: tracer les changements d'état
  useEffect(() => {
    console.log('🔄 AdminTicketSystem state changed:', {
      modalOpen,
      hasSelectedTicket: !!selectedTicket,
      selectedTicketId: selectedTicket?.id,
      ticketsCount: tickets.length
    });
  }, [modalOpen, selectedTicket, tickets.length]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await getTickets({ role: 'admin' });
      console.log('📥 AdminTicketSystem tickets loaded:', {
        count: data?.length || 0,
        sample: data?.[0] ? {
          id: data[0].id,
          subject: data[0].subject,
          hasConversation: Array.isArray(data[0].conversation),
          conversationLength: data[0].conversation?.length || 0
        } : null
      });
      setTickets(data || []);
      
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

  // Handlers modal
  const handleSendMessage = async (content, attachments) => {
    if (!selectedTicket) return;
    
    try {
      await addMessageToTicket(
        selectedTicket.id,
        'admin',
        'admin@system',
        content,
        attachments
      );

      onNotification?.({ type: 'success', message: '✅ Réponse envoyée' });
      await loadTickets();
      
      const updated = await getTickets({ role: 'admin' });
      setSelectedTicket(updated.find(t => t.id === selectedTicket.id));
    } catch (err) {
      console.error('❌ Erreur envoi message:', err);
      throw err;
    }
  };

  const handleMarkAsRead = async (role) => {
    if (!selectedTicket) return;
    try {
      await markMessagesAsRead(selectedTicket.id, role);
      await loadTickets();
    } catch (err) {
      console.error('❌ Erreur marquage:', err);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await resolveTicket(selectedTicket.id);
      onNotification?.({ type: 'success', message: '✅ Ticket résolu' });
      setModalOpen(false);
      await loadTickets();
    } catch (err) {
      console.error('❌ Erreur résolution:', err);
      onNotification?.({ type: 'error', message: 'Erreur résolution' });
    }
  };

  const handleReopen = async () => {
    if (!selectedTicket) return;
    try {
      await reopenTicket(selectedTicket.id);
      onNotification?.({ type: 'success', message: '✅ Ticket réouvert' });
      
      const updated = await getTickets({ role: 'admin' });
      setSelectedTicket(updated.find(t => t.id === selectedTicket.id));
      await loadTickets();
    } catch (err) {
      console.error('❌ Erreur réouverture:', err);
      onNotification?.({ type: 'error', message: 'Erreur réouverture' });
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Clôturer définitivement ce ticket ?')) return;
    
    try {
      await closeTicket(selectedTicket.id);
      onNotification?.({ type: 'success', message: '✅ Ticket clôturé' });
      setModalOpen(false);
      await loadTickets();
    } catch (err) {
      console.error('❌ Erreur clôture:', err);
      onNotification?.({ type: 'error', message: 'Erreur clôture' });
    }
  };

  // Filtrage et tri
  const filtered = filterAdminTickets(tickets, activeFilter);
  const searched = searchTickets(filtered, searchQuery);
  const sorted = sortTickets(searched, sortBy, sortOrder);

  // Compteurs
  const counts = {
    actionable: filterAdminTickets(tickets, 'actionable').length,
    in_progress: filterAdminTickets(tickets, 'in_progress').length,
    resolved_recent: filterAdminTickets(tickets, 'resolved_recent').length,
    archived: filterAdminTickets(tickets, 'archived').length,
    all: tickets.length
  };

  const unreadCount = getUnreadCount(tickets, 'admin');

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
        padding: '2px 8px',
        borderRadius: '10px',
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '0.7rem',
        fontWeight: '700',
        textTransform: 'uppercase'
      }}>
        {style.label}
      </span>
    );
  };

  const getPriorityIcon = (priority) => {
    const icons = { low: '🟢', normal: '🟡', high: '🟠', urgent: '🔴' };
    return icons[priority] || '🟡';
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>
          🎫 Gestion des tickets
          {unreadCount > 0 && (
            <span style={{
              marginLeft: '12px',
              padding: '4px 12px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: '12px',
              fontSize: '0.875rem'
            }}>
              {unreadCount} non lus
            </span>
          )}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Vue administrative avec filtres intelligents
        </p>
      </div>

      {/* Filtres smart */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <Button
          variant={activeFilter === 'actionable' ? 'primary' : 'outline'}
          onClick={() => setActiveFilter('actionable')}
        >
          ⚡ À traiter ({counts.actionable})
        </Button>
        <Button
          variant={activeFilter === 'in_progress' ? 'primary' : 'outline'}
          onClick={() => setActiveFilter('in_progress')}
        >
          ⏳ En cours ({counts.in_progress})
        </Button>
        <Button
          variant={activeFilter === 'resolved_recent' ? 'primary' : 'outline'}
          onClick={() => setActiveFilter('resolved_recent')}
        >
          ✅ Résolus 7j ({counts.resolved_recent})
        </Button>
        <Button
          variant={activeFilter === 'archived' ? 'primary' : 'outline'}
          onClick={() => setActiveFilter('archived')}
        >
          📦 Archivés ({counts.archived})
        </Button>
        <Button
          variant={activeFilter === 'all' ? 'primary' : 'outline'}
          onClick={() => setActiveFilter('all')}
        >
          📋 Tous ({counts.all})
        </Button>
      </div>

      {/* Recherche + Tri */}
      <Card style={{ marginBottom: '20px' }}>
        <CardContent>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Rechercher (sujet, messages, token...)"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0 16px',
                height: '50px',
                fontSize: '0.875rem',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="date">📅 Date</option>
              <option value="priority">⚡ Priorité</option>
              <option value="status">📊 Statut</option>
              <option value="unread">💬 Non lus</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste tickets */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          ⏳ Chargement...
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {searchQuery ? 'Aucun ticket trouvé' : 'Aucun ticket dans ce filtre'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sorted.map(ticket => (
            <Card
              key={ticket.id}
              style={{ cursor: 'pointer', transition: 'all 0.2s', zIndex: 1, position: 'relative', background: 'var(--bg-primary)', pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('🔥 onClick déclenché (Admin):', ticket.id);
                setSelectedTicket(ticket);
                setModalOpen(true);
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <CardContent>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '1.5rem' }}>
                    {getPriorityIcon(ticket.priority)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                        {ticket.subject}
                      </h3>
                      {getStatusBadge(ticket.status)}
                      {ticket.unread_count > 0 && (
                        <span style={{
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}>
                          {ticket.unread_count} 💬
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {ticket.type && <span style={{ marginRight: '8px' }}>🏷️ {ticket.type}</span>}
                      {ticket.category && <span style={{ marginRight: '8px' }}>📂 {ticket.category}</span>}
                      <span>📅 {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal détail */}
      {modalOpen && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          currentUserRole="admin"
          onClose={() => setModalOpen(false)}
          onSendMessage={handleSendMessage}
          onMarkAsRead={handleMarkAsRead}
          onResolve={handleResolve}
          onReopen={handleReopen}
          onCloseTicket={handleCloseTicket}
        />
      )}
    </div>
  );
};

export default AdminTicketSystem;