import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../UI';
import HistoryCollapse from '../../HistoryCollapse';
import NetworkFeesAvail from '../NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import { notificationAtom } from '../../../atoms';
import { addEntry, getHistoryByToken, ACTION_TYPES } from '../../../services/historyService';

export const Burn = ({
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
  onHistoryUpdate // Callback pour rafraîchir l'historique parent
}) => {
  const setNotification = useSetAtom(notificationAtom);
  const [processing, setProcessing] = useState(false);
  const [localHistory, setLocalHistory] = useState(history);
  const [burnAmount, setBurnAmount] = useState('');

 // Gérer la destruction (Burn)
  const handleBurn = async (data) => {
    const amount = data?.burnAmount || burnAmount;
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({ type: 'error', message: 'Montant invalide' });
      return;
    }

    // AVERTISSEMENT : Vérifier si on brûle tout + si on a un mint baton
    const burnAmountBigInt = BigInt(Math.round(parseFloat(amount) * Math.pow(10, tokenInfo?.genesisInfo?.decimals || 0)));
    const myBalanceBigInt = BigInt(myBalance || '0');
    const isBurningAll = burnAmountBigInt >= myBalanceBigInt;
    
    if (isBurningAll && isCreator) {
      const confirmMsg = "⚠️ ATTENTION : Vous allez détruire TOUS vos tokens. Si le mint baton est inclus, vous ne pourrez PLUS JAMAIS créer de nouveaux tokens pour ce tokenId. Continuer ?";
      if (!window.confirm(confirmMsg)) {
        setProcessing(false);
        return;
      }
    } else if (parseFloat(amount) > parseFloat(myBalance) * 0.5) {
      // Avertissement si burn > 50%
      if (!window.confirm(`⚠️ Vous allez détruire ${amount} tokens (${((parseFloat(amount) / parseFloat(myBalance)) * 100).toFixed(0)}% de votre solde). Continuer ?`)) {
        setProcessing(false);
        return;
      }
    }

    setProcessing(true);
    try {
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const protocol = profileInfo?.protocol || tokenInfo?.protocol || 'ALP';
      const result = await wallet.burnToken(tokenId, parseInt(amount), decimals, protocol);
      const txid = result.txid || result;
      
      setNotification({
        type: 'success',
        message: `🔥 ${amount} jetons détruits ! TXID: ${txid.substring(0, 8)}...`
      });
      
      // Enregistrer dans l'historique
      try {
        // Récupération sécurisée des données pour l'historique
        const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || 'UNK';
        const safeOwner = typeof wallet?.getAddress === 'function' ? wallet.getAddress() : (wallet?.address || '');

        console.log('📝 Enregistrement historique Burn...', { safeTicker, safeOwner });

        await addEntry({
          owner_address: safeOwner,
          token_id: tokenId,
          token_ticker: safeTicker,
          action_type: ACTION_TYPES.BURN,
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
      
      setBurnAmount('');
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 2000);
    } catch (err) {
      console.error('❌ Erreur burn:', err);
      setNotification({ type: 'error', message: err.message || 'Échec de la destruction' });
    } finally {
      setProcessing(false);
    }
  };

  // Définir le MAX pour burn
  const handleSetMaxBurn = () => {
    const decimals = tokenInfo?.genesisInfo?.decimals || 0;
    const maxAmount = formatAmount(myBalance, decimals);
    setBurnAmount(maxAmount);
  };
  
  const onSubmit = (e) => {
    e.preventDefault();
    handleBurn({ burnAmount });
  };

  if (activeTab !== 'burn' || !isCreator) return null;

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
        
        {/* Avertissement style "Alert" */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fefce8', 
          border: '1px solid #fde047', 
          borderRadius: '8px', 
          color: '#854d0e', 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'start',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong>Action irréversible :</strong> Les jetons détruits seront définitivement retirés de la circulation.
          </div>
        </div>
        
        <Input
          label="Quantité à détruire"
          type="number"
          value={burnAmount}
          onChange={(e) => setBurnAmount(e.target.value)}
          placeholder="100"
          disabled={processing}
          actionButton={{
            label: 'MAX',
            onClick: handleSetMaxBurn
          }}
          helperText={`Solde disponible : ${formatAmount(myBalance, decimals)} ${ticker}`}
        />

        {/* Bloc Frais avec calcul intelligent */}
        <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
          <ActionFeeEstimate actionType="burn" />
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
          variant="danger" 
          fullWidth 
          disabled={processing || !burnAmount} 
          style={{ height: '56px', fontSize: '1.1rem', marginTop: '8px' }}
        >
          {processing ? '⏳ Destruction...' : '🔥 Détruire définitivement'}
        </Button>
      </form>
      
      {/* Historique des destructions */}
      <HistoryCollapse
        history={history}
        loadingHistory={loadingHistory}
        title="📜 Historique des destructions"
        compact={true}
        filterFn={h => h.action_type === 'BURN'}
      />
    </div>
  );
};

export default Burn;
