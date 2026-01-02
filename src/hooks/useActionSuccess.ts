import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom, balanceRefreshTriggerAtom, tokenRefreshTriggerAtom } from '../atoms';
import { addEntry, ACTION_TYPES, ActionType } from '../services/historyService';

/**
 * Paramètres pour une action blockchain réussie
 */
export interface ActionSuccessParams {
  txid: string;
  amount: string;
  ticker: string;
  actionType: 'send' | 'airdrop' | 'mint' | 'burn' | 'message';
  recipientCount?: number;
  tokenId?: string;
  ownerAddress?: string;
  details?: Record<string, any>;
}

/**
 * Hook centralisé pour gérer succès des actions blockchain
 * 
 * Responsabilités:
 * 1. Affiche notification avec TXID
 * 2. Déclenche refresh global (balance + tokens)
 * 3. Enregistre dans historique
 * 
 * USAGE:
 * const handleActionSuccess = useActionSuccess();
 * const txid = await sendToken(...);
 * if (txid) {
 *   handleActionSuccess({
 *     txid,
 *     amount: '100',
 *     ticker: 'MYTOKEN',
 *     actionType: 'send',
 *     tokenId,
 *     ownerAddress
 *   });
 * }
 */
export const useActionSuccess = () => {
  const setNotification = useSetAtom(notificationAtom);
  const setBalanceRefresh = useSetAtom(balanceRefreshTriggerAtom);
  const setTokenRefresh = useSetAtom(tokenRefreshTriggerAtom);

  /**
   * Callback à appeler après succès blockchain
   * Coordonne notification, refresh, et historique
   */
  const handleActionSuccess = useCallback(
    async (params: ActionSuccessParams): Promise<void> => {
      const {
        txid,
        amount,
        ticker,
        actionType,
        recipientCount,
        tokenId,
        ownerAddress,
        details
      } = params;

      // 1. Notification utilisateur avec TXID
      const actionEmojis: Record<string, string> = {
        send: '📤',
        airdrop: '🚁',
        mint: '🏭',
        burn: '🔥',
        message: '💬'
      };

      const emoji = actionEmojis[actionType] || '✅';
      const recipientMsg = recipientCount && recipientCount > 0 
        ? ` à ${recipientCount} destinataire${recipientCount > 1 ? 's' : ''}`
        : '';

      setNotification({
        type: 'success',
        message: `${emoji} ${amount} ${ticker} - ${actionType}${recipientMsg} ! TXID: ${txid.substring(0, 8)}...`
      });

      // 2. Déclenche refresh global
      // ✅ Important: Increment pour que useEffect se déclenche
      setBalanceRefresh(Date.now());
      setTokenRefresh(Date.now());

      // 3. Enregistrer dans historique (async, non-bloquant)
      if (tokenId && ownerAddress) {
        try {
          const actionTypeMap: Record<string, ActionType> = {
            send: ACTION_TYPES.SEND,
            airdrop: ACTION_TYPES.AIRDROP,
            mint: ACTION_TYPES.MINT,
            burn: ACTION_TYPES.BURN,
            message: ACTION_TYPES.MESSAGE
          };

          await addEntry({
            owner_address: ownerAddress,
            token_id: tokenId,
            token_ticker: ticker,
            action_type: actionTypeMap[actionType],
            amount,
            tx_id: txid,
            details: details || null
          });
        } catch (histErr) {
          // ⚠️ Pas fatal - historique est optionnel
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }
      }
    },
    [setNotification, setBalanceRefresh, setTokenRefresh]
  );

  return handleActionSuccess;
};

export default useActionSuccess;
