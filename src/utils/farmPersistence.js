/**
 * Farm Persistence Service
 * 
 * Système de persistance des fermes basé sur l'adresse du créateur
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
 * @returns {Array} Liste des fermes du créateur
 */
export async function getFarmsByCreator(creatorAddress) {
  if (!creatorAddress) return [];
  
  const requests = await loadVerificationRequests();
  return requests.filter(req => req.creatorAddress === creatorAddress);
}

/**
 * Récupérer une ferme spécifique par tokenId et adresse créateur
 * @param {string} tokenId - ID du token
 * @param {string} creatorAddress - Adresse du créateur
 * @returns {Object|null} Ferme trouvée ou null
 */
export async function getFarmByTokenAndCreator(tokenId, creatorAddress) {
  if (!tokenId || !creatorAddress) return null;
  
  const farms = await getFarmsByCreator(creatorAddress);
  return farms.find(f => f.tokenId === tokenId || 
    (f.tokens && f.tokens.some(t => t.tokenId === tokenId))) || null;
}

/**
 * Sauvegarder une demande de vérification
 * Note: Cette fonction retourne les données à écrire dans verification-requests.json
 * L'écriture réelle se fait via un endpoint backend (à implémenter)
 * 
 * @param {Object} farmData - Données de la ferme
 * @returns {Object} Données formatées
 */
export function prepareFarmVerificationRequest(farmData) {
  const now = new Date().toISOString();
  
  return {
    id: farmData.id || `farm_${Date.now()}`,
    tokenId: farmData.tokenId || (farmData.tokens && farmData.tokens[0]?.tokenId),
    name: farmData.name,
    description: farmData.description,
    country: farmData.country,
    region: farmData.region,
    department: farmData.department,
    address: farmData.address,
    phone: farmData.phone,
    email: farmData.email,
    website: farmData.website,
    otherWebsite: farmData.otherWebsite,
    facebook: farmData.facebook,
    instagram: farmData.instagram,
    tiktok: farmData.tiktok,
    youtube: farmData.youtube,
    whatsapp: farmData.whatsapp,
    telegram: farmData.telegram,
    companyid: farmData.companyid,
    governmentidverificationweblink: farmData.governmentidverificationweblink,
    nationalcertification: farmData.nationalcertification,
    nationalcertificationweblink: farmData.nationalcertificationweblink,
    internationalcertification: farmData.internationalcertification,
    internationalcertificationweblink: farmData.internationalcertificationweblink,
    products: farmData.products || [],
    services: farmData.services || [],
    tokens: farmData.tokens || [],
    image: farmData.image,
    protocol: farmData.protocol || 'ALP',
    creatorAddress: farmData.creatorAddress,
    createdWithFarmWallet: true,
    verified: false,
    verificationStatus: farmData.verificationStatus || 'unverified',
    createdAt: farmData.createdAt || now,
    updatedAt: now,
    verificationRequestedAt: farmData.verificationRequestedAt,
    verifiedAt: farmData.verifiedAt,
    adminNotes: farmData.adminNotes,
    adminMessage: farmData.adminMessage
  };
}

/**
 * Fusionner les données localStorage avec verification-requests.json
 * Pour compatibilité avec les fermes créées avant cette migration
 * 
 * @param {string} creatorAddress - Adresse du créateur
 * @returns {Array} Fermes fusionnées
 */
export async function getMergedFarms(creatorAddress) {
  // 1. Charger depuis verification-requests.json
  const persistentFarms = await getFarmsByCreator(creatorAddress);
  
  // 2. Charger depuis localStorage (anciennes fermes)
  const localPending = JSON.parse(localStorage.getItem('farmwallet_pending_farms') || '[]');
  const localVerified = JSON.parse(localStorage.getItem('farmwallet_farms_data') || '[]');
  const localFarms = [...localPending, ...localVerified].filter(
    f => f.creatorAddress === creatorAddress
  );
  
  // 3. Fusionner et dédupliquer
  const allFarms = [...persistentFarms];
  
  for (const localFarm of localFarms) {
    const tokenId = localFarm.tokenId || 
      (localFarm.tokens && localFarm.tokens[0]?.tokenId);
    
    const exists = allFarms.some(f => {
      const fTokenId = f.tokenId || (f.tokens && f.tokens[0]?.tokenId);
      return fTokenId === tokenId;
    });
    
    if (!exists && tokenId) {
      allFarms.push(localFarm);
    }
  }
  
  console.log(`✅ Fermes fusionnées pour ${creatorAddress.substring(0, 15)}...:`, {
    persistent: persistentFarms.length,
    localStorage: localFarms.length,
    total: allFarms.length
  });
  
  return allFarms;
}

