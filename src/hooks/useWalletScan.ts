import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { 
  walletAtom, 
  walletConnectedAtom, 
  selectedProfileAtom, 
  favoriteProfilesAtom,
  walletTokensAtom,
  tokenInfoCacheAtom,
  walletScanTriggerAtom,
  WalletToken,
} from '../atoms';
import { useProfiles } from './useProfiles';

// Type definitions
interface Profile {
  id: string;
  name: string;
  tokenId: string;
  verified?: boolean;
  ticker?: string;
  creatorProfileId?: string;
  description?: string;
  image?: string | null;
  region?: string;
  country?: string;
  [key: string]: unknown;
}

interface UseWalletScanReturn {
  // State from atom (cached)
  myTokens: WalletToken[];
  tokenBalances: Record<string, string>;
  scanLoading: boolean;
  scanError: string | null;
  lastScanAt: number | null;
  
  // Actions
  triggerScan: () => void;
  formatTokenBalance: (balance: string | bigint, decimals?: number) => string;
}

/**
 * Format token balance with proper decimals handling
 */
const formatTokenBalance = (balance: string | bigint, decimals: number = 0): string => {
  if (!balance) return '0';
  const balanceNum = typeof balance === 'string' ? BigInt(balance) : BigInt(balance.toString());
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = balanceNum / divisor;
  const remainder = balanceNum % divisor;
  
  if (remainder === 0n) {
    return wholePart.toString();
  }
  
  const decimalPart = remainder.toString().padStart(decimals, '0');
  return `${wholePart}.${decimalPart}`.replace(/\.?0+$/, '');
};

/**
 * useWalletScan Hook - Refactoré avec Atom Cache
 * 
 * Architecture:
 * - Les résultats du scan sont stockés dans walletTokensAtom (source de vérité)
 * - Le scan ne se déclenche QUE quand:
 *   1. Wallet connecté ET selectedProfile === null (hub view)
 *   2. Ou manuellement via triggerScan()
 * - Les infos token sont cachées dans tokenInfoCacheAtom pour éviter appels Chronik répétés
 * 
 * @returns État et actions du scan
 */
