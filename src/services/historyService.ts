/**
 * Service de gestion de l'historique des actions sur les tokens
 * Utilise Supabase pour stocker et récupérer l'historique d'activité
 */

import { supabase } from './supabaseClient';

// Types
interface HistoryEntry {
  owner_address: string;
  token_id: string;
  token_ticker: string;
  action_type: string;
  amount?: string | null;
  tx_id?: string | null;
  details?: Record<string, unknown> | null;
}

interface HistoryRecord extends HistoryEntry {
  id: string;
  created_at: string;
}

enum ActionType {
  SEND = 'SEND',
  MINT = 'MINT',
  BURN = 'BURN',
  AIRDROP = 'AIRDROP',
  CREATE = 'CREATE',
  IMPORT = 'IMPORT',
  MESSAGE = 'MESSAGE'
}

/**
 * Types d'actions disponibles
 */
export const ACTION_TYPES = {
  SEND: 'SEND',
  MINT: 'MINT',
  BURN: 'BURN',
  AIRDROP: 'AIRDROP',
  CREATE: 'CREATE',
  IMPORT: 'IMPORT',
  MESSAGE: 'MESSAGE'
};

/**
 * Ajoute une entrée dans l'historique
 * @param entry - L'entrée à ajouter
 * @returns L'entrée créée avec son ID, ou null en cas d'erreur
 */
export async function addEntry(
  entry: HistoryEntry
): Promise<HistoryRecord | null> {
  try {
    // 1. Validation souple (Ne pas throw, juste return null avec un warning)
    if (
      !entry.owner_address ||
      !entry.token_id ||
      !entry.token_ticker ||
      !entry.action_type
    ) {
      console.warn(
        '⚠️ Historique incomplet (champs manquants), entrée ignorée:',
        entry
      );
      return null;
    }

    // 2. Vérification type (Souple aussi)
    if (!Object.values(ACTION_TYPES).includes(entry.action_type)) {
      console.warn(`⚠️ Type d'action invalide: ${entry.action_type}`);
      return null;
    }

    console.log('📝 Ajout entrée historique:', entry);

    const { data, error } = await supabase
      .from('token_history')
      .insert([
        {
          owner_address: entry.owner_address,
          token_id: entry.token_id,
          token_ticker: entry.token_ticker,
          action_type: entry.action_type,
          amount: entry.amount || null,
          tx_id: entry.tx_id || null,
          details: entry.details || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(
        '❌ Erreur Supabase lors de l\'ajout à l\'historique:',
        error
      );
      return null;
    }

    console.log('✅ Entrée ajoutée à l\'historique:', data);
    return data as HistoryRecord;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur addEntry:', errMsg);
    return null;
  }
}

/**
 * Récupère l'historique filtré par token et (optionnellement) par type d'action
 * @param tokenId - ID du token
 * @param actionType - Type d'action à filtrer (optionnel)
 * @returns Liste des entrées d'historique, triées par date décroissante
 */
export async function getHistoryByToken(
  tokenId: string,
  actionType: string | null = null
): Promise<HistoryRecord[]> {
  try {
    if (!tokenId) {
      throw new Error('Le tokenId est obligatoire');
    }

    console.log(`🔍 Chargement historique pour token ${tokenId.substring(0, 8)}...`);

    let query = supabase
      .from('token_history')
      .select('*')
      .eq('token_id', tokenId);

    // Filtre optionnel par type d'action
    if (actionType) {
      if (!Object.values(ACTION_TYPES).includes(actionType)) {
        throw new Error(
          `Type d'action invalide. Doit être l'un de : ${Object.values(ACTION_TYPES).join(', ')}`
        );
      }
      query = query.eq('action_type', actionType);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      console.error(
        '❌ Erreur lors de la récupération de l\'historique par token:',
        error
      );
      throw error;
    }

    console.log(
      `✅ Historique récupéré pour token ${tokenId.substring(0, 8)}:`,
      data?.length || 0,
      'entrées'
    );
    return (data as HistoryRecord[]) || [];
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur getHistoryByToken:', errMsg);
    throw err;
  }
}

/**
 * Récupère tout l'historique d'un utilisateur
 * @param ownerAddress - Adresse eCash de l'utilisateur
 * @returns Liste des entrées d'historique, triées par date décroissante
 */
export async function getGlobalHistory(
  ownerAddress: string
): Promise<HistoryRecord[]> {
  try {
    if (!ownerAddress) {
      throw new Error('L\'adresse du propriétaire est obligatoire');
    }

    const { data, error } = await supabase
      .from('token_history')
      .select('*')
      .eq('owner_address', ownerAddress)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        'Erreur lors de la récupération de l\'historique global:',
        error
      );
      throw error;
    }

    console.log(
      `📜 Historique global récupéré pour ${ownerAddress}:`,
      data?.length || 0,
      'entrées'
    );
    return (data as HistoryRecord[]) || [];
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur getGlobalHistory:', errMsg);
    throw err;
  }
}

/**
 * Récupère les statistiques d'un token (nombre d'actions par type)
 * @param tokenId - ID du token
 * @returns Objet avec le compte par type d'action
 */
export async function getTokenStats(
  tokenId: string
): Promise<Record<string, number>> {
  try {
    if (!tokenId) {
      throw new Error('Le tokenId est obligatoire');
    }

    const { data, error } = await supabase
      .from('token_history')
      .select('action_type')
      .eq('token_id', tokenId);

    if (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      throw error;
    }

    // Compter les actions par type
    const stats = ((data || []) as HistoryRecord[]).reduce(
      (acc, entry) => {
        acc[entry.action_type] = (acc[entry.action_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return stats;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Erreur getTokenStats:', errMsg);
    throw err;
  }
}

export default {
  addEntry,
  getHistoryByToken,
  getGlobalHistory,
  getTokenStats,
  ACTION_TYPES
};
