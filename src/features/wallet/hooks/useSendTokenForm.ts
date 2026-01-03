import { useState, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { walletAtom, walletConnectedAtom, notificationAtom } from '../../../atoms';
import { sanitizeInput, isValidXECAddress, isValidAmount } from '../../../utils/validation';

interface SendFormState {
  address: string;
  amount: string;
}

interface UseSendTokenFormProps {
  tokenId: string | null;
  tokenTicker: string;
  tokenDecimals: number;
  protocol: string;
  maxBalance: string | null;
}

interface UseSendTokenFormResult {
  sendForm: SendFormState;
  setSendForm: React.Dispatch<React.SetStateAction<SendFormState>>;
  sendLoading: boolean;
  handleSendSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setMaxAmount: () => void;
  resetForm: () => void;
}

/**
 * Hook to manage token send form state and submission
 * Extracted from ClientWalletPage to reduce complexity
 */
export const useSendTokenForm = ({
  tokenId,
  tokenTicker,
  tokenDecimals,
  protocol,
  maxBalance,
}: UseSendTokenFormProps): UseSendTokenFormResult => {
  const [sendForm, setSendForm] = useState<SendFormState>({ address: '', amount: '' });
  const [sendLoading, setSendLoading] = useState(false);
  
  const wallet = useAtomValue(walletAtom);
  const walletConnected = useAtomValue(walletConnectedAtom);
  const setNotification = useSetAtom(notificationAtom);

  const resetForm = useCallback(() => {
    setSendForm({ address: '', amount: '' });
  }, []);

  const setMaxAmount = useCallback(() => {
    if (maxBalance) {
      setSendForm(prev => ({ ...prev, amount: maxBalance }));
    }
  }, [maxBalance]);

  const handleSendSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Validation: Token must be selected
    if (!tokenId) {
      setNotification({ 
        type: 'error', 
        message: 'Sélectionnez un jeton pour envoyer. XEC est le carburant réseau, pas un jeton.' 
      });
      return;
    }

    // Form validation
    if (!sendForm.address || !sendForm.amount) {
      setNotification({ type: 'error', message: 'Remplissez l\'adresse et le montant.' });
      return;
    }
    
    if (!wallet || !walletConnected) {
      setNotification({ type: 'error', message: 'Wallet non connecté' });
      return;
    }

    const sanitizedAddress = sanitizeInput(sendForm.address, 'address');
    const sanitizedAmount = sanitizeInput(sendForm.amount, 'amount');

    if (!sanitizedAddress || !isValidXECAddress(sanitizedAddress)) {
      setNotification({ type: 'error', message: 'Adresse invalide' });
      return;
    }

    if (!sanitizedAmount || !isValidAmount(sanitizedAmount, 'etoken')) {
      setNotification({ type: 'error', message: 'Montant invalide' });
      return;
    }

    const amount = parseFloat(sanitizedAmount);
    if (amount <= 0) {
      setNotification({ type: 'error', message: 'Le montant doit être positif' });
      return;
    }

    setSendLoading(true);
    try {
      const cleanAmount = String(amount).replace(',', '.');
      
      console.log(`📤 Envoi Token ${tokenTicker} → ${sanitizedAddress}`);
      const result = await wallet.sendToken(
        tokenId,
        sanitizedAddress,
        cleanAmount,
        tokenDecimals,
        protocol
      );
      
      setNotification({ 
        type: 'success', 
        message: `✅ ${cleanAmount} ${tokenTicker} envoyés ! TXID: ${result.txid.substring(0, 8)}...` 
      });
      
      resetForm();
      
    } catch (error) {
      console.error('❌ Erreur envoi:', error);
      const errorMsg = error instanceof Error ? error.message : 'Échec de l\'envoi';
      setNotification({ type: 'error', message: errorMsg });
    } finally {
      setSendLoading(false);
    }
  }, [tokenId, tokenTicker, tokenDecimals, protocol, sendForm, wallet, walletConnected, setNotification, resetForm]);

  return {
    sendForm,
    setSendForm,
    sendLoading,
    handleSendSubmit,
    setMaxAmount,
    resetForm,
  };
};

export default useSendTokenForm;
