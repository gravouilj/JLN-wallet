import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../UI';
import HistoryCollapse from '../../HistoryCollapse';
import NetworkFeesAvail from '../NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import { notificationAtom } from '../../../atoms';
import { useMintToken } from '../../../hooks/useMintToken';
import { useActionSuccess } from '../../../hooks/useActionSuccess';
import { validateTokenSendAmount } from '../../../utils/validation';

interface MintProps {
  activeTab: string;
  ticker: string;
  isCreator: boolean;
  genesisInfo: any;
  history: any[];
  loadingHistory: boolean;
  tokenId: string;
  wallet: any;
  tokenInfo: any;
  onHistoryUpdate?: () => Promise<void>;
}

/**
 * Composant Mint refactorisé avec useMintToken hook
 * Responsabilités:
 * - UI pour la saisie du montant à émettre
 * - Gestion du destinataire du bâton (optionnel)
 * - Affichage des frais
 * - Historique des minting
 * 
 * La logique métier (validation, wallet appel) est dans useMintToken
 */
export const Mint: React.FC<MintProps> = ({
  activeTab,
  ticker,
  isCreator,
  genesisInfo,
  history,
  loadingHistory,
  tokenId,
  wallet,
  tokenInfo,
  onHistoryUpdate,
}) => {
  // State pour UI
  const [mintAmount, setMintAmount] = useState('');
  const [batonRecipient, setBatonRecipient] = useState('');
  const [dynamicFee, setDynamicFee] = useState(546);

  // Hook métier + action success handler
  const decimals = tokenInfo?.genesisInfo?.decimals || 0;
  const { isLoading, error, txId, success, mint, reset } = useMintToken(tokenId, decimals);
  const handleActionSuccess = useActionSuccess();
  const setNotification = useSetAtom(notificationAtom);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ FIXED: Validate amount using token decimals
    const validation = validateTokenSendAmount(mintAmount, decimals);
    if (!validation.valid) {
      setNotification({ type: 'error', message: validation.error });
      return;
    }

    const txid = await mint(mintAmount, batonRecipient || undefined);

    if (txid) {
      // ✅ FIXED: Use centralized action success handler
      await handleActionSuccess({
        txid,
        amount: mintAmount,
        ticker,
        actionType: 'mint',
        tokenId,
        ownerAddress: wallet?.getAddress?.() || wallet?.address || '',
        details: batonRecipient ? { batonRecipient } : null
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
      setMintAmount('');
      setBatonRecipient('');
      reset();
    } else if (error) {
      setNotification({ type: 'error', message: error });
    }
  };

  if (activeTab !== 'mint' || !isCreator) return null;

  return (
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
      <form onSubmit={handleMint} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Info Box */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '8px',
            color: '#1e40af',
            fontSize: '0.9rem',
          }}
        >
          🏭 <strong>Émission de jetons</strong> : Créez de nouveaux jetons {ticker} (Offre variable).
        </div>

        {/* Montant à émettre */}
        <Input
          label="Quantité à émettre"
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="1000"
          disabled={!isCreator || isLoading}
          helperText="Nombre de jetons à créer (selon les décimales du token)"
        />

        {/* Destinataire du Bâton (optionnel) */}
        <Input
          label="Destinataire du bâton (optionnel)"
          type="text"
          value={batonRecipient}
          onChange={(e) => setBatonRecipient(e.target.value)}
          placeholder="ecash:qp..."
          disabled={!isCreator || isLoading}
          helperText="Adresse qui recevra le bâton (capacité à ré-émettre). Laisser vide pour garder le contrôle."
        />

        {/* Frais */}
        <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
          <ActionFeeEstimate actionType="mint" onFeeCalculated={(fee) => setDynamicFee(fee)} />
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
          variant="primary"
          fullWidth
          disabled={!genesisInfo.authPubkey || isLoading || !mintAmount}
          style={{ height: '56px', fontSize: '1.1rem' }}
        >
          {isLoading ? '⏳ Émission...' : "Confirmer l'émission"}
        </Button>

        {!genesisInfo.authPubkey && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', color: '#92400e' }}>
            ⚠️ Vous n'avez pas les permissions d'émission
          </div>
        )}
      </form>

      {/* Historique */}
      <div style={{ marginTop: '24px' }}>
        <HistoryCollapse
          history={history}
          loadingHistory={loadingHistory}
          title="📜 Historique des émissions"
          compact={true}
          filterFn={(h: any) => h.action_type === 'MINT'}
        />
      </div>
    </div>
  );
};

export default Mint;
