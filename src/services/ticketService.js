import { supabase } from './supabaseClient';

/**
 * ticketService - Service CRUD pour la gestion des tickets
 * Utilise les fonctions PostgreSQL créées dans tickets_refactoring.sql
 */

/**
 * Crée un nouveau ticket
 * @param {Object} ticketData - Données du ticket
 * @param {string} ticketData.subject - Sujet du ticket
 * @param {string} ticketData.description - Description initiale (premier message)
 * @param {string} ticketData.type - Type: 'admin_creator', 'admin_client', 'creator_client', 'report'
 * @param {string} ticketData.category - Catégorie
 * @param {string} ticketData.priority - Priorité: 'normal', 'high', 'urgent'
 * @param {string} ticketData.created_by_address - Adresse eCash du créateur
 * @param {string} ticketData.created_by_role - Rôle: 'admin', 'creator', 'client'
 * @param {string} [ticketData.token_id] - ID du token concerné (optionnel)
 * @param {string} [ticketData.profile_id] - ID du profil créateur (optionnel)
 * @param {string} [ticketData.client_address] - Adresse eCash du client (optionnel)
 * @param {Object} [ticketData.metadata] - Métadonnées additionnelles (tokenInfo, profileInfo, etc.)
 * @returns {Promise<Object>} Ticket créé
 */
export const createTicket = async (ticketData) => {
  try {
    const {
      subject,
      description,
      type,
      category,
      priority = 'normal',
      created_by_address,
      created_by_role,
      token_id = null,
      profile_id = null,
      client_address = null,
      metadata = {}
    } = ticketData;

    // Message initial dans conversation
    const initialMessage = {
      id: crypto.randomUUID(),
      author: created_by_role,
      author_address: created_by_address,
      content: description,
      timestamp: new Date().toISOString(),
      attachments: [],
      read: false
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        subject,
        type,
        category,
        priority,
        status: 'open',
        created_by_address,
        created_by_role,
        token_id,
        profile_id,
        client_address,
        conversation: [initialMessage],
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Ticket créé:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Erreur création ticket:', err);
    throw err;
  }
};

/**
 * Ajoute un message à la conversation d'un ticket
 * Utilise la fonction PostgreSQL add_message_to_ticket()
 * 
 * @param {string} ticketId - UUID du ticket
 * @param {string} author - Rôle: 'admin', 'creator', 'client'
 * @param {string} authorAddress - Adresse eCash de l'auteur
 * @param {string} content - Contenu du message
 * @param {Array} attachments - Pièces jointes [{name, url, type}]
 * @returns {Promise<Object>} Ticket mis à jour
 */
export const addMessageToTicket = async (ticketId, author, authorAddress, content, attachments = []) => {
  try {
    const { data, error } = await supabase.rpc('add_message_to_ticket', {
      p_ticket_id: ticketId,
      p_author: author,
      p_author_address: authorAddress,
      p_content: content,
      p_attachments: attachments
    });

    if (error) throw error;

    console.log('✅ Message ajouté au ticket:', ticketId);
    return data;
  } catch (err) {
    console.error('❌ Erreur ajout message:', err);
    throw err;
  }
};

/**
 * Marque les messages d'un ticket comme lus pour un rôle
 * Utilise la fonction PostgreSQL mark_messages_as_read()
 * 
 * @param {string} ticketId - UUID du ticket
 * @param {string} role - Rôle qui lit: 'admin', 'creator', 'client'
 * @returns {Promise<Object>} Ticket mis à jour
 */
export const markMessagesAsRead = async (ticketId, role) => {
  try {
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      p_ticket_id: ticketId,
      p_role: role
    });

    if (error) throw error;

    console.log('✅ Messages marqués lus pour', role, 'sur ticket', ticketId);
    return data;
  } catch (err) {
    console.error('❌ Erreur marquage messages lus:', err);
    throw err;
  }
};

/**
 * Met à jour le statut d'un ticket
 * @param {string} ticketId - UUID du ticket
 * @param {string} newStatus - Nouveau statut: 'open', 'awaiting_reply', 'in_progress', 'resolved', 'closed'
 * @returns {Promise<Object>} Ticket mis à jour
 */
export const updateTicketStatus = async (ticketId, newStatus) => {
  try {
    const updates = { status: newStatus };

    // Gérer les timestamps selon le statut
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      // Le trigger set_auto_close_date() va calculer auto_close_at automatiquement
    } else if (newStatus === 'closed') {
      updates.closed_at = new Date().toISOString();
    } else if (newStatus === 'open' || newStatus === 'in_progress') {
      // Réouverture: reset timestamps
      updates.resolved_at = null;
      updates.closed_at = null;
      updates.auto_close_at = null;
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Statut ticket mis à jour:', ticketId, '→', newStatus);
    return data;
  } catch (err) {
    console.error('❌ Erreur mise à jour statut:', err);
    throw err;
  }
};

