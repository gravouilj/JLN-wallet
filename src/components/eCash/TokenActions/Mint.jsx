import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../UI';
import HistoryCollapse from '../../HistoryCollapse';
import NetworkFeesAvail from '../NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import { notificationAtom } from '../../../atoms';
import { addEntry, getHistoryByToken, ACTION_TYPES } from '../../../services/historyService';

export const Mint = ({
  activeTab,
  ticker,
  isCreator,
  genesisInfo,
  history,
  loadingHistory,
  tokenId,
  wallet,
  tokenInfo,
  onHistoryUpdate // Callback pour rafraîchir l'historique parent
}) => {
  const setNotification = useSetAtom(notificationAtom);
  const [processing, setProcessing] = useState(false);
  const [localHistory, setLocalHistory] = useState(history);
  const [mintAmount, setMintAmount] = useState('');

    // Gérer l'émission (Mint)
  const handleMint = async (data) => {
    const amount = data?.mintAmount || mintAmount;
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({ type: 'error', message: 'Montant invalide' });
      return;
    }

    setProcessing(true);
    try {
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const txid = await wallet.mintToken(tokenId, parseInt(amount), decimals);
      
      setNotification({
        type: 'success',
        message: `✅ ${amount} jetons émis ! TXID: ${txid.substring(0, 8)}...`
      });
      
      // Enregistrer dans l'historique
      try {
        // Récupération sécurisée des données pour l'historique
        const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || 'UNK';
        const safeOwner = typeof wallet?.getAddress === 'function' ? wallet.getAddress() : (wallet?.address || '');

        console.log('📝 Enregistrement historique Mint...', { safeTicker, safeOwner });

        await addEntry({
          owner_address: safeOwner,
          token_id: tokenId,
          token_ticker: safeTicker,
          action_type: ACTION_TYPES.MINT,
          amount: amount,
          tx_id: txid,
          details: null
        });
        
        // Rafraîchir l'historique via callback parent
        if (onHistoryUpdate) {
          const historyData = await getHistoryByToken(tokenId);
          onHistoryUpdate(historyData || []);
        }
      } catch (histErr) {
        console.warn('⚠️ Erreur enregistrement historique:', histErr);
      }
      
      setMintAmount('');
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 2000);
    } catch (err) {
      console.error('❌ Erreur mint:', err);
      setNotification({ type: 'error', message: err.message || 'Échec de l\'émission' });
    } finally {
      setProcessing(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleMint({ mintAmount });
  };

  if (activeTab !== 'mint' || !isCreator) return null;

  return (
    <div style={{ 
      backgroundColor: 'white', 
      border: '1px solid #e5e7eb', 
      borderTop: 'none', 
      borderBottomLeftRadius: '12px', 
      borderBottomRightRadius: '12px', 
      padding: '32px 24px', 
      marginBottom: '24px' 
    }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Info Box */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#eff6ff', 
          border: '1px solid #dbeafe', 
          borderRadius: '8px', 
          color: '#1e40af', 
          fontSize: '0.9rem' 
        }}>
          🏭 <strong>Émission de jetons</strong> : Créez de nouveaux jetons {ticker} (Offre variable).
        </div>

        <Input
          label="Quantité à émettre"
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="1000"
          disabled={!isCreator || processing}
          helperText="Nombre de jetons à créer (selon les décimales du token)"
        />

        {/* Bloc Frais avec calcul intelligent */}
        <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
          <ActionFeeEstimate actionType="mint" />
          {isCreator && (
            <NetworkFeesAvail 
              compact={true} 
              showActions={true} 
              estimatedFee={546} 
            />
          )}
        </div>
                
        <Button 
          type="submit" 
          variant="primary" 
          fullWidth 
          disabled={!genesisInfo.authPubkey || processing || !mintAmount} 
          style={{ height: '56px', fontSize: '1.1rem' }}
        >
          {processing ? '⏳ Émission...' : 'Confirmer l\'émission'}
        </Button>

        {!genesisInfo.authPubkey && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fef3c7', 
            border: '1px solid #fbbf24', 
            borderRadius: '8px', 
            color: '#92400e', 
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            ⚠️ Ce token a une offre fixe. L'émission n'est pas possible.
          </div>
        )}
      </form>
      
      {/* Historique des émissions */}
      <HistoryCollapse
        history={history}
        loadingHistory={loadingHistory}
        title="📜 Historique des émissions"
        compact={true}
        filterFn={h => h.action_type === 'MINT'}
      />
    </div>
  );
};

export default Mint;
