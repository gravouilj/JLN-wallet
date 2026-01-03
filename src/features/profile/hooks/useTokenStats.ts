/**
 * useTokenStats - Loads token blockchain statistics for profile tokens
 * Extracted from ManageProfilePage for token stats loading logic
 */
import { useState, useCallback, useEffect } from 'react';
import { useEcashWallet } from '../../../hooks';
import type { UserProfile } from '../../../types';

export interface TokenWithStats {
  tokenId: string;
  ticker: string;
  name?: string;
  isVisible: boolean;
  isLinked: boolean;
  // Blockchain stats
  totalSupply?: string;
  circulatingSupply?: string;
  holders?: number;
  decimals?: number;
  loading?: boolean;
  error?: string;
}

interface UseTokenStatsOptions {
  existingProfile: UserProfile | null;
  autoLoad?: boolean;
}

/**
 * Hook for loading token blockchain statistics
 */
export function useTokenStats(options: UseTokenStatsOptions) {
  const { existingProfile, autoLoad = true } = options;
  const { wallet } = useEcashWallet();

  const [tokensWithStats, setTokensWithStats] = useState<TokenWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stats for all profile tokens
  const loadTokensWithStats = useCallback(async () => {
    if (!existingProfile?.tokens?.length || !wallet) {
      setTokensWithStats([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tokensWithStatsPromises = existingProfile.tokens.map(async (token: { tokenId: string; ticker?: string; name?: string; isVisible?: boolean; isLinked?: boolean }) => {
        const baseToken: TokenWithStats = {
          tokenId: token.tokenId,
          ticker: token.ticker || 'UNK',
          name: token.name,
          isVisible: token.isVisible ?? true,
          isLinked: token.isLinked ?? true,
          loading: true,
        };

        try {
          // Fetch token info from blockchain
          const tokenInfo = await wallet.getTokenInfo(token.tokenId);
          
          if (tokenInfo) {
            const decimals = tokenInfo.genesisInfo?.decimals || 0;
            // Use genesisInfo supply data if available
            const genesisSupply = tokenInfo.genesisInfo?.genesisSupply || '0';
            const circulatingSupply = tokenInfo.genesisInfo?.circulatingSupply || genesisSupply;
            
            return {
              ...baseToken,
              name: tokenInfo.genesisInfo?.tokenName || token.name,
              ticker: tokenInfo.genesisInfo?.tokenTicker || token.ticker || 'UNK',
              totalSupply: genesisSupply,
              circulatingSupply: circulatingSupply,
              decimals,
              holders: undefined, // Would require additional API call
              loading: false,
            };
          }
          
          return { ...baseToken, loading: false };
        } catch (err) {
          console.warn(`Failed to load stats for token ${token.tokenId}:`, err);
          return { 
            ...baseToken, 
            loading: false, 
            error: 'Erreur de chargement' 
          };
        }
      });

      const results = await Promise.all(tokensWithStatsPromises);
      setTokensWithStats(results);
    } catch (err) {
      console.error('❌ Error loading token stats:', err);
      setError((err as Error).message || 'Erreur de chargement des jetons');
    } finally {
      setLoading(false);
    }
  }, [existingProfile?.tokens, wallet]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && existingProfile?.tokens?.length) {
      loadTokensWithStats();
    }
  }, [autoLoad, existingProfile?.tokens?.length, loadTokensWithStats]);

  // Update visibility for a specific token
  const updateTokenVisibility = useCallback((tokenId: string, isVisible: boolean) => {
    setTokensWithStats(prev => 
      prev.map(token => 
        token.tokenId === tokenId 
          ? { ...token, isVisible } 
          : token
      )
    );
  }, []);

  // Get a single token's stats
  const getTokenStats = useCallback((tokenId: string): TokenWithStats | undefined => {
    return tokensWithStats.find(t => t.tokenId === tokenId);
  }, [tokensWithStats]);

  return {
    // State
    tokensWithStats,
    loading,
    error,

    // Actions
    loadTokensWithStats,
    updateTokenVisibility,
    getTokenStats,
    
    // Computed
    hasTokens: tokensWithStats.length > 0,
    visibleTokens: tokensWithStats.filter(t => t.isVisible),
    linkedTokens: tokensWithStats.filter(t => t.isLinked),
  };
}

export type UseTokenStatsReturn = ReturnType<typeof useTokenStats>;
