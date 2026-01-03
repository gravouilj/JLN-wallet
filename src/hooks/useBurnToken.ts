import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
import { CommandHookState, initialCommandState, loadingState, errorState, successState } from './types';

/**
 * Custom Hook pour la destruction de tokens
 * Gère la validation du montant et l'appel wallet
 */
export const useBurnToken = (tokenId: string, decimals: number = 0) => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<CommandHookState>(initialCommandState);

  const execute = useCallback(
    async (amount: string): Promise<string | null> => {
      setState(loadingState());

      // Validation du montant
      if (!amount.trim()) {
        setState(errorState('Montant requis'));
        return null;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setState(errorState('Montant invalide'));
        return null;
      }

      if (!wallet) {
        setState(errorState('Wallet non connecté'));
        return null;
      }

      try {
        const result = await wallet.burnToken(tokenId, amountNum, decimals);

        setState(successState(result.txid));
        return result.txid;
      } catch (err: any) {
        const errorMsg = err.message || 'Erreur lors de la destruction';
        console.error('[useBurnToken]', errorMsg, err);
        setState(errorState(errorMsg));
        return null;
      }
    },
    [wallet, tokenId, decimals]
  );

  const reset = useCallback(() => {
    setState(initialCommandState);
  }, []);

  return { 
    ...state, 
    isLoading: state.loading,
    execute,
    burn: execute,
    reset 
  };
};
