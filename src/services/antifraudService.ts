/**
 * antifraudService.ts
 *
 * Service centralisé pour la gestion du système anti-arnaque de JLN Wallet.
 *
 * Fonctionnalités :
 * - Détection des signalements actifs
 * - Comptage des détenteurs actifs d'un jeton
 * - Vérification des profils dupliqués (réinscription frauduleuse)
 * - Blocage/déblocage automatique de la création/importation de jetons
 * - Archivage des profils supprimés
 *
 * Règles anti-arnaque :
 * 1. Si créateur a des signalements actifs ET modifie isLinked/isVisible → blocage auto
 * 2. Détenteurs actuels voient toujours le jeton même si isVisible=false ou isLinked=false
 * 3. Profils supprimés avec signalements actifs → archivés pour détection de doublons
 * 4. Déblocage uniquement si tickets résolus par le client
 */

import { supabase } from './supabaseClient';
import adminService from './adminService';
import { EcashWallet } from './ecashWallet';

// Types
interface CreatorBlockStatus {
  isBlocked: boolean;
  reason: string | null;
  blockedAt: string | null;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedFields: string[];
  lastDeletionDate: string | null;
  hadFraudHistory: boolean;
}

interface ToggleValidationResult {
  canToggle: boolean;
  blockReason: string | null;
  activeReports: number;
  activeHolders: number;
  shouldBlock?: boolean;
  showWarning?: boolean;
}

/**
 * Compter les signalements actifs (non résolus) pour un profil
 * @param profileId - UUID du profil
 * @returns Nombre de signalements actifs
 */
export const getActiveReportsCount = async (profileId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('profile_reports')
      .select('*', { count: 'exact', head: true })
      .eq('profil_id', profileId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors du comptage des signalements:', errMsg);
    return 0;
  }
};

/**
 * Compter les tickets non résolus pour un profil
 * @param profileId - UUID du profil
 * @returns Nombre de tickets non résolus
 */
export const getUnresolvedTicketsCount = async (
  profileId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .not('status', 'in', '(resolved,closed)');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors du comptage des tickets:', errMsg);
    return 0;
  }
};

/**
 * Compter les détenteurs actifs d'un jeton (balance > 0)
 * @param wallet - Instance EcashWallet
 * @param tokenId - ID du jeton
 * @returns Nombre de détenteurs actifs
 */
export const getActiveHoldersCount = async (
  wallet: EcashWallet | null,
  tokenId: string
): Promise<number> => {
  try {
    if (!wallet || !tokenId) return 0;

    // Utiliser calculateAirdropHolders avec minEligible=0 pour avoir tous les détenteurs
    // @ts-expect-error calculateAirdropHolders return type not fully typed
    const holders = await wallet.calculateAirdropHolders(tokenId, 0);
    return (holders?.length || 0) as number;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors du comptage des détenteurs:', errMsg);
    return 0;
  }
};

/**
 * Vérifier si le créateur est bloqué pour création/importation
 * @param ownerAddress - Adresse du wallet du créateur
 * @returns Status du blocage
 */
export const checkCreatorBlocked = async (
  ownerAddress: string
): Promise<CreatorBlockStatus> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_blocked_from_creating, blocked_reason, blocked_at')
      .eq('owner_address', ownerAddress)
      .single();

    if (error) throw error;

    return {
      isBlocked: (data as any)?.is_blocked_from_creating || false,
      reason: (data as any)?.blocked_reason || null,
      blockedAt: (data as any)?.blocked_at || null
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors de la vérification du blocage:', errMsg);
    return { isBlocked: false, reason: null, blockedAt: null };
  }
};

/**
 * Bloquer automatiquement un créateur
 * @param profileId - UUID du profil
 * @param reason - Raison du blocage
 * @returns true si succès
 */
export const blockCreator = async (
  profileId: string,
  reason: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_blocked_from_creating: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (error) throw error;

    // Logger dans communication_history
    await supabase
      .from('communication_history')
      .insert({
        profile_id: profileId,
        message: `🚫 Blocage automatique : ${reason}`,
        sender_type: 'system'
      });

    console.log(`🚫 Créateur bloqué : ${reason}`);
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors du blocage du créateur:', errMsg);
    return false;
  }
};

/**
 * Débloquer manuellement un créateur (admin uniquement)
 * @param profileId - UUID du profil
 * @param adminWallet - Adresse wallet de l'admin
 * @param unblockReason - Raison du déblocage
 * @returns true si succès
 */
export const unblockCreator = async (
  profileId: string,
  adminWallet: string,
  unblockReason: string
): Promise<boolean> => {
  // Déléguer à adminService qui vérifie la whitelist
  return await adminService.adminUnblockProfile(
    profileId,
    adminWallet,
    unblockReason
  );
};

