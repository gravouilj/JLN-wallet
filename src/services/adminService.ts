/**
 * adminService.ts
 *
 * Service pour la gestion des administrateurs/modérateurs (whitelist publique)
 *
 * Philosophie :
 * - Blocages = Automatiques (système anti-arnaque)
 * - Déblocages = Manuels (validation humaine)
 * - Transparence = Totale (actions publiques)
 */

import { supabase } from './supabaseClient';

// Types
interface AdminCheckResult {
  isAdmin: boolean;
  role: string | null;
  adminName: string | null;
}

interface AdminRecord {
  wallet_address: string;
  admin_name: string;
  admin_role: string;
  is_active: boolean;
  added_at: string;
}

interface AdminAction {
  id: string;
  created_at: string;
  admin_wallet: string;
  action_type: string;
  reason: string;
}

/**
 * Vérifier si une adresse wallet est admin actif
 * @param ownerAddress - Adresse wallet à vérifier
 * @returns Promise avec { isAdmin, role, adminName }
 */
export const checkIsAdmin = async (
  ownerAddress: string
): Promise<AdminCheckResult> => {
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur vérification admin:', errMsg);
    return { isAdmin: false, role: null, adminName: null };
  }
};

/**
 * Récupérer la liste publique des admins actifs
 * @returns Promise avec liste des admins
 */
export const getAdminList = async (): Promise<AdminRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('*')
      .eq('is_active', true)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return (data as AdminRecord[]) || [];
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur récupération liste admins:', errMsg);
    return [];
  }
};

/**
 * Récupérer l'historique public des actions admin
 * @param limit - Nombre d'actions à récupérer
 * @returns Promise avec historique des actions
 */
export const getAdminActionsHistory = async (
  limit: number = 50
): Promise<AdminAction[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as AdminAction[]) || [];
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur récupération historique admin:', errMsg);
    return [];
  }
};

/**
 * Débloquer un profil (admin uniquement)
 * @param profileId - UUID du profil
 * @param adminWallet - Adresse wallet de l'admin
 * @param reason - Raison du déblocage
 * @returns Promise<true> si succès
 */
export const adminUnblockProfile = async (
  profileId: string,
  adminWallet: string,
  reason: string
): Promise<boolean> => {
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur déblocage admin:', errMsg);
    return false;
  }
};

/**
 * Bloquer manuellement un profil (cas exceptionnel, admin uniquement)
 * @param profileId - UUID du profil
 * @param adminWallet - Adresse wallet de l'admin
 * @param reason - Raison du blocage
 * @returns Promise<true> si succès
 */
export const adminBlockProfile = async (
  profileId: string,
  adminWallet: string,
  reason: string
): Promise<boolean> => {
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur blocage admin:', errMsg);
    return false;
  }
};

/**
 * Ajouter un nouvel admin (super_admin uniquement)
 * @param newAdminWallet - Adresse du nouvel admin
 * @param newAdminName - Nom public de l'admin
 * @param newAdminRole - 'moderator' ou 'super_admin'
 * @param addedByWallet - Adresse du super_admin qui ajoute
 * @returns Promise<true> si succès
 */
export const addAdmin = async (
  newAdminWallet: string,
  newAdminName: string,
  newAdminRole: string,
  addedByWallet: string
): Promise<boolean> => {
  try {
    // Vérifier que l'utilisateur est super_admin
    const { role } = await checkIsAdmin(addedByWallet);
    if (role !== 'super_admin') {
      console.error(
        '❌ Accès refusé : seul un super_admin peut ajouter des admins'
      );
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur ajout admin:', errMsg);
    return false;
  }
};

/**
 * Retirer un admin (super_admin uniquement)
 * @param adminWalletToRemove - Adresse de l'admin à retirer
 * @param removedByWallet - Adresse du super_admin qui retire
 * @param reason - Raison du retrait
 * @returns Promise<true> si succès
 */
export const removeAdmin = async (
  adminWalletToRemove: string,
  removedByWallet: string,
  reason: string
): Promise<boolean> => {
  try {
    // Vérifier que l'utilisateur est super_admin
    const { role } = await checkIsAdmin(removedByWallet);
    if (role !== 'super_admin') {
      console.error(
        '❌ Accès refusé : seul un super_admin peut retirer des admins'
      );
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur retrait admin:', errMsg);
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
