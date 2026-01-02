import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
import { isValidXECAddress } from '../utils/validation';

interface MintState {
  isLoading: boolean;
  error: string | null;
  txId: string | null;
  success: boolean;
}

/**
 * Custom Hook pour la création de tokens
 * Gère la validation du montant et du destinataire du bâton
 */
export const useMintToken = (tokenId: string, decimals: number = 0) => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<MintState>({
    isLoading: false,
    error: null,
    txId: null,
    success: false,
  });

  const mint = useCallback(
    async (
      amount: string,
      batonRecipient?: string
    ): Promise<string | null> => {
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

      // Validation du destinataire du bâton (optionnel)
      if (batonRecipient && !isValidXECAddress(batonRecipient)) {
        setState({
          isLoading: false,
          error: 'Adresse du bâton invalide',
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
        const result = await wallet.mintToken(
          tokenId,
          amountNum,
          decimals
        );

        setState({
          isLoading: false,
          error: null,
          txId: result.txid,
          success: true,
        });

        return result.txid;
      } catch (err: any) {
        const errorMsg = err.message || 'Erreur lors du minting';
        console.error('[useMintToken]', errorMsg, err);
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

  return { ...state, mint, reset };
};
