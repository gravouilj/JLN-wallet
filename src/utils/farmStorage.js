/**
 * Service de gestion locale des fermes et tokens
 * Permet de créer/modifier des fermes avant validation admin
 */

const STORAGE_KEY = 'farmwallet_pending_farms';
const FARMS_STORAGE_KEY = 'farmwallet_farms_data';

/**
 * Sauvegarder une ferme localement (en attente de validation)
 */
export function savePendingFarm(farmData) {
  try {
    const pending = getPendingFarms();
    
    // Vérifier si la ferme existe déjà
    const existingIndex = pending.findIndex(f => 
      f.tokenId === farmData.tokenId || 
      (f.creatorAddress && f.creatorAddress === farmData.creatorAddress)
    );
    
    const farmToSave = {
      ...farmData,
      id: farmData.id || `pending_${Date.now()}`,
      verificationStatus: farmData.verificationStatus || 'unverified',
      verified: false,
      createdAt: farmData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Mise à jour
      pending[existingIndex] = farmToSave;
    } else {
      // Nouvelle ferme
      pending.push(farmToSave);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    console.log('✅ Ferme sauvegardée localement:', farmToSave);
    return farmToSave;
  } catch (error) {
    console.error('❌ Erreur sauvegarde ferme:', error);
    throw error;
  }
}

/**
 * Récupérer toutes les fermes en attente
 */
export function getPendingFarms() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Erreur lecture fermes en attente:', error);
    return [];
  }
}

/**
 * Récupérer une ferme en attente par tokenId ou creatorAddress
 */
export function getPendingFarm(tokenId, creatorAddress) {
  const pending = getPendingFarms();
  return pending.find(f => 
    f.tokenId === tokenId || 
    (creatorAddress && f.creatorAddress === creatorAddress)
  );
}

/**
 * Supprimer une ferme en attente
 */
export function deletePendingFarm(tokenId) {
  try {
    const pending = getPendingFarms();
    const filtered = pending.filter(f => f.tokenId !== tokenId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('✅ Ferme supprimée:', tokenId);
  } catch (error) {
    console.error('❌ Erreur suppression ferme:', error);
  }
}

/**
 * Demander la vérification d'une ferme
 */
export function requestVerification(tokenId) {
  try {
    const pending = getPendingFarms();
    const farm = pending.find(f => f.tokenId === tokenId);
    
    if (!farm) {
      throw new Error('Ferme non trouvée');
    }
    
    farm.verificationStatus = 'pending';
    farm.verificationRequestedAt = new Date().toISOString();
    
    savePendingFarm(farm);
    return farm;
  } catch (error) {
    console.error('❌ Erreur demande vérification:', error);
    throw error;
  }
}

/**
 * Approuver une ferme (admin)
 */
export function approveFarm(tokenId, adminNotes = '') {
  try {
    const pending = getPendingFarms();
    const farm = pending.find(f => f.tokenId === tokenId);
    
    if (!farm) {
      throw new Error('Ferme non trouvée');
    }
    
    farm.verified = true;
    farm.verificationStatus = 'verified';
    farm.verifiedAt = new Date().toISOString();
    farm.adminNotes = adminNotes;
    
    // Ajouter aux fermes vérifiées
    addToVerifiedFarms(farm);
    
    // Supprimer des fermes en attente
    deletePendingFarm(tokenId);
    
    return farm;
  } catch (error) {
    console.error('❌ Erreur approbation ferme:', error);
    throw error;
  }
}

/**
 * Demander plus d'informations (admin)
 */
export function requestMoreInfo(tokenId, message) {
  try {
    const pending = getPendingFarms();
    const farm = pending.find(f => f.tokenId === tokenId);
    
    if (!farm) {
      throw new Error('Ferme non trouvée');
    }
    
    farm.verificationStatus = 'info_requested';
    farm.adminMessage = message;
    farm.adminMessageAt = new Date().toISOString();
    
    savePendingFarm(farm);
    return farm;
  } catch (error) {
    console.error('❌ Erreur demande info:', error);
    throw error;
  }
}

/**
 * Ajouter une ferme aux fermes vérifiées (localStorage)
 */
function addToVerifiedFarms(farm) {
  try {
    const verified = getVerifiedFarms();
    
    // Vérifier si déjà présente
    const existingIndex = verified.findIndex(f => f.tokenId === farm.tokenId);
    
    if (existingIndex >= 0) {
      verified[existingIndex] = farm;
    } else {
      verified.push(farm);
    }
    
    localStorage.setItem(FARMS_STORAGE_KEY, JSON.stringify(verified));
    console.log('✅ Ferme ajoutée aux fermes vérifiées');
  } catch (error) {
    console.error('❌ Erreur ajout ferme vérifiée:', error);
  }
}

/**
 * Récupérer toutes les fermes vérifiées
 */
export function getVerifiedFarms() {
  try {
    const stored = localStorage.getItem(FARMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Erreur lecture fermes vérifiées:', error);
    return [];
  }
}

/**
 * Récupérer toutes les fermes (vérifiées + en attente)
 */
export function getAllFarms() {
  const verified = getVerifiedFarms();
  const pending = getPendingFarms();
  return [...verified, ...pending];
}

/**
 * Récupérer une ferme (vérifiée ou en attente)
 */
export function getFarm(tokenId) {
  const all = getAllFarms();
  return all.find(f => f.tokenId === tokenId);
}
