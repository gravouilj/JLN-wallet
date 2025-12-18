/**
 * antifraudService.js
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

/**
 * Compter les signalements actifs (non résolus) pour un profil
 * @param {string} profileId - UUID du profil
 * @returns {Promise<number>} Nombre de signalements actifs
 */
export const getActiveReportsCount = async (profileId) => {
  try {
    const { count, error } = await supabase
      .from('profile_reports')
      .select('*', { count: 'exact', head: true })
      .eq('profil_id', profileId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('❌ Erreur lors du comptage des signalements:', error);
    return 0;
  }
};

/**
 * Compter les tickets non résolus pour un profil
 * @param {string} profileId - UUID du profil
 * @returns {Promise<number>} Nombre de tickets non résolus
 */
export const getUnresolvedTicketsCount = async (profileId) => {
  try {
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .not('status', 'in', '(resolved,closed)');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('❌ Erreur lors du comptage des tickets:', error);
    return 0;
  }
};

/**
 * Compter les détenteurs actifs d'un jeton (balance > 0)
 * @param {Object} wallet - Instance EcashWallet
 * @param {string} tokenId - ID du jeton
 * @returns {Promise<number>} Nombre de détenteurs actifs
 */
export const getActiveHoldersCount = async (wallet, tokenId) => {
  try {
    if (!wallet || !tokenId) return 0;
    
    // Utiliser calculateAirdropHolders avec minEligible=0 pour avoir tous les détenteurs
    const holders = await wallet.calculateAirdropHolders(tokenId, 0);
    return holders?.length || 0;
  } catch (error) {
    console.error('❌ Erreur lors du comptage des détenteurs:', error);
    return 0;
  }
};

/**
 * Vérifier si le créateur est bloqué pour création/importation
 * @param {string} ownerAddress - Adresse du wallet du créateur
 * @returns {Promise<Object>} { isBlocked, reason, blockedAt }
 */
export const checkCreatorBlocked = async (ownerAddress) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_blocked_from_creating, blocked_reason, blocked_at')
      .eq('owner_address', ownerAddress)
      .single();

    if (error) throw error;

    return {
      isBlocked: data?.is_blocked_from_creating || false,
      reason: data?.blocked_reason || null,
      blockedAt: data?.blocked_at || null
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du blocage:', error);
    return { isBlocked: false, reason: null, blockedAt: null };
  }
};

/**
 * Bloquer automatiquement un créateur
 * @param {string} profileId - UUID du profil
 * @param {string} reason - Raison du blocage
 * @returns {Promise<boolean>} true si succès
 */
export const blockCreator = async (profileId, reason) => {
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
    console.error('❌ Erreur lors du blocage du créateur:', error);
    return false;
  }
};

/**
 * Débloquer manuellement un créateur (admin uniquement)
 * @param {string} profileId - UUID du profil
 * @param {string} adminWallet - Adresse wallet de l'admin
 * @param {string} unblockReason - Raison du déblocage
 * @returns {Promise<boolean>} true si succès
 */
export const unblockCreator = async (profileId, adminWallet, unblockReason) => {
  // Déléguer à adminService qui vérifie la whitelist
  return await adminService.adminUnblockProfile(profileId, adminWallet, unblockReason);
};

/**
 * Vérifier si des données correspondent à un profil supprimé (détection de doublons)
 * @param {Object} profileData - { email, phone, businessReg, postalCode, streetAddress }
 * @returns {Promise<Object>} { isDuplicate, matchedFields, lastDeletionDate, hadFraudHistory }
 */
export const checkDuplicateProfileData = async (profileData) => {
  try {
    const { email, phone, businessReg, postalCode, streetAddress } = profileData;

    const { data, error } = await supabase.rpc('check_duplicate_profile_data', {
      p_email: email || null,
      p_phone: phone || null,
      p_business_reg: businessReg || null,
      p_postal_code: postalCode || null,
      p_street_address: streetAddress || null
    });

    if (error) throw error;

    if (data && data.length > 0) {
      const result = data[0];
      return {
        isDuplicate: result.is_duplicate,
        matchedFields: result.matched_fields || [],
        lastDeletionDate: result.last_deletion_date,
        hadFraudHistory: result.had_fraud_history
      };
    }

    return { isDuplicate: false, matchedFields: [], lastDeletionDate: null, hadFraudHistory: false };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des doublons:', error);
    return { isDuplicate: false, matchedFields: [], lastDeletionDate: null, hadFraudHistory: false };
  }
};

/**
 * Valider si le toggle isVisible/isLinked est autorisé
 * @param {string} profileId - UUID du profil
 * @param {Object} wallet - Instance EcashWallet
 * @param {string} tokenId - ID du jeton
 * @returns {Promise<Object>} { canToggle, blockReason, activeReports, activeHolders }
 */
export const validateTokenToggle = async (profileId, wallet, tokenId) => {
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
    console.error('❌ Erreur lors de la validation du toggle:', error);
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
 * @returns {Promise<Array>} Liste des profils bloqués
 */
export const getBlockedProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('blocked_profiles_view')
      .select('*')
      .order('blocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des profils bloqués:', error);
    return [];
  }
};

/**
 * Vérifier si un détenteur a accès à un jeton (même si isVisible=false ou isLinked=false)
 * @param {Object} wallet - Instance EcashWallet
 * @param {string} tokenId - ID du jeton
 * @returns {Promise<boolean>} true si le détenteur a des jetons
 */
export const isTokenHolder = async (wallet, tokenId) => {
  try {
    if (!wallet || !tokenId) return false;
    
    const balance = await wallet.getTokenBalance(tokenId);
    return BigInt(balance || 0) > 0n;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut de détenteur:', error);
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