/**
 * Résout un ticket (admin ou creator)
 * @param {string} ticketId - UUID du ticket
 * @returns {Promise<Object>} Ticket résolu
 */
export const resolveTicket = async (ticketId) => {
  return updateTicketStatus(ticketId, 'resolved');
};

/**
 * Réouvre un ticket résolu
 * @param {string} ticketId - UUID du ticket
 * @returns {Promise<Object>} Ticket réouvert
 */
export const reopenTicket = async (ticketId) => {
  return updateTicketStatus(ticketId, 'open');
};

/**
 * Clôt définitivement un ticket (admin uniquement)
 * @param {string} ticketId - UUID du ticket
 * @returns {Promise<Object>} Ticket clôturé
 */
export const closeTicket = async (ticketId) => {
  return updateTicketStatus(ticketId, 'closed');
};

/**
 * Escalade un ticket creator_client vers admin
 * Crée un nouveau ticket admin_creator avec référence
 * 
 * @param {string} ticketId - UUID du ticket original
 * @param {string} reason - Raison de l'escalade
 * @param {string} creatorAddress - Adresse du créateur qui escalade
 * @returns {Promise<Object>} Nouveau ticket admin créé
 */
export const escalateToAdmin = async (ticketId, reason, creatorAddress) => {
  try {
    // 1. Récupérer le ticket original
    const { data: originalTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Créer ticket admin_creator
    const escalatedTicket = await createTicket({
      subject: `🚨 Escalade: ${originalTicket.subject}`,
      description: `${reason}\n\n--- Ticket original ---\nID: ${ticketId}\nType: ${originalTicket.type}\nClient: ${originalTicket.client_address}`,
      type: 'admin_creator',
      category: 'escalation',
      priority: 'high',
      created_by_address: creatorAddress,
      created_by_role: 'creator',
      profile_id: originalTicket.profile_id,
      token_id: originalTicket.token_id,
      metadata: {
        ...originalTicket.metadata,
        escalated_from: ticketId,
        escalation_reason: reason
      }
    });

    // 3. Marquer ticket original comme escaladé
    await supabase
      .from('tickets')
      .update({
        metadata: {
          ...originalTicket.metadata,
          escalated: true,
          escalated_to: escalatedTicket.id,
          escalated_at: new Date().toISOString()
        }
      })
      .eq('id', ticketId);

    console.log('✅ Ticket escaladé vers admin:', escalatedTicket.id);
    return escalatedTicket;
  } catch (err) {
    console.error('❌ Erreur escalade:', err);
    throw err;
  }
};

/**
 * Récupère les tickets avec filtres
 * @param {Object} filters - Filtres de recherche
 * @param {string} [filters.role] - Filtrer par rôle: 'admin', 'creator', 'client'
 * @param {string} [filters.address] - Filtrer par adresse
 * @param {string} [filters.status] - Filtrer par statut
 * @param {string} [filters.type] - Filtrer par type
 * @param {string} [filters.search] - Recherche texte (subject)
 * @returns {Promise<Array>} Liste de tickets
 */
export const getTickets = async (filters = {}) => {
  try {
    let query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.role) {
      // Filtrer selon le rôle
      if (filters.role === 'admin') {
        // Admin voit tous les tickets
      } else if (filters.role === 'creator' && filters.profileId) {
        query = query.eq('profile_id', filters.profileId);
      } else if (filters.role === 'client' && filters.address) {
        query = query.eq('created_by_address', filters.address);
      }
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.search) {
      query = query.ilike('subject', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erreur Supabase détaillée:', error);
      throw error;
    }

    // S'assurer que conversation est toujours un array
    const tickets = (data || []).map(ticket => ({
      ...ticket,
      conversation: ticket.conversation || [],
      unread_count: ticket.unread_count || 0
    }));

    console.log('✅ Tickets récupérés:', tickets.length);
    return tickets;
  } catch (err) {
    console.error('❌ Erreur récupération tickets:', err);
    throw err;
  }
};

/**
 * Récupère un ticket par ID avec conversation complète
 * @param {string} ticketId - UUID du ticket
 * @returns {Promise<Object>} Ticket complet
 */
export const getTicketById = async (ticketId) => {
  try {
    const { data, error } = await supabase
      .from('tickets_with_context')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('❌ Erreur récupération ticket:', err);
    throw err;
  }
};

export default {
  createTicket,
  addMessageToTicket,
  markMessagesAsRead,
  updateTicketStatus,
  resolveTicket,
  reopenTicket,
  closeTicket,
  escalateToAdmin,
  getTickets,
  getTicketById
};
