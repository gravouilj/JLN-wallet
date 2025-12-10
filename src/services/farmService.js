import { supabase } from './supabaseClient';
import { EcashWallet } from './ecashWallet'; // Pour récupérer les infos blockchain live

// --- GESTION DES DONNÉES ---

export const FarmService = {
  
  // 1. Récupérer la ferme d'un utilisateur (Créateur)
  async getMyFarm(ownerAddress) {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('owner_address', ownerAddress)
      .single();
    
    if (error && error.code !== 'PGRST116') console.error("Erreur fetch ferme:", error);
    return data || null; // Retourne null si pas encore de ferme
  },

  // 2. Sauvegarder/Mettre à jour la ferme (ManageFarmPage)
  // Gère automatiquement le statut "unverified" si modification
  async saveFarm(farmData, ownerAddress) {
    console.log('🔵 saveFarm appelé avec:', { ownerAddress, farmData });
    
    // Récupérer statut actuel
    const current = await this.getMyFarm(ownerAddress);
    console.log('📊 Ferme actuelle:', current);
    
    // Si la ferme est déjà vérifiée, toute modification la repasse en "unverified" 
    // sauf si c'est juste une mise à jour mineure (logique à affiner)
    // Pour l'instant : Modification = Reset validation (sécurité)
    let newStatus = current?.verification_status || 'unverified';
    if (current?.verified) {
        newStatus = 'unverified'; 
    }

    const payload = {
      ...farmData,
      owner_address: ownerAddress,
      updated_at: new Date().toISOString(),
      verification_status: farmData.forceStatus || newStatus,
      verified: (farmData.forceStatus || newStatus) === 'verified',
      status: farmData.status || 'active' // Par défaut active
    };
    
    delete payload.forceStatus;
    
    console.log('📦 Payload Supabase:', payload);

    const { data, error } = await supabase
      .from('farms')
      .upsert(payload, { onConflict: 'owner_address' })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      throw error;
    }
    
    console.log('✅ Sauvegarde réussie:', data);
    return data;
  },

  // 3. ADMIN: Récupérer les demandes (Pending + Unverified + Info_requested)
  async getPendingFarms() {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .in('verification_status', ['pending', 'unverified', 'info_requested'])
      .in('status', ['active', 'hidden', 'pending_deletion']) // Inclure tous sauf deleted
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 4. ADMIN: Valider ou Demander Info
  async adminUpdateStatus(farmId, status, message = null) {
    const update = {
      verification_status: status,
      verified: status === 'verified',
      admin_message: message,
      verified_at: status === 'verified' ? new Date() : null
    };

    const { data, error } = await supabase
      .from('farms')
      .update(update)
      .eq('id', farmId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 5. PUBLIC: Annuaire (Seulement les vérifiées ET actives)
  async getVerifiedFarms() {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('verified', true)
      .eq('status', 'active'); // Exclure hidden et pending_deletion
      
    if (error) throw error;
    return data || [];
  },

  // 6. ADMIN: Tous les tokens (Vue globale)
  // Récupère toutes les fermes qui ont des tokens, même non vérifiées
  async getAllTokensForAdmin() {
    const { data, error } = await supabase
      .from('farms')
      .select('owner_address, tokens, name')
      .not('tokens', 'is', null);

    if (error) throw error;

    // Aplatir la structure pour avoir une liste de tokens
    let allTokens = [];
    data.forEach(farm => {
        if (Array.isArray(farm.tokens)) {
            farm.tokens.forEach(t => {
                allTokens.push({
                    ...t,
                    farmName: farm.name,
                    ownerAddress: farm.owner_address
                });
            });
        }
    });
    return allTokens;
  },

  // 7. ADMIN: Masquer une ferme du directory (sans suppression)
  async hideFarm(farmId, reason) {
    const { data, error } = await supabase
      .from('farms')
      .update({
        status: 'hidden',
        hidden_at: new Date().toISOString(),
        deletion_reason: reason
      })
      .eq('id', farmId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 8. ADMIN: Marquer une ferme pour suppression (soft delete - 1 an)
  async markForDeletion(farmId, reason) {
    const { data, error } = await supabase
      .from('farms')
      .update({
        status: 'pending_deletion',
        deletion_requested_at: new Date().toISOString(),
        deletion_reason: reason
      })
      .eq('id', farmId)
      .select()
      .single();

    if (error) throw error;
    
    // Marquer tous les signalements comme resolved
    await supabase
      .from('farm_reports')
      .update({
        admin_status: 'resolved',
        admin_action_at: new Date().toISOString()
      })
      .eq('farm_id', farmId)
      .eq('admin_status', 'pending');

    return data;
  },

  // 9. ADMIN: Réactiver une ferme (annuler suppression/masquage)
  async reactivateFarm(farmId) {
    const { data, error } = await supabase
      .from('farms')
      .update({
        status: 'active',
        hidden_at: null,
        deletion_requested_at: null,
        deletion_reason: null
      })
      .eq('id', farmId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 10. ADMIN: Suppression définitive avec blacklist
  async deleteFarmPermanently(farmId, adminAddress) {
    // Récupérer les infos de la ferme avant suppression
    const { data: farm, error: fetchError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (fetchError) throw fetchError;

    // Créer entrée blacklist
    const tokenIds = Array.isArray(farm.tokens) 
      ? farm.tokens.map(t => t.tokenId) 
      : [];

    const { error: blacklistError } = await supabase
      .from('blacklist')
      .insert({
        ecash_address: farm.owner_address,
        token_ids: tokenIds,
        reason: farm.deletion_reason || 'Arnaque confirmée',
        farm_name: farm.name,
        farm_description: farm.description,
        blacklisted_by: adminAddress
      });

    if (blacklistError && blacklistError.code !== '23505') {
      throw blacklistError; // Ignorer erreur si déjà en blacklist
    }

    // Supprimer définitivement
    const { error: deleteError } = await supabase
      .from('farms')
      .delete()
      .eq('id', farmId);

    if (deleteError) throw deleteError;

    return { success: true, farm };
  },

  // 11. ADMIN: Vérifier si une adresse est blacklistée
  async isBlacklisted(ecashAddress) {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .eq('ecash_address', ecashAddress)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data ? true : false;
  },

  // 12. ADMIN: Récupérer la blacklist
  async getBlacklist() {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .order('blacklisted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // 13. USER: Signaler une ferme
  async reportFarm(farmId, reporterAddress, reason) {
    const { data, error } = await supabase
      .from('farm_reports')
      .insert({
        farm_id: farmId,
        reporter_address: reporterAddress,
        reason: reason,
        admin_status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 14. ADMIN: Récupérer les fermes signalées (seulement pending)
  async getReportedFarms() {
    const { data, error } = await supabase
      .from('farm_reports')
      .select(`
        *,
        farms!inner(
          id,
          name,
          description,
          owner_address,
          verification_status,
          status
        )
      `)
      .eq('admin_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Grouper par ferme et compter les signalements
    const farmReports = {};
    data.forEach(report => {
      const farmId = report.farm_id;
      if (!farmReports[farmId]) {
        farmReports[farmId] = {
          farm: report.farms,
          reports: [],
          count: 0
        };
      }
      farmReports[farmId].reports.push(report);
      farmReports[farmId].count++;
    });
    
    return Object.values(farmReports).sort((a, b) => b.count - a.count);
  },

  // 15. ADMIN: Ignorer les signalements d'une ferme
  async ignoreReports(farmId, adminNote = '') {
    const { data, error } = await supabase
      .from('farm_reports')
      .update({
        admin_status: 'ignored',
        admin_action_at: new Date().toISOString(),
        admin_note: adminNote
      })
      .eq('farm_id', farmId)
      .eq('admin_status', 'pending')
      .select();

    if (error) throw error;
    return data;
  },

  // 16. ADMIN: Marquer les signalements comme "en investigation"
  async markReportsInvestigating(farmId) {
    const { data, error } = await supabase
      .from('farm_reports')
      .update({
        admin_status: 'investigating',
        admin_action_at: new Date().toISOString()
      })
      .eq('farm_id', farmId)
      .eq('admin_status', 'pending')
      .select();

    if (error) throw error;
    return data;
  }
}