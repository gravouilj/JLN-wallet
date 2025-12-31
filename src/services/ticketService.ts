import { supabase } from './supabaseClient';

// Types
interface TicketMessage {
  id: string;
  author: 'admin' | 'creator' | 'client';
  author_address: string;
  content: string;
  timestamp: string;
  attachments: Array<{ name: string; url: string; type: string }>;
  read: boolean;
}

interface TicketData {
  subject: string;
  description: string;
  type: 'admin_creator' | 'admin_client' | 'creator_client' | 'report';
  category: string;
  priority?: 'normal' | 'high' | 'urgent';
  created_by_address: string;
  created_by_role: 'admin' | 'creator' | 'client';
  token_id?: string | null;
  profile_id?: string | null;
  client_address?: string | null;
  metadata?: Record<string, unknown>;
}

interface Ticket {
  id: string;
  subject: string;
  type: string;
  category: string;
  priority: string;
  status: 'open' | 'awaiting_reply' | 'in_progress' | 'resolved' | 'closed';
  created_by_address: string;
  created_by_role: string;
  token_id: string | null;
  profile_id: string | null;
  client_address: string | null;
  conversation: TicketMessage[];
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  auto_close_at?: string | null;
  unread_count?: number;
}

interface TicketFilters {
  role?: 'admin' | 'creator' | 'client';
  address?: string;
  profileId?: string;
  status?: string;
  type?: string;
  search?: string;
}

/**
 * Crée un nouveau ticket
 * @param ticketData - Données du ticket
 * @returns Ticket créé
 */
export const createTicket = async (ticketData: TicketData): Promise<Ticket> => {
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
    const initialMessage: TicketMessage = {
      id: crypto.randomUUID(),
      author: created_by_role as 'admin' | 'creator' | 'client',
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

    console.log('✅ Ticket créé:', (data as Ticket).id);
    return data as Ticket;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur création ticket:', errMsg);
    throw err;
  }
};

/**
 * Ajoute un message à la conversation d'un ticket
 * @param ticketId - UUID du ticket
 * @param author - Rôle: 'admin', 'creator', 'client'
 * @param authorAddress - Adresse eCash de l'auteur
 * @param content - Contenu du message
 * @param attachments - Pièces jointes
 * @returns Ticket mis à jour
 */
export const addMessageToTicket = async (
  ticketId: string,
  author: 'admin' | 'creator' | 'client',
  authorAddress: string,
  content: string,
  attachments: Array<{ name: string; url: string; type: string }> = []
): Promise<Ticket> => {
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
    return data as Ticket;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur ajout message:', errMsg);
    throw err;
  }
};

/**
 * Marque les messages d'un ticket comme lus pour un rôle
 * @param ticketId - UUID du ticket
 * @param role - Rôle qui lit: 'admin', 'creator', 'client'
 * @returns Ticket mis à jour
 */
export const markMessagesAsRead = async (
  ticketId: string,
  role: 'admin' | 'creator' | 'client'
): Promise<Ticket> => {
  try {
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      p_ticket_id: ticketId,
      p_role: role
    });

    if (error) throw error;

    console.log('✅ Messages marqués lus pour', role, 'sur ticket', ticketId);
    return data as Ticket;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur marquage messages lus:', errMsg);
    throw err;
  }
};

/**
 * Met à jour le statut d'un ticket
 * @param ticketId - UUID du ticket
 * @param newStatus - Nouveau statut
 * @returns Ticket mis à jour
 */
export const updateTicketStatus = async (
  ticketId: string,
  newStatus: 'open' | 'awaiting_reply' | 'in_progress' | 'resolved' | 'closed'
): Promise<Ticket> => {
  try {
    const updates: Record<string, unknown> = { status: newStatus };

    // Gérer les timestamps selon le statut
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
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
    return data as Ticket;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur mise à jour statut:', errMsg);
    throw err;
  }
};

/**
 * Résout un ticket (admin ou creator)
 * @param ticketId - UUID du ticket
 * @returns Ticket résolu
 */
export const resolveTicket = async (ticketId: string): Promise<Ticket> => {
  return updateTicketStatus(ticketId, 'resolved');
};

/**
 * Réouvre un ticket résolu
 * @param ticketId - UUID du ticket
 * @returns Ticket réouvert
 */
export const reopenTicket = async (ticketId: string): Promise<Ticket> => {
  return updateTicketStatus(ticketId, 'open');
};

/**
 * Clôt définitivement un ticket (admin uniquement)
 * @param ticketId - UUID du ticket
 * @returns Ticket clôturé
 */
export const closeTicket = async (ticketId: string): Promise<Ticket> => {
  return updateTicketStatus(ticketId, 'closed');
};

/**
 * Escalade un ticket creator_client vers admin
 * @param ticketId - UUID du ticket original
 * @param reason - Raison de l'escalade
 * @param creatorAddress - Adresse du créateur qui escalade
 * @returns Nouveau ticket admin créé
 */
export const escalateToAdmin = async (
  ticketId: string,
  reason: string,
  creatorAddress: string
): Promise<Ticket> => {
  try {
    // 1. Récupérer le ticket original
    const { data: originalTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    const original = originalTicket as Ticket;

    // 2. Créer ticket admin_creator
    const escalatedTicket = await createTicket({
      subject: `🚨 Escalade: ${original.subject}`,
      description: `${reason}\n\n--- Ticket original ---\nID: ${ticketId}\nType: ${original.type}\nClient: ${original.client_address}`,
      type: 'admin_creator',
      category: 'escalation',
      priority: 'high',
      created_by_address: creatorAddress,
      created_by_role: 'creator',
      profile_id: original.profile_id || undefined,
      token_id: original.token_id || undefined,
      metadata: {
        ...original.metadata,
        escalated_from: ticketId,
        escalation_reason: reason
      }
    });

    // 3. Marquer ticket original comme escaladé
    await supabase
      .from('tickets')
      .update({
        metadata: {
          ...original.metadata,
          escalated: true,
          escalated_to: escalatedTicket.id,
          escalated_at: new Date().toISOString()
        }
      })
      .eq('id', ticketId);

    console.log('✅ Ticket escaladé vers admin:', escalatedTicket.id);
    return escalatedTicket;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur escalade:', errMsg);
    throw err;
  }
};

/**
 * Récupère les tickets avec filtres
 * @param filters - Filtres de recherche
 * @returns Liste de tickets
 */
export const getTickets = async (filters: TicketFilters = {}): Promise<Ticket[]> => {
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
    const tickets = ((data as Ticket[]) || []).map(ticket => ({
      ...ticket,
      conversation: ticket.conversation || [],
      unread_count: ticket.unread_count || 0
    }));

    console.log('✅ Tickets récupérés:', tickets.length);
    return tickets;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur récupération tickets:', errMsg);
    throw err;
  }
};

/**
 * Récupère un ticket par ID avec conversation complète
 * @param ticketId - UUID du ticket
 * @returns Ticket complet
 */
export const getTicketById = async (ticketId: string): Promise<Ticket> => {
  try {
    const { data, error } = await supabase
      .from('tickets_with_context')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) throw error;

    return data as Ticket;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur récupération ticket:', errMsg);
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
