/**
 * smartFilters.js - Filtres intelligents pour les tickets
 * Selon la spécification TICKETS_SYSTEM_REFACTORING.md
 */

/**
 * Filtre les tickets pour la vue Admin
 * @param {Array} tickets - Liste complète des tickets
 * @param {string} filterType - Type de filtre: 'actionable', 'in_progress', 'resolved_recent', 'archived'
 * @returns {Array} Tickets filtrés
 */
export const filterAdminTickets = (tickets, filterType) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  switch (filterType) {
    case 'actionable': // À traiter
      return tickets.filter(t => 
        t.status === 'open' || t.status === 'awaiting_reply'
      );

    case 'in_progress': // En cours
      return tickets.filter(t => 
        t.status === 'in_progress'
      );

    case 'resolved_recent': // Résolus 7 derniers jours
      return tickets.filter(t => {
        if (t.status !== 'resolved') return false;
        const resolvedDate = new Date(t.resolved_at);
        return resolvedDate >= sevenDaysAgo;
      });

    case 'archived': // Archivés (résolus > 7j + clôturés)
      return tickets.filter(t => {
        if (t.status === 'closed') return true;
        if (t.status === 'resolved') {
          const resolvedDate = new Date(t.resolved_at);
          return resolvedDate < sevenDaysAgo;
        }
        return false;
      });

    case 'all':
    default:
      return tickets;
  }
};

/**
 * Filtre les tickets pour la vue Créateur
 * @param {Array} tickets - Liste complète des tickets
 * @param {string} filterType - Type de filtre: 'clients', 'admin', 'active', 'resolved'
 * @param {string} profileId - ID du profil créateur
 * @returns {Array} Tickets filtrés
 */
export const filterCreatorTickets = (tickets, filterType, profileId) => {
  switch (filterType) {
    case 'clients': // Tickets avec clients
      return tickets.filter(t => 
        t.type === 'creator_client' && 
        t.profile_id === profileId
      );

    case 'admin': // Tickets avec admin
      return tickets.filter(t => 
        t.type === 'admin_creator' && 
        t.profile_id === profileId
      );

    case 'active': // Actifs (open, awaiting_reply, in_progress)
      return tickets.filter(t => 
        ['open', 'awaiting_reply', 'in_progress'].includes(t.status) &&
        t.profile_id === profileId
      );

    case 'resolved': // Résolus
      return tickets.filter(t => 
        ['resolved', 'closed'].includes(t.status) &&
        t.profile_id === profileId
      );

    case 'all':
    default:
      return tickets.filter(t => t.profile_id === profileId);
  }
};

/**
 * Filtre les tickets pour la vue Client
 * @param {Array} tickets - Liste complète des tickets
 * @param {string} filterType - Type de filtre: 'active', 'resolved_recent', 'closed'
 * @param {string} clientAddress - Adresse eCash du client
 * @returns {Array} Tickets filtrés
 */
export const filterClientTickets = (tickets, filterType, clientAddress) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Filtrer d'abord par adresse client
  const clientTickets = tickets.filter(t => 
    t.client_address === clientAddress || 
    t.created_by_address === clientAddress
  );

  switch (filterType) {
    case 'active': // Actifs
      return clientTickets.filter(t => 
        ['open', 'awaiting_reply', 'in_progress'].includes(t.status)
      );

    case 'resolved_recent': // Résolus 7 derniers jours
      return clientTickets.filter(t => {
        if (t.status !== 'resolved') return false;
        const resolvedDate = new Date(t.resolved_at);
        return resolvedDate >= sevenDaysAgo;
      });

    case 'closed': // Clôturés
      return clientTickets.filter(t => t.status === 'closed');

    case 'all':
    default:
      return clientTickets;
  }
};

/**
 * Recherche textuelle dans les tickets
 * @param {Array} tickets - Liste de tickets
 * @param {string} searchQuery - Requête de recherche
 * @returns {Array} Tickets correspondants
 */
export const searchTickets = (tickets, searchQuery) => {
  if (!searchQuery || searchQuery.trim() === '') return tickets;

  const query = searchQuery.toLowerCase().trim();

  return tickets.filter(ticket => {
    // Recherche dans le sujet
    if (ticket.subject?.toLowerCase().includes(query)) return true;

    // Recherche dans la catégorie
    if (ticket.category?.toLowerCase().includes(query)) return true;

    // Recherche dans les messages de conversation
    if (ticket.conversation && Array.isArray(ticket.conversation)) {
      const hasMatchingMessage = ticket.conversation.some(msg => 
        msg.content?.toLowerCase().includes(query)
      );
      if (hasMatchingMessage) return true;
    }

    // Recherche dans metadata.tokenInfo
    if (ticket.metadata?.tokenInfo) {
      const tokenInfo = ticket.metadata.tokenInfo;
      if (tokenInfo.ticker?.toLowerCase().includes(query)) return true;
      if (tokenInfo.name?.toLowerCase().includes(query)) return true;
    }

    return false;
  });
};

/**
 * Compte les tickets par statut pour affichage des badges
 * @param {Array} tickets - Liste de tickets
 * @returns {Object} Compteurs par statut
 */
export const getTicketCounts = (tickets) => {
  return {
    open: tickets.filter(t => t.status === 'open').length,
    awaiting_reply: tickets.filter(t => t.status === 'awaiting_reply').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    total: tickets.length
  };
};

/**
 * Compte les messages non lus pour un rôle
 * @param {Array} tickets - Liste de tickets
 * @param {string} role - 'admin', 'creator', 'client'
 * @returns {number} Nombre de messages non lus
 */
export const getUnreadCount = (tickets, role) => {
  return tickets.reduce((count, ticket) => {
    if (!ticket.conversation || !Array.isArray(ticket.conversation)) return count;
    
    const unreadMessages = ticket.conversation.filter(msg => 
      !msg.read && msg.author !== role
    );
    
    return count + unreadMessages.length;
  }, 0);
};

/**
 * Tri des tickets
 * @param {Array} tickets - Liste de tickets
 * @param {string} sortBy - Critère: 'date', 'priority', 'status', 'unread'
 * @param {string} order - 'asc' ou 'desc'
 * @returns {Array} Tickets triés
 */
export const sortTickets = (tickets, sortBy = 'date', order = 'desc') => {
  const sorted = [...tickets];

  switch (sortBy) {
    case 'date':
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
      break;

    case 'priority': {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      sorted.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] || 2;
        const priorityB = priorityOrder[b.priority] || 2;
        return order === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      });
      break;
    }

    case 'status': {
      const statusOrder = { open: 1, awaiting_reply: 2, in_progress: 3, resolved: 4, closed: 5 };
      sorted.sort((a, b) => {
        const statusA = statusOrder[a.status] || 1;
        const statusB = statusOrder[b.status] || 1;
        return order === 'asc' ? statusA - statusB : statusB - statusA;
      });
      break;
    }

    case 'unread':
      sorted.sort((a, b) => {
        const unreadA = a.unread_count || 0;
        const unreadB = b.unread_count || 0;
        return order === 'asc' ? unreadA - unreadB : unreadB - unreadA;
      });
      break;

    default:
      break;
  }

  return sorted;
};

export default {
  filterAdminTickets,
  filterCreatorTickets,
  filterClientTickets,
  searchTickets,
  getTicketCounts,
  getUnreadCount,
  sortTickets
};
