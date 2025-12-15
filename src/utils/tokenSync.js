/**
 * Service de synchronisation des données blockchain vers Supabase
 * Met à jour automatiquement les informations dynamiques des tokens
 */

/**
 * Synchronise les données d'un token depuis la blockchain
 * @param {string} tokenId - ID du token à synchroniser
 * @param {Object} wallet - Instance du wallet ecash-lib
 * @returns {Object} Données synchronisées incluant ticker, name, etc.
 */
export async function syncTokenData(tokenId, wallet) {
  try {
    console.log(`🔄 Synchronisation token ${tokenId.substring(0, 8)}...`);
    
    // Récupérer les infos blockchain complètes
    const info = await wallet.getTokenInfo(tokenId);
    
    const circulatingSupply = info.genesisInfo?.circulatingSupply || '0';
    const genesisSupply = info.genesisInfo?.genesisSupply || '0';
    const decimals = info.genesisInfo?.decimals || 0;
    const ticker = info.genesisInfo?.tokenTicker || 'UNK';
    const tokenName = info.genesisInfo?.tokenName || 'Unknown Token';
    
    // Calculer le statut
    const isActive = BigInt(circulatingSupply) > 0n;
    const isFixed = !info.genesisInfo?.authPubkey || info.genesisInfo.authPubkey === '';
    const isDeleted = isFixed && !isActive && BigInt(genesisSupply) > 0n;
    
    const dynamicData = {
      ticker,
      tokenName,
      circulatingSupply,
      genesisSupply,
      isActive,
      isDeleted,
      decimals,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`✅ Token ${tokenId.substring(0, 8)} synchronisé:`, dynamicData);
    
    return dynamicData;
    
  } catch (error) {
    console.error(`❌ Erreur sync token ${tokenId.substring(0, 8)}:`, error);
    return null;
  }
}

/**
 * Récupère les données dynamiques d'un token depuis le cache local
 * @param {string} tokenId - ID du token
 * @returns {Object|null} Données dynamiques ou null si non trouvé
 */
export function getCachedTokenData(tokenId) {
  try {
    const cached = localStorage.getItem(`token_cache_${tokenId}`);
    if (cached) {
      const data = JSON.parse(cached);
      // Vérifier si le cache est encore valide (< 5 minutes)
      const cacheAge = Date.now() - new Date(data.lastUpdated).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('Erreur lecture cache:', error);
    return null;
  }
}

/**
 * Stocke les données dynamiques dans le cache local
 * @param {string} tokenId - ID du token
 * @param {Object} dynamicData - Données à mettre en cache
 */
export function cacheTokenData(tokenId, dynamicData) {
  try {
    localStorage.setItem(`token_cache_${tokenId}`, JSON.stringify(dynamicData));
  } catch (error) {
    console.error('Erreur écriture cache:', error);
  }
}

/**
 * Hook React pour synchroniser automatiquement les données d'un token
 * @param {string} tokenId - ID du token
 * @param {Object} wallet - Instance du wallet
 * @param {number} intervalMs - Intervalle de synchronisation en ms (défaut: 30000)
 * @returns {Object} Données dynamiques du token
 */
export function useTokenSync(tokenId, wallet, intervalMs = 30000) {
  const [dynamicData, setDynamicData] = React.useState(() => getCachedTokenData(tokenId));
  
  React.useEffect(() => {
    if (!tokenId || !wallet) return;
    
    const sync = async () => {
      const data = await syncTokenData(tokenId, wallet);
      if (data) {
        setDynamicData(data);
        cacheTokenData(tokenId, data);
      }
    };
    
    // Sync immédiat
    sync();
    
    // Sync périodique
    const interval = setInterval(sync, intervalMs);
    
    return () => clearInterval(interval);
  }, [tokenId, wallet, intervalMs]);
  
  return dynamicData;
}
