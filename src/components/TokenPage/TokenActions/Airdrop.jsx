import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../UI';
import HistoryList from '../../HistoryList';
import NetworkFeesAvail from '../../NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import AddressBook from '../../AddressBook';
import { notificationAtom } from '../../../atoms';
import { addEntry, getHistoryByToken, ACTION_TYPES } from '../../../services/historyService';
import addressBookService from '../../../services/addressBookService';

export const Airdrop = ({
  activeTab,
  ticker,
  xecBalance,
  isCreator,
  history,
  loadingHistory,
  tokenId,
  wallet,
  tokenInfo,
  onHistoryUpdate // Callback pour rafraîchir l'historique parent
}) => {
  const setNotification = useSetAtom(notificationAtom);
  const [airdropMode, setAirdropMode] = useState('equal');
  const [airdropTotal, setAirdropTotal] = useState('');
  const [minEligible, setMinEligible] = useState('');
  const [ignoreCreator, setIgnoreCreator] = useState(true);
  const [airdropMessage, setAirdropMessage] = useState(''); // Message optionnel
  const [holdersCount, setHoldersCount] = useState(null);
  const [calculatedHolders, setCalculatedHolders] = useState([]);
  const [isCalculationValid, setIsCalculationValid] = useState(false);
  const [airdropProcessing, setAirdropProcessing] = useState(false);
  const [loadingHolders, setLoadingHolders] = useState(false); // State local pour le chargement
  const [dynamicFee, setDynamicFee] = useState(650); // Frais calculés dynamiquement
  const [showAddressBook, setShowAddressBook] = useState(false); // Afficher/masquer le carnet d'adresses
  const [savingContact, setSavingContact] = useState(null); // Adresse en cours de sauvegarde
  const [contactName, setContactName] = useState(''); // Nom temporaire pour sauvegarde

  const handleSetMaxAirdrop = () => {
    // Réserver ~10 XEC pour les frais
    const maxAvailable = Math.max(0, xecBalance - 10);
    setAirdropTotal(maxAvailable.toFixed(2));
  };

  const onCalculate = async () => {
    const result = await handleCalculateAirdrop({
      airdropMode,
      airdropTotal,
      minEligible,
      ignoreCreator
    });
    
    if (result) {
      setHoldersCount(result.holdersCount);
      setCalculatedHolders(result.holders || []);
      setIsCalculationValid(true);
    }
  };

  const onExecute = async () => {
    setAirdropProcessing(true);
    try {
      await handleExecuteAirdrop({
        airdropMode,
        airdropTotal,
        holders: calculatedHolders
      });
      // Reset après succès
      setAirdropTotal('');
      setHoldersCount(null);
      setCalculatedHolders([]);
      setIsCalculationValid(false);
    } catch (error) {
      console.error('Airdrop error:', error);
    } finally {
      setAirdropProcessing(false);
    }
  };

  // Calculer le nombre de détenteurs pour l'airdrop
  const handleCalculateAirdrop = async () => {
    if (!airdropTotal || parseFloat(airdropTotal) <= 0) {
      setNotification({ type: 'error', message: 'Montant total requis' });
      return;
    }

    setLoadingHolders(true);
    try {
      console.log('👥 Calcul des détenteurs éligibles...');
      
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const minTokens = minEligible ? parseFloat(minEligible) : 0;
      
      // Utiliser la méthode du wallet
      const result = await wallet.calculateAirdropHolders(
        tokenId, 
        minTokens, 
        ignoreCreator, 
        decimals
      );
      
      // Calculer le montant XEC pour chaque détenteur
      const totalXec = parseFloat(airdropTotal);
      const isProportional = airdropMode === 'prorata';
      
      let holdersWithXec = [];
      
      if (isProportional) {
        // Mode proportionnel : calculer la somme des tokens des détenteurs ÉLIGIBLES
        const totalEligibleTokens = result.holders.reduce((sum, h) => sum + h.balanceFormatted, 0);
        
        holdersWithXec = result.holders.map(holder => {
          const percentage = holder.balanceFormatted / totalEligibleTokens;
          const xecAmount = totalXec * percentage;
          return {
            ...holder,
            xecAmount: xecAmount.toFixed(2)
          };
        });
      } else {
        // Mode égalitaire : montant identique pour tous
        const xecPerHolder = totalXec / result.count;
        
        holdersWithXec = result.holders.map(holder => ({
          ...holder,
          xecAmount: xecPerHolder.toFixed(2)
        }));
      }
      
      setHoldersCount(result.count);
      setCalculatedHolders(holdersWithXec);
      setIsCalculationValid(true); // Marquer le calcul comme valide
      
      setNotification({
        type: 'success',
        message: `✅ ${result.count} détenteur${result.count > 1 ? 's' : ''} éligible${result.count > 1 ? 's' : ''} trouvé${result.count > 1 ? 's' : ''}`
      });
      
      console.log(`✅ Détenteurs éligibles: ${result.count}`, holdersWithXec.slice(0, 5));
      
    } catch (err) {
      console.error('❌ Erreur calcul détenteurs:', err);
      setNotification({ 
        type: 'error', 
        message: 'Impossible de calculer les détenteurs' 
      });
    } finally {
      setLoadingHolders(false);
    }
  };

  // Recalculer les montants XEC quand le montant total ou le mode change
  useEffect(() => {
    if (calculatedHolders.length === 0 || !airdropTotal || parseFloat(airdropTotal) <= 0) return;
    
    // Invalider le calcul car les param\u00e8tres ont chang\u00e9\n    setIsCalculationValid(false);
    
    const totalXec = parseFloat(airdropTotal);
    const isProportional = airdropMode === 'prorata';
    
    let holdersWithXec = [];
    
    if (isProportional) {
      // Calculer la somme des tokens des détenteurs éligibles
      const totalEligibleTokens = calculatedHolders.reduce((sum, h) => sum + h.balanceFormatted, 0);
      
      holdersWithXec = calculatedHolders.map(holder => {
        const percentage = holder.balanceFormatted / totalEligibleTokens;
        const xecAmount = totalXec * percentage;
        return {
          ...holder,
          xecAmount: xecAmount.toFixed(2)
        };
      });
    } else {
      const xecPerHolder = totalXec / calculatedHolders.length;
      
      holdersWithXec = calculatedHolders.map(holder => ({
        ...holder,
        xecAmount: xecPerHolder.toFixed(2)
      }));
    }
    
    setCalculatedHolders(holdersWithXec);
  }, [airdropTotal, airdropMode]);

  // Invalider le calcul quand les paramètres de filtrage changent
  useEffect(() => {
    if (isCalculationValid) {
      setIsCalculationValid(false);
    }
  }, [minEligible, ignoreCreator]);

  // Distribuer XEC aux détenteurs (Airdrop)
  const handleExecuteAirdrop = async () => {
    if (!holdersCount || holdersCount === 0) {
      setNotification({ type: 'error', message: 'Veuillez d\'abord calculer le nombre de détenteurs' });
      return;
    }

    if (!airdropTotal || parseFloat(airdropTotal) <= 0) {
      setNotification({ type: 'error', message: 'Montant total requis' });
      return;
    }

    const totalXec = parseFloat(airdropTotal);
    const isProportional = airdropMode === 'prorata';

    setAirdropProcessing(true);
    try {
      console.log(`🎁 Lancement Airdrop: ${totalXec} XEC (${isProportional ? 'Pro-Rata' : 'Égalitaire'})`);
      
      const result = await wallet.airdrop(tokenId, totalXec, isProportional, ignoreCreator, minEligible, airdropMessage);
      
      setNotification({
        type: 'success',
        message: `🎉 Distribution réussie vers ${result.recipientsCount} destinataires ! TXID: ${result.txid.substring(0, 8)}...`
      });
      
      // Enregistrer dans l'historique
      try {
        // Récupération sécurisée des données pour l'historique
        const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || 'UNK';
        const safeOwner = typeof wallet?.getAddress === 'function' ? wallet.getAddress() : (wallet?.address || '');

        console.log('📝 Enregistrement historique Airdrop...', { safeTicker, safeOwner });

        await addEntry({
          owner_address: safeOwner,
          token_id: tokenId,
          token_ticker: safeTicker,
          action_type: ACTION_TYPES.AIRDROP,
          amount: airdropTotal.toString(),
          tx_id: result.txid,
          details: {
            recipients_count: result.recipientsCount,
            mode: airdropMode,
            ignore_creator: ignoreCreator,
            message: airdropMessage || null
          }
        });
        
        // Rafraîchir l'historique via callback parent
        if (onHistoryUpdate) {
          await onHistoryUpdate();
        }
      } catch (histErr) {
        console.warn('⚠️ Erreur enregistrement historique:', histErr);
      }
      
      // Afficher détails dans la console
      console.log('📊 Résultat Airdrop:', result);
      
      // Réinitialiser le formulaire
      setAirdropTotal('');
      setMinEligible('');
      setAirdropMessage('');
      setHoldersCount(null);
      setCalculatedHolders([]);
      setIsCalculationValid(false);
      
      // Recharger le solde XEC
      setTimeout(async () => {
        try {
          const xecBalanceData = await wallet.getBalance(true);
          setXecBalance(xecBalanceData.balance || 0);
        } catch (err) {
          console.warn('⚠️ Échec rechargement solde XEC:', err);
        }
      }, 2000);
      
    } catch (err) {
      console.error('❌ Erreur Airdrop:', err);
      setNotification({ 
        type: 'error', 
        message: err.message || 'Échec de la distribution' 
      });
    } finally {
      setAirdropProcessing(false);
    }
  };

  // Invalider le calcul si les paramètres changent
  const handleParamChange = (setter) => (value) => {
    setter(value);
    setIsCalculationValid(false);
  };

  if (activeTab !== 'airdrop') return null;

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
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        
        {/* Info Box */}
        <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', color: '#1e40af', fontSize: '0.9rem' }}>
          💡 <strong>Distribution de XEC</strong> : Envoyez des eCash à tous les détenteurs de {ticker}.
        </div>
        
        {/* Mode de distribution */}
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Mode de distribution
          </label>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => handleParamChange(setAirdropMode)('equal')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: airdropMode === 'equal' ? '#ffffff' : 'transparent',
                color: airdropMode === 'equal' ? '#0f172a' : '#64748b',
                boxShadow: airdropMode === 'equal' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Égalitaire
            </button>
            <button
              type="button"
              onClick={() => handleParamChange(setAirdropMode)('prorata')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: airdropMode === 'prorata' ? '#ffffff' : 'transparent',
                color: airdropMode === 'prorata' ? '#0f172a' : '#64748b',
                boxShadow: airdropMode === 'prorata' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Pro-Rata
            </button>
          </div>
        </div>
        
        {/* Checkbox Ignorer Créateur */}
        <div 
          onClick={() => handleParamChange(setIgnoreCreator)(!ignoreCreator)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
            border: `1px solid ${ignoreCreator ? '#3b82f6' : '#e2e8f0'}`,
            backgroundColor: ignoreCreator ? '#eff6ff' : '#ffffff',
            borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <input type="checkbox" checked={ignoreCreator} readOnly style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#1e293b' }}>Ignorer le créateur (Moi)</span>
        </div>
        
        <Input
          label="Montant total à distribuer (XEC)"
          type="number"
          value={airdropTotal}
          onChange={(e) => handleParamChange(setAirdropTotal)(e.target.value)}
          placeholder="1000.00"
          actionButton={{ label: 'MAX', onClick: handleSetMaxAirdrop }}
          helperText={`Disponible : ${xecBalance.toFixed(2)} XEC`}
        />

        {/* Message optionnel */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.9rem', 
            fontWeight: '600', 
            marginBottom: '8px', 
            color: 'var(--text-primary)' 
          }}>
            Message (optionnel)
          </label>
          <textarea
            value={airdropMessage}
            onChange={(e) => setAirdropMessage(e.target.value)}
            placeholder="Ajoutez un message à votre distribution..."
            disabled={airdropProcessing}
            maxLength={220}
            rows={2}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '0.95rem',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-input, #fff)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color, #0074e4)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e5e7eb)'}
          />
          <div style={{ 
            fontSize: '0.8rem', 
            color: 'var(--text-secondary, #6b7280)', 
            marginTop: '4px',
            textAlign: 'right' 
          }}>
            {airdropMessage.length}/220 caractères
          </div>
        </div>

        <Input
          label="Solde minimum requis (Optionnel)"
          type="number"
          value={minEligible}
          onChange={(e) => handleParamChange(setMinEligible)(e.target.value)}
          placeholder="0.00"
          helperText="Ex: 10 (Seuls ceux qui ont > 10 jetons recevront)"
        />

        {/* Actions & Résultats */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Bouton Calculer */}
          {(!isCalculationValid || holdersCount === null) && (
            <Button onClick={onCalculate} variant="secondary" fullWidth disabled={loadingHolders || !airdropTotal} style={{ height: '56px' }}>
              {loadingHolders ? '⏳ Calcul en cours...' : '🔍 Calculer les détenteurs'}
            </Button>
          )}

          {/* RÉSULTAT DÉTAILLÉ */}
          {holdersCount !== null && (
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Résultat du scan</span>
                <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {holdersCount} éligible{holdersCount > 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Liste scrollable des adresses */}
              {calculatedHolders.length > 0 && (
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
                  {calculatedHolders.map((holder, idx) => {
                    // Vérifier si l'adresse existe dans le carnet
                    const contact = addressBookService.getContactByAddress(holder.address, tokenId);
                    const displayName = contact ? contact.name : null;
                    const isEditing = savingContact === holder.address;

                    return (
                      <div key={idx} style={{ 
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: '#fff',
                        borderRadius: '10px',
                        border: `1px solid ${displayName ? '#3b82f6' : '#e2e8f0'}`,
                        transition: 'all 0.2s'
                      }}>
                        {/* Nom du contact si existe */}
                        {displayName && (
                          <div style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: '600', 
                            color: '#3b82f6',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            👤 {displayName}
                          </div>
                        )}

                        {/* Ligne principale : Adresse + Solde + XEC */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div 
                              onClick={() => {
                                navigator.clipboard.writeText(holder.address);
                                setNotification({ type: 'success', message: '📋 Adresse copiée' });
                              }}
                              style={{ 
                                fontFamily: 'monospace', 
                                fontSize: '0.8rem',
                                color: displayName ? '#64748b' : '#1e293b',
                                cursor: 'pointer',
                                wordBreak: 'break-all',
                                padding: '4px 8px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                              title="Cliquer pour copier l'adresse complète"
                            >
                              {holder.address}
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#94a3b8',
                              marginTop: '4px'
                            }}>
                              💰 {Number(holder.balanceFormatted).toLocaleString()} jetons
                            </div>
                          </div>
                          <div style={{ 
                            fontWeight: '700', 
                            color: '#16a34a',
                            fontSize: '0.9rem',
                            marginLeft: '12px',
                            whiteSpace: 'nowrap'
                          }}>
                            + {holder.xecAmount} XEC
                          </div>
                        </div>

                        {/* Actions : Sauvegarder dans carnet */}
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <input
                              type="text"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              placeholder="Nom du contact"
                              autoFocus
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                fontSize: '0.85rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                outline: 'none'
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && contactName.trim()) {
                                  addressBookService.saveContact(holder.address, contactName.trim(), tokenId);
                                  setNotification({ type: 'success', message: `✅ "${contactName}" ajouté au carnet` });
                                  setContactName('');
                                  setSavingContact(null);
                                  // Forcer le re-render
                                  setCalculatedHolders([...calculatedHolders]);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (contactName.trim()) {
                                  addressBookService.saveContact(holder.address, contactName.trim(), tokenId);
                                  setNotification({ type: 'success', message: `✅ "${contactName}" ajouté au carnet` });
                                  setContactName('');
                                  setSavingContact(null);
                                  setCalculatedHolders([...calculatedHolders]);
                                }
                              }}
                              disabled={!contactName.trim()}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                border: 'none',
                                backgroundColor: contactName.trim() ? '#3b82f6' : '#cbd5e1',
                                color: '#fff',
                                borderRadius: '6px',
                                cursor: contactName.trim() ? 'pointer' : 'not-allowed'
                              }}
                            >
                              ✅
                            </button>
                            <button
                              onClick={() => {
                                setSavingContact(null);
                                setContactName('');
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                border: 'none',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            {!displayName ? (
                              <button
                                onClick={() => {
                                  setSavingContact(holder.address);
                                  setContactName('');
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  border: '1px solid #3b82f6',
                                  backgroundColor: '#eff6ff',
                                  color: '#3b82f6',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  flex: 1
                                }}
                              >
                                💾 Sauvegarder dans le carnet
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`Supprimer "${displayName}" du carnet ?`)) {
                                    addressBookService.deleteContact(holder.address, tokenId);
                                    setNotification({ type: 'success', message: '🗑️ Contact supprimé' });
                                    setCalculatedHolders([...calculatedHolders]);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  border: '1px solid #ef4444',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  flex: 1
                                }}
                              >
                                🗑️ Retirer du carnet
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {holdersCount === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', fontSize: '0.9rem' }}>
                  Aucun détenteur ne correspond aux critères.
                </div>
              )}
            </div>
          )}

          {/* AVERTISSEMENT SI MODIFIÉ */}
          {!isCalculationValid && holdersCount !== null && (
            <div style={{ padding: '12px', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', color: '#9a3412', fontSize: '0.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>⚠️</span> Paramètres modifiés, veuillez recalculer.
            </div>
          )}

          {/* Bloc Frais avec calcul intelligent */}
          <ActionFeeEstimate 
            actionType="airdrop" 
            params={{ 
              recipients: calculatedHolders.length || 1,
              message: airdropMessage 
            }}
            onFeeCalculated={(fee) => setDynamicFee(fee)}
          />

          {/* Frais Réseau (si créateur) */}
          {isCreator && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <NetworkFeesAvail 
                  compact={true} 
                  showActions={true} 
                  estimatedFee={dynamicFee} 
                />
              </div>
            </div>
          )}

          {/* Bouton Distribuer */}
          <Button 
            onClick={onExecute} 
            variant="primary" 
            fullWidth
            disabled={airdropProcessing || !isCalculationValid || holdersCount === 0}
            style={{ height: '56px', backgroundColor: isCalculationValid ? '#16a34a' : '#94a3b8' }} 
          >
            {airdropProcessing ? '⏳ Distribution en cours...' : '🎁 Distribuer maintenant'}
          </Button>

          {/* Bouton Carnet d'adresses du jeton */}
          {isCreator && (
            <button
              onClick={() => setShowAddressBook(!showAddressBook)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                border: '2px solid #cbd5e1',
                backgroundColor: showAddressBook ? '#eff6ff' : '#fff',
                color: showAddressBook ? '#3b82f6' : '#64748b',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📇 {showAddressBook ? 'Masquer' : 'Afficher'} le carnet d'adresses du jeton
            </button>
          )}
        </div>
      </form>

      {/* Carnet d'adresses du jeton (masquable) */}
      {isCreator && showAddressBook && (
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <AddressBook tokenId={tokenId} compact={true} />
        </div>
      )}
      
      {/* Historique des distributions */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
          📜 Historique des distributions
        </h3>
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>⏳ Chargement...</div>
        ) : (
          <HistoryList history={history.filter(h => h.action_type === 'AIRDROP')} compact />
        )}
      </div>
    </div>
  );
};

export default Airdrop;
