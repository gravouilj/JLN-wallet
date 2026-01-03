import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
import { isValidXECAddress } from '../utils/validation';
import { CommandHookState, initialCommandState, loadingState, errorState, successState } from './types';

/**
 * Custom Hook pour la création de tokens
 * Gère la validation du montant et du destinataire du bâton
 */
export const useMintToken = (tokenId: string, decimals: number = 0) => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<CommandHookState>(initialCommandState);

  const execute = useCallback(
    async (
      amount: string,
      batonRecipient?: string
    ): Promise<string | null> => {
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

      // Validation du destinataire du bâton (optionnel)
      if (batonRecipient && !isValidXECAddress(batonRecipient)) {
        setState(errorState('Adresse du bâton invalide'));
        return null;
      }

      if (!wallet) {
        setState(errorState('Wallet non connecté'));
        return null;
      }

      try {
        const result = await wallet.mintToken(
          tokenId,
          amountNum,
          decimals
        );

        setState(successState(result.txid));
        return result.txid;
      } catch (err: any) {
        const errorMsg = err.message || 'Erreur lors du minting';
        console.error('[useMintToken]', errorMsg, err);
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
    mint: execute,
    reset 
  };
};
