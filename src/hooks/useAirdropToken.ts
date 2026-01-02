import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
import { isValidXECAddress } from '../utils/validation';

interface AirdropRecipient {
  address: string;
  amount: string;
}

interface AirdropState {
  isLoading: boolean;
  error: string | null;
  txId: string | null;
  success: boolean;
}

/**
 * Custom Hook pour l'airdrop de tokens
 * Gère la validation de multiples destinataires et l'appel wallet
 */
export const useAirdropToken = (tokenId: string, decimals: number = 0) => {
  const [wallet] = useAtom(walletAtom);
  const [state, setState] = useState<AirdropState>({
    isLoading: false,
    error: null,
    txId: null,
    success: false,
  });

  const validateRecipients = useCallback(
    (recipients: AirdropRecipient[]): string | null => {
      if (recipients.length === 0) return 'Au moins 1 destinataire requis';

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        if (!recipient.address.trim()) return `Adresse ${i + 1} manquante`;
        if (!isValidXECAddress(recipient.address))
          return `Adresse ${i + 1} invalide`;
        if (!recipient.amount.trim()) return `Montant ${i + 1} manquant`;

        const amountNum = parseFloat(recipient.amount);
        if (isNaN(amountNum) || amountNum <= 0)
          return `Montant ${i + 1} invalide`;
      }

      return null;
    },
    []
  );

  const airdrop = useCallback(
    async (recipients: AirdropRecipient[]): Promise<string | null> => {
      setState({ isLoading: true, error: null, txId: null, success: false });

      const validationError = validateRecipients(recipients);
      if (validationError) {
        setState({
          isLoading: false,
          error: validationError,
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
        // Appel wallet avec tous les destinataires
        const result = await wallet.airdropToken(tokenId, recipients, decimals);

        setState({
          isLoading: false,
          error: null,
          txId: result.txid,
          success: true,
        });

        return result.txid;
      } catch (err: any) {
        const errorMsg = err.message || "Erreur lors de l'airdrop";
        console.error('[useAirdropToken]', errorMsg, err);
        setState({
          isLoading: false,
          error: errorMsg,
          txId: null,
          success: false,
        });
        return null;
      }
    },
    [validateRecipients, wallet, tokenId, decimals]
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, txId: null, success: false });
  }, []);

  return { ...state, airdrop, reset };
};