export const useWalletScan = (): UseWalletScanReturn => {
  const wallet = useAtomValue(walletAtom);
  const walletConnected = useAtomValue(walletConnectedAtom);
  const selectedProfile = useAtomValue(selectedProfileAtom);
  const { profiles } = useProfiles() as { profiles: Profile[] };
  
  const [favoriteProfileIds, setFavoriteProfileIds] = useAtom(favoriteProfilesAtom);
  const [walletTokens, setWalletTokens] = useAtom(walletTokensAtom);
  const [tokenInfoCache, setTokenInfoCache] = useAtom(tokenInfoCacheAtom);
  const scanTrigger = useAtomValue(walletScanTriggerAtom);
  const setScanTrigger = useSetAtom(walletScanTriggerAtom);

  /**
   * Déclencher un scan manuel
   */
  const triggerScan = useCallback(() => {
    setScanTrigger(Date.now());
  }, [setScanTrigger]);

  /**
   * Récupérer les infos token (avec cache)
   */
  const getTokenInfoCached = useCallback(async (tokenId: string) => {
    // Check cache (valid for 5 minutes)
    const cached = tokenInfoCache[tokenId];
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return {
        genesisInfo: {
          tokenName: cached.tokenName,
          tokenTicker: cached.tokenTicker,
          decimals: cached.decimals,
        }
      };
    }

    // Fetch from blockchain
    if (!wallet) return null;
    
    try {
      const info = await wallet.getTokenInfo(tokenId);
      
      // Update cache
      setTokenInfoCache(prev => ({
        ...prev,
        [tokenId]: {
          tokenName: info.genesisInfo?.tokenName || 'Inconnu',
          tokenTicker: info.genesisInfo?.tokenTicker || '???',
          decimals: info.genesisInfo?.decimals || 0,
          fetchedAt: Date.now(),
        }
      }));
      
      return info;
    } catch (e) {
      console.warn(`⚠️ Impossible de récupérer infos blockchain pour ${tokenId}:`, e);
      return null;
    }
  }, [wallet, tokenInfoCache, setTokenInfoCache]);

  /**
   * Exécuter le scan
   */
  const runScan = useCallback(async () => {
    if (!wallet || !walletConnected) return;
    
    setWalletTokens(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔍 SCAN GLOBAL: Scan des jetons dans le wallet...');
      
      // 1. Get all tokens from wallet (source of truth)
      const walletTokensList = await wallet.listETokens();
      console.log(`📦 ${walletTokensList.length} jeton(s) détecté(s) dans le wallet`);
      
      const balances: Record<string, string> = {};
      const tokensWithBalance: WalletToken[] = [];
      const newFavoritesToAdd: string[] = [];
      
      // 2. Process each token found in wallet
      for (const walletToken of walletTokensList) {
        const { tokenId, balance: rawBalance } = walletToken;
        
        // Skip zero balances
        const balanceNum = BigInt(rawBalance || '0');
        if (balanceNum === 0n) continue;
        
        // 3. Get blockchain metadata (with cache)
        const tokenInfo = await getTokenInfoCached(tokenId);
        
        const ticker = tokenInfo?.genesisInfo?.tokenTicker || 'UNK';
        const decimals = tokenInfo?.genesisInfo?.decimals || 0;
        const blockchainName = tokenInfo?.genesisInfo?.tokenName || 'Token Inconnu';
        
        // 4. Search if token exists in profiles
        const profileMatch = Array.isArray(profiles) 
          ? profiles.find((p: Profile) => p.tokenId === tokenId)
          : null;
        
        const formattedBalance = formatTokenBalance(rawBalance, decimals);
        balances[tokenId] = formattedBalance;
        
        if (profileMatch) {
          // ✅ Token referenced in profiles
          console.log(`✅ Jeton référencé: ${profileMatch.name} (${ticker}) - Solde: ${formattedBalance}`);
          
          tokensWithBalance.push({
            tokenId,
            name: profileMatch.name,
            ticker,
            decimals,
            balance: formattedBalance,
            verified: true,
            profileId: profileMatch.id,
            image: profileMatch.image,
          });
          
          // Auto-add to favorites if not already present
          if (!favoriteProfileIds.includes(profileMatch.id)) {
            console.log(`⭐ Auto-ajout aux favoris: ${profileMatch.name}`);
            newFavoritesToAdd.push(profileMatch.id);
          }
        } else {
          // ⚠️ Token NOT referenced - use blockchain info only
          console.log(`⚠️ Jeton non-référencé détecté: ${tokenId}`);
          
          tokensWithBalance.push({
            tokenId,
            name: blockchainName,
            ticker,
            decimals,
            balance: formattedBalance,
            verified: false,
            image: null,
          });
        }
      }
      
      // Update atom state
      setWalletTokens({
        tokens: tokensWithBalance,
        balances,
        loading: false,
        error: null,
        lastScanAt: Date.now(),
      });
      
      // Update favorites (only for referenced tokens)
      if (newFavoritesToAdd.length > 0) {
        console.log(`💾 Ajout de ${newFavoritesToAdd.length} ferme(s) référencée(s) aux favoris`);
        setFavoriteProfileIds([...favoriteProfileIds, ...newFavoritesToAdd]);
      }
      
      console.log(`📊 RÉSULTAT SCAN: ${tokensWithBalance.length} jeton(s) avec solde positif`);
      console.log(`   - Référencés: ${tokensWithBalance.filter(t => t.verified).length}`);
      console.log(`   - Non-référencés: ${tokensWithBalance.filter(t => !t.verified).length}`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors du scan';
      console.error('❌ Erreur lors du scan des jetons:', error);
      setWalletTokens(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
    }
  }, [wallet, walletConnected, profiles, favoriteProfileIds, setFavoriteProfileIds, setWalletTokens, getTokenInfoCached]);

  // Main scan effect - ONLY in hub view (when selectedProfile is null)
  useEffect(() => {
    // Reset if wallet not connected
    if (!wallet || !walletConnected) {
      if (walletTokens.tokens.length > 0) {
        setWalletTokens({
          tokens: [],
          balances: {},
          loading: false,
          error: null,
          lastScanAt: null,
        });
      }
      return;
    }
    
    // Only scan in hub view OR on manual trigger
    if (selectedProfile !== null && scanTrigger === 0) {
      return;
    }
    
    // Debounce
    const timeoutId = setTimeout(() => {
      runScan();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, walletConnected, selectedProfile, scanTrigger, profiles?.length]);

  return {
    myTokens: walletTokens.tokens,
    tokenBalances: walletTokens.balances,
    scanLoading: walletTokens.loading,
    scanError: walletTokens.error,
    lastScanAt: walletTokens.lastScanAt,
    triggerScan,
    formatTokenBalance,
  };
};

export default useWalletScan;
