/**
 * adminService.js
 * 
 * Service pour la gestion des administrateurs/modérateurs (whitelist publique)
 * 
 * Philosophie :
 * - Blocages = Automatiques (système anti-arnaque)
 * - Déblocages = Manuels (validation humaine)
 * - Transparence = Totale (actions publiques)
 */

import { supabase } from './supabaseClient';

/**
 * Vérifier si une adresse wallet est admin actif
 * @param {string} ownerAddress - Adresse wallet à vérifier
 * @returns {Promise<Object>} { isAdmin, role, adminName }
 */
export const checkIsAdmin = async (ownerAddress) => {
  try {
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('wallet_address, admin_name, admin_role, is_active')
      .eq('wallet_address', ownerAddress)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { isAdmin: false, role: null, adminName: null };
    }

    return {
      isAdmin: true,
      role: data.admin_role,
      adminName: data.admin_name
    };
  } catch (error) {
    console.error('❌ Erreur vérification admin:', error);
    return { isAdmin: false, role: null, adminName: null };
  }
};

/**
 * Récupérer la liste publique des admins actifs
 * @returns {Promise<Array>} Liste des admins
 */
export const getAdminList = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('*')
      .eq('is_active', true)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erreur récupération liste admins:', error);
    return [];
  }
};

/**
 * Récupérer l'historique public des actions admin
 * @param {number} limit - Nombre d'actions à récupérer
 * @returns {Promise<Array>} Historique des actions
 */
export const getAdminActionsHistory = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erreur récupération historique admin:', error);
    return [];
  }
};

/**
 * Débloquer un profil (admin uniquement)
 * @param {string} profileId - UUID du profil
 * @param {string} adminWallet - Adresse wallet de l'admin
 * @param {string} reason - Raison du déblocage
 * @returns {Promise<boolean>} true si succès
 */
export const adminUnblockProfile = async (profileId, adminWallet, reason) => {
  try {
    // Vérifier d'abord que l'utilisateur est admin
    const { isAdmin } = await checkIsAdmin(adminWallet);
    if (!isAdmin) {
      console.error('❌ Accès refusé : utilisateur non admin');
      return false;
    }

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('admin_unblock_profile', {
      p_profile_id: profileId,
      p_admin_wallet: adminWallet,
      p_unblock_reason: reason
    });

    if (error) throw error;

    console.log(`✅ Profil ${profileId} débloqué par admin`);
    return true;
  } catch (error) {
    console.error('❌ Erreur déblocage admin:', error);
    return false;
  }
};

/**
 * Bloquer manuellement un profil (cas exceptionnel, admin uniquement)
 * @param {string} profileId - UUID du profil
 * @param {string} adminWallet - Adresse wallet de l'admin
 * @param {string} reason - Raison du blocage
 * @returns {Promise<boolean>} true si succès
 */
export const adminBlockProfile = async (profileId, adminWallet, reason) => {
  try {
    // Vérifier que l'utilisateur est admin
    const { isAdmin } = await checkIsAdmin(adminWallet);
    if (!isAdmin) {
      console.error('❌ Accès refusé : utilisateur non admin');
      return false;
    }

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('admin_block_profile', {
      p_profile_id: profileId,
      p_admin_wallet: adminWallet,
      p_block_reason: reason
    });

    if (error) throw error;

    console.log(`✅ Profil ${profileId} bloqué manuellement par admin`);
    return true;
  } catch (error) {
    console.error('❌ Erreur blocage admin:', error);
    return false;
  }
};

/**
 * Ajouter un nouvel admin (super_admin uniquement)
 * @param {string} newAdminWallet - Adresse du nouvel admin
 * @param {string} newAdminName - Nom public de l'admin
 * @param {string} newAdminRole - 'moderator' ou 'super_admin'
 * @param {string} addedByWallet - Adresse du super_admin qui ajoute
 * @returns {Promise<boolean>} true si succès
 */
export const addAdmin = async (newAdminWallet, newAdminName, newAdminRole, addedByWallet) => {
  try {
    // Vérifier que l'utilisateur est super_admin
    const { role } = await checkIsAdmin(addedByWallet);
    if (role !== 'super_admin') {
      console.error('❌ Accès refusé : seul un super_admin peut ajouter des admins');
      return false;
    }

    const { data, error } = await supabase.rpc('add_admin', {
      p_new_admin_wallet: newAdminWallet,
      p_new_admin_name: newAdminName,
      p_new_admin_role: newAdminRole,
      p_added_by_wallet: addedByWallet
    });

    if (error) throw error;

    console.log(`✅ Admin ${newAdminName} ajouté avec succès`);
    return true;
  } catch (error) {
    console.error('❌ Erreur ajout admin:', error);
    return false;
  }
};

/**
 * Retirer un admin (super_admin uniquement)
 * @param {string} adminWalletToRemove - Adresse de l'admin à retirer
 * @param {string} removedByWallet - Adresse du super_admin qui retire
 * @param {string} reason - Raison du retrait
 * @returns {Promise<boolean>} true si succès
 */
export const removeAdmin = async (adminWalletToRemove, removedByWallet, reason) => {
  try {
    // Vérifier que l'utilisateur est super_admin
    const { role } = await checkIsAdmin(removedByWallet);
    if (role !== 'super_admin') {
      console.error('❌ Accès refusé : seul un super_admin peut retirer des admins');
      return false;
    }

    const { data, error } = await supabase.rpc('remove_admin', {
      p_admin_wallet_to_remove: adminWalletToRemove,
      p_removed_by_wallet: removedByWallet,
      p_reason: reason
    });

    if (error) throw error;

    console.log(`✅ Admin retiré avec succès`);
    return true;
  } catch (error) {
    console.error('❌ Erreur retrait admin:', error);
    return false;
  }
};

export const adminService = {
  checkIsAdmin,
  getAdminList,
  getAdminActionsHistory,
  adminUnblockProfile,
  adminBlockProfile,
  addAdmin,
  removeAdmin
};

export default adminService;
