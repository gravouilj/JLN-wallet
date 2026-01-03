import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import { decryptMessage, isEncrypted } from '../../../utils/encryption';
import { Input, Button } from '../../../components/UI';

// Types
interface MessageDisplayProps {
  message: string;
  compact?: boolean;
}

/**
 * Composant pour afficher et décrypter un message OP_RETURN
 */
export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, compact = false }) => {
  const [showDecrypt, setShowDecrypt] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const encrypted = isEncrypted(message);

  const handleDecrypt = async (): Promise<void> => {
    if (!password) {
      setError('Veuillez entrer un mot de passe');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const decryptedText = await decryptMessage(message, password);
      setDecrypted(decryptedText);
      setShowDecrypt(false);
    } catch (err) {
      setError('Mot de passe incorrect ou message corrompu');
    } finally {
      setLoading(false);
    }
  };

  // Message non crypté
  if (!encrypted) {
    return (
      <div style={{ 
        fontSize: compact ? '0.85rem' : '0.95rem',
        color: 'var(--text-primary)',
        wordBreak: 'break-word'
      }}>
        {message}
      </div>
    );
  }

  // Message crypté - affichage compact
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
          🔒 Message crypté
        </span>
        <button
          onClick={() => setShowDecrypt(!showDecrypt)}
          style={{
            padding: '2px 8px',
            fontSize: '0.75rem',
            backgroundColor: '#eff6ff',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showDecrypt ? '❌' : '🔓 Décrypter'}
        </button>
      </div>
    );
  }

  // Message crypté - vue complète
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px'
    }}>
      {decrypted ? (
        // Message décrypté affiché
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
              ✅ Message décrypté
            </span>
            <button
              onClick={() => setDecrypted(null)}
              style={{
                padding: '2px 8px',
                fontSize: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Masquer
            </button>
          </div>
          <div style={{ 
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            wordBreak: 'break-word',
            padding: '8px',
            backgroundColor: '#fff',
            borderRadius: '6px'
          }}>
            {decrypted}
          </div>
        </>
      ) : (
        // Interface de décryptage
        <>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🔒</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>
              Message crypté
            </span>
          </div>

          {showDecrypt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Input
                type="password"
                placeholder="Entrez le mot de passe..."
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleDecrypt()}
              />
              {error && (
                <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                  ❌ {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  onClick={handleDecrypt}
                  disabled={loading || !password}
                  variant="primary"
                  style={{ flex: 1 }}
                >
                  {loading ? '⏳ Décryptage...' : '🔓 Décrypter'}
                </Button>
                <button
                  onClick={() => {
                    setShowDecrypt(false);
                    setPassword('');
                    setError(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDecrypt(true)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔓 Décrypter ce message
            </button>
          )}

          <div style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            marginTop: '8px',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            {message.substring(0, 60)}...
          </div>
        </>
      )}
    </div>
  );
};

export default MessageDisplay;
