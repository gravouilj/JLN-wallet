import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  walletAtom,
  walletConnectedAtom,
  balanceAtom,
  totalBalanceAtom,
  balanceBreakdownAtom,
  balanceRefreshTriggerAtom,
  tokenRefreshTriggerAtom,
} from '../atoms';

const useBalance = (refreshInterval = 10000) => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [balance, setBalance] = useAtom(balanceAtom);
  const [totalBalance, setTotalBalance] = useAtom(totalBalanceAtom);
  const [balanceBreakdown, setBalanceBreakdown] = useAtom(balanceBreakdownAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  const [, setTokenRefreshTrigger] = useAtom(tokenRefreshTriggerAtom);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Memoize fetchBalance to avoid creating a new function on each render
  const fetchBalance = useCallback(async () => {
    // Always set loading true first, even if we return early
    setLoading(true);
    setError(null);

    if (!wallet || !walletConnected) {
      // Reset all balance atoms if wallet is not available
      setBalance(0);
      setTotalBalance(0);
      setBalanceBreakdown({
        spendableBalance: 0,
        totalBalance: 0,
        tokenDustValue: 0,
        pureXecUtxos: 0,
        tokenUtxos: 0
      });
      setLoading(false);
      return;
    }

    try {
      // Get balance data from wallet service (already fetches UTXOs via Chronik)
      const balanceData = await wallet.getBalance();
      
      // Use the detailed balance breakdown from the service
      const xecBalance = balanceData.balance; // Spendable XEC (no token dust)
      const totalBalance = balanceData.totalBalance; // Total including token dust
      
      // Update balance breakdown atom
      setBalanceBreakdown(balanceData.balanceBreakdown);
      
      // Update total balance atom
      setTotalBalance(totalBalance);

      // Defensive check: ensure wallet is still connected after API call
      if (!wallet || !walletConnected) {
        console.warn('Wallet became disconnected during balance fetch');
        return;
      }

      setBalance(xecBalance || 0); // Update atom with XEC balance

      // Trigger token refresh after balance/UTXO update
      setTokenRefreshTrigger(Date.now());

      // Add minimum loading time to make it visible
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('Failed to fetch XEC balance:', error);
      setError(error.message);

      // Reset all balance atoms in case of an error
      setBalance(0);
      setTotalBalance(0);
      setBalanceBreakdown({
        spendableBalance: 0,
        totalBalance: 0,
        tokenDustValue: 0,
        pureXecUtxos: 0,
        tokenUtxos: 0
      });

      // Don't disconnect wallet on balance fetch errors - just log and continue
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected, setBalance, setTotalBalance, setBalanceBreakdown, setTokenRefreshTrigger]);

  useEffect(() => {
    if (walletConnected) {
      fetchBalance(); // Fetch balance when wallet connects
      const interval = setInterval(fetchBalance, refreshInterval); // Refresh every 10 seconds
      return () => clearInterval(interval); // Cleanup interval on unmount or disconnect
    }
  }, [walletConnected, fetchBalance, refreshInterval]);

  // Separate effect for manual refresh trigger
  useEffect(() => {
    if (walletConnected && triggerRefresh > 0) {
      fetchBalance(); // Only call fetchBalance, don't set up new interval
    }
  }, [triggerRefresh, walletConnected, fetchBalance]);

  return {
    balance,
    totalBalance,
    balanceBreakdown,
    loading,
    error,
    refreshBalance: fetchBalance
  };
};

export default useBalance;
