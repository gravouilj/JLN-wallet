import { supabase } from './supabaseClient';
import { EcashWallet } from './ecashWallet'; // Pour récupérer les infos blockchain live

// --- GESTION DES DONNÉES ---

export const ProfilService = {
  
  // 1. Récupérer la ferme d'un utilisateur (Créateur)
  async getMyProfil(ownerAddress) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('owner_address', ownerAddress)
      .single();
    
    if (error && error.code !== 'PGRST116') console.error("Erreur fetch profil:", error);
    return data || null; // Retourne null si pas encore de profil
  },
  
  // 1b. Alias pour getProfilByOwner (compatibilité)
  async getProfilByOwner(ownerAddress) {
    return this.getMyProfil(ownerAddress);
  },

  // 2. Sauvegarder/Mettre à jour le profil (ManageProfilPage)
  // Gère automatiquement le statut "unverified" si modification
  async saveProfil(profilData, ownerAddress) {
    console.log('🔵 saveProfil appelé avec:', { ownerAddress, profilData });
    
    // Récupérer statut actuel
    const current = await this.getMyProfil(ownerAddress);
    console.log('📊 Profil actuel:', current);
    
    // Si le profil est déjà vérifié, toute modification le repasse en "none" 
    // sauf si c'est juste une mise à jour mineure (logique à affiner)
    // Pour l'instant : Modification = Reset validation (sécurité)
    let newStatus = current?.verification_status || 'none';
    if (current?.verified) {
        newStatus = 'none'; 
    }

    const payload = {
      ...profilData,
      owner_address: ownerAddress,
      updated_at: new Date().toISOString(),
      verification_status: profilData.forceStatus || newStatus,
      verified: (profilData.forceStatus || newStatus) === 'verified',
      status: profilData.status || 'active' // Par défaut active
    };
    
    delete payload.forceStatus;
    
    console.log('📦 Payload Supabase:', payload);

    const { data, error } = await supabase
      .from('profiles')
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
  
  // 2b. Mise à jour partielle d'un profil (sans reset du statut de vérification)
  // Utilisé pour les modifications mineures comme la visibilité des tokens
  async updateProfil(ownerAddress, updates) {
    console.log('🔵 updateProfil appelé avec:', { ownerAddress, updates });
    
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('owner_address', ownerAddress)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase updateProfil:', error);
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
    
    // Récupérer le profil actuel
    const profil = await this.getMyProfil(ownerAddress);
    if (!profil) {
      throw new Error('Profil introuvable pour cet utilisateur');
    }
    
    // Vérifier que le token existe dans le profil
    const tokens = profil.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      throw new Error('Token non trouvé dans ce profil');
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
          }),
          ...(metadata.isLinked !== undefined && { 
            isLinked: metadata.isLinked 
          })
        };
      }
      return t;
    });
    
    // Sauvegarder via updateProfil (pas de reset du statut de vérification)
    const result = await this.updateProfil(ownerAddress, {
      tokens: updatedTokens
    });
    
    console.log('✅ Métadonnées token mises à jour:', result);
    return result;
  },

  // 2d. Mise à jour de l'image d'un token
  // Seul le champ image est modifié avec timestamp
  async updateTokenImage(ownerAddress, tokenId, imageUrl) {
    console.log('🔵 updateTokenImage appelé:', { ownerAddress, tokenId, imageUrl });
    
    // Récupérer le profil actuel
    const profil = await this.getMyProfil(ownerAddress);
    if (!profil) {
      throw new Error('Profil introuvable pour cet utilisateur');
    }
    
    // Vérifier que le token existe dans le profil
    const tokens = profil.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      throw new Error('Token non trouvé dans ce profil');
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
    
    // Sauvegarder via updateProfil (pas de reset du statut de vérification)
    const result = await this.updateProfil(ownerAddress, {
      tokens: updatedTokens
    });
    
    console.log('✅ Image token mise à jour:', result);
    return result;
  },

  // 2d. Mettre à jour l'image d'un token spécifique
  async updateTokenImage(ownerAddress, tokenId, imageUrl) {
    console.log('🖼️ updateTokenImage appelé:', { ownerAddress, tokenId, imageUrl });
    
    // Récupérer le profil actuel
    const profil = await this.getMyProfil(ownerAddress);
    if (!profil) {
      throw new Error('Profil introuvable pour cet utilisateur');
    }
    
    // Vérifier que le token existe dans le profil
    const tokens = profil.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) {
      throw new Error('Token non trouvé dans ce profil');
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
    
    // Sauvegarder via updateProfil
    const result = await this.updateProfil(ownerAddress, {
      tokens: updatedTokens
    });
    
    console.log('✅ Image du token mise à jour:', result);
    return result;
  },

  // 2e. Ajouter un token au tableau tokens d'un profil existant
  // Utilisé pour associer un token créé (Mint Baton) au profil du créateur
  async addTokenToProfil(ownerAddress, tokenData) {
    console.log('🔗 addTokenToProfil appelé:', { ownerAddress, tokenId: tokenData.tokenId });
    
    try {
      // Récupérer le profil actuel
      const profil = await this.getMyProfil(ownerAddress);
      if (!profil) {
        throw new Error('Profil introuvable pour cet utilisateur');
      }
      
      // Vérifier que le token n'est pas déjà dans le tableau
      const tokens = profil.tokens || [];
      const tokenExists = tokens.some(t => t.tokenId === tokenData.tokenId);
      
      if (tokenExists) {
        console.log('ℹ️ Token déjà dans le profil');
        return profil; // Pas d'erreur, juste retourner le profil
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
      
      // Sauvegarder via updateProfil
      const result = await this.updateProfil(ownerAddress, {
        tokens: updatedTokens
      });
      
      console.log('✅ Token ajouté au profil:', tokenData.ticker);
      return result;
      
    } catch (err) {
      console.error('❌ Erreur addTokenToProfil:', err);
      throw err;
    }
  },

  // 2d. Vérifier la disponibilité d'un token avant import
  // Empêche qu'un token soit revendiqué par plusieurs fermes différentes
  async checkTokenAvailability(tokenId, currentUserAddress) {
    console.log('🔍 Vérification disponibilité token:', { tokenId, currentUserAddress });
    
    try {
      // Récupérer TOUTES les profils actifs (exclure seulement deleted et banned)
      const { data: allProfils, error } = await supabase
        .from('profiles')
        .select('*')
        .not('status', 'in', '("deleted","banned")'); // Inclure draft, active, suspended
      
      if (error) {
        console.error('❌ Erreur query profils:', error);
        throw error;
      }
      
      console.log(`📊 ${allProfils?.length || 0} profils à vérifier`);
      
      // Chercher si le token existe dans une autre ferme
      const profilWithToken = allProfils?.find(profil => {
        // Vérifier le token principal
        if (profil.tokenId === tokenId) {
          return true;
        }
        
        // Vérifier dans le tableau tokens (tokens importés)
        if (Array.isArray(profil.tokens)) {
          return profil.tokens.some(t => t.tokenId === tokenId);
        }
        
        return false;
      });
      
      if (!profilWithToken) {
        console.log('✅ Token disponible (non utilisé)');
        return {
          isAvailable: true,
          existingProfilName: null,
          existingProfilOwner: null
        };
      }
      
      // Token trouvé : vérifier si c'est le profil de l'utilisateur actuel
      const isOwnProfil = profilWithToken.owner_address === currentUserAddress;
      
      if (isOwnProfil) {
        console.log('✅ Token disponible (déjà dans votre profil - ré-import autorisé)');
        return {
          isAvailable: true,
          existingProfilName: profilWithToken.name,
          existingProfilOwner: profilWithToken.owner_address,
          isReimport: true
        };
      }
      
      // Token appartient à un autre profil
      console.log('❌ Token déjà utilisé par:', profilWithToken.name);
      return {
        isAvailable: false,
        existingProfilName: profilWithToken.name,
        existingProfilOwner: profilWithToken.owner_address
      };
      
    } catch (err) {
      console.error('❌ Erreur checkTokenAvailability:', err);
      throw err;
    }
  },

  // 3. ADMIN: Récupérer les demandes de vérification (Pending + Info_requested)
  async getPendingProfils() {
    console.log('🔍 getPendingProfils: Tentative de récupération des profils en attente...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('verification_status', ['pending', 'info_requested'])
      .order('updated_at', { ascending: false});

    if (error) {
      console.error('❌ getPendingProfils ERROR:', error);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      throw error;
    }
    
    console.log('✅ getPendingProfils SUCCESS:', {
      count: data?.length || 0,
      profils: data
    });
    
    return data || [];
  },

  // 4. ADMIN: Valider ou Demander Info
  async adminUpdateStatus(profilId, status, message = null) {
    // Récupérer la ferme pour accéder à l'historique actuel
    const { data: profil, error: fetchError } = await supabase
      .from('farms')
      .select('communication_history')
      .eq('id', profilId)
      .single();

    if (fetchError) throw fetchError;

    const currentHistory = profil?.communication_history || [];
    
    // Si c'est un refus et qu'il y a un message, ajouter un message système
    let updatedHistory = currentHistory;
    if (status === 'rejected' && message) {
      const systemMessage = {
        author: 'system',
        message: `🚫 REFUS : ${message}`,
        timestamp: new Date().toISOString()
      };
      updatedHistory = [...currentHistory, systemMessage];
    }

    const update = {
      verification_status: status,
      verified: status === 'verified',
      admin_message: message,
      verified_at: status === 'verified' ? new Date() : null,
      communication_history: updatedHistory
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', profilId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 5. PUBLIC: Annuaire (Toutes les fermes actives, vérifiées ou non)
  async getVerifiedProfils() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'active'); // Afficher toutes les fermes publiques/actives
      
    if (error) throw error;
    return data || [];
  },

  // 6. ADMIN: Tous les tokens (Vue globale)
  // Récupère toutes les fermes qui ont des tokens, même non vérifiées
  async getAllTokensForAdmin() {
    const { data, error } = await supabase
      .from('profiles')
      .select('owner_address, tokens, name')
      .not('tokens', 'is', null);

    if (error) throw error;

    // Aplatir la structure pour avoir une liste de tokens
    let allTokens = [];
    data.forEach(profil => {
        if (Array.isArray(profil.tokens)) {
            profil.tokens.forEach(t => {
                allTokens.push({
                    ...t,
                    profilName: profil.name,
                    ownerAddress: profil.owner_address
                });
            });
        }
    });
    return allTokens;
  },

  // 7. ADMIN: Suspendre une ferme (masquée mais récupérable)
  async suspendProfil(profilId, reason) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: reason
      })
      .eq('id', profilId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 8. ADMIN: Marquer une ferme comme supprimée (soft delete)
  async deleteProfil(profilId, reason) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deletion_reason: reason
      })
      .eq('id', profilId)
      .select()
      .single();

    if (error) throw error;
    
    // Marquer tous les signalements comme resolved
    await supabase
      .from('profil_reports')
      .update({
        admin_status: 'resolved',
        admin_action_at: new Date().toISOString()
      })
      .eq('profil_id', profilId)
      .eq('admin_status', 'pending');

    return data;
  },

  // 9. ADMIN: Réactiver une ferme (annuler suspension/suppression)
  async reactivateProfil(profilId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        suspended_at: null,
        deleted_at: null,
        suspension_reason: null,
        deletion_reason: null
      })
      .eq('id', profilId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 10. ADMIN: Suppression définitive avec blacklist
  async deleteProfilPermanently(profilId, adminAddress) {
    // Récupérer les infos de la ferme avant suppression
    const { data: profil, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profilId)
      .single();

    if (fetchError) throw fetchError;

    // Créer entrée blacklist
    const tokenIds = Array.isArray(profil.tokens) 
      ? profil.tokens.map(t => t.tokenId) 
      : [];

    const { error: blacklistError } = await supabase
      .from('blacklist')
      .insert({
        ecash_address: profil.owner_address,
        token_ids: tokenIds,
        reason: profil.deletion_reason || 'Arnaque confirmée',
        profil_name: profil.name,
        profil_description: profil.description,
        blacklisted_by: adminAddress
      });

    if (blacklistError && blacklistError.code !== '23505') {
      throw blacklistError; // Ignorer erreur si déjà en blacklist
    }

    // Supprimer définitivement
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profilId);

    if (deleteError) throw deleteError;

    return { success: true, profilId };
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
  async reportProfil(profilId, reporterAddress, reason) {
    const { data, error } = await supabase
      .from('profil_reports')
      .insert({
        profil_id: profilId,
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
  async getReportedProfils() {
    console.log('🔍 getReportedProfils: Tentative de récupération des signalements...');
    
    const { data, error } = await supabase
      .from('profil_reports')
      .select(`
        *,
        profils!inner(
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
      console.error('❌ getReportedProfils ERROR:', error);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      throw error;
    }
    
    console.log('✅ getReportedProfils SUCCESS:', {
      count: data?.length || 0,
      reports: data
    });
    
    // Grouper par profil et compter les signalements
    // IMPORTANT: Exclure uniquement les profils avec status 'banned' ou 'deleted'
    // Les profils draft, suspended et actives doivent apparaître
    const profilReports = {};
    data.forEach(report => {
      const profilId = report.profil_id;
      const profil = report.profils;
      
      // Exclure uniquement les profils bannies ou supprimées
      if (profil && profil.status !== 'banned' && profil.status !== 'deleted') {
        if (!profilReports[profilId]) {
          profilReports[profilId] = {
            profil: profil,
            reports: [],
            count: 0
          };
        }
        profilReports[profilId].reports.push(report);
        profilReports[profilId].count++;
      }
    });
    
    const result = Object.values(profilReports).sort((a, b) => b.count - a.count);
    console.log('📊 Profils signalés groupés (hors banned):', result.length);
    
    return result;
  },

  // 15. ADMIN: Ignorer les signalements d'un profil
  async ignoreReports(profilId, adminNote = '') {
    const { data, error } = await supabase
      .from('profil_reports')
      .update({
        admin_status: 'ignored',
        admin_action_at: new Date().toISOString(),
        admin_note: adminNote
      })
      .eq('profil_id', profilId)
      .eq('admin_status', 'pending')
      .select();

    if (error) throw error;
    return data;
  },

  // 16b. Récupérer les signalements d'un profil spécifique
  async getMyProfilReports(profilId, role = 'creator') {
    let query = supabase
      .from('profil_reports')
      .select('*')
      .eq('profil_id', profilId);
    // Si c'est un creator, ne montrer que les signalements visibles
    if (role === 'creator') {
      query = query.eq('visible_to_creator', true);
    }
    // Si c'est un admin, montrer tous les signalements

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ getMyProfilReports ERROR:', error);
      return [];
    }
    
    return data || [];
  },

  // 16c. ADMIN: Basculer la visibilité d'un signalement pour le fermier
  async toggleReportVisibility(reportId, isVisible) {
    const { data, error } = await supabase
      .from('profil_reports')
      .update({ visible_to_creator: isVisible })
      .eq('id', reportId)
      .select();

    if (error) {
      console.error('❌ toggleReportVisibility ERROR:', error);
      throw error;
    }
    
    return data?.[0];
  },

  // 16. ADMIN: Marquer les signalements comme "en investigation"
  async markReportsInvestigating(profilId) {
    const { data, error } = await supabase
      .from('profil_reports')
      .update({
        admin_status: 'investigating',
        admin_action_at: new Date().toISOString()
      })
      .eq('profil_id', profilId)
      .eq('admin_status', 'pending')
      .select();

    if (error) throw error;
    return data;
  },

  // 17. Ajouter un message à l'historique de communication
  async addMessage(ownerAddress, author, message, messageType = 'verification') {
    console.log('💬 addMessage appelé:', { ownerAddress, author, message, messageType });
    
    try {
      // Récupérer le profil actuel
      const profil = await this.getMyProfil(ownerAddress);
      if (!profil) {
        throw new Error('Profil introuvable');
      }
      
      // Récupérer l'historique existant ou créer un nouveau tableau
      const history = profil.communication_history || [];
      
      // Ajouter le nouveau message avec son type
      const newMessage = {
        author: author, // 'admin' ou 'creator'
        message: message,
        type: messageType, // 'verification' ou 'general'
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [...history, newMessage];
      
      // Préparer la mise à jour
      const updateData = {
        communication_history: updatedHistory
      };
      
      // Si c'est un message du créateur, repasser en 'pending' SAUF si déjà 'verified' ou 'banned'
      // ET seulement pour les messages de type 'verification'
      if ((author === 'creator' || author === 'user') && messageType === 'verification') {
        const currentStatus = profil.verification_status;
        // Ne changer le statut que s'il n'est PAS déjà 'verified' ou 'banned'
        if (currentStatus !== 'verified' && currentStatus !== 'banned') {
          updateData.verification_status = 'pending';
          console.log('🔄 Statut repassé en "pending" après message creator');
        } else {
          console.log('✅ Statut maintenu à "' + currentStatus + '" (déjà vérifié ou banni)');
        }
      }
      
      // Mettre à jour le profil
      const result = await this.updateProfil(ownerAddress, updateData);
      
      console.log('✅ Message ajouté à l\'historique');
      return result;
      
    } catch (err) {
      console.error('❌ Erreur addMessage:', err);
      throw err;
    }
  },

  // 18. Suppression soft delete du profil (respecte logique Web3)
  async deleteProfil(ownerAddress) {
    console.log('🗑️ deleteProfil appelé:', { ownerAddress });
    
    try {
      // Récupérer le profil actuel
      const profil = await this.getMyProfil(ownerAddress);
      if (!profil) {
        throw new Error('Profil introuvable');
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
      
      // Mettre à jour le profil
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('owner_address', ownerAddress)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur Supabase deleteProfil:', error);
        throw error;
      }
      
      console.log('✅ Profil supprimé (soft delete):', data);
      return data;
      
    } catch (err) {
      console.error('❌ Erreur deleteProfil:', err);
      throw err;
    }
  },

  // ADMIN: Récupérer les profils bannis
  async getBannedProfils() {
    console.log('🔍 getBannedProfils: Tentative de récupération des profils bannis...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('status', ['banned', 'pending_deletion'])
      .order('updated_at', { ascending: false});

    if (error) {
      console.error('❌ getBannedProfils ERROR:', error);
      throw error;
    }
    
    console.log('✅ getBannedProfils SUCCESS:', {
      count: data?.length || 0
    });
    
    return data || [];
  },

  // ADMIN: Bannir un profil
  async banProfil(profilId, reason) {
    console.log('🛑 banProfil:', { profilId, reason });
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'banned',
        verification_status: 'rejected',
        verified: false,
        admin_message: `🛑 PROFIL BANNI - ${reason}`,
        banned_at: new Date().toISOString(),
        deletion_reason: reason
      })
      .eq('id', profilId)
      .select()
      .single();

    if (error) {
      console.error('❌ banProfil ERROR:', error);
      throw error;
    }
    
    // Marquer tous les signalements comme resolved
    await supabase
      .from('profil_reports')
      .update({
        admin_status: 'resolved',
        admin_action_at: new Date().toISOString()
      })
      .eq('profil_id', profilId)
      .eq('admin_status', 'pending');
    
    console.log('✅ banProfil SUCCESS:', data);
    return data;
  }
};

// Aliases de compatibilité pour la migration farms → profils
export const FarmService = ProfilService;
export const farmService = ProfilService;
export const profilService = ProfilService;

export default ProfilService;