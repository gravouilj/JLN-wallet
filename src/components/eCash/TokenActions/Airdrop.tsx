import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../UI';
import HistoryCollapse from '../../HistoryCollapse';
import NetworkFeesAvail from '../NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import AddressBook from '../../AddressBook/AddressBook';
import HoldersDetails from './HoldersDetails';
import { notificationAtom } from '../../../atoms';
import { addEntry, ACTION_TYPES } from '../../../services/historyService';
import { useAirdropToken } from '../../../hooks/useAirdropToken';

interface AirdropRecipient {
  address: string;
  amount: string;
}

interface AirdropProps {
  activeTab: string;
  ticker: string;
  xecBalance: number;
  isCreator: boolean;
  history: any[];
  loadingHistory: boolean;
  tokenId: string;
  wallet: any;
  tokenInfo: any;
  onHistoryUpdate?: () => Promise<void>;
}

/**
 * Composant Airdrop refactorisé avec useAirdropToken hook
 * Responsabilités:
 * - UI pour la configuration de l'airdrop (mode, montants)
 * - Calcul des destinataires et prévisualisation
 * - Gestion du carnet d'adresses
 * 
 * La logique métier (validation batch, wallet appel) est dans useAirdropToken
 */
export const Airdrop: React.FC<AirdropProps> = ({
  activeTab,
  ticker,
  xecBalance,
  isCreator,
  history,
  loadingHistory,
  tokenId,
  wallet,
  tokenInfo,
  onHistoryUpdate,
}) => {
  // State pour UI
  const [airdropMode, setAirdropMode] = useState<'equal' | 'manual'>('equal');
  const [airdropTotal, setAirdropTotal] = useState('');
  const [minEligible, setMinEligible] = useState('');
  const [ignoreCreator, setIgnoreCreator] = useState(true);
  const [airdropMessage, setAirdropMessage] = useState('');
  const [holdersCount, setHoldersCount] = useState<number | null>(null);
  const [calculatedHolders, setCalculatedHolders] = useState<AirdropRecipient[]>([]);
  const [isCalculationValid, setIsCalculationValid] = useState(false);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [dynamicFee, setDynamicFee] = useState(546);
  const [showAddressBook, setShowAddressBook] = useState(false);

  // Hook métier
  const decimals = tokenInfo?.genesisInfo?.decimals || 0;
  const { isLoading, error, txId, success, airdrop, reset } = useAirdropToken(tokenId, decimals);

  const setNotification = useSetAtom(notificationAtom);

  const handleSetMaxAirdrop = () => {
    const maxAvailable = Math.max(0, xecBalance - 10);
    setAirdropTotal(maxAvailable.toFixed(2));
  };

  const handleCalculateAirdrop = async () => {
    if (!airdropTotal || parseFloat(airdropTotal) <= 0) {
      setNotification({ type: 'error', message: 'Montant total requis' });
      return;
    }

    setLoadingHolders(true);
    try {
      const minTokens = minEligible ? parseFloat(minEligible) : 0;

      // Utiliser le wallet pour calculer les détenteurs
      const result = await wallet.calculateAirdropHolders(tokenId, minTokens, ignoreCreator, decimals);

      if (!result || result.holders.length === 0) {
        setNotification({ type: 'warning', message: 'Aucun détenteur éligible trouvé' });
        return;
      }

      const totalAmount = parseFloat(airdropTotal);
      const holdersArray = result.holders;

      let recipients: AirdropRecipient[] = [];

      if (airdropMode === 'equal') {
        const amountPerHolder = totalAmount / holdersArray.length;
        recipients = holdersArray.map((holder) => ({
          address: holder.address,
          amount: amountPerHolder.toString(),
        }));
      } else {
        // Mode manuel - utiliser les montants existants
        recipients = holdersArray.map((holder) => ({
          address: holder.address,
          amount: holder.amount?.toString() || '0',
        }));
      }

      setCalculatedHolders(recipients);
      setHoldersCount(holdersArray.length);
      setIsCalculationValid(true);

      setNotification({
        type: 'success',
        message: `✅ ${holdersArray.length} détenteurs calculés (${airdropMode})`,
      });
    } catch (err: any) {
      console.error('❌ Erreur calcul airdrop:', err);
      setNotification({ type: 'error', message: err.message || 'Erreur calcul détenteurs' });
    } finally {
      setLoadingHolders(false);
    }
  };

  const handleExecuteAirdrop = async () => {
    if (calculatedHolders.length === 0) {
      setNotification({ type: 'error', message: 'Aucun destinataire calculé' });
      return;
    }

    // Utiliser le hook pour faire l'airdrop
    const txid = await airdrop(calculatedHolders);

    if (txid) {
      setNotification({
        type: 'success',
        message: `✅ Airdrop effectué à ${calculatedHolders.length} destinataires ! TXID: ${txid.substring(0, 8)}...`,
      });

      // Enregistrer historique
      try {
        const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || ticker || 'UNK';
        const safeOwner = wallet?.getAddress() || '';
        const totalAmount = calculatedHolders.reduce((sum, r) => sum + parseFloat(r.amount), 0);

        await addEntry({
          owner_address: safeOwner,
          token_id: tokenId,
          token_ticker: safeTicker,
          action_type: ACTION_TYPES.AIRDROP,
          amount: totalAmount.toString(),
          tx_id: txid,
          details: { recipients: calculatedHolders.length, message: airdropMessage || null },
        });

        if (onHistoryUpdate) {
          await onHistoryUpdate();
        }
      } catch (histErr) {
        console.warn('⚠️ Erreur enregistrement historique:', histErr);
      }

      // Reset
      setAirdropTotal('');
      setHoldersCount(null);
      setCalculatedHolders([]);
      setIsCalculationValid(false);
      setAirdropMessage('');
      reset();
    } else if (error) {
      setNotification({ type: 'error', message: error });
    }
  };

  if (activeTab !== 'airdrop') return null;

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
        {/* Mode Sélection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Mode d'airdrop
          </label>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setAirdropMode('equal')}
              disabled={isLoading || loadingHolders}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: airdropMode === 'equal' ? '#ffffff' : 'transparent',
                color: airdropMode === 'equal' ? '#0f172a' : '#64748b',
                boxShadow: airdropMode === 'equal' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Montants Égaux
            </button>
            <button
              type="button"
              onClick={() => setAirdropMode('manual')}
              disabled={isLoading || loadingHolders}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: airdropMode === 'manual' ? '#ffffff' : 'transparent',
                color: airdropMode === 'manual' ? '#0f172a' : '#64748b',
                boxShadow: airdropMode === 'manual' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Montants Manuels
            </button>
          </div>
        </div>

        {/* Montant Total */}
        <Input
          label="Montant Total"
          type="number"
          value={airdropTotal}
          onChange={(e) => setAirdropTotal(e.target.value)}
          placeholder="0.00"
          disabled={isLoading || loadingHolders}
          actionButton={{
            label: 'MAX',
            onClick: handleSetMaxAirdrop,
          }}
          helperText={`Solde disponible : ${xecBalance.toFixed(2)} XEC`}
        />

        {/* Montant Minimum */}
        <Input
          label="Montant Minimum des Détenteurs (optionnel)"
          type="number"
          value={minEligible}
          onChange={(e) => setMinEligible(e.target.value)}
          placeholder="0"
          disabled={isLoading || loadingHolders}
          helperText="Exclure les détenteurs avec moins de ce montant"
        />

        {/* Checkbox Ignorer Créateur */}
        <div style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="ignoreCreator"
            checked={ignoreCreator}
            onChange={(e) => setIgnoreCreator(e.target.checked)}
            disabled={isLoading || loadingHolders}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="ignoreCreator" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Ignorer le créateur dans l'airdrop
          </label>
        </div>

        {/* Message optionnel */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Message (optionnel)
          </label>
          <textarea
            value={airdropMessage}
            onChange={(e) => setAirdropMessage(e.target.value)}
            placeholder="Ajouter un message à l'airdrop..."
            disabled={isLoading || loadingHolders}
            maxLength={220}
            rows={2}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '0.9rem',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-input, #fff)',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', textAlign: 'right' }}>
            {airdropMessage.length}/220 caractères
          </div>
        </div>

        {/* Bouton Calculer */}
        <Button
          variant="secondary"
          fullWidth
          onClick={handleCalculateAirdrop}
          disabled={!airdropTotal || parseFloat(airdropTotal) <= 0 || isLoading || loadingHolders}
          style={{ height: '44px', marginBottom: '12px' }}
        >
          {loadingHolders ? '⏳ Calcul...' : '🧮 Calculer Destinataires'}
        </Button>

        {/* Affichage des Détenteurs Calculés */}
        {isCalculationValid && holdersCount !== null && (
          <>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderRadius: '8px',
                color: '#065f46',
                marginBottom: '16px',
              }}
            >
              ✅ {holdersCount} détenteur(s) éligible(s) calculé(s)
            </div>

            <HoldersDetails recipients={calculatedHolders} collapsible={true} />

            {/* Frais */}
            <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', marginTop: '16px', alignItems: 'start' }}>
              <ActionFeeEstimate
                actionType="airdrop"
                params={{ recipients: calculatedHolders.length }}
                onFeeCalculated={(fee) => setDynamicFee(fee)}
              />
              {isCreator && <NetworkFeesAvail compact={true} showActions={true} estimatedFee={dynamicFee} />}
            </div>

            {/* Erreur */}
            {error && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginTop: '16px' }}>
                ❌ {error}
              </div>
            )}

            {/* Bouton Exécuter */}
            <Button
              variant="primary"
              fullWidth
              onClick={handleExecuteAirdrop}
              disabled={isLoading}
              style={{ height: '56px', marginTop: '16px', fontSize: '1.1rem' }}
            >
              {isLoading ? '⏳ Airdrop en cours...' : `Exécuter l'airdrop (${holdersCount} destinataires)`}
            </Button>
          </>
        )}

        {/* Historique */}
        <div style={{ marginTop: '24px' }}>
          <HistoryCollapse
            history={history}
            loadingHistory={loadingHistory}
            title="📜 Historique des airdrops"
            compact={true}
            filterFn={(h: any) => h.action_type === 'AIRDROP'}
          />
        </div>
      </div>
    </>
  );
};

export default Airdrop;
