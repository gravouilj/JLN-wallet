/**
 * Profil Persistence Service
 * 
 * Système de persistance des profils basé sur l'adresse du créateur
 * Compatible multi-navigateurs via verification-requests.json
 * 
 * Architecture:
 * 1. verification-requests.json stocke toutes les demandes (persistant dans l'app)
 * 2. Récupération via creatorAddress lors de l'import mnémonique
 * 3. Blockchain comme source de vérité pour les données token
 */

// Chemins des fichiers
const VERIFICATION_REQUESTS_PATH = '../data/verification-requests.json';

/**
 * Charger toutes les demandes de vérification
 */
export async function loadVerificationRequests() {
  try {
    const module = await import(VERIFICATION_REQUESTS_PATH);
    return module.default || [];
  } catch (err) {
    console.warn('⚠️ Impossible de charger verification-requests.json:', err);
    return [];
  }
}

/**
 * Récupérer les fermes d'un créateur via son adresse
 * @param {string} creatorAddress - Adresse eCash du créateur
 * @returns {Array} Liste des profils du créateur
 */
export async function getProfilesByCreator(creatorAddress) {
  if (!creatorAddress) return [];
  
  const requests = await loadVerificationRequests();
  return requests.filter(req => req.creatorAddress === creatorAddress);
}

/**
 * Récupérer une ferme spécifique par tokenId et adresse créateur
 * @param {string} tokenId - ID du token
 * @param {string} creatorAddress - Adresse du créateur
 * @returns {Object|null} Profil trouvé ou null
 */
export async function getProfileByTokenAndCreator(tokenId, creatorAddress) {
  if (!tokenId || !creatorAddress) return null;
  
  const profiles = await getProfilesByCreator(creatorAddress);
  return profiles.find(f => f.tokenId === tokenId || 
    (f.tokens && f.tokens.some(t => t.tokenId === tokenId))) || null;
}

/**
 * Sauvegarder une demande de vérification
 * Note: Cette fonction retourne les données à écrire dans verification-requests.json
 * L'écriture réelle se fait via un endpoint backend (à implémenter)
 * 
 * @param {Object} profileData - Données du profil
 * @returns {Object} Données formatées
 */
export function prepareProfileVerificationRequest(profileData) {
  const now = new Date().toISOString();
  
  return {
    id: profileData.id || `profile_${Date.now()}`,
    tokenId: profileData.tokenId || (profileData.tokens && profileData.tokens[0]?.tokenId),
    name: profileData.name,
    description: profileData.description,
    country: profileData.country,
    region: profileData.region,
    department: profileData.department,
    address: profileData.address,
    phone: profileData.phone,
    email: profileData.email,
    website: profileData.website,
    otherWebsite: profileData.otherWebsite,
    facebook: profileData.facebook,
    instagram: profileData.instagram,
    tiktok: profileData.tiktok,
    youtube: profileData.youtube,
    whatsapp: profileData.whatsapp,
    telegram: profileData.telegram,
    companyid: profileData.companyid,
    governmentidverificationweblink: profileData.governmentidverificationweblink,
    nationalcertification: profileData.nationalcertification,
    nationalcertificationweblink: profileData.nationalcertificationweblink,
    internationalcertification: profileData.internationalcertification,
    internationalcertificationweblink: profileData.internationalcertificationweblink,
    products: profileData.products || [],
    services: profileData.services || [],
    tokens: profileData.tokens || [],
    image: profileData.image,
    protocol: profileData.protocol || 'ALP',
    creatorAddress: profileData.creatorAddress,
    createdWithJlnWallet: true,
    verified: false,
    verificationStatus: profileData.verificationStatus || 'unverified',
    createdAt: profileData.createdAt || now,
    updatedAt: now,
    verificationRequestedAt: profileData.verificationRequestedAt,
    verifiedAt: profileData.verifiedAt,
    adminNotes: profileData.adminNotes,
    adminMessage: profileData.adminMessage
  };
}

/**
 * Fusionner les données localStorage avec verification-requests.json
 * Pour compatibilité avec les fermes créées avant cette migration
 * 
 * @param {string} creatorAddress - Adresse du créateur
 * @returns {Array} Fermes fusionnées
 */
export async function getMergedProfils(creatorAddress) {
  // 1. Charger depuis verification-requests.json
  const persistentProfils = await getProfilsByCreator(creatorAddress);
  
  // 2. Charger depuis localStorage (anciennes fermes)
  const localPending = JSON.parse(localStorage.getItem('Jlnwallet_pending_profil') || '[]');
  const localVerified = JSON.parse(localStorage.getItem('Jlnwallet_profils_data') || '[]');
  const localProfils = [...localPending, ...localVerified].filter(
    f => f.creatorAddress === creatorAddress
  );
  
  // 3. Fusionner et dédupliquer
  const allProfils = [...persistentProfils];
  
  for (const localProfil of localProfils) {
    const tokenId = localProfil.tokenId || 
      (localProfil.tokens && localProfil.tokens[0]?.tokenId);
    
    const exists = allProfils.some(f => {
      const fTokenId = f.tokenId || (f.tokens && f.tokens[0]?.tokenId);
      return fTokenId === tokenId;
    });
    
    if (!exists && tokenId) {
      allProfils.push(localProfil);
    }
  }
  
  console.log(`✅ Fermes fusionnées pour ${creatorAddress.substring(0, 15)}...:`, {
    persistent: persistentProfils.length,
    localStorage: localProfils.length,
    total: allProfils.length
  });
  
  return allProfils;
}

