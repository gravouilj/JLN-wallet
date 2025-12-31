import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

// --- GESTION DES DONNÉES ---

export const ProfilService = {
  
  // 1. Récupérer le profil d'un utilisateur
  async getMyProfil(ownerAddress: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('owner_address', ownerAddress)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') console.error("Erreur fetch profil:", error);
    return data || null;
  },
  
  // 1b. Alias pour getProfilByOwner
  async getProfilByOwner(ownerAddress: string): Promise<UserProfile | null> {
    return this.getMyProfil(ownerAddress);
  },

  // 2. Sauvegarder/Mettre à jour le profil
  async saveProfil(profilData: Partial<UserProfile> & { forceStatus?: string }, ownerAddress: string): Promise<UserProfile> {
    console.log('🔵 saveProfil appelé avec:', { ownerAddress, profilData });
    
    const current = await this.getMyProfil(ownerAddress);
    
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
      status: profilData.status || 'active'
    };
    
    if ('forceStatus' in payload) delete (payload as any).forceStatus;
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'owner_address' })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      throw error;
    }
    return data;
  },
  
  // 2b. Mise à jour partielle
  async updateProfil(ownerAddress: string, updates: Partial<UserProfile>): Promise<UserProfile> {
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
    return data;
  },

  // 2c. Mise à jour métadonnées token
  async updateTokenMetadata(ownerAddress: string, tokenId: string, metadata: { purpose?: string, counterpart?: string, isVisible?: boolean, isLinked?: boolean }): Promise<UserProfile> {
    const profil = await this.getMyProfil(ownerAddress);
    if (!profil) throw new Error('Profil introuvable');
    
    const tokens = profil.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) throw new Error('Token non trouvé');
    
    const updatedTokens = tokens.map(t => {
      if (t.tokenId === tokenId) {
        return {
          ...t,
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
    
    return await this.updateProfil(ownerAddress, { tokens: updatedTokens });
  },

  // 2d. Mise à jour image token
  async updateTokenImage(ownerAddress: string, tokenId: string, imageUrl: string): Promise<UserProfile> {
    console.log('🔵 updateTokenImage appelé:', { ownerAddress, tokenId, imageUrl });
    
    const profil = await this.getMyProfil(ownerAddress);
    if (!profil) throw new Error('Profil introuvable');
    
    const tokens = profil.tokens || [];
    const tokenIndex = tokens.findIndex(t => t.tokenId === tokenId);
    
    if (tokenIndex === -1) throw new Error('Token non trouvé');
    
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
    
    return await this.updateProfil(ownerAddress, { tokens: updatedTokens });
  },

  // 2e. Ajouter un token au profil
  async addTokenToProfil(ownerAddress: string, tokenData: any): Promise<UserProfile> {
    try {
      const profil = await this.getMyProfil(ownerAddress);
      if (!profil) throw new Error('Profil introuvable');
      
      const tokens = profil.tokens || [];
      const tokenExists = tokens.some(t => t.tokenId === tokenData.tokenId);
      
      if (tokenExists) {
        console.log('ℹ️ Token déjà dans le profil');
        return profil;
      }
      
      const updatedTokens = [...tokens, {
        tokenId: tokenData.tokenId,
        ticker: tokenData.ticker,
        name: tokenData.name || tokenData.ticker,
        decimals: tokenData.decimals || 0,
        image: tokenData.image || '',
        purpose: tokenData.purpose || '',
        counterpart: tokenData.counterpart || '',
        isVisible: true,
        addedAt: new Date().toISOString()
      }];
      
      return await this.updateProfil(ownerAddress, { tokens: updatedTokens });
    } catch (err) {
      console.error('❌ Erreur addTokenToProfil:', err);
      throw err;
    }
  },

  // 2f. Vérifier disponibilité token
  async checkTokenAvailability(tokenId: string, currentUserAddress: string): Promise<any> {
    try {
      const { data: allProfils, error } = await supabase
        .from('profiles')
        .select('*')
        .not('status', 'in', '("deleted","banned")');
      
      if (error) throw error;
      
      const profilWithToken = (allProfils || []).find((profil: any) => {
        if (profil.tokenId === tokenId) return true;
        if (Array.isArray(profil.tokens)) {
          return profil.tokens.some((t: any) => t.tokenId === tokenId);
        }
        return false;
      });
      
      if (!profilWithToken) return { isAvailable: true };
      
      const isOwnProfil = profilWithToken.owner_address === currentUserAddress;
      
      if (isOwnProfil) {
        return { isAvailable: true, existingProfilName: profilWithToken.name, isReimport: true };
      }
      
      return { isAvailable: false, existingProfilName: profilWithToken.name, existingFarmName: profilWithToken.name };
      
    } catch (err) {
      console.error('❌ Erreur checkTokenAvailability:', err);
      throw err;
    }
  },

  // 3. ADMIN: Récupérer les demandes de vérification
  async getPendingProfils(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('verification_status', ['pending', 'info_requested'])
      .order('updated_at', { ascending: false});

    if (error) throw error;
    return data || [];
  },

  // 4. ADMIN: Valider ou Demander Info
  async adminUpdateStatus(profilId: string, status: string, message: string | null = null): Promise<UserProfile> {
    const { data: profil, error: fetchError } = await supabase
      .from('profiles')
      .select('communication_history')
      .eq('id', profilId)
      .single();

    if (fetchError) throw fetchError;

    const currentHistory = profil?.communication_history || [];
    let updatedHistory = currentHistory;
    
    if (status === 'rejected' && message) {
      updatedHistory = [...currentHistory, {
        author: 'system',
        message: `🚫 REFUS : ${message}`,
        timestamp: new Date().toISOString()
      }];
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

  // 5. PUBLIC: Annuaire
  async getVerifiedProfils(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'active');
    if (error) throw error;
    return data || [];
  },

  // 6. ADMIN: Tous les tokens (Vue globale)
  async getAllTokensForAdmin(): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('owner_address, tokens, name')
      .not('tokens', 'is', null);

    if (error) throw error;

    const allTokens: any[] = [];
    data.forEach((profil: any) => {
        if (Array.isArray(profil.tokens)) {
            profil.tokens.forEach((t: any) => {
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

  // 7. ADMIN: Suspendre une ferme
  async suspendProfil(profilId: string, reason: string): Promise<UserProfile> {
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

  // Alias pour suspendProfile
  async suspendProfile(profilId: string, reason: string): Promise<UserProfile> {
    return this.suspendProfil(profilId, reason);
  },

  // 8. ADMIN: Marquer comme supprimée (soft delete)
  async deleteProfil(profilId: string, reason: string): Promise<UserProfile> {
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
    
    // Marquer signalements comme résolus
    await supabase
      .from('profile_reports')
      .update({
        admin_status: 'resolved',
        admin_action_at: new Date().toISOString()
      })
      .eq('profil_id', profilId)
      .eq('admin_status', 'pending');

    return data;
  },

  // 9. ADMIN: Réactiver une ferme
  async reactivateProfil(profilId: string): Promise<UserProfile> {
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
  
  // Alias pour reactivateProfile
  async reactivateProfile(profilId: string): Promise<UserProfile> {
    return this.reactivateProfil(profilId);
  },

  // 10. ADMIN: Suppression définitive avec blacklist
  async deleteProfilPermanently(profilId: string, adminAddress: string): Promise<any> {
    const { data: profil, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profilId)
      .single();

    if (fetchError) throw fetchError;

    const tokenIds = Array.isArray(profil.tokens) 
      ? profil.tokens.map((t: any) => t.tokenId) 
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
      throw blacklistError;
    }

    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profilId);

    if (deleteError) throw deleteError;

    return { success: true, profilId };
  },

  // 11. ADMIN: Vérifier blacklist
  async isBlacklisted(ecashAddress: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .eq('ecash_address', ecashAddress)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  // 12. ADMIN: Récupérer la blacklist
  async getBlacklist(): Promise<any[]> {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .order('blacklisted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 13. USER: Signaler une ferme
  async reportProfil(profilId: string, reporterAddress: string, reason: string): Promise<any> {
    const { data, error } = await supabase
      .from('profile_reports')
      .insert({
        profile_id: profilId,
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

  // 14. ADMIN: Récupérer les fermes signalées
  async getReportedProfils(): Promise<any[]> {
    const { data, error } = await supabase
      .from('profile_reports')
      .select(`
        *,
        profiles!inner(
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
    
    // Groupement
    const profilReports: any = {};
    data.forEach((report: any) => {
      const profilId = report.profile_id;
      const profil = report.profiles;
      
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
    
    return Object.values(profilReports).sort((a: any, b: any) => b.count - a.count);
  },

  // 15. ADMIN: Ignorer signalements
  async ignoreReports(profilId: string, adminNote = ''): Promise<any> {
    const { data, error } = await supabase
      .from('profile_reports')
      .update({
        admin_status: 'ignored',
        admin_action_at: new Date().toISOString(),
        admin_note: adminNote
      })
      .eq('profile_id', profilId)
      .eq('admin_status', 'pending')
      .select();

    if (error) throw error;
    return data;
  },
  
  // 16. ADMIN: Marquer investigation
  async markReportsInvestigating(profilId: string): Promise<any> {
    const { data, error } = await supabase
      .from('profile_reports')
      .update({
        admin_status: 'investigating',
        admin_action_at: new Date().toISOString()
      })
      .eq('profile_id', profilId)
      .eq('admin_status', 'pending')
      .select();

    if (error) throw error;
    return data;
  },

  // 16b. Récupérer signalements d'un profil
  async getMyProfilReports(profilId: string, role = 'creator'): Promise<any[]> {
    let query = supabase
      .from('profile_reports')
      .select('*')
      .eq('profile_id', profilId);
      
    if (role === 'creator') {
      query = query.eq('visible_to_creator', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  // 16c. ADMIN: Toggle visibilité signalement
  async toggleReportVisibility(reportId: string, isVisible: boolean): Promise<any> {
    const { data, error } = await supabase
      .from('profile_reports')
      .update({ visible_to_creator: isVisible })
      .eq('id', reportId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // 17. Ajouter un message
  async addMessage(ownerAddress: string, author: string, message: string, messageType = 'verification'): Promise<UserProfile> {
    try {
      const profil = await this.getMyProfil(ownerAddress);
      if (!profil) throw new Error('Profil introuvable');
      
      const history = (profil as any).communication_history || [];
      const newMessage = {
        author: author,
        message: message,
        type: messageType,
        timestamp: new Date().toISOString()
      };
      
      const updateData: any = {
        communication_history: [...history, newMessage]
      };
      
      if ((author === 'creator' || author === 'user') && messageType === 'verification') {
        const currentStatus = profil.verification_status;
        if (currentStatus && currentStatus !== 'verified' && currentStatus !== 'rejected') {
          updateData.verification_status = 'pending';
        }
      }
      
      return await this.updateProfil(ownerAddress, updateData);
    } catch (err) {
      console.error('❌ Erreur addMessage:', err);
      throw err;
    }
  },

  // 18. Suppression intelligente (Corbeille) -- OVERLOAD POUR LE TYPE DE RETOUR
  async deleteProfilSoft(ownerAddress: string): Promise<any> {
    try {
      const profil: any = await this.getMyProfil(ownerAddress);
      if (!profil) throw new Error('Profil introuvable');

      const reports = profil.profile_reports || [];
      const isRisky = reports.some((r: any) => r.admin_status !== 'ignored') || profil.status === 'banned';

      if (isRisky) {
        // SOFT DELETE
        const { data, error } = await supabase
          .from('profiles')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            deletion_reason: 'Suppression demandée (Données conservées)',
          })
          .eq('owner_address', ownerAddress)
          .select()
          .single();
          
        if (error) throw error;
        return { success: true, type: 'soft', message: 'Profil désactivé.', data };
      } else {
        // HARD DELETE
        await supabase.from('profile_reports').delete().eq('profile_id', profil.id);
        const { error } = await supabase.from('profiles').delete().eq('owner_address', ownerAddress);
        if (error) throw error;
        return { success: true, type: 'hard', message: 'Profil supprimé définitivement.' };
      }
    } catch (err) {
      console.error('❌ Erreur deleteProfil:', err);
      throw err;
    }
  },

  // 19. Réactivation (Restauration)
  async reactivateMyProfil(ownerAddress: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'draft',
        verification_status: 'none',
        deleted_at: null,
        deletion_reason: null
      })
      .eq('owner_address', ownerAddress)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 20. ADMIN: Profils bannis
  async getBannedProfils(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('status', ['banned', 'pending_deletion', 'deleted'])
      .order('updated_at', { ascending: false});

    if (error) throw error;
    return data || [];
  },

  // 21. ADMIN: Bannir
  async banProfil(profilId: string, reason: string): Promise<UserProfile> {
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

    if (error) throw error;
    
    await supabase
      .from('profile_reports')
      .update({
        admin_status: 'resolved',
        admin_action_at: new Date().toISOString()
      })
      .eq('profile_id', profilId)
      .eq('admin_status', 'pending');
    
    return data;
  },
  
  // Alias banProfile
  async banProfile(profilId: string, reason: string): Promise<UserProfile> {
    return this.banProfil(profilId, reason);
  }
};

// Aliases de compatibilité
export const FarmService = ProfilService;
export const farmService = ProfilService;
export const profilService = ProfilService;

export default ProfilService;