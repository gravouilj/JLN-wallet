/**
 * useTokenPageData - Loads all token data for TokenPage
 * Handles token info, creator detection, balance, holders count
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useEcashWallet } from '../../../hooks/useEcashWallet';
import { useProfiles, Profile } from '../../../hooks/useProfiles';
import { syncTokenData, getCachedTokenData, cacheTokenData } from '../../../utils/tokenSync';
import { getHistoryByToken } from '../../../services/historyService';

export interface TokenPageData {
  tokenInfo: unknown | null;
  profileInfo: Profile | null;
  myBalance: string;
  isCreator: boolean;
  xecBalance: number;
  holdersCount: number | null;
  history: unknown[];
  tokenDetails: unknown | null;
}

interface UseTokenPageDataOptions {
  tokenId: string | undefined;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook for loading complete token page data
 */
export function useTokenPageData(options: UseTokenPageDataOptions) {
  const { tokenId, autoRefresh = true, refreshInterval = 30000 } = options;
  const { wallet } = useEcashWallet();
  const { profiles, refreshProfiles, loading: loadingProfiles } = useProfiles();

  // Main state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<unknown | null>(null);
  const [profileInfo, setProfileInfo] = useState<Profile | null>(null);
  const [myBalance, setMyBalance] = useState('0');
  const [isCreator, setIsCreator] = useState(false);
  const [xecBalance, setXecBalance] = useState(0);
  const [holdersCount, setHoldersCount] = useState<number | null>(null);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [history, setHistory] = useState<unknown[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Prevent reload loops
  const hasLoadedOnce = useRef(false);

  // Load holders count
  const fetchHolderCount = useCallback(async () => {
    if (!wallet || !tokenId) return;

    try {
      setLoadingHolders(true);
      const tokenUtxos = await wallet.chronik.tokenId(tokenId).utxos();
      
      const holderAddresses = new Set<string>();
      for (const utxo of tokenUtxos.utxos) {
        if (!utxo.token || utxo.token.isMintBaton) continue;
        try {
          const scriptHex = utxo.script;
          const pkhHex = scriptHex.substring(6, 46);
          holderAddresses.add(pkhHex);
        } catch {
          // Skip invalid addresses
        }
      }

      setHoldersCount(holderAddresses.size);
    } catch (err) {
      console.warn('⚠️ Could not count holders:', err);
      setHoldersCount(null);
    } finally {
      setLoadingHolders(false);
    }
  }, [wallet, tokenId]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!tokenId) return;

    setLoadingHistory(true);
    try {
      const historyData = await getHistoryByToken(tokenId);
      setHistory(historyData);
    } catch (err) {
      console.error('❌ Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [tokenId]);

  // Main data loading
  const loadTokenData = useCallback(async () => {
    if (!wallet || !tokenId) {
      setLoading(false);
      return;
    }

    // Wait for profiles to load
    if (loadingProfiles) {
      return;
    }

    // Skip reload if already loaded successfully
    if (hasLoadedOnce.current && profiles.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache for immediate display (optional optimization)
      getCachedTokenData(tokenId);

      // 2. Sync from blockchain (source of truth)
      const dynamicData = await syncTokenData(tokenId, wallet);
      if (dynamicData) {
        cacheTokenData(tokenId, dynamicData);
      }

      // 3. Get full blockchain info
      const info = await wallet.getTokenInfo(tokenId);
      const walletAddress = wallet.getAddress();

      // 4. STRICT CREATOR DETECTION
      const batons = await wallet.getMintBatons();
      const hasMintBaton = batons.some((b: { tokenId: string }) => b.tokenId === tokenId);

      let isTokenCreator = false;
      let myProfile: Profile | null = null;

      // Rule A (Variable supply): Has Mint Baton
      if (hasMintBaton) {
        isTokenCreator = true;
        myProfile = profiles.find((p: Profile) =>
          p.owner_address === walletAddress &&
          (p.tokenId === tokenId || (Array.isArray(p.tokens) && p.tokens.some((t: any) => t.tokenId === tokenId)))
        ) || null;
      }
      // Rule B (Fixed/Imported): Owner of profile containing the token
      else {
        myProfile = profiles.find((p: Profile) =>
          p.owner_address === walletAddress &&
          (p.tokenId === tokenId || (Array.isArray(p.tokens) && p.tokens.some((t: any) => t.tokenId === tokenId)))
        ) || null;

        if (myProfile) {
          isTokenCreator = true;
        }
      }

      setIsCreator(isTokenCreator);

      // 5. Get my balance
      let balance = '0';
      try {
        const balanceData = await wallet.getTokenBalance(tokenId);
        balance = balanceData.balance || '0';
      } catch {
        console.warn('⚠️ Balance not available');
      }

      setTokenInfo(info);
      setProfileInfo(myProfile);
      setMyBalance(balance);

      // 6. Get XEC balance for fees
      const xecBalanceData = await wallet.getBalance();
      setXecBalance(xecBalanceData.balance || 0);

      // 7. Load holders and history
      await fetchHolderCount();
      await loadHistory();

      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('❌ Error loading token:', err);
      setError((err as Error).message || 'Failed to load token data');
    } finally {
      setLoading(false);
    }
  }, [tokenId, wallet, loadingProfiles, profiles, fetchHolderCount, loadHistory]);

  // Initial load
  useEffect(() => {
    loadTokenData();
  }, [loadTokenData]);

  // Auto refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadTokenData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadTokenData]);

  // Refresh function for external use
  const refreshTokenData = useCallback(async () => {
    if (!wallet || !tokenId) return;

    try {
      // Reload balance
      const balanceData = await wallet.getTokenBalance(tokenId);
      setMyBalance(balanceData.balance || '0');

      // Reload token info
      const info = await wallet.chronik.token(tokenId);
      setTokenInfo(info);

      // Reload holders
      await fetchHolderCount();

      // Reload history
      await loadHistory();

      // Sync profiles
      refreshProfiles();
    } catch (err) {
      console.warn('⚠️ Error refreshing:', err);
    }
  }, [wallet, tokenId, fetchHolderCount, loadHistory, refreshProfiles]);

  // Get token details from profile
  const tokenDetails = profileInfo?.tokens?.find((t: any) => t.tokenId === tokenId) || null;

  // Genesis info shortcut
  const genesisInfo = (tokenInfo as { genesisInfo?: Record<string, unknown> })?.genesisInfo || {};

  return {
    // Loading states
    loading,
    loadingHolders,
    loadingHistory,
    loadingProfiles,
    error,

    // Data
    tokenInfo,
    profileInfo,
    myBalance,
    isCreator,
    xecBalance,
    holdersCount,
    history,
    tokenDetails,
    genesisInfo,

    // Computed
    name: (profileInfo?.name || genesisInfo.tokenName || 'Token Non Référencé') as string,
    ticker: (genesisInfo.tokenTicker || 'UNK') as string,
    decimals: (genesisInfo.decimals || 0) as number,
    protocol: (profileInfo?.protocol || (tokenInfo as { protocol?: string })?.protocol || 'ALP') as string,
    isListed: !!profileInfo,

    // Actions
    refreshTokenData,
    loadHistory,
    fetchHolderCount,
    refreshProfiles,
  };
}

export type UseTokenPageDataReturn = ReturnType<typeof useTokenPageData>;
