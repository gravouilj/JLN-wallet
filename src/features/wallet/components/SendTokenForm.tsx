import React, { useState, useTransition, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import QrCodeScanner from '../../../components/eCash/QrCodeScanner';
import { useEcashWallet } from '../../../hooks/useEcashWallet';
import { notificationAtom } from '../../../atoms';
import { sanitizeInput, isValidXECAddress, isValidAmount } from '../../../utils/validation';

interface SendTokenFormProps {
  token: any;
  balance: string;
  decimals: number;
  gasAvailable: boolean;
  onSuccess?: () => void;
}

/**
 * SendTokenForm - Formulaire optimisé pour envoyer des tokens
 * Utilise React 19 useTransition pour la gestion d'état async
 * Validation intelligente + UX claire
 */
export const SendTokenForm: React.FC<SendTokenFormProps> = ({
  token,
  balance,
  decimals,
  gasAvailable,
  onSuccess
}) => {
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  // React 19 Transition Hook
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [form, setForm] = useState({ address: '', amount: '' });
  const [showScanner, setShowScanner] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate form fields
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!form.address || form.address.trim() === '') {
      errors.address = 'Veuillez entrer une adresse';
    } else if (!isValidXECAddress(form.address)) {
      errors.address = 'Adresse invalide (doit commencer par ecash:)';
    }

    if (!form.amount || form.amount.trim() === '') {
      errors.amount = 'Veuillez entrer un montant';
    } else if (!isValidAmount(form.amount, 'etoken')) {
      errors.amount = 'Montant invalide';
    } else {
      const amountNum = parseFloat(form.amount);
      if (amountNum <= 0) {
        errors.amount = 'Le montant doit être positif';
      } else if (amountNum > parseFloat(balance)) {
        errors.amount = `Montant insuffisant (max: ${balance})`;
      }
    }

    if (!gasAvailable) {
      errors.gas = 'Crédit réseau insuffisant pour cette transaction';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, balance, gasAvailable]);

  // Handle form submission with useTransition
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setNotification({
        type: 'error',
        message: 'Veuillez corriger les erreurs du formulaire'
      });
      return;
    }

    // Use startTransition for state updates, but handle async separately
    const executeTransaction = async () => {
      try {
        if (!wallet) throw new Error('Wallet non connecté');

        const sanitizedAddress = sanitizeInput(form.address, 'address');
        const sanitizedAmount = sanitizeInput(form.amount, 'amount');
        const cleanAmount = String(sanitizedAmount).replace(',', '.');

        console.log(`📤 Envoi de ${cleanAmount} ${token.ticker} vers ${sanitizedAddress.substring(0, 20)}...`);

        const result = await wallet.sendToken(
          token.tokenId,
          sanitizedAddress,
          cleanAmount,
          decimals,
          token.protocol || 'SLP'
        );

        startTransition(() => {
          setNotification({
            type: 'success',
            message: `✓ Transaction envoyée ! TXID: ${result.txid.substring(0, 12)}...`
          });

          // Reset form
          setForm({ address: '', amount: '' });
          setValidationErrors({});
        });

        // Callback if provided
        if (onSuccess) onSuccess();

      } catch (error) {
        console.error('❌ Erreur lors de l\'envoi:', error);
        startTransition(() => {
          setNotification({
            type: 'error',
            message: error instanceof Error ? error.message : 'Échec de l\'envoi'
          });
        });
      }
    };
    
    executeTransaction();
  };

  // Handle QR code scan
  const handleAddressDetected = (address: string) => {
    setForm(prev => ({ ...prev, address }));
    setShowScanner(false);
    setValidationErrors(prev => ({ ...prev, address: '' }));
    setNotification({
      type: 'success',
      message: '✓ Adresse scannée'
    });
  };

  // Set max amount
  const handleMaxAmount = () => {
    setForm(prev => ({ ...prev, amount: balance }));
    setValidationErrors(prev => ({ ...prev, amount: '' }));
  };

  // Dynamic fee estimate (simplified)
  const estimatedFee = 0.003; // ~3 XEC in satoshis

  return (
    <>
      <form onSubmit={handleSubmit} style={{
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Address Field */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text-primary, #000)'
          }}>
            Destinataire {token.ticker}
          </label>
          
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={form.address}
              onChange={(e) => {
                setForm(prev => ({ ...prev, address: e.target.value }));
                setValidationErrors(prev => ({ ...prev, address: '' }));
              }}
              placeholder="ecash:qp..."
              disabled={isPending}
              style={{
                width: '100%',
                padding: '12px 45px 12px 14px',
                fontSize: '14px',
                border: `1px solid ${validationErrors.address ? '#d32f2f' : 'var(--border-color, #ddd)'}`,
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary, #fff)',
                boxSizing: 'border-box',
                opacity: isPending ? 0.6 : 1
              }}
            />

            {/* QR Scan Button */}
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={isPending}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1
              }}
              title="Scanner QR"
            >
              📷
            </button>
          </div>

          {validationErrors.address && (
            <span style={{ fontSize: '12px', color: '#d32f2f', marginTop: '4px', display: 'block' }}>
              {validationErrors.address}
            </span>
          )}

          {/* Address validation hint */}
          {form.address && form.address.startsWith('ecash:q') && !validationErrors.address && (
            <span style={{ fontSize: '11px', color: '#2e7d32', marginTop: '4px', display: 'block' }}>
              ✓ Adresse eCash valide
            </span>
          )}
        </div>

        {/* Amount Field */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text-primary, #000)'
          }}>
            Montant
          </label>

          <div style={{ position: 'relative' }}>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => {
                setForm(prev => ({ ...prev, amount: e.target.value }));
                setValidationErrors(prev => ({ ...prev, amount: '' }));
              }}
              placeholder="0.00"
              disabled={isPending}
              style={{
                width: '100%',
                padding: '12px 65px 12px 14px',
                fontSize: '14px',
                border: `1px solid ${validationErrors.amount ? '#d32f2f' : 'var(--border-color, #ddd)'}`,
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary, #fff)',
                boxSizing: 'border-box',
                opacity: isPending ? 0.6 : 1
              }}
            />

            <button
              type="button"
              onClick={handleMaxAmount}
              disabled={isPending}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '600',
                border: '1px solid var(--primary-color, #0074e4)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--primary-color, #0074e4)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1
              }}
            >
              MAX
            </button>
          </div>

          {validationErrors.amount && (
            <span style={{ fontSize: '12px', color: '#d32f2f', marginTop: '4px', display: 'block' }}>
              {validationErrors.amount}
            </span>
          )}

          <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '12px' }}>
            Solde disponible: {balance} {token.ticker}
          </small>
        </div>

        {/* Gas Warning */}
        {validationErrors.gas && (
          <div style={{
            padding: '12px',
            backgroundColor: '#ffebee',
            borderLeft: '4px solid #d32f2f',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#c62828'
          }}>
            ⚠️ {validationErrors.gas}
          </div>
        )}

        {!gasAvailable && !validationErrors.gas && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fff3e0',
            borderLeft: '4px solid #f57c00',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#e65100'
          }}>
            💡 Crédit réseau faible. Contactez votre créateur pour en recevoir plus.
          </div>
        )}

        {/* Fee Estimate */}
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--bg-secondary, #f5f5f5)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ marginBottom: '4px' }}>
            Frais estimés: ~{estimatedFee} XEC
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>
            (Variable selon la congestion du réseau)
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || Object.keys(validationErrors).length > 0}
          style={{
            padding: '14px',
            fontSize: '15px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: isPending || Object.keys(validationErrors).length > 0
              ? '#ccc'
              : 'var(--primary-color, #0074e4)',
            color: '#fff',
            cursor: isPending || Object.keys(validationErrors).length > 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {isPending ? '⌛ Envoi en cours...' : `✓ Envoyer ${token.ticker}`}
        </button>
      </form>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <button
            type="button"
            onClick={() => setShowScanner(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#000',
              cursor: 'pointer'
            }}
          >
            ✕ Fermer
          </button>
          <QrCodeScanner onAddressDetected={handleAddressDetected} />
        </div>
      )}
    </>
  );
};
