import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useParams } from 'react-router-dom';
import { Input, Button, Modal } from '../../UI';
import HistoryCollapse from '../../HistoryCollapse';
import NetworkFeesAvail from '../NetworkFeesAvail';
import QrCodeScanner from '../QrCodeScanner';
import ActionFeeEstimate from './ActionFeeEstimate';
import AddressBookSelector from '../../AddressBook/AddressBookSelector';
import AddressBookMultiSelector from '../../AddressBook/AddressBookMultiSelector';
import { notificationAtom } from '../../../atoms';
import { addEntry, getHistoryByToken, ACTION_TYPES } from '../../../services/historyService';

export const Send = ({ 
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
  const [sendMode, setSendMode] = useState('single'); // 'single' ou 'multiple'
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [multipleRecipients, setMultipleRecipients] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dynamicFee, setDynamicFee] = useState(546); // Dust limit eCash
  const [selectedContactName, setSelectedContactName] = useState(''); // Nom du contact sélectionné
  
  const setNotification = useSetAtom(notificationAtom);

  const handleSetMax = () => {
    setSendAmount(formatAmount(myBalance, decimals));
  };

  // Gérer l'envoi de tokens
  const handleSendToken = async (e) => {
    e.preventDefault();
    
    if (sendMode === 'single') {
      // Envoi à un seul destinataire
      if (!sendAddress || !sendAmount) {
        setNotification({ type: 'error', message: 'Adresse et montant requis' });
        return;
      }

      setProcessing(true);
      try {
        const protocol = profileInfo?.protocol || tokenInfo?.protocol || 'ALP';
        const result = await wallet.sendToken(tokenId, sendAddress, sendAmount, decimals, protocol, sendMessage);
        
        setNotification({
          type: 'success',
          message: `✅ ${sendAmount} jetons envoyés ! TXID: ${result.txid.substring(0, 8)}...`
        });
        
        // Enregistrer dans l'historique
        try {
          const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || ticker || 'UNK';
          const safeOwner = wallet?.getAddress() || '';

          await addEntry({
            owner_address: safeOwner,
            token_id: tokenId,
            token_ticker: safeTicker,
            action_type: ACTION_TYPES.SEND,
            amount: sendAmount,
            tx_id: result.txid,
            details: { recipient: sendAddress, message: sendMessage || null }
          });
          
          // Rafraîchir l'historique via callback parent
          if (onHistoryUpdate) {
            await onHistoryUpdate();
          }
        } catch (histErr) {
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }
        
        setSendAddress('');
        setSendAmount('');
        setSendMessage('');
        
      } catch (err) {
        console.error('❌ Erreur envoi:', err);
        setNotification({ type: 'error', message: err.message || 'Échec de l\'envoi' });
      } finally {
        setProcessing(false);
      }
    } else {
      // Envoi à plusieurs destinataires
      if (!multipleRecipients || multipleRecipients.trim().length === 0) {
        setNotification({ type: 'error', message: 'Veuillez entrer les destinataires' });
        return;
      }

      setProcessing(true);
      try {
        // Parser les destinataires (format: adresse,montant par ligne)
        const lines = multipleRecipients.trim().split('\n');
        const recipients = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const parts = trimmed.split(',');
          if (parts.length !== 2) {
            throw new Error(`Format invalide: "${trimmed}". Utilisez: adresse,montant`);
          }
          
          const [address, amount] = parts.map(p => p.trim());
          if (!address.startsWith('ecash:')) {
            throw new Error(`Adresse invalide: ${address}`);
          }
          
          recipients.push({ address, amount });
        }

        if (recipients.length === 0) {
          throw new Error('Aucun destinataire valide trouvé');
        }

        const protocol = profileInfo?.protocol || tokenInfo?.protocol || 'ALP';
        const result = await wallet.sendTokenToMany(tokenId, recipients, decimals, protocol, sendMessage);
        
        setNotification({
          type: 'success',
          message: `✅ Envoyé à ${result.recipientsCount} destinataires ! TXID: ${result.txid.substring(0, 8)}...`
        });
        
        // Enregistrer dans l'historique
        try {
          const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || ticker || 'UNK';
          const safeOwner = wallet?.getAddress() || '';

          await addEntry({
            owner_address: safeOwner,
            token_id: tokenId,
            token_ticker: safeTicker,
            action_type: ACTION_TYPES.SEND,
            amount: recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0).toString(),
            tx_id: result.txid,
            details: { recipients, message: sendMessage || null }
          });
          
          // Rafraîchir l'historique via callback parent
          if (onHistoryUpdate) {
            await onHistoryUpdate();
          }
        } catch (histErr) {
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }
        
        setMultipleRecipients('');
        setSendMessage('');
        
      } catch (err) {
        console.error('❌ Erreur envoi multiple:', err);
        setNotification({ type: 'error', message: err.message || 'Échec de l\'envoi' });
      } finally {
        setProcessing(false);
      }
    }
  };

  // Gérer le scan QR
  const handleQrScan = (scannedAddress) => {
    setSendAddress(scannedAddress);
    setShowQrScanner(false);
    setNotification({ type: 'success', message: '✅ Adresse scannée' });
  };

  if (activeTab !== 'send') return null;

  return (
    <>
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderTop: 'none', 
        borderBottomLeftRadius: '12px', 
        borderBottomRightRadius: '12px', 
        padding: '32px 24px', 
        marginBottom: '24px' 
      }}>
        <form onSubmit={handleSendToken} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Info Box */}
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#eff6ff', 
            border: '1px solid #dbeafe', 
            borderRadius: '8px', 
            color: '#1e40af', 
            fontSize: '0.9rem'
          }}>
            💡 <strong>Envoyer des {ticker}</strong>
          </div>

          {/* Toggle Mode d'envoi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Mode d'envoi
            </label>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setSendMode('single')}
                disabled={processing}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: sendMode === 'single' ? '#ffffff' : 'transparent',
                  color: sendMode === 'single' ? '#0f172a' : '#64748b',
                  boxShadow: sendMode === 'single' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Envoyer à Un
              </button>
              <button
                type="button"
                onClick={() => setSendMode('multiple')}
                disabled={processing}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: sendMode === 'multiple' ? '#ffffff' : 'transparent',
                  color: sendMode === 'multiple' ? '#0f172a' : '#64748b',
                  boxShadow: sendMode === 'multiple' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Envoyer à Plusieurs
              </button>
            </div>
          </div>

          {sendMode === 'single' ? (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Destinataire {selectedContactName && `(👤 ${selectedContactName})`}
                  </label>
                  <AddressBookSelector 
                    tokenId={tokenId}
                    onSelectContact={(address, name) => {
                      setSendAddress(address);
                      setSelectedContactName(name);
                      setNotification({ type: 'success', message: `✅ Contact "${name}" sélectionné` });
                    }}
                  />
                </div>
                <Input
                  value={sendAddress}
                  onChange={(e) => {
                    setSendAddress(e.target.value);
                    setSelectedContactName(''); // Effacer le nom si l'adresse est modifiée manuellement
                  }}
                  placeholder="ecash:qp..."
                  disabled={processing}
                  rightIcon={
                    <button 
                      type="button" 
                      onClick={() => setShowQrScanner(true)} 
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.3rem',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      📷
                    </button>
                  }
                />
              </div>

              <Input
                label="Montant"
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                disabled={processing}
                actionButton={{
                  label: 'MAX',
                  onClick: handleSetMax
                }}
                helperText={`Solde disponible : ${formatAmount(myBalance, decimals)} ${ticker}`}
              />
            </>
          ) : (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  color: 'var(--text-primary)' 
                }}>
                  Destinataires (un par ligne)
                </label>
                <AddressBookMultiSelector
                  tokenId={tokenId}
                  onContactsSelected={(contacts) => {
                    const newLines = contacts.map(c => `${c.address},${sendAmount || '0'}  # ${c.name}`).join('\n');
                    setMultipleRecipients(prev => prev ? `${prev}\n${newLines}` : newLines);
                    setNotification({ type: 'success', message: `✅ ${contacts.length} contact(s) ajouté(s)` });
                  }}
                />
              </div>
              <textarea
                value={multipleRecipients}
                onChange={(e) => setMultipleRecipients(e.target.value)}
                placeholder="ecash:qp...,100&#10;ecash:qq...,50&#10;ecash:qr...,75"
                disabled={processing}
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-input, #fff)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color, #0074e4)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e5e7eb)'}
              />
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-secondary, #6b7280)', 
                marginTop: '4px'
              }}>
                Format: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>adresse,montant</code>
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-muted, #94a3b8)', 
                marginTop: '4px'
              }}>
                Solde disponible : {formatAmount(myBalance, decimals)} {ticker}
              </div>
            </div>
          )}

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
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Ajoutez un message à votre transaction..."
              disabled={processing}
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
              {sendMessage.length}/220 caractères
            </div>
          </div>

          {/* Bloc Frais avec calcul intelligent */}
          <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
            <ActionFeeEstimate 
              actionType="send" 
              params={{ message: sendMessage }}
              onFeeCalculated={(fee) => setDynamicFee(fee)}
            />
            {isCreator && (
              <NetworkFeesAvail 
                compact={true} 
                showActions={true} 
                estimatedFee={dynamicFee} 
              />
            )}
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            fullWidth 
            disabled={
              processing || 
              (sendMode === 'single' ? (!sendAddress || !sendAmount) : !multipleRecipients)
            } 
            style={{ height: '56px', fontSize: '1.1rem' }}
          >
            {processing ? '⏳ Envoi en cours...' : (sendMode === 'single' ? 'Envoyer' : 'Envoyer à tous')}
          </Button>
        </form>
        
        {/* Historique des envois */}
        <HistoryCollapse
          history={history}
          loadingHistory={loadingHistory}
          title="📜 Historique des envois"
          compact={true}
          filterFn={h => h.action_type === 'SEND'}
        />
      </div>

      {/* Modal QR Scanner */}
      <Modal isOpen={showQrScanner} onClose={() => setShowQrScanner(false)}>
        <Modal.Header>Scanner un QR Code</Modal.Header>
        <Modal.Body>
          <QrCodeScanner onScan={handleQrScan} />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Send;
