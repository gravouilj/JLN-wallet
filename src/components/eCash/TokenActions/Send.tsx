import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button, Modal } from '../../UI';
import HistoryCollapse from '../../HistoryCollapse';
import NetworkFeesAvail from '../NetworkFeesAvail';
import QrCodeScanner from '../QrCodeScanner';
import ActionFeeEstimate from './ActionFeeEstimate';
import AddressBookSelector from '../../AddressBook/AddressBookSelector';
import AddressBookMultiSelector from '../../AddressBook/AddressBookMultiSelector';
import { notificationAtom } from '../../../atoms';
import { addEntry, ACTION_TYPES } from '../../../services/historyService';
import { useSendToken } from '../../../hooks/useSendToken';

interface SendProps {
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
 * Composant Send refactorisé avec useSendToken hook
 * Responsabilités:
 * - UI pour la saisie d'adresses et montants
 * - Gestion du mode single/multiple
 * - Historique des transactions
 * - Intégration du scanner QR
 * 
 * La logique métier (validation, wallet appel) est dans useSendToken
 */
export const Send: React.FC<SendProps> = ({
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
  const [sendMode, setSendMode] = useState<'single' | 'multiple'>('single');
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [multipleRecipients, setMultipleRecipients] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [dynamicFee, setDynamicFee] = useState(546);
  const [selectedContactName, setSelectedContactName] = useState('');

  // Hook métier
  const { isLoading, error, send, reset } = useSendToken();

  const setNotification = useSetAtom(notificationAtom);

  const handleSetMax = () => {
    setSendAmount(formatAmount(myBalance, decimals));
  };

  const handleSendToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sendMode === 'single') {
      // Envoi simple
      const txid = await send({
        address: sendAddress,
        amount: sendAmount,
        message: sendMessage || undefined,
      });

      if (txid) {
        setNotification({
          type: 'success',
          message: `✅ ${sendAmount} jetons envoyés ! TXID: ${txid.substring(0, 8)}...`,
        });

        // Enregistrer historique
        try {
          const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || ticker || 'UNK';
          const safeOwner = wallet?.getAddress() || '';

          await addEntry({
            owner_address: safeOwner,
            token_id: tokenId,
            token_ticker: safeTicker,
            action_type: ACTION_TYPES.SEND,
            amount: sendAmount,
            tx_id: txid,
            details: { recipient: sendAddress, message: sendMessage || null },
          });

          if (onHistoryUpdate) {
            await onHistoryUpdate();
          }
        } catch (histErr) {
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }

        // Reset forms
        setSendAddress('');
        setSendAmount('');
        setSendMessage('');
        reset();
      } else if (error) {
        setNotification({ type: 'error', message: error });
      }
    } else {
      // Envoi multiple - Parser les destinataires
      const lines = multipleRecipients.trim().split('\n');
      const recipients = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(',');
        if (parts.length !== 2) {
          setNotification({
            type: 'error',
            message: `Format invalide: "${trimmed}". Utilisez: adresse,montant`,
          });
          return;
        }

        const [address, amount] = parts.map((p) => p.trim());
        recipients.push({ address, amount });
      }

      if (recipients.length === 0) {
        setNotification({ type: 'error', message: 'Aucun destinataire valide trouvé' });
        return;
      }

      // Utiliser sendTokenToMany pour envoyer en une seule transaction
      try {
        if (!wallet) {
          setNotification({ type: 'error', message: 'Wallet non connecté' });
          return;
        }

        const protocol = profileInfo?.protocol || tokenInfo?.protocol || 'ALP';
        const result = await wallet.sendTokenToMany(tokenId, recipients, decimals, protocol, sendMessage || null);

        setNotification({
          type: 'success',
          message: `✅ Envoyé à ${result.recipientsCount} destinataires ! TXID: ${result.txid.substring(0, 8)}...`,
        });

        // Enregistrer dans l'historique
        try {
          const safeTicker = tokenInfo?.genesisInfo?.tokenTicker || ticker || 'UNK';
          const safeOwner = wallet?.getAddress() || '';
          const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0).toString();

          await addEntry({
            owner_address: safeOwner,
            token_id: tokenId,
            token_ticker: safeTicker,
            action_type: ACTION_TYPES.SEND,
            amount: totalAmount,
            tx_id: result.txid,
            details: { recipients: recipients.length, message: sendMessage || null },
          });

          if (onHistoryUpdate) {
            await onHistoryUpdate();
          }
        } catch (histErr) {
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }

        setMultipleRecipients('');
        setSendMessage('');
        reset();
      } catch (err: any) {
        const errorMsg = err.message || 'Échec de l\'envoi multiple';
        console.error('❌ Erreur envoi multiple:', errorMsg, err);
        setNotification({ type: 'error', message: errorMsg });
      }
    }
  };

  const handleQrScan = (scannedAddress: string) => {
    setSendAddress(scannedAddress);
    setShowQrScanner(false);
    setNotification({ type: 'success', message: '✅ Adresse scannée' });
  };

  if (activeTab !== 'send') return null;

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
        <form onSubmit={handleSendToken} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Info Box */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '8px',
              color: '#1e40af',
              fontSize: '0.9rem',
            }}
          >
            💡 <strong>Envoyer des {ticker}</strong>
          </div>

          {/* Toggle Mode d'envoi */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--text-primary)',
              }}
            >
              Mode d'envoi
            </label>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setSendMode('single')}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: sendMode === 'single' ? '#ffffff' : 'transparent',
                  color: sendMode === 'single' ? '#0f172a' : '#64748b',
                  boxShadow: sendMode === 'single' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Envoyer à Un
              </button>
              <button
                type="button"
                onClick={() => setSendMode('multiple')}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: sendMode === 'multiple' ? '#ffffff' : 'transparent',
                  color: sendMode === 'multiple' ? '#0f172a' : '#64748b',
                  boxShadow: sendMode === 'multiple' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Envoyer à Plusieurs
              </button>
            </div>
          </div>

          {/* Single Mode */}
          {sendMode === 'single' ? (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Destinataire {selectedContactName && `(👤 ${selectedContactName})`}
                  </label>
                  <AddressBookSelector
                    tokenId={tokenId}
                    onSelectContact={(address: string, name: string) => {
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
                    setSelectedContactName('');
                  }}
                  placeholder="ecash:qp..."
                  disabled={isLoading}
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
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
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
                disabled={isLoading}
                actionButton={{
                  label: 'MAX',
                  onClick: handleSetMax,
                }}
                helperText={`Solde disponible : ${formatAmount(myBalance, decimals)} ${ticker}`}
              />
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Destinataires (un par ligne)
                </label>
                <AddressBookMultiSelector
                  tokenId={tokenId}
                  onContactsSelected={(contacts: any[]) => {
                    const newLines = contacts.map((c) => `${c.address},${sendAmount || '0'}  # ${c.name}`).join('\n');
                    setMultipleRecipients((prev) => (prev ? `${prev}\n${newLines}` : newLines));
                    setNotification({ type: 'success', message: `✅ ${contacts.length} contact(s) ajouté(s)` });
                  }}
                />
              </div>
              <textarea
                value={multipleRecipients}
                onChange={(e) => setMultipleRecipients(e.target.value)}
                placeholder="ecash:qp...,100&#10;ecash:qq...,50&#10;ecash:qr...,75"
                disabled={isLoading}
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
                  resize: 'vertical',
                }}
                onFocus={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--primary-color, #0074e4)')}
                onBlur={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--border-color, #e5e7eb)')}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', marginTop: '4px' }}>
                Format: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>adresse,montant</code>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                Solde disponible : {formatAmount(myBalance, decimals)} {ticker}
              </div>
            </div>
          )}

          {/* Message optionnel */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--text-primary)',
              }}
            >
              Message (optionnel)
            </label>
            <textarea
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Ajoutez un message à votre transaction..."
              disabled={isLoading}
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
                resize: 'vertical',
              }}
              onFocus={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--primary-color, #0074e4)')}
              onBlur={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--border-color, #e5e7eb)')}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', marginTop: '4px', textAlign: 'right' }}>
              {sendMessage.length}/220 caractères
            </div>
          </div>

          {/* Frais */}
          <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
            <ActionFeeEstimate actionType="send" params={{ message: sendMessage }} onFeeCalculated={(fee: any) => setDynamicFee(fee)} />
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
            disabled={
              isLoading || (sendMode === 'single' ? !sendAddress || !sendAmount : !multipleRecipients)
            }
            style={{ height: '56px', fontSize: '1.1rem' }}
          >
            {isLoading ? '⏳ Envoi en cours...' : sendMode === 'single' ? 'Envoyer' : 'Envoyer à tous'}
          </Button>
        </form>

        {/* Historique */}
        <HistoryCollapse
          history={history}
          loadingHistory={loadingHistory}
          title="📜 Historique des envois"
          compact={true}
          filterFn={(h: any) => h.action_type === 'SEND'}
        />
      </div>

      {/* QR Scanner Modal */}
      <Modal isOpen={showQrScanner} onClose={() => setShowQrScanner(false)}>
        <Modal.Header>Scanner un QR Code</Modal.Header>
        <Modal.Body>
          <QrCodeScanner onAddressDetected={handleQrScan} />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Send;
