import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
import { isValidXECAddress, validateXecSendAmount, validateTokenSendAmount } from '../utils/validation';
import { CommandHookState, initialCommandState, loadingState, errorState, successState } from './types';

interface SendTokenParams {
  address: string;
  amount: string;
  tokenId?: string;
  decimals?: number;
}

/**
 * Custom Hook pour gérer l'envoi de tokens
 * Centralise la validation, l'appel wallet et la gestion d'erreurs
 * 
 * ✅ FIXED:
 * - validateXecSendAmount() for XEC (no dust limit)
 * - validateTokenSendAmount() for ALP tokens (respects decimals)
 * - BigInt usage throughout
 */
export const useSendToken = () => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<CommandHookState>(initialCommandState);

  /**
   * Validation locale des inputs
   * - XEC: Adresse + montant (pas de dust limit pour send XEC)
   * - Token: Adresse + montant + respect des decimals
   */
  const validateInputs = useCallback((params: SendTokenParams): string | null => {
    if (!params.address.trim()) return 'Adresse requise';
    if (!isValidXECAddress(params.address)) return 'Adresse eCash invalide';
    if (!params.amount.trim()) return 'Montant requis';

    // ✅ FIXED: Use dedicated validators
    if (params.tokenId) {
      const decimals = params.decimals || 0;
      const result = validateTokenSendAmount(params.amount, decimals);
      return result.valid ? null : result.error || 'Montant invalide';
    } else {
      const result = validateXecSendAmount(params.amount);
      return result.valid ? null : result.error || 'Montant invalide';
    }
  }, []);

  /**
   * Fonction principale d'envoi
   * Valide les inputs puis appelle le wallet
   */
  const execute = useCallback(
    async (params: SendTokenParams): Promise<string | null> => {
      setState(loadingState());

      // 1. Validation
      const validationError = validateInputs(params);
      if (validationError) {
        setState(errorState(validationError));
        return null;
      }

      if (!wallet) {
        setState(errorState('Wallet non connecté'));
        return null;
      }

      try {
        // 2. Appel wallet
        let txid: string;

        if (params.tokenId) {
          // Envoi de token (utilise BigInt en interne dans wallet.sendToken)
          const decimals = params.decimals || 0;
          const result = await wallet.sendToken(
            params.tokenId,
            params.address,
            params.amount,
            decimals
          );
          txid = result.txid;
        } else {
          // Envoi XEC (1 XEC = 100 sats, gestion interne)
          const result = await wallet.sendXec(params.address, params.amount);
          txid = result.txid;
        }

        setState(successState(txid));
        return txid;
      } catch (err: any) {
        const errorMsg = err.message || 'Erreur lors de la transaction';
        console.error('[useSendToken]', errorMsg, err);
        setState(errorState(errorMsg));
        return null;
      }
    },
    [validateInputs, wallet]
  );

  /**
   * Reset state - utile après un succès
   */
  const reset = useCallback(() => {
    setState(initialCommandState);
  }, []);

  // Expose both 'loading' (standard) and 'isLoading' (backward compat)
  return { 
    ...state, 
    isLoading: state.loading, // backward compatibility
    execute, 
    send: execute, // alias for backward compatibility
    reset 
  };
};
