/**
 * Service de gestion locale des fermes et tokens
 * Permet de créer/modifier des fermes avant validation admin
 */

const STORAGE_KEY = 'jlnwallet_pending_profils';
const PROFIL_STORAGE_KEY = 'jlnwallet_profils_data';

/**
 * Sauvegarder une ferme localement (en attente de validation)
 */
export function savePendingProfil(profilData) {
  try {
    const pending = getPendingProfils();
    
    // Vérifier si la ferme existe déjà
    const existingIndex = pending.findIndex(f => 
      f.tokenId === profilData.tokenId || 
      (f.creatorAddress && f.creatorAddress === profilData.creatorAddress)
    );
    
    const profilToSave = {
      ...profilData,
      id: profilData.id || `pending_${Date.now()}`,
      verificationStatus: profilData.verificationStatus || 'unverified',
      verified: false,
      createdAt: profilData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Mise à jour
      pending[existingIndex] = profilToSave;
    } else {
      // Nouvelle ferme
      pending.push(profilToSave);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    console.log('✅ Ferme sauvegardée localement:', profilToSave);
    return profilToSave;
  } catch (error) {
    console.error('❌ Erreur sauvegarde ferme:', error);
    throw error;
  }
}

/**
 * Récupérer tous les profils en attente
 */
export function getPendingProfils() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Erreur lecture profils en attente:', error);
    return [];
  }
}

/**
 * Récupérer un profil en attente par tokenId ou creatorAddress
 */
export function getPendingProfil(tokenId, creatorAddress) {
  const pending = getPendingProfils();
  return pending.find(f => 
    f.tokenId === tokenId || 
    (creatorAddress && f.creatorAddress === creatorAddress)
  );
}

/**
 * Supprimer un profil en attente
 */
export function deletePendingProfil(tokenId) {
  try {
    const pending = getPendingProfils();
    const filtered = pending.filter(f => f.tokenId !== tokenId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('✅ Profil supprimé:', tokenId);
  } catch (error) {
    console.error('❌ Erreur suppression profil:', error);
  }
}

/**
 * Demander la vérification d'un profil
 */
export function requestVerification(tokenId) {
  try {
    const pending = getPendingProfils();
    const profil = pending.find(f => f.tokenId === tokenId);
    
    if (!profil) {
      throw new Error('Profil non trouvé');
    }
    
    profil.verificationStatus = 'pending';
    profil.verificationRequestedAt = new Date().toISOString();
    
    savePendingProfil(profil);
    return profil;
  } catch (error) {
    console.error('❌ Erreur demande vérification:', error);
    throw error;
  }
}

/**
 * Approuver un profil (admin)
 */
export function approveProfil(tokenId, adminNotes = '') {
  try {
    const pending = getPendingProfils();
    const profil = pending.find(f => f.tokenId === tokenId);
    
    if (!profil) {
      throw new Error('Profil non trouvé');
    }
    
    profil.verified = true;
    profil.verificationStatus = 'verified';
    profil.verifiedAt = new Date().toISOString();
    profil.adminNotes = adminNotes;
    
    // Ajouter aux profils vérifiés
    addToVerifiedProfils(profil);
    
    // Supprimer des profils en attente
    deletePendingProfil(tokenId);
    
    return profil;
  } catch (error) {
    console.error('❌ Erreur approbation profil:', error);
    throw error;
  }
}

/**
 * Demander plus d'informations (admin)
 */
export function requestMoreInfo(tokenId, message) {
  try {
    const pending = getPendingProfils();
    const profil = pending.find(f => f.tokenId === tokenId);
    
    if (!profil) {
      throw new Error('Profil non trouvé');
    }
    
    profil.verificationStatus = 'info_requested';
    profil.adminMessage = message;
    profil.adminMessageAt = new Date().toISOString();
    
    savePendingProfil(profil);
    return profil;
  } catch (error) {
    console.error('❌ Erreur demande info:', error);
    throw error;
  }
}

/**
 * Ajouter un profil aux profils vérifiés (localStorage)
 */
function addToVerifiedProfils(profil) {
  try {
    const verified = getVerifiedProfils();
    
    // Vérifier si déjà présente
    const existingIndex = verified.findIndex(f => f.tokenId === profil.tokenId);
    
    if (existingIndex >= 0) {
      verified[existingIndex] = profil;
    } else {
      verified.push(profil);
    }
    
    localStorage.setItem(PROFILS_STORAGE_KEY, JSON.stringify(verified));
    console.log('✅ Profil ajouté aux profils vérifiés');
  } catch (error) {
    console.error('❌ Erreur ajout ferme vérifiée:', error);
  }
}

/**
 * Récupérer toutes les fermes vérifiées
 */
export function getVerifiedProfils() {
  try {
    const stored = localStorage.getItem(PROFILS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Erreur lecture profils vérifiés:', error);
    return [];
  }
}

/**
 * Récupérer toutes les fermes (vérifiées + en attente)
 */
export function getAllProfils() {
  const verified = getVerifiedProfils();
  const pending = getPendingProfils();
  return [...verified, ...pending];
}

/**
 * Récupérer un profil (vérifié ou en attente)
 */
export function getProfil(tokenId) {
  const all = getAllProfils();
  return all.find(f => f.tokenId === tokenId);
}
