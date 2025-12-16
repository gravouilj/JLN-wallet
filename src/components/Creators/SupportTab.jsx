import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Button, Badge, InfoBox, Stack, Tabs, Modal } from '../UI';
import { supabase } from '../../services/supabaseClient';
import CreatorTicketForm from './CreatorTicketForm';
import SearchFilters from '../SearchFilters';

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
 * @param {String} props.profilId - ID du profil de créateur
 * @param {Object} props.existingProfiles - Profil de créateur actuel
 * @param {Function} props.onCreateTicket - Callback création ticket
 * @param {Function} props.setNotification - Fonction pour afficher les notifications
 */
const SupportTab = ({ profilId, existingProfiles, onCreateTicket, setNotification, walletAddress }) => {
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTicketTab, setActiveTicketTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);


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
    if (profilId) {
      loadMyTickets();
    }
  }, [profilId]);

  const loadMyTickets = async () => {
    try {
      setLoadingTickets(true);
      
      // Charger tickets créateur→admin (sans token_id)
      const { data: adminTickets, error: adminError } = await supabase
        .from('tickets')
        .select(`
          *,
          messages:ticket_messages(*)
        `)
        .eq('farm_id', profilId)
        .eq('type', 'creator')
        .is('token_id', null)
        .order('created_at', { ascending: false });

      if (adminError) throw adminError;

      // Charger signalements de profil (type='report' avec farm_id)
      const { data: reportTickets, error: reportError } = await supabase
        .from('tickets')
        .select(`
          *,
          messages:ticket_messages(*)
        `)
        .eq('farm_id', profilId)
        .eq('type', 'report')
        .order('created_at', { ascending: false });

      if (reportError) throw reportError;

      // Charger tickets client→créateur (type='creator' avec token_id)
      const { data: clientTickets, error: clientError } = await supabase
        .from('tickets')
        .select(`
          *,
          messages:ticket_messages(*)
        `)
        .eq('farm_id', profilId)
        .eq('type', 'creator')
        .not('token_id', 'is', null)
        .order('created_at', { ascending: false });

      if (clientError) throw clientError;

      // Combiner tous les tickets avec catégorie
      const allTickets = [
        ...(adminTickets || []).map(t => ({ ...t, ticketCategory: 'admin' })),
        ...(reportTickets || []).map(t => ({ ...t, ticketCategory: 'report' })),
        ...(clientTickets || []).map(t => ({ ...t, ticketCategory: 'client' }))
      ];

      setMyTickets(allTickets);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  // (Message rapide supprimé - utiliser "Nouveau ticket" à la place)

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

  // Filtrer les tickets
  const filteredTickets = useMemo(() => {
    let filtered = myTickets;

    // Filtrer par catégorie (onglet)
    if (activeTicketTab === 'admin') {
      filtered = filtered.filter(t => t.ticketCategory === 'admin');
    } else if (activeTicketTab === 'reports') {
      filtered = filtered.filter(t => t.ticketCategory === 'report');
    } else if (activeTicketTab === 'clients') {
      filtered = filtered.filter(t => t.ticketCategory === 'client');
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.subject?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.id?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [myTickets, activeTicketTab, filterStatus, searchQuery]);

  // Compter les tickets par catégorie
  const ticketCounts = useMemo(() => ({
    all: myTickets.length,
    admin: myTickets.filter(t => t.ticketCategory === 'admin').length,
    reports: myTickets.filter(t => t.ticketCategory === 'report').length,
    clients: myTickets.filter(t => t.ticketCategory === 'client').length
  }), [myTickets]);

  // Compter les tickets non traités
  const unreadCounts = useMemo(() => ({
    all: myTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
    admin: myTickets.filter(t => t.ticketCategory === 'admin' && t.status !== 'closed' && t.status !== 'resolved').length,
    reports: myTickets.filter(t => t.ticketCategory === 'report' && t.status !== 'closed' && t.status !== 'resolved').length,
    clients: myTickets.filter(t => t.ticketCategory === 'client' && t.status !== 'closed' && t.status !== 'resolved').length
  }), [myTickets]);

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
              type="button"
              variant="primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '❌ Annuler' : '✉️ Nouveau ticket'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de création de ticket */}
      {showForm && (
        <CreatorTicketForm
          profilId={profilId}
          walletAddress={walletAddress}
          setNotification={setNotification}
          onSubmit={(ticket) => {
            setShowForm(false);
            loadMyTickets(); // Refresh la liste
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Mes tickets avec onglets */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            📋 Mes tickets de support
          </h3>

          {/* Onglets de catégories */}
          <Tabs
            tabs={[
              { 
                id: 'all', 
                label: `📋 Tous (${ticketCounts.all}) ${unreadCounts.all > 0 ? '🔴' : ''}` 
              },
              { 
                id: 'admin', 
                label: `🛡️ Admin (${ticketCounts.admin}) ${unreadCounts.admin > 0 ? '🔴' : ''}` 
              },
              { 
                id: 'reports', 
                label: `🚨 Signalements (${ticketCounts.reports}) ${unreadCounts.reports > 0 ? '🔴' : ''}` 
              },
              { 
                id: 'clients', 
                label: `👤 Clients (${ticketCounts.clients}) ${unreadCounts.clients > 0 ? '🔴' : ''}` 
              }
            ]}
            activeTab={activeTicketTab}
            onChange={setActiveTicketTab}
          />

          {/* Filtres */}
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <SearchFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Rechercher un ticket par sujet, ID..."
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
                }
              ]}
              hasActiveFilters={searchQuery || filterStatus !== 'all'}
              onClearAll={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
            />
          </div>

          {loadingTickets ? (
            <div className="text-center py-4">
              <p className="text-secondary">Chargement...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <InfoBox type="info" icon="💡">
              {searchQuery || filterStatus !== 'all' ? (
                <><strong>Aucun ticket trouvé</strong><br />
                Aucun ticket ne correspond aux filtres sélectionnés.</>
              ) : (
                <><strong>Aucun ticket pour le moment</strong><br />
                Créez un ticket pour poser une question ou signaler un problème.</>
              )}
            </InfoBox>
          ) : (
            <Stack spacing="sm">
              {filteredTickets.map((ticket) => (
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
                        {ticket.ticketCategory === 'admin' ? '🛡️' :
                         ticket.ticketCategory === 'report' ? '🚨' : '👤'}
                      </span>
                      <span style={{ fontSize: '1rem' }}>
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
                      {ticket.ticketCategory === 'admin' ? 'Admin' :
                       ticket.ticketCategory === 'report' ? 'Signalement' : 'Client'}
                    </span>
                    {ticket.messages && ticket.messages.length > 0 && (
                      <>
                        <span>•</span>
                        <span>💬 {ticket.messages.length} message{ticket.messages.length > 1 ? 's' : ''}</span>
                      </>
                    )}
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
                      setSelectedTicket(ticket);
                      setShowTicketModal(true);
                    }}
                  >
                    👁️ Voir les détails
                  </Button>
                </div>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Modal détails du ticket */}
      {showTicketModal && selectedTicket && (
        <Modal isOpen={showTicketModal} onClose={() => {
          setShowTicketModal(false);
          setSelectedTicket(null);
        }}>
          <Modal.Header>
            {selectedTicket.ticketCategory === 'admin' ? '🛡️' :
             selectedTicket.ticketCategory === 'report' ? '🚨' : '👤'} {selectedTicket.subject}
          </Modal.Header>
          <Modal.Body>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <Badge variant={statusColors[selectedTicket.status] || 'secondary'}>
                  {statusLabels[selectedTicket.status] || selectedTicket.status}
                </Badge>
                <Badge variant="neutral">
                  {selectedTicket.category}
                </Badge>
                <Badge variant="neutral">
                  Priorité: {selectedTicket.priority}
                </Badge>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                📅 Créé le {formatDate(selectedTicket.created_at)}
              </p>
              {selectedTicket.description && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Description :</strong>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {selectedTicket.description}
                  </p>
                </div>
              )}
            </div>

            {/* Historique des messages */}
            {selectedTicket.messages && selectedTicket.messages.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  💬 Conversation ({selectedTicket.messages.length})
                </h4>
                <Stack spacing="sm">
                  {selectedTicket.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        backgroundColor: msg.author === 'admin' ? 'var(--info-light)' : 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: `1px solid ${msg.author === 'admin' ? 'var(--border-info)' : 'var(--border-primary)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '0.85rem', color: msg.author === 'admin' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {msg.author === 'admin' ? '🛡️ Admin' : msg.author === 'creator' ? '🌾 Créateur' : '👤 Client'}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </Stack>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => {
                setShowTicketModal(false);
                setSelectedTicket(null);
              }}
            >
              Fermer
            </Button>
          </Modal.Footer>
        </Modal>
      )}

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