/**
 * Enrichir une ferme avec les données blockchain en temps réel
 * @param {Object} farm - Données de la ferme
 * @param {Object} wallet - Instance du wallet
 * @returns {Object} Ferme enrichie
 */
export async function enrichFarmWithBlockchainData(farm, wallet) {
  if (!farm || !wallet) return farm;
  
  const tokenId = farm.tokenId || (farm.tokens && farm.tokens[0]?.tokenId);
  if (!tokenId) return farm;
  
  try {
    // Récupérer les infos blockchain
    const tokenInfo = await wallet.getTokenInfo(tokenId);
    const balanceData = await wallet.getTokenBalance(tokenId);
    
    // Vérifier si le créateur possède le mintBaton
    const batons = await wallet.getMintBatons();
    const hasMintBaton = batons.some(b => b.tokenId === tokenId);
    
    // Enrichir le token dans la ferme
    const enrichedTokens = farm.tokens ? farm.tokens.map(t => {
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
      ...farm,
      tokens: enrichedTokens
    };
    
  } catch (err) {
    console.warn(`⚠️ Erreur enrichissement blockchain pour ${tokenId}:`, err);
    return farm;
  }
}

/**
 * Sauvegarder temporairement en localStorage en attendant l'écriture dans verification-requests.json
 * @param {Object} farmData - Données de la ferme
 */
export function saveFarmToLocalStorage(farmData) {
  const pending = JSON.parse(localStorage.getItem('farmwallet_pending_farms') || '[]');
  
  const farmToSave = prepareFarmVerificationRequest(farmData);
  
  // Chercher si la ferme existe déjà
  const tokenId = farmToSave.tokenId || (farmToSave.tokens && farmToSave.tokens[0]?.tokenId);
  const existingIndex = pending.findIndex(f => {
    const fTokenId = f.tokenId || (f.tokens && f.tokens[0]?.tokenId);
    return fTokenId === tokenId && f.creatorAddress === farmToSave.creatorAddress;
  });
  
  if (existingIndex >= 0) {
    pending[existingIndex] = farmToSave;
  } else {
    pending.push(farmToSave);
  }
  
  localStorage.setItem('farmwallet_pending_farms', JSON.stringify(pending));
  console.log('💾 Ferme sauvegardée dans localStorage:', farmToSave.name);
  
  return farmToSave;
}

/**
 * Mettre à jour le statut de vérification d'une ferme
 * @param {string} tokenId - ID du token
 * @param {string} creatorAddress - Adresse du créateur
 * @param {string} newStatus - Nouveau statut
 * @param {Object} additionalData - Données supplémentaires (adminMessage, etc.)
 */
export function updateFarmVerificationStatus(tokenId, creatorAddress, newStatus, additionalData = {}) {
  const pending = JSON.parse(localStorage.getItem('farmwallet_pending_farms') || '[]');
  
  const farmIndex = pending.findIndex(f => {
    const fTokenId = f.tokenId || (f.tokens && f.tokens[0]?.tokenId);
    return fTokenId === tokenId && f.creatorAddress === creatorAddress;
  });
  
  if (farmIndex >= 0) {
    pending[farmIndex] = {
      ...pending[farmIndex],
      verificationStatus: newStatus,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };
    
    if (newStatus === 'pending') {
      pending[farmIndex].verificationRequestedAt = new Date().toISOString();
    }
    
    localStorage.setItem('farmwallet_pending_farms', JSON.stringify(pending));
    console.log(`✅ Statut mis à jour: ${newStatus} pour token ${tokenId.substring(0, 8)}...`);
    
    return pending[farmIndex];
  }
  
  return null;
}
