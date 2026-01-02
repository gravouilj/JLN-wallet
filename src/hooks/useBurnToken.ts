import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';

interface BurnState {
  isLoading: boolean;
  error: string | null;
  txId: string | null;
  success: boolean;
}

/**
 * Custom Hook pour la destruction de tokens
 * Gère la validation du montant et l'appel wallet
 */
export const useBurnToken = (tokenId: string, decimals: number = 0) => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<BurnState>({
    isLoading: false,
    error: null,
    txId: null,
    success: false,
  });

  const burn = useCallback(
    async (amount: string): Promise<string | null> => {
      setState({ isLoading: true, error: null, txId: null, success: false });

      // Validation du montant
      if (!amount.trim()) {
        setState({
          isLoading: false,
          error: 'Montant requis',
          txId: null,
          success: false,
        });
        return null;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setState({
          isLoading: false,
          error: 'Montant invalide',
          txId: null,
          success: false,
        });
        return null;
      }

      if (!wallet) {
        setState({
          isLoading: false,
          error: 'Wallet non connecté',
          txId: null,
          success: false,
        });
        return null;
      }

      try {
        const result = await wallet.burn(tokenId, amountNum, decimals);

        setState({
          isLoading: false,
          error: null,
          txId: result.txid,
          success: true,
        });

        return result.txid;
      } catch (err: any) {
        const errorMsg = err.message || 'Erreur lors de la destruction';
        console.error('[useBurnToken]', errorMsg, err);
        setState({
          isLoading: false,
          error: errorMsg,
          txId: null,
          success: false,
        });
        return null;
      }
    },
    [wallet, tokenId, decimals]
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, txId: null, success: false });
  }, []);

  return { ...state, burn, reset };
};
