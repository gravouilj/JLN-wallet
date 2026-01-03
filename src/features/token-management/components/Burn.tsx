import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../../components/UI';
import HistoryCollapse from '../../../components/HistoryCollapse';
import NetworkFeesAvail from '../../../components/eCash/NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import { notificationAtom } from '../../../atoms';
import { useBurnToken } from '../../../hooks/useBurnToken';
import { useActionSuccess } from '../../../hooks/useActionSuccess';
import { validateTokenSendAmount } from '../../../utils/validation';

interface BurnProps {
  activeTab: string;
  ticker: string;
  decimals: number;
  myBalance: number;
  isCreator: boolean;
  history: any[];
  loadingHistory: boolean;
  formatAmount: (amount: number, decimals: number) => string;
  tokenId: string;
  wallet: any;
  tokenInfo: any;
  profileInfo: any;
  onHistoryUpdate?: () => Promise<void>;
}

/**
 * Composant Burn refactorisé avec useBurnToken hook
 * Responsabilités:
 * - UI pour la saisie du montant à brûler
 * - Avertissements utilisateur (brûler 100%, > 50%)
 * - Affichage des frais
 * - Historique des burning
 * 
 * La logique métier (validation, wallet appel) est dans useBurnToken
 */
export const Burn: React.FC<BurnProps> = ({
  activeTab,
  ticker,
  decimals,
  myBalance,
  isCreator,
  history,
  loadingHistory,
  formatAmount,
  tokenId,
  wallet,
  tokenInfo,
  profileInfo,
  onHistoryUpdate,
}) => {
  // State pour UI
  const [burnAmount, setBurnAmount] = useState('');
  const [dynamicFee, setDynamicFee] = useState(546);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Hook métier + action success handler
  const { isLoading, error, txId, success, burn, reset } = useBurnToken(tokenId, decimals);
  const handleActionSuccess = useActionSuccess();
  const setNotification = useSetAtom(notificationAtom);

  const handleSetMax = () => {
    setBurnAmount(formatAmount(myBalance, decimals));
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ FIXED: Use proper token validation
    const validation = validateTokenSendAmount(burnAmount, decimals);
    if (!validation.valid) {
      setNotification({ type: 'error', message: validation.error });
      return;
    }

    const amount = parseFloat(burnAmount);

    // Avertissement si brûler 100%
    if (validation.atoms) {
      const myBalanceAtoms = BigInt(Math.round(myBalance * Math.pow(10, decimals)));
      const isBurningAll = validation.atoms >= myBalanceAtoms;

      if (isBurningAll && isCreator) {
        const msg = `⚠️ ATTENTION CRITIQUE: Vous allez détruire TOUS vos tokens. Si le mint baton est inclus, vous ne pourrez PLUS JAMAIS créer de nouveaux tokens pour ce tokenId. Êtes-vous sûr ?`;
        setConfirmMessage(msg);
        setShowConfirmModal(true);
        return;
      } else if (amount > myBalance * 0.5) {
        const msg = `⚠️ Attention: Vous allez détruire ${burnAmount} tokens (${((amount / myBalance) * 100).toFixed(0)}% de votre solde). Continuer ?`;
        setConfirmMessage(msg);
        setShowConfirmModal(true);
        return;
      }
    }

    // Procéder sans confirmation
    await executeBurn();
  };

  const executeBurn = async () => {
    setShowConfirmModal(false);

    const txid = await burn(burnAmount);

    if (txid) {
      // ✅ FIXED: Use centralized action success handler
      await handleActionSuccess({
        txid,
        amount: burnAmount,
        ticker,
        actionType: 'burn',
        tokenId,
        ownerAddress: wallet?.getAddress?.() || wallet?.address || '',
        details: null
      });

      // Bonus: onHistoryUpdate callback optionnel
      if (onHistoryUpdate) {
        try {
          await onHistoryUpdate();
        } catch (err) {
          console.warn('⚠️ onHistoryUpdate erreur:', err);
        }
      }

      // Reset
      setBurnAmount('');
      reset();
    } else if (error) {
      setNotification({ type: 'error', message: error });
    }
  };

  if (activeTab !== 'burn') return null;

  return (
    <>
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          padding: '32px 24px',
          marginBottom: '24px',
        }}
      >
        <form onSubmit={handleBurn} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Info Box */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#7f1d1d',
              fontSize: '0.9rem',
            }}
          >
            🔥 <strong>Destruction de jetons</strong> : Brûlez vos {ticker} pour réduire l'offre totale. Cette action est irréversible.
          </div>

          {/* Montant à brûler */}
          <Input
            label="Montant à détruire"
            type="number"
            value={burnAmount}
            onChange={(e) => setBurnAmount(e.target.value)}
            placeholder="0.00"
            disabled={isLoading}
            actionButton={{
              label: 'MAX',
              onClick: handleSetMax,
            }}
            helperText={`Solde disponible : ${formatAmount(myBalance, decimals)} ${ticker}`}
          />

          {/* Avertissement si brûle > 50% */}
          {burnAmount && parseFloat(burnAmount) > myBalance * 0.5 && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ Vous allez détruire plus de 50% de votre solde. Cette action est irréversible.
            </div>
          )}

          {/* Frais */}
          <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
            <ActionFeeEstimate actionType="burn" onFeeCalculated={(fee) => setDynamicFee(fee)} />
            {isCreator && <NetworkFeesAvail compact={true} showActions={true} estimatedFee={dynamicFee} />}
          </div>

          {/* Erreur */}
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b' }}>
              ❌ {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="danger"
            fullWidth
            disabled={isLoading || !burnAmount}
            style={{ height: '56px', fontSize: '1.1rem' }}
          >
            {isLoading ? '⏳ Destruction...' : '🔥 Confirmer la destruction'}
          </Button>
        </form>

        {/* Historique */}
        <div style={{ marginTop: '24px' }}>
          <HistoryCollapse
            history={history}
            loadingHistory={loadingHistory}
            title="📜 Historique des destructions"
            compact={true}
            filterFn={(h: any) => h.action_type === 'BURN'}
          />
        </div>
      </div>

      {/* Modal de Confirmation */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>Confirmation</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>{confirmMessage}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Annuler
              </button>
              <button
                onClick={executeBurn}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                }}
              >
                {isLoading ? '⏳...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Burn;