/**
 * Enrichir une ferme avec les données blockchain en temps réel
 * @param {Object} profil - Données de la ferme
 * @param {Object} wallet - Instance du wallet
 * @returns {Object} Ferme enrichie
 */
export async function enrichFarmWithBlockchainData(profil, wallet) {
  if (!profil || !wallet) return profil;
  
  const tokenId = profil.tokenId || (profil.tokens && profil.tokens[0]?.tokenId);
  if (!tokenId) return profil;
  
  try {
    // Récupérer les infos blockchain
    const tokenInfo = await wallet.getTokenInfo(tokenId);
    const balanceData = await wallet.getTokenBalance(tokenId);
    
    // Vérifier si le créateur possède le mintBaton
    const batons = await wallet.getMintBatons();
    const hasMintBaton = batons.some(b => b.tokenId === tokenId);
    
    // Enrichir le token dans le profil
    const enrichedTokens = profil.tokens ? profil.tokens.map(t => {
      if (t.tokenId === tokenId) {
        return {
          ...t,
          ticker: tokenInfo.genesisInfo?.tokenTicker || t.ticker,
          tokenName: tokenInfo.genesisInfo?.tokenName || t.tokenName,
          decimals: tokenInfo.genesisInfo?.decimals || t.decimals,
          _dynamicData: {
            circulatingSupply: tokenInfo.genesisInfo?.circulatingSupply,
            genesisSupply: tokenInfo.genesisInfo?.genesisSupply,
            balance: balanceData.balance,
            hasMintBaton: hasMintBaton,
            isActive: BigInt(tokenInfo.genesisInfo?.circulatingSupply || '0') > 0n,
            lastUpdated: new Date().toISOString()
          }
        };
      }
      return t;
    }) : [{
      tokenId: tokenId,
      protocol: 'ALP',
      ticker: tokenInfo.genesisInfo?.tokenTicker || 'UNK',
      tokenName: tokenInfo.genesisInfo?.tokenName || 'Unknown Token',
      decimals: tokenInfo.genesisInfo?.decimals || 0,
      _dynamicData: {
        circulatingSupply: tokenInfo.genesisInfo?.circulatingSupply,
        genesisSupply: tokenInfo.genesisInfo?.genesisSupply,
        balance: balanceData.balance,
        hasMintBaton: hasMintBaton,
        isActive: BigInt(tokenInfo.genesisInfo?.circulatingSupply || '0') > 0n,
        lastUpdated: new Date().toISOString()
      }
    }];
    
    return {
      ...profil,
      tokens: enrichedTokens
    };
    
  } catch (err) {
    console.warn(`⚠️ Erreur enrichissement blockchain pour ${tokenId}:`, err);
    return profil;
  }
}

/**
 * Sauvegarder temporairement en localStorage en attendant l'écriture dans verification-requests.json
 * @param {Object} profilData - Données de la ferme
 */
export function saveFarmToLocalStorage(profilData) {
  const pending = JSON.parse(localStorage.getItem('farmwallet_pending_farms') || '[]');
  
  const profilToSave = prepareFarmVerificationRequest(profilData);
  
  // Chercher si la ferme existe déjà
  const tokenId = profilToSave.tokenId || (profilToSave.tokens && profilToSave.tokens[0]?.tokenId);
  const existingIndex = pending.findIndex(f => {
    const fTokenId = f.tokenId || (f.tokens && f.tokens[0]?.tokenId);
    return fTokenId === tokenId && f.creatorAddress === profilToSave.creatorAddress;
  });
  
  if (existingIndex >= 0) {
    pending[existingIndex] = profilToSave;
  } else {
    pending.push(profilToSave);
  }
  
  localStorage.setItem('farmwallet_pending_farms', JSON.stringify(pending));
  console.log('💾 Ferme sauvegardée dans localStorage:', profilToSave.name);
  
  return profilToSave;
}

/**
 * Mettre à jour le statut de vérification d'une ferme
 * @param {string} tokenId - ID du token
 * @param {string} creatorAddress - Adresse du créateur
 * @param {string} newStatus - Nouveau statut
 * @param {Object} additionalData - Données supplémentaires (adminMessage, etc.)
 */
export function updateProfilVerificationStatus(tokenId, creatorAddress, newStatus, additionalData = {}) {
  const pending = JSON.parse(localStorage.getItem('farmwallet_pending_farms') || '[]');
  
  const profilIndex = pending.findIndex(f => {
    const fTokenId = f.tokenId || (f.tokens && f.tokens[0]?.tokenId);
    return fTokenId === tokenId && f.creatorAddress === creatorAddress;
  });
  
  if (profilIndex >= 0) {
    pending[profilIndex] = {
      ...pending[profilIndex],
      verificationStatus: newStatus,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };
    
    if (newStatus === 'pending') {
      pending[profilIndex].verificationRequestedAt = new Date().toISOString();
    }
    
    localStorage.setItem('profilwallet_pending_profil', JSON.stringify(pending));
    console.log(`✅ Statut mis à jour: ${newStatus} pour token ${tokenId.substring(0, 8)}...`);
    
    return pending[profilIndex];
  }
  
  return null;
}
