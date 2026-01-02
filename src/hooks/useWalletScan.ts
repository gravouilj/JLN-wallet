import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useEcashWallet } from './useEcashWallet';
import { walletConnectedAtom, selectedProfileAtom, favoriteProfilesAtom } from '../atoms';
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
  [key: string]: any;
}

interface MyToken extends Profile {
  balance?: string;
}

interface TokenBalances {
  [tokenId: string]: string;
}

interface UseWalletScanReturn {
  myTokens: MyToken[];
  tokenBalances: TokenBalances;
  scanLoading: boolean;
  scanError: string | null;
  formatTokenBalance: (balance: string | bigint, decimals?: number) => string;
}

/**
 * useWalletScan Hook
 * Extrait la logique complexe de scan des jetons du wallet
 * Responsabilités:
 * - Scanner tous les tokens du wallet via wallet.listETokens()
 * - Matcher les tokens avec les profils de l'annuaire
 * - Formater les soldes avec les bonnes décimales
 * - Auto-ajouter aux favoris les tokens référencés
 */
export const useWalletScan = (): UseWalletScanReturn => {
  const { wallet } = useEcashWallet();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [selectedProfile] = useAtom(selectedProfileAtom);
  const { profiles } = useProfiles() as { profiles: Profile[] };
  const [favoriteProfileIds, setFavoriteProfileIds] = useAtom(favoriteProfilesAtom);
  
  const [myTokens, setMyTokens] = useState<MyToken[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances>({});
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Format token balance with proper decimals handling
  const formatTokenBalance = useCallback((balance: string | bigint, decimals: number = 0): string => {
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
  }, []);

  // Main scan effect - ONLY in hub view (when selectedProfile is null)
  useEffect(() => {
    // Reset data if not in hub view
    if (!wallet || !walletConnected || selectedProfile !== null) {
      setMyTokens([]);
      setTokenBalances({});
      return;
    }
    
    const runScan = async () => {
      setScanLoading(true);
      setScanError(null);
      
      try {
        console.log('🔍 SCAN GLOBAL: Scan des jetons dans le wallet...');
        
        // 1. Get all tokens from wallet (source of truth)
        const walletTokens = await wallet.listETokens();
        console.log(`📦 ${walletTokens.length} jeton(s) détecté(s) dans le wallet`);
        
        const balances = {};
        const tokensWithBalance = [];
        const newFavoritesToAdd = [];
        
        // 2. Process each token found in wallet
        for (const walletToken of walletTokens) {
          const { tokenId, balance: rawBalance } = walletToken;
          
          // Skip zero balances
          const balanceNum = BigInt(rawBalance || '0');
          if (balanceNum === 0n) continue;
          
          // 3. Get blockchain metadata (ticker, decimals ALWAYS from blockchain)
          let tokenInfo = { 
            genesisInfo: { 
              tokenName: 'Inconnu', 
              tokenTicker: '???', 
              decimals: 0 
            } 
          };
          
          try {
            tokenInfo = await wallet.getTokenInfo(tokenId);
          } catch (e) {
            console.warn(`⚠️ Impossible de récupérer infos blockchain pour ${tokenId}:`, e);
          }
          
          const ticker = tokenInfo.genesisInfo?.tokenTicker || 'UNK';
          const decimals = tokenInfo.genesisInfo?.decimals || 0;
          const blockchainName = tokenInfo.genesisInfo?.tokenName || 'Token Inconnu';
          
          // 4. Search if token exists in profiles.json
          const profileMatch = Array.isArray(profiles) 
            ? profiles.find((p: Profile) => p.tokenId === tokenId)
            : null;
          
          const formattedBalance = formatTokenBalance(rawBalance, decimals);
          balances[tokenId] = formattedBalance;
          
          if (profileMatch) {
            // ✅ Token referenced in profiles.json
            console.log(`✅ Jeton référencé: ${profileMatch.name} (${ticker}) - Solde: ${formattedBalance}`);
            
            tokensWithBalance.push({
              ...profileMatch,
              ticker: ticker, // OVERRIDE: always blockchain
              decimals: decimals, // OVERRIDE: always blockchain
              verified: true,
              balance: formattedBalance
            });
            
            // Auto-add to favorites if not already present
            if (!favoriteProfileIds.includes(profileMatch.id)) {
              console.log(`⭐ Auto-ajout aux favoris: ${profileMatch.name}`);
              newFavoritesToAdd.push(profileMatch.id);
            }
          } else {
            // ⚠️ Token NOT referenced - use blockchain info only
            console.log(`⚠️ Jeton non-référencé détecté: ${tokenId}`);
            console.log(`📡 Infos blockchain: ${blockchainName} (${ticker})`);
            
            tokensWithBalance.push({
              id: tokenId,
              tokenId: tokenId,
              name: blockchainName,
              ticker: ticker,
              decimals: decimals,
              description: 'Jeton non référencé dans l\'annuaire',
              verified: false,
              balance: formattedBalance,
              image: null,
              region: 'Inconnu',
              country: 'Inconnu'
            });
          }
        }
        
        setTokenBalances(balances);
        setMyTokens(tokensWithBalance);
        
        // Update favorites (only for referenced tokens)
        if (newFavoritesToAdd.length > 0) {
          console.log(`💾 Ajout de ${newFavoritesToAdd.length} ferme(s) référencée(s) aux favoris`);
          setFavoriteProfileIds([...favoriteProfileIds, ...newFavoritesToAdd]);
        }
        
        console.log(`📊 RÉSULTAT SCAN: ${tokensWithBalance.length} jeton(s) avec solde positif`);
        console.log(`   - Référencés: ${tokensWithBalance.filter((t: MyToken) => t.verified).length}`);
        console.log(`   - Non-référencés: ${tokensWithBalance.filter((t: MyToken) => !t.verified).length}`);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur lors du scan';
        console.error('❌ Erreur lors du scan des jetons:', error);
        setScanError(errorMsg);
      } finally {
        setScanLoading(false);
      }
    };
    
    runScan();
  }, [wallet, walletConnected, selectedProfile, profiles, favoriteProfileIds, setFavoriteProfileIds, formatTokenBalance]);

  return {
    myTokens,
    tokenBalances,
    scanLoading,
    scanError,
    formatTokenBalance
  };
};