/**
 * Vérifier si des données correspondent à un profil supprimé (détection de doublons)
 * @param profileData - Données du profil à vérifier
 * @returns Résultat du test de duplication
 */
export const checkDuplicateProfileData = async (
  profileData: Partial<{
    email: string;
    phone: string;
    businessReg: string;
    postalCode: string;
    streetAddress: string;
  }>
): Promise<DuplicateCheckResult> => {
  try {
    const {
      email,
      phone,
      businessReg,
      postalCode,
      streetAddress
    } = profileData;

    // @ts-expect-error Supabase RPC not fully typed
    const { data, error } = await supabase.rpc(
      'check_duplicate_profile_data',
      {
        p_email: email || null,
        p_phone: phone || null,
        p_business_reg: businessReg || null,
        p_postal_code: postalCode || null,
        p_street_address: streetAddress || null
      }
    );

    if (error) throw error;

    if (data && data.length > 0) {
      const result = data[0] as any;
      return {
        isDuplicate: result.is_duplicate,
        matchedFields: result.matched_fields || [],
        lastDeletionDate: result.last_deletion_date,
        hadFraudHistory: result.had_fraud_history
      };
    }

    return {
      isDuplicate: false,
      matchedFields: [],
      lastDeletionDate: null,
      hadFraudHistory: false
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors de la vérification des doublons:', errMsg);
    return {
      isDuplicate: false,
      matchedFields: [],
      lastDeletionDate: null,
      hadFraudHistory: false
    };
  }
};

/**
 * Valider si le toggle isVisible/isLinked est autorisé
 * @param profileId - UUID du profil
 * @param wallet - Instance EcashWallet
 * @param tokenId - ID du jeton
 * @returns Résultat de la validation
 */
export const validateTokenToggle = async (
  profileId: string,
  wallet: EcashWallet | null,
  tokenId: string
): Promise<ToggleValidationResult> => {
  try {
    // 1. Vérifier les signalements actifs
    const activeReports = await getActiveReportsCount(profileId);

    // 2. Compter les détenteurs actifs
    const activeHolders = await getActiveHoldersCount(wallet, tokenId);

    // 3. Si signalements actifs + détenteurs actifs → BLOQUER
    if (activeReports > 0 && activeHolders > 0) {
      return {
        canToggle: false,
        blockReason: 'signalements_actifs',
        activeReports,
        activeHolders,
        shouldBlock: true // Déclencher le blocage automatique
      };
    }

    // 4. Si détenteurs actifs mais pas de signalements → AVERTIR mais AUTORISER
    if (activeHolders > 0) {
      return {
        canToggle: true,
        blockReason: null,
        activeReports,
        activeHolders,
        showWarning: true // Afficher modal d'avertissement
      };
    }

    // 5. Sinon, autoriser sans avertissement
    return {
      canToggle: true,
      blockReason: null,
      activeReports,
      activeHolders,
      showWarning: false
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors de la validation du toggle:', errMsg);
    // En cas d'erreur, bloquer par précaution
    return {
      canToggle: false,
      blockReason: 'erreur_validation',
      activeReports: 0,
      activeHolders: 0
    };
  }
};

/**
 * Récupérer la liste des profils bloqués (admin uniquement)
 * @returns Liste des profils bloqués
 */
export const getBlockedProfiles = async (): Promise<unknown[]> => {
  try {
    const { data, error } = await supabase
      .from('blocked_profiles_view')
      .select('*')
      .order('blocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur lors de la récupération des profils bloqués:', errMsg);
    return [];
  }
};

/**
 * Vérifier si un détenteur a accès à un jeton (même si isVisible=false ou isLinked=false)
 * @param wallet - Instance EcashWallet
 * @param tokenId - ID du jeton
 * @returns true si le détenteur a des jetons
 */
export const isTokenHolder = async (
  wallet: EcashWallet | null,
  tokenId: string
): Promise<boolean> => {
  try {
    if (!wallet || !tokenId) return false;

    // @ts-expect-error getTokenBalance return type not fully typed
    const balance = await wallet.getTokenBalance(tokenId);
    return BigInt(balance || 0) > 0n;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(
      '❌ Erreur lors de la vérification du statut de détenteur:',
      errMsg
    );
    return false;
  }
};

export const antifraudService = {
  getActiveReportsCount,
  getUnresolvedTicketsCount,
  getActiveHoldersCount,
  checkCreatorBlocked,
  blockCreator,
  unblockCreator,
  checkDuplicateProfileData,
  validateTokenToggle,
  getBlockedProfiles,
  isTokenHolder
};

export default antifraudService;
