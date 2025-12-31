import { supabase } from './supabaseClient';

/**
 * tokenLinkedService - Service pour gérer les opérations isLinked
 *
 * Gère la sécurité des données lors du changement de statut isLinked d'un token
 */

interface Ticket {
  id: string;
  type: string;
  status: string;
  subject: string;
  created_at: string;
}

interface TicketCheckResult {
  hasActiveTickets: boolean;
  ticketCount: number;
  details: {
    tickets?: Ticket[];
    byType?: {
      client: number;
      report: number;
      creator: number;
    };
    error?: string;
  };
  activeTickets?: object;
}

interface CleanupResult {
  success: boolean;
  message: string;
  deletedCount:
    | number
    | {
        tickets: number;
        messages: number;
        history: number;
      };
  activeTickets?: object;
}

interface UpdateLinkedStatusResult {
  success: boolean;
  message: string;
  warning: string | null;
  activeTickets?: object;
}

/**
 * Vérifie si un token a des tickets ou signalements non traités
 * @param tokenId - ID du token
 * @param profilId - ID du profil (optionnel pour vérification supplémentaire)
 * @returns Promise avec info sur les tickets actifs
 */
export const checkActiveTicketsForToken = async (
  tokenId: string,
  profilId: string | null = null
): Promise<TicketCheckResult> => {
  try {
    // Statuts considérés comme "non traités"
    const activeStatuses = ['open', 'in_progress'];

    const query = supabase
      .from('tickets')
      .select('id, type, status, subject, created_at')
      .eq('token_id', tokenId)
      .in('status', activeStatuses);

    // Si profilId fourni, vérifier aussi les tickets liés au profil
    if (profilId) {
      const { data: farmTickets } = await supabase
        .from('tickets')
        .select('id, type, status, subject, created_at')
        .eq('profile_id', profilId)
        .eq('token_id', tokenId)
        .in('status', activeStatuses);

      const { data: tokenTickets } = await query;

      // Combiner les résultats et dédupliquer
      const allTickets: Ticket[] = [
        ...(tokenTickets as Ticket[]) || [],
        ...(farmTickets as Ticket[]) || []
      ];
      const uniqueTickets = Array.from(
        new Map(allTickets.map(t => [t.id, t])).values()
      );

      return {
        hasActiveTickets: uniqueTickets.length > 0,
        ticketCount: uniqueTickets.length,
        details: {
          tickets: uniqueTickets,
          byType: {
            client: uniqueTickets.filter(t => t.type === 'client').length,
            report: uniqueTickets.filter(t => t.type === 'report').length,
            creator: uniqueTickets.filter(t => t.type === 'creator').length
          }
        }
      };
    }

    const { data, error } = await query;

    if (error) throw error;

    const tickets: Ticket[] = (data as Ticket[]) || [];

    return {
      hasActiveTickets: tickets.length > 0,
      ticketCount: tickets.length,
      details: {
        tickets,
        byType: {
          client: tickets.filter(t => t.type === 'client').length,
          report: tickets.filter(t => t.type === 'report').length,
          creator: tickets.filter(t => t.type === 'creator').length
        }
      }
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Erreur vérification tickets actifs:', errMsg);
    // En cas d'erreur, on considère qu'il y a des tickets actifs (sécurité)
    return {
      hasActiveTickets: true,
      ticketCount: -1,
      details: { error: errMsg }
    };
  }
};

/**
 * Nettoie les données d'un token si aucun ticket actif
 * ATTENTION: Cette fonction supprime définitivement les données
 * @param tokenId - ID du token
 * @param profilId - ID du profil
 * @returns Promise avec info de nettoyage
 */
export const cleanupTokenDataIfSafe = async (
  tokenId: string,
  profilId: string
): Promise<CleanupResult> => {
  try {
    // 1. Vérifier s'il y a des tickets actifs
    const { hasActiveTickets, ticketCount, details } =
      await checkActiveTicketsForToken(tokenId, profilId);

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
    const ticketIds = ((closedTickets as Ticket[]) || []).map(t => t.id);
    let deletedMessages = 0;

    if (ticketIds.length > 0) {
      const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .delete()
        .in('ticket_id', ticketIds)
        .select();

      if (messagesError) throw messagesError;
      deletedMessages = (messages as unknown[]) ? (messages as unknown[]).length : 0;
    }

    // 4. Supprimer l'historique des actions liées au token (si table existe)
    let deletedHistory = 0;
    try {
      const { data: history, error: historyError } = await supabase
        .from('activity_history')
        .delete()
        .eq('token_id', tokenId)
        .select();

      if (!historyError) {
        deletedHistory = (history as unknown[]) ? (history as unknown[]).length : 0;
      }
    } catch (err) {
      // Table peut ne pas exister, on continue
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Historique non supprimé:', errMsg);
    }

    return {
      success: true,
      message: `Données nettoyées avec succès`,
      deletedCount: {
        tickets: ((closedTickets as Ticket[]) || []).length,
        messages: deletedMessages,
        history: deletedHistory
      }
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Erreur nettoyage données token:', errMsg);
    return {
      success: false,
      message: `Erreur lors du nettoyage : ${errMsg}`,
      deletedCount: 0
    };
  }
};

/**
 * Wrapper pour changer le statut isLinked d'un token avec vérifications
 * @param tokenId - ID du token
 * @param profilId - ID du profil
 * @param newIsLinkedValue - Nouvelle valeur de isLinked
 * @returns Promise avec résultat de la mise à jour
 */
export const updateTokenLinkedStatus = async (
  tokenId: string,
  profilId: string,
  newIsLinkedValue: boolean
): Promise<UpdateLinkedStatusResult> => {
  try {
    // 1. Récupérer le profil et ses tokens
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('tokens')
      .eq('id', profilId)
      .single();

    if (fetchError) throw fetchError;

    const tokens = (profile as any).tokens || [];
    const tokenIndex = tokens.findIndex(
      (t: any) => t.tokenId === tokenId
    );

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
      const { hasActiveTickets, ticketCount, details } =
        await checkActiveTicketsForToken(tokenId, profilId);

      if (hasActiveTickets) {
        return {
          success: false,
          message: `Impossible de délier ce token : ${ticketCount} ticket(s) ou signalement(s) non traité(s)`,
          warning:
            'Veuillez d\'abord traiter tous les tickets et signalements en attente.',
          activeTickets: details
        };
      }

      // Nettoyer les données si aucun ticket actif
      const cleanupResult = await cleanupTokenDataIfSafe(
        tokenId,
        profilId
      );

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
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Erreur mise à jour isLinked:', errMsg);
    return {
      success: false,
      message: `Erreur : ${errMsg}`,
      warning: null
    };
  }
};
