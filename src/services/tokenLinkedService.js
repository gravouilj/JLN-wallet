import { supabase } from './supabaseClient';

/**
 * tokenLinkedService - Service pour gérer les opérations isLinked
 * 
 * Gère la sécurité des données lors du changement de statut isLinked d'un token
 */

/**
 * Vérifie si un token a des tickets ou signalements non traités
 * @param {string} tokenId - ID du token
 * @param {string} profilId - ID du profil (optionnel pour vérification supplémentaire)
 * @returns {Promise<{hasActiveTickets: boolean, ticketCount: number, details: object}>}
 */
export const checkActiveTicketsForToken = async (tokenId, profilId = null) => {
  try {
    // Statuts considérés comme "non traités"
    const activeStatuses = ['open', 'in_progress'];
    
    let query = supabase
      .from('tickets')
      .select('id, type, status, subject, created_at')
      .eq('token_id', tokenId)
      .in('status', activeStatuses);
    
    // Si profilId fourni, vérifier aussi les tickets liés au profil
    if (profilId) {
      const { data: farmTickets } = await supabase
        .from('tickets')
        .select('id, type, status, subject, created_at')
        .eq('farm_id', profilId)
        .eq('token_id', tokenId)
        .in('status', activeStatuses);
      
      const { data: tokenTickets } = await query;
      
      // Combiner les résultats et dédupliquer
      const allTickets = [...(tokenTickets || []), ...(farmTickets || [])];
      const uniqueTickets = Array.from(new Map(allTickets.map(t => [t.id, t])).values());
      
      return {
        hasActiveTickets: uniqueTickets.length > 0,
        ticketCount: uniqueTickets.length,
        details: {
          tickets: uniqueTickets,
          byType: {
            client: uniqueTickets.filter(t => t.type === 'client').length,
            report: uniqueTickets.filter(t => t.type === 'report').length,
            creator: uniqueTickets.filter(t => t.type === 'creator').length,
          }
        }
      };
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const tickets = data || [];
    
    return {
      hasActiveTickets: tickets.length > 0,
      ticketCount: tickets.length,
      details: {
        tickets,
        byType: {
          client: tickets.filter(t => t.type === 'client').length,
          report: tickets.filter(t => t.type === 'report').length,
          creator: tickets.filter(t => t.type === 'creator').length,
        }
      }
    };
  } catch (err) {
    console.error('Erreur vérification tickets actifs:', err);
    // En cas d'erreur, on considère qu'il y a des tickets actifs (sécurité)
    return {
      hasActiveTickets: true,
      ticketCount: -1,
      details: { error: err.message }
    };
  }
};

/**
 * Nettoie les données d'un token si aucun ticket actif
 * ATTENTION: Cette fonction supprime définitivement les données
 * @param {string} tokenId - ID du token
 * @param {string} profilId - ID du profil
 * @returns {Promise<{success: boolean, message: string, deletedCount: number}>}
 */
export const cleanupTokenDataIfSafe = async (tokenId, profilId) => {
  try {
    // 1. Vérifier s'il y a des tickets actifs
    const { hasActiveTickets, ticketCount, details } = await checkActiveTicketsForToken(tokenId, profilId);
    
    if (hasActiveTickets) {
      return {
        success: false,
        message: `Impossible de supprimer les données : ${ticketCount} ticket(s) non traité(s) trouvé(s)`,
        deletedCount: 0,
        activeTickets: details
      };
    }
    
    // 2. Si pas de tickets actifs, on peut supprimer les tickets fermés/résolus
    const { data: closedTickets, error: ticketsError } = await supabase
      .from('tickets')
      .delete()
      .eq('token_id', tokenId)
      .in('status', ['resolved', 'closed'])
      .select();
    
    if (ticketsError) throw ticketsError;
    
    // 3. Supprimer les messages associés aux tickets supprimés
    const ticketIds = (closedTickets || []).map(t => t.id);
    let deletedMessages = 0;
    
    if (ticketIds.length > 0) {
      const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .delete()
        .in('ticket_id', ticketIds)
        .select();
      
      if (messagesError) throw messagesError;
      deletedMessages = (messages || []).length;
    }
    
    // 4. Supprimer l'historique des actions liées au token (si table existe)
    // Note: À adapter selon votre schéma de base de données
    let deletedHistory = 0;
    try {
      const { data: history, error: historyError } = await supabase
        .from('activity_history')
        .delete()
        .eq('token_id', tokenId)
        .select();
      
      if (!historyError) {
        deletedHistory = (history || []).length;
      }
    } catch (err) {
      // Table peut ne pas exister, on continue
      console.warn('Historique non supprimé:', err);
    }
    
    return {
      success: true,
      message: `Données nettoyées avec succès`,
      deletedCount: {
        tickets: (closedTickets || []).length,
        messages: deletedMessages,
        history: deletedHistory
      }
    };
  } catch (err) {
    console.error('Erreur nettoyage données token:', err);
    return {
      success: false,
      message: `Erreur lors du nettoyage : ${err.message}`,
      deletedCount: 0
    };
  }
};

/**
 * Wrapper pour changer le statut isLinked d'un token avec vérifications
 * @param {string} tokenId - ID du token
 * @param {string} profilId - ID du profil
 * @param {boolean} newIsLinkedValue - Nouvelle valeur de isLinked
 * @returns {Promise<{success: boolean, message: string, warning: string|null}>}
 */
export const updateTokenLinkedStatus = async (tokenId, profilId, newIsLinkedValue) => {
  try {
    // 1. Récupérer le profil et ses tokens
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('tokens')
      .eq('id', profilId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const tokens = profile.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      return {
        success: false,
        message: 'Token non trouvé dans le profil',
        warning: null
      };
    }
    
    const oldIsLinkedValue = tokens[tokenIndex].isLinked;
    
    // Si on passe de true à false, vérifier les tickets actifs
    if (oldIsLinkedValue === true && newIsLinkedValue === false) {
      const { hasActiveTickets, ticketCount, details } = await checkActiveTicketsForToken(tokenId, profilId);
      
      if (hasActiveTickets) {
        return {
          success: false,
          message: `Impossible de délier ce token : ${ticketCount} ticket(s) ou signalement(s) non traité(s)`,
          warning: 'Veuillez d\'abord traiter tous les tickets et signalements en attente.',
          activeTickets: details
        };
      }
      
      // Nettoyer les données si aucun ticket actif
      const cleanupResult = await cleanupTokenDataIfSafe(tokenId, profilId);
      
      if (!cleanupResult.success) {
        return {
          success: false,
          message: cleanupResult.message,
          warning: 'Le statut n\'a pas été modifié.'
        };
      }
    }
    
    // 2. Mettre à jour le statut isLinked
    tokens[tokenIndex].isLinked = newIsLinkedValue;
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ tokens })
      .eq('id', profilId);
    
    if (updateError) throw updateError;
    
    return {
      success: true,
      message: newIsLinkedValue 
        ? 'Token lié au profil avec succès' 
        : 'Token délié et données nettoyées avec succès',
      warning: null
    };
  } catch (err) {
    console.error('Erreur mise à jour isLinked:', err);
    return {
      success: false,
      message: `Erreur : ${err.message}`,
      warning: null
    };
  }
};
