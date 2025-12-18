import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Stack, Input } from '../UI';
import { TicketDetailModal } from '../TicketSystem';
import { getTickets, addMessageToTicket, markMessagesAsRead, resolveTicket, escalateToAdmin } from '../../services/ticketService';
import { filterCreatorTickets, searchTickets, sortTickets, getUnreadCount } from '../../utils/smartFilters';
import { useTranslation } from '../../hooks';

/**
 * SupportTab - Système de support pour créateurs (REFACTORISÉ Phase 2)
 * 
 * Nouvelles fonctionnalités:
 * - 2 onglets: Tickets Clients, Tickets Admin
 * - Utilise TicketDetailModal pour affichage complet
 * - Conversation bidirectionnelle avec clients
 * - Possibilité d'escalader vers admin
 * - Support nouveau schéma: creator_client, admin_creator
 * 
 * @param {Object} props
 * @param {String} props.profilId - ID du profil créateur
 * @param {String} props.walletAddress - Adresse wallet du créateur
 * @param {Function} props.setNotification - Callback notifications
 */
const SupportTab = ({ profilId, walletAddress, setNotification }) => {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('clients'); // clients, admin
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('active'); // active, resolved, all
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (profilId) {
      loadTickets();
    }
  }, [profilId]);

  // Debug: tracer les changements d'état
  useEffect(() => {
    console.log('🔄 SupportTab state changed:', {
      modalOpen,
      hasSelectedTicket: !!selectedTicket,
      selectedTicketId: selectedTicket?.id,
      ticketsCount: tickets.length,
      sortedCount: sorted.length
    });
  }, [modalOpen, selectedTicket, tickets.length]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const allTickets = await getTickets({
        role: 'creator',
        profileId: profilId
      });

      console.log('📥 SupportTab tickets loaded:', {
        count: allTickets?.length || 0,
        profilId,
        sample: allTickets?.[0] ? {
          id: allTickets[0].id,
          subject: allTickets[0].subject,
          type: allTickets[0].type,
          hasConversation: Array.isArray(allTickets[0].conversation)
        } : null
      });
      setTickets(allTickets || []);
    } catch (err) {
      console.error('❌ Erreur chargement tickets:', err);
      setNotification?.({ 
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
        'creator',
        walletAddress,
        content,
        attachments
      );

      setNotification?.({ type: 'success', message: '✅ Réponse envoyée' });
      await loadTickets();
      
      const updated = await getTickets({ role: 'creator', profileId: profilId });
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
      setNotification?.({ type: 'success', message: '✅ Ticket résolu' });
      setModalOpen(false);
      await loadTickets();
    } catch (err) {
      console.error('❌ Erreur résolution:', err);
      setNotification?.({ type: 'error', message: 'Erreur résolution' });
    }
  };

  const handleEscalate = async () => {
    if (!selectedTicket) return;
    
    const reason = window.prompt('Raison de l\'escalade vers l\'admin:');
    if (!reason) return;
    
    try {
      await escalateToAdmin(selectedTicket.id, reason, walletAddress);
      setNotification?.({ 
        type: 'success', 
        message: '✅ Ticket escaladé vers l\'admin' 
      });
      setModalOpen(false);
      await loadTickets();
    } catch (err) {
      console.error('❌ Erreur escalade:', err);
      setNotification?.({ type: 'error', message: 'Erreur escalade' });
    }
  };

  // Filtrage
  const tabFiltered = filterCreatorTickets(tickets, activeTab, profilId);
  const statusFiltered = filter === 'all' 
    ? tabFiltered 
    : filterCreatorTickets(tabFiltered, filter, profilId);
  const searched = searchTickets(statusFiltered, searchQuery);
  const sorted = sortTickets(searched, 'date', 'desc');

  // Compteurs
  const clientTickets = filterCreatorTickets(tickets, 'clients', profilId);
  const adminTickets = filterCreatorTickets(tickets, 'admin', profilId);
  const unreadClients = getUnreadCount(clientTickets, 'creator');
  const unreadAdmin = getUnreadCount(adminTickets, 'creator');

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
    <Stack spacing="md">
      {/* Header */}
      <Card>
        <CardContent>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
              💬 Support & Communication
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Gérez vos conversations avec les clients et l'administration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Onglets Clients/Admin */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button
          variant={activeTab === 'clients' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('clients')}
          style={{ flex: 1 }}
        >
          👥 Tickets Clients ({clientTickets.length})
          {unreadClients > 0 && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              backgroundColor: 'white',
              color: 'var(--primary)',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: '700'
            }}>
              {unreadClients}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === 'admin' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('admin')}
          style={{ flex: 1 }}
        >
          🛡️ Tickets Admin ({adminTickets.length})
          {unreadAdmin > 0 && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              backgroundColor: 'white',
              color: 'var(--primary)',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: '700'
            }}>
              {unreadAdmin}
            </span>
          )}
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Button
              variant={filter === 'active' ? 'primary' : 'outline'}
              onClick={() => setFilter('active')}
              size="sm"
            >
              ⚡ Actifs
            </Button>
            <Button
              variant={filter === 'resolved' ? 'primary' : 'outline'}
              onClick={() => setFilter('resolved')}
              size="sm"
            >
              ✅ Résolus
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              📋 Tous
            </Button>
          </div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Rechercher un ticket..."
          />
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
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
              {activeTab === 'clients' ? '👥' : '🛡️'}
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {activeTab === 'clients' 
                ? 'Aucun ticket client pour le moment'
                : 'Aucun ticket admin pour le moment'}
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
                console.log('🔥 onClick déclenché (Creator):', ticket.id);
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
                      {ticket.category && <span style={{ marginRight: '8px' }}>📂 {ticket.category}</span>}
                      <span>📅 {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                      {ticket.metadata?.escalated && (
                        <span style={{ marginLeft: '8px', color: 'var(--warning)' }}>⬆️ Escaladé</span>
                      )}
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
          currentUserRole="creator"
          onClose={() => setModalOpen(false)}
          onSendMessage={handleSendMessage}
          onMarkAsRead={handleMarkAsRead}
          onResolve={handleResolve}
          onEscalate={handleEscalate}
        />
      )}
    </Stack>
  );
};

export default SupportTab;
