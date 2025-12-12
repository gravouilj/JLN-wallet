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
  
  // 1b. Alias pour getFarmByOwner (compatibilité)
  async getFarmByOwner(ownerAddress) {
    return this.getMyFarm(ownerAddress);
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
  
  // 2b. Mise à jour partielle d'une ferme (sans reset du statut de vérification)
  // Utilisé pour les modifications mineures comme la visibilité des tokens
  async updateFarm(ownerAddress, updates) {
    console.log('🔵 updateFarm appelé avec:', { ownerAddress, updates });
    
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('farms')
      .update(payload)
      .eq('owner_address', ownerAddress)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase updateFarm:', error);
      throw error;
    }
    
    console.log('✅ Mise à jour réussie:', data);
    return data;
  },

  // 2c. Mise à jour des métadonnées d'un token spécifique
  // Seuls les champs modifiables sont mis à jour : purpose, counterpart, isVisible
  // Les données blockchain (ticker, name, etc.) sont IMMUABLES
  async updateTokenMetadata(ownerAddress, tokenId, metadata) {
    console.log('🔵 updateTokenMetadata appelé:', { ownerAddress, tokenId, metadata });
    
    // Récupérer la ferme actuelle
    const farm = await this.getMyFarm(ownerAddress);
    if (!farm) {
      throw new Error('Ferme introuvable pour cet utilisateur');
    }
    
    // Vérifier que le token existe dans la ferme
    const tokens = farm.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      throw new Error('Token non trouvé dans cette ferme');
    }
    
    // Créer le tableau mis à jour avec SEULEMENT les champs modifiables
    const updatedTokens = tokens.map(t => {
      if (t.tokenId === tokenId) {
        return {
          ...t,
          // Champs modifiables uniquement
          ...(metadata.purpose !== undefined && { 
            purpose: metadata.purpose,
            purposeUpdatedAt: new Date().toISOString()
          }),
          ...(metadata.counterpart !== undefined && { 
            counterpart: metadata.counterpart,
            counterpartUpdatedAt: new Date().toISOString()
          }),
          ...(metadata.isVisible !== undefined && { 
            isVisible: metadata.isVisible 
          })
        };
      }
      return t;
    });
    
    // Sauvegarder via updateFarm (pas de reset du statut de vérification)
    const result = await this.updateFarm(ownerAddress, {
      tokens: updatedTokens
    });
    
    console.log('✅ Métadonnées token mises à jour:', result);
    return result;
  },

  // 2d. Mise à jour de l'image d'un token
  // Seul le champ image est modifié avec timestamp
  async updateTokenImage(ownerAddress, tokenId, imageUrl) {
    console.log('🔵 updateTokenImage appelé:', { ownerAddress, tokenId, imageUrl });
    
    // Récupérer la ferme actuelle
    const farm = await this.getMyFarm(ownerAddress);
    if (!farm) {
      throw new Error('Ferme introuvable pour cet utilisateur');
    }
    
    // Vérifier que le token existe dans la ferme
    const tokens = farm.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      throw new Error('Token non trouvé dans cette ferme');
    }
    
    // Créer le tableau mis à jour avec le nouveau champ image
    const updatedTokens = tokens.map(t => {
      if (t.tokenId === tokenId) {
        return {
          ...t,
          image: imageUrl,
          imageUpdatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    
    // Sauvegarder via updateFarm (pas de reset du statut de vérification)
    const result = await this.updateFarm(ownerAddress, {
      tokens: updatedTokens
    });
    
    console.log('✅ Image token mise à jour:', result);
    return result;
  },

  // 2d. Mettre à jour l'image d'un token spécifique
  async updateTokenImage(ownerAddress, tokenId, imageUrl) {
    console.log('🖼️ updateTokenImage appelé:', { ownerAddress, tokenId, imageUrl });
    
    // Récupérer la ferme actuelle
    const farm = await this.getMyFarm(ownerAddress);
    if (!farm) {
      throw new Error('Ferme introuvable pour cet utilisateur');
    }
    
    // Vérifier que le token existe dans la ferme
    const tokens = farm.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      throw new Error('Token non trouvé dans cette ferme');
    }
    
    // Créer le tableau mis à jour avec la nouvelle image
    const updatedTokens = tokens.map(t => {
      if (t.tokenId === tokenId) {
        return {
          ...t,
          image: imageUrl,
          imageUpdatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    
    // Sauvegarder via updateFarm
    const result = await this.updateFarm(ownerAddress, {
      tokens: updatedTokens
    });
    
    console.log('✅ Image du token mise à jour:', result);
    return result;
  },

  // 2e. Ajouter un token au tableau tokens d'une ferme existante
  // Utilisé pour associer un token créé (Mint Baton) à la ferme du créateur
  async addTokenToFarm(ownerAddress, tokenData) {
    console.log('🔗 addTokenToFarm appelé:', { ownerAddress, tokenId: tokenData.tokenId });
    
    try {
      // Récupérer la ferme actuelle
      const farm = await this.getMyFarm(ownerAddress);
      if (!farm) {
        throw new Error('Ferme introuvable pour cet utilisateur');
      }
      
      // Vérifier que le token n'est pas déjà dans le tableau
      const tokens = farm.tokens || [];
      const tokenExists = tokens.some(t => t.tokenId === tokenData.tokenId);
      
      if (tokenExists) {
        console.log('ℹ️ Token déjà dans la ferme');
        return farm; // Pas d'erreur, juste retourner la ferme
      }
      
      // Ajouter le token au tableau
      const updatedTokens = [...tokens, {
        tokenId: tokenData.tokenId,
        ticker: tokenData.ticker,
        name: tokenData.name || tokenData.ticker,
        decimals: tokenData.decimals || 0,
        image: tokenData.image || '',
        purpose: tokenData.purpose || '',
        counterpart: tokenData.counterpart || '',
        isVisible: true, // Par défaut visible
        addedAt: new Date().toISOString()
      }];
      
      // Sauvegarder via updateFarm
      const result = await this.updateFarm(ownerAddress, {
        tokens: updatedTokens
      });
      
      console.log('✅ Token ajouté à la ferme:', tokenData.ticker);
      return result;
      
    } catch (err) {
      console.error('❌ Erreur addTokenToFarm:', err);
      throw err;
    }
  },

  // 2d. Vérifier la disponibilité d'un token avant import
  // Empêche qu'un token soit revendiqué par plusieurs fermes différentes
  async checkTokenAvailability(tokenId, currentUserAddress) {
    console.log('🔍 Vérification disponibilité token:', { tokenId, currentUserAddress });
    
    try {
      // Récupérer TOUTES les fermes actives
      const { data: allFarms, error } = await supabase
        .from('farms')
        .select('*')
        .in('status', ['active', 'hidden', 'pending_deletion']); // Exclure seulement les supprimées
      
      if (error) {
        console.error('❌ Erreur query farms:', error);
        throw error;
      }
      
      console.log(`📊 ${allFarms?.length || 0} fermes à vérifier`);
      
      // Chercher si le token existe dans une autre ferme
      const farmWithToken = allFarms?.find(farm => {
        // Vérifier le token principal
        if (farm.tokenId === tokenId) {
          return true;
        }
        
        // Vérifier dans le tableau tokens (tokens importés)
        if (Array.isArray(farm.tokens)) {
          return farm.tokens.some(t => t.tokenId === tokenId);
        }
        
        return false;
      });
      
      if (!farmWithToken) {
        console.log('✅ Token disponible (non utilisé)');
        return {
          isAvailable: true,
          existingFarmName: null,
          existingFarmOwner: null
        };
      }
      
      // Token trouvé : vérifier si c'est la ferme de l'utilisateur actuel
      const isOwnFarm = farmWithToken.owner_address === currentUserAddress;
      
      if (isOwnFarm) {
        console.log('✅ Token disponible (déjà dans votre ferme - ré-import autorisé)');
        return {
          isAvailable: true,
          existingFarmName: farmWithToken.name,
          existingFarmOwner: farmWithToken.owner_address,
          isReimport: true
        };
      }
      
      // Token appartient à une autre ferme
      console.log('❌ Token déjà utilisé par:', farmWithToken.name);
      return {
        isAvailable: false,
        existingFarmName: farmWithToken.name,
        existingFarmOwner: farmWithToken.owner_address
      };
      
    } catch (err) {
      console.error('❌ Erreur checkTokenAvailability:', err);
      throw err;
    }
  },

  // 3. ADMIN: Récupérer les demandes (Pending + Unverified + Info_requested)
  async getPendingFarms() {
    console.log('🔍 getPendingFarms: Tentative de récupération des fermes en attente...');
    
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .in('verification_status', ['pending', 'info_requested', 'unverified'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ getPendingFarms ERROR:', error);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      throw error;
    }
    
    console.log('✅ getPendingFarms SUCCESS:', {
      count: data?.length || 0,
      farms: data
    });
    
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
    console.log('🔍 getReportedFarms: Tentative de récupération des signalements...');
    
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

    if (error) {
      console.error('❌ getReportedFarms ERROR:', error);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      throw error;
    }
    
    console.log('✅ getReportedFarms SUCCESS:', {
      count: data?.length || 0,
      reports: data
    });
    
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
    
    const result = Object.values(farmReports).sort((a, b) => b.count - a.count);
    console.log('📊 Fermes signalées groupées:', result.length);
    
    return result;
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
  },

  // 17. Ajouter un message à l'historique de communication
  async addMessage(ownerAddress, author, message) {
    console.log('💬 addMessage appelé:', { ownerAddress, author, message });
    
    try {
      // Récupérer la ferme actuelle
      const farm = await this.getMyFarm(ownerAddress);
      if (!farm) {
        throw new Error('Ferme introuvable');
      }
      
      // Récupérer l'historique existant ou créer un nouveau tableau
      const history = farm.communication_history || [];
      
      // Ajouter le nouveau message
      const newMessage = {
        author: author, // 'admin' ou 'creator'
        message: message,
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [...history, newMessage];
      
      // Mettre à jour la ferme
      const result = await this.updateFarm(ownerAddress, {
        communication_history: updatedHistory
      });
      
      console.log('✅ Message ajouté à l\'historique');
      return result;
      
    } catch (err) {
      console.error('❌ Erreur addMessage:', err);
      throw err;
    }
  },

  // 18. Suppression soft delete du profil (respecte logique Web3)
  async deleteFarmProfile(ownerAddress) {
    console.log('🗑️ deleteFarmProfile appelé:', { ownerAddress });
    
    try {
      // Récupérer la ferme actuelle
      const farm = await this.getMyFarm(ownerAddress);
      if (!farm) {
        throw new Error('Ferme introuvable');
      }
      
      // Soft delete : nettoyage des données personnelles, conservation des données techniques
      const payload = {
        // Statut deleted
        status: 'deleted',
        
        // VIDER les données personnelles
        name: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        location_country: null,
        location_region: null,
        location_department: null,
        website: null,
        image_url: null,
        
        // Vider socials (JSONB)
        socials: null,
        
        // Vider certifications (JSONB)
        certifications: null,
        
        // Vider produits et services
        products: null,
        services: null,
        
        // Vider historique communication
        communication_history: null,
        
        // CONSERVER les données techniques (pas dans le payload = pas modifié)
        // - owner_address (conservé automatiquement car clé)
        // - id (conservé automatiquement car clé primaire)
        // - tokens (conservé pour référence blockchain)
        // - created_at (conservé pour historique)
        // - verification_status, verified, verified_at (historique sécurité)
        
        // Timestamp de suppression
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString()
      };
      
      // Mettre à jour la ferme
      const { data, error } = await supabase
        .from('farms')
        .update(payload)
        .eq('owner_address', ownerAddress)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur Supabase deleteFarmProfile:', error);
        throw error;
      }
      
      console.log('✅ Profil supprimé (soft delete):', data);
      return data;
      
    } catch (err) {
      console.error('❌ Erreur deleteFarmProfile:', err);
      throw err;
    }
  },

  // ADMIN: Récupérer les fermes bannies
  async getBannedFarms() {
    console.log('🔍 getBannedFarms: Tentative de récupération des fermes bannies...');
    
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .in('status', ['banned', 'pending_deletion'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ getBannedFarms ERROR:', error);
      throw error;
    }
    
    console.log('✅ getBannedFarms SUCCESS:', {
      count: data?.length || 0
    });
    
    return data || [];
  },

  // ADMIN: Bannir une ferme
  async banFarm(farmId, reason) {
    console.log('🛑 banFarm:', { farmId, reason });
    
    const { data, error } = await supabase
      .from('farms')
      .update({
        status: 'banned',
        verification_status: 'rejected',
        verified: false,
        admin_message: `🛑 FERME BANNIE - ${reason}`,
        banned_at: new Date().toISOString(),
        deletion_reason: reason
      })
      .eq('id', farmId)
      .select()
      .single();

    if (error) {
      console.error('❌ banFarm ERROR:', error);
      throw error;
    }
    
    // Marquer tous les signalements comme resolved
    await supabase
      .from('farm_reports')
      .update({
        admin_status: 'resolved',
        admin_action_at: new Date().toISOString()
      })
      .eq('farm_id', farmId)
      .eq('admin_status', 'pending');
    
    console.log('✅ banFarm SUCCESS:', data);
    return data;
  }
};

export default FarmService;