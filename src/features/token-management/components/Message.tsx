import React, { useState, FormEvent, ChangeEvent, FocusEvent } from 'react';
import { useSetAtom } from 'jotai';
import { Input, Button } from '../../../components/UI';
import HistoryCollapse from '../../../components/HistoryCollapse';
import NetworkFeesAvail from '../../../components/eCash/NetworkFeesAvail';
import ActionFeeEstimate from './ActionFeeEstimate';
import AddressBookSelector from '../../../components/AddressBook/AddressBookSelector';
import AddressBookMultiSelector from '../../../components/AddressBook/AddressBookMultiSelector';
import { notificationAtom } from '../../../atoms';
import { addEntry, getHistoryByToken, ACTION_TYPES } from '../../../services/historyService';
import { encryptMessage, estimateEncryptedSize } from '../../../utils/encryption';
import { validateMessageSize } from '../../../utils/validation';
import { useActionSuccess } from '../../../hooks/useActionSuccess';
import type { EcashWallet } from '../../../services/ecashWallet';

// Types
type SendMode = 'single' | 'multiple';

interface TokenInfo {
  tokenId: string;
  mintBatons?: string[];
  decimals?: number;
  tokenType?: { number: number };
  [key: string]: unknown;
}

interface HistoryEntry {
  id: string;
  action_type: string;
  amount?: string;
  token_ticker?: string;
  created_at: string;
  tx_id?: string;
  details?: Record<string, unknown>;
}

interface MessageProps {
  activeTab: string;
  ticker: string;
  isCreator: boolean;
  history: HistoryEntry[];
  loadingHistory: boolean;
  tokenId: string;
  wallet: EcashWallet | null;
  tokenInfo: TokenInfo | null;
  onHistoryUpdate?: () => Promise<void>;
}

interface SendMessageParams {
  message: string;
  recipients: string[];
}

