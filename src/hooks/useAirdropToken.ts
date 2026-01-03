import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
import { CommandHookState, initialCommandState, loadingState, errorState, successState } from './types';

/**
 * Options pour l'airdrop
 */
interface AirdropOptions {
  totalAmountXec: number;
  proportional?: boolean;
  ignoreCreator?: boolean;
  minEligible?: number;
  message?: string | null;
}

/**
 * Résultat de l'airdrop
 */
interface AirdropResult {
  success: boolean;
  txid: string;
  holdersCount: number;
  recipientsCount: number;
  totalDistributed: number;
  method: 'proportional' | 'equal';
}

/**
 * Custom Hook pour l'airdrop de XEC aux holders d'un token
 * Utilise wallet.airdrop() qui distribue XEC proportionnellement ou également aux holders
 */
export const useAirdropToken = (tokenId: string, _decimals: number = 0) => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<CommandHookState>(initialCommandState);

  const execute = useCallback(
    async (options: AirdropOptions): Promise<AirdropResult | null> => {
      setState(loadingState());

      const { totalAmountXec, proportional = true, ignoreCreator = true, minEligible = 0, message = null } = options;

      // Validation
      if (!totalAmountXec || totalAmountXec <= 0) {
        setState(errorState('Montant XEC invalide'));
        return null;
      }

      if (!wallet) {
        setState(errorState('Wallet non connecté'));
        return null;
      }

      try {
        // Appel wallet.airdrop avec la vraie signature
        const result = await wallet.airdrop(
          tokenId, 
          totalAmountXec, 
          proportional, 
          ignoreCreator, 
          minEligible, 
          message
        );

        setState(successState(result.txid));
        return result as AirdropResult;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'airdrop";
        console.error('[useAirdropToken]', errorMsg, err);
        setState(errorState(errorMsg));
        return null;
      }
    },
    [wallet, tokenId]
  );

  const reset = useCallback(() => {
    setState(initialCommandState);
  }, []);

  // Expose both 'loading' (standard) and 'isLoading' (backward compat)
  return { 
    ...state, 
    isLoading: state.loading,
    execute,
    airdrop: execute, // alias for backward compatibility
    reset 
  };
};