export const Message: React.FC<MessageProps> = ({
  activeTab,
  ticker,
  isCreator,
  history,
  loadingHistory,
  tokenId,
  wallet,
  tokenInfo,
  onHistoryUpdate
}) => {
  const setNotification = useSetAtom(notificationAtom);
  const [processing, setProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [recipient, setRecipient] = useState<string>('');
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [multipleRecipients, setMultipleRecipients] = useState<string>('');
  const [encryptionPassword, setEncryptionPassword] = useState<string>('');
  const [showEncryption, setShowEncryption] = useState<boolean>(false);
  const MAX_MESSAGE_BYTES = 220; // OP_RETURN limit in bytes

  // ✅ FIXED: Calculate actual UTF-8 byte size, not character count
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const byteSize = messageBytes.length;
  const remainingBytes = MAX_MESSAGE_BYTES - byteSize;
  const isOversized = byteSize > MAX_MESSAGE_BYTES;

  const handleActionSuccess = useActionSuccess();

  // Gérer l'envoi de message on-chain
  const handleSendMessage = async ({ message, recipients }: SendMessageParams): Promise<void> => {
    if (!message || message.trim().length === 0) {
      setNotification({ type: 'error', message: 'Le message ne peut pas être vide' });
      return;
    }

    // ✅ FIXED: Validate UTF-8 byte size, not character count
    const validation = validateMessageSize(message, MAX_MESSAGE_BYTES);
    if (!validation.valid) {
      setNotification({ type: 'error', message: validation.error });
      return;
    }

    setProcessing(true);
    try {
      let finalMessage = message;
      
      // Cryptage optionnel
      if (showEncryption && encryptionPassword) {
        try {
          finalMessage = await encryptMessage(message, encryptionPassword);
          
          // ✅ FIXED: Vérifier la taille UTF-8 après cryptage
          const encryptedValidation = validateMessageSize(finalMessage, MAX_MESSAGE_BYTES);
          if (!encryptedValidation.valid) {
            throw new Error(`Message crypté ${encryptedValidation.error}`);
          }
          
          setNotification({ type: 'info', message: '🔒 Message crypté avec succès' });
        } catch (encErr) {
          throw new Error(`Erreur cryptage: ${encErr.message}`);
        }
      }
      
      // Vérifier que la méthode sendMessage existe
      if (!wallet.sendMessage || typeof wallet.sendMessage !== 'function') {
        throw new Error('La fonctionnalité d\'envoi de message on-chain n\'est pas encore implémentée. Veuillez contacter le support.');
      }
      
      // Envoyer le message via OP_RETURN
      const result = await wallet.sendMessage(finalMessage);
      const txid = result.txid || result;
      
      // ✅ FIXED: Use centralized action success handler
      await handleActionSuccess({
        txid,
        amount: '0',
        ticker: tokenId || 'OP_RETURN',
        actionType: 'message',
        tokenId: tokenId || '',
        ownerAddress: typeof wallet?.getAddress === 'function' ? wallet.getAddress() : (wallet?.address || ''),
        details: { message, recipients: recipients && recipients.length > 0 ? recipients.join(', ') : null }
      });

      // Bonus: onHistoryUpdate callback
      if (onHistoryUpdate) {
        try {
          await onHistoryUpdate();
        } catch (err) {
          console.warn('⚠️ onHistoryUpdate erreur:', err);
        }
      }
      
      setMessage('');
      setRecipient('');
      setSelectedContactName('');
      setMultipleRecipients('');
    } catch (err) {
      console.error('❌ Erreur envoi message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Échec de l\'envoi du message';
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setProcessing(false);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    // Note: Les OP_RETURN messages sont publics et ne nécessitent pas de destinataire
    // Le message est simplement enregistré dans la blockchain
    
    if (!message || message.trim().length === 0) {
      setNotification({ type: 'error', message: 'Le message ne peut pas être vide' });
      return;
    }
    
    // ✅ FIXED: Validate UTF-8 byte size before proceeding
    const validation = validateMessageSize(message, MAX_MESSAGE_BYTES);
    if (!validation.valid) {
      setNotification({ type: 'error', message: validation.error });
      return;
    }
    
    // Les destinataires sont optionnels (pour historique uniquement)
    let recipients = [];
    if (sendMode === 'single' && recipient) {
      recipients = [recipient];
    } else if (sendMode === 'multiple' && multipleRecipients) {
      recipients = multipleRecipients.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }
    
    handleSendMessage({ message, recipients });
  };

  if (activeTab !== 'message') return null;

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
          padding: '12px 16px', 
          backgroundColor: '#eff6ff', 
          border: '1px solid #dbeafe', 
          borderRadius: '8px', 
          color: '#1e40af', 
          fontSize: '0.9rem' 
        }}>
          💬 <strong>Message on-chain</strong> : Envoyez un message public et permanent lié à {ticker}.
        </div>

        {/* Toggle Single/Multiple */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setSendMode('single')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: sendMode === 'single' ? 'var(--primary)' : '#f3f4f6',
              color: sendMode === 'single' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            👤 Un destinataire
          </button>
          <button
            type="button"
            onClick={() => setSendMode('multiple')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: sendMode === 'multiple' ? 'var(--primary)' : '#f3f4f6',
              color: sendMode === 'multiple' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            👥 Plusieurs destinataires
          </button>
        </div>

        {/* Champ destinataire(s) */}
        {sendMode === 'single' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Destinataire {selectedContactName && `(👤 ${selectedContactName})`}
              </label>
              <AddressBookSelector 
                tokenId={tokenId}
                onSelectContact={(address, name) => {
                  setRecipient(address);
                  setSelectedContactName(name);
                  setNotification({ type: 'success', message: `✅ Contact "${name}" sélectionné` });
                }}
              />
            </div>
            <Input
              value={recipient}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setRecipient(e.target.value);
                setSelectedContactName(''); // Effacer le nom si modifié manuellement
              }}
              placeholder="ecash:qp..."
              disabled={processing}
            />
          </div>
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
                Liste de destinataires (un par ligne)
              </label>
              <AddressBookMultiSelector
                tokenId={tokenId}
                onContactsSelected={(contacts) => {
                  const newLines = contacts.map(c => `${c.address}  # ${c.name}`).join('\n');
                  setMultipleRecipients(prev => prev ? `${prev}\n${newLines}` : newLines);
                  setNotification({ type: 'success', message: `✅ ${contacts.length} contact(s) ajouté(s)` });
                }}
              />
            </div>
            <textarea
              value={multipleRecipients}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMultipleRecipients(e.target.value)}
              placeholder="ecash:qp...&#10;ecash:qr...&#10;ecash:qs..."
              disabled={processing}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '1rem',
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
              onFocus={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.style.borderColor = 'var(--primary-color, #0074e4)'}
              onBlur={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)'}
            />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {multipleRecipients.split('\n').filter(l => l.trim()).length} adresse(s)
            </div>
          </div>
        )}

        {/* Textarea pour le message */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.9rem', 
            fontWeight: '600', 
            marginBottom: '8px', 
            color: 'var(--text-primary)' 
          }}>
            Votre message
          </label>
          <textarea
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            placeholder="Ex: Annonce importante pour les détenteurs de tokens..."
            disabled={processing}
            maxLength={MAX_MESSAGE_BYTES}
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
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
            onFocus={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.style.borderColor = 'var(--primary-color, #0074e4)'}
            onBlur={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)'}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '6px',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: 'var(--text-secondary, #6b7280)' }}>
              Le message sera visible publiquement sur la blockchain
            </span>
            <span style={{ 
              color: remainingBytes < 20 ? '#ef4444' : (isOversized ? '#ef4444' : 'var(--text-secondary, #6b7280)'),
              fontWeight: remainingBytes < 20 || isOversized ? '600' : '400'
            }}>
              {isOversized ? '❌' : '✅'} {byteSize} / {MAX_MESSAGE_BYTES} bytes UTF-8
            </span>
          </div>
        </div>

        {/* Option de cryptage */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input
              type="checkbox"
              id="enableEncryption"
              checked={showEncryption}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShowEncryption(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="enableEncryption"
              style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e40af', cursor: 'pointer' }}
            >
              🔐 Crypter le message (optionnel)
            </label>
          </div>
          
          {showEncryption && (
            <>
              <Input
                type="password"
                label="Mot de passe de cryptage"
                value={encryptionPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEncryptionPassword(e.target.value)}
                placeholder="Entrez un mot de passe sécurisé"
                disabled={processing}
              />
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#1e40af',
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#dbeafe',
                borderRadius: '6px'
              }}>
                ℹ️ <strong>Important :</strong> Le destinataire devra connaître ce mot de passe pour décrypter le message. 
                Le message crypté sera stocké publiquement sur la blockchain mais illisible sans le mot de passe.
              </div>
              {encryptionPassword && message && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b',
                  marginTop: '6px'
                }}>
                  Taille estimée après cryptage : ~{estimateEncryptedSize(message)} caractères
                </div>
              )}
            </>
          )}
        </div>

        {/* Avertissement permanence */}
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fef3c7', 
          border: '1px solid #fbbf24', 
          borderRadius: '8px', 
          color: '#92400e', 
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'start',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>
            <strong>Attention :</strong> Les messages on-chain sont permanents et ne peuvent pas être modifiés ou supprimés.
          </span>
        </div>

        {/* Bloc Frais avec calcul intelligent */}
        <div style={{ display: 'grid', gridTemplateColumns: isCreator ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
          <ActionFeeEstimate actionType="message" params={{ message }} />
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
          disabled={processing || !message || isOversized} 
          style={{ height: '56px', fontSize: '1.1rem' }}
        >
          {processing ? '⏳ Envoi du message...' : '💬 Publier le message'}
        </Button>
      </form>
      
      {/* Historique des messages */}
      <HistoryCollapse
        history={history}
        loadingHistory={loadingHistory}
        title="📜 Historique des messages"
        compact={true}
        filterFn={h => h.action_type === 'MESSAGE'}
      />
    </div>
  );
};

export default Message;
