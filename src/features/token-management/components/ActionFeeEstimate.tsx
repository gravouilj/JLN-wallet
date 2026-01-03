import React, { useState, useEffect } from 'react';

// Types
type ActionType = 'send' | 'airdrop' | 'mint' | 'burn' | 'message';

interface ActionFeeEstimateParams {
  message?: string;
  recipients?: number;
}

interface ActionFeeEstimateProps {
  actionType: ActionType;
  params?: ActionFeeEstimateParams;
  onFeeCalculated?: (fee: number) => void;
}

const DUST_LIMIT = 546;

/**
 * ActionFeeEstimate - Calcule les frais réels d'une transaction selon son type
 */
export const ActionFeeEstimate: React.FC<ActionFeeEstimateProps> = ({ 
  actionType, 
  params = {}, 
  onFeeCalculated 
}) => {
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    calculateFee();
  }, [actionType, JSON.stringify(params)]);

  const calculateFee = async (): Promise<void> => {
    try {
      setIsCalculating(true);
      let feeInSats = 0;

      // Estimation basée sur le poids typique de chaque type de transaction
      switch (actionType) {
        case 'send':
          // Token send: 1 input token + 1 input XEC + OP_RETURN + 1 output dest + 1 change
          // ~400-500 bytes
          feeInSats = estimateTokenSend(params);
          break;

        case 'airdrop':
          // Airdrop: 1 input token + N inputs XEC + OP_RETURN + N outputs dest + 1 change
          // Variable selon nombre de destinataires
          feeInSats = estimateAirdrop(params);
          break;

        case 'mint':
          // Mint: 1 input mintBaton + 1 input XEC + OP_RETURN + 1 output token + 1 mintBaton change
          // ~450 bytes, minimum dust limit
          feeInSats = 546;
          break;

        case 'burn':
          // Burn: 1 input token + 1 input XEC + OP_RETURN + potentiellement 1 change
          // ~400 bytes, minimum dust limit
          feeInSats = 546;
          break;

        case 'message':
          // Message: 1-2 inputs XEC + OP_RETURN (taille variable) + 1 change
          feeInSats = estimateMessage(params);
          break;

        default:
          feeInSats = 546; // Dust limit par défaut
      }

      setEstimatedFee(feeInSats);
      
      // Appel du callback si fourni
      if (onFeeCalculated && typeof onFeeCalculated === 'function') {
        onFeeCalculated(feeInSats);
      }
    } catch (error) {
      console.error('Error calculating fee:', error);
      setEstimatedFee(546); // Fallback au dust limit
      if (onFeeCalculated && typeof onFeeCalculated === 'function') {
        onFeeCalculated(546);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const estimateTokenSend = (params: ActionFeeEstimateParams): number => {
    const { message = '' } = params;
    
    // Transaction token send standard: ~400-500 bytes
    // Avec OP_RETURN message: +length du message
    // Fee rate: 1 sat/byte
    // Dust limit: 546 sats minimum
    
    const baseTxSize = 450; // Taille moyenne d'une tx token send
    const messageSize = message ? message.length : 0;
    const totalSize = baseTxSize + messageSize;
    
    // 1 sat/byte, minimum 546 sats (dust limit)
    return Math.max(546, totalSize);
  };

  const estimateAirdrop = (params: ActionFeeEstimateParams): number => {
    const { recipients = 1, message = '' } = params;
    
    // Airdrop/multi-send:
    // - Base: ~250 bytes
    // - +34 bytes par output supplémentaire
    // - +150 bytes par input XEC supplémentaire (si nécessaire)
    
    const numRecipients = Math.max(1, recipients);
    const baseSize = 250;
    const outputSize = numRecipients * 34;
    
    // 1 input supplémentaire tous les 5 outputs environ
    const extraInputs = Math.floor(numRecipients / 5);
    const inputSize = extraInputs * 150;
    
    const messageSize = message ? message.length : 0;
    const totalSize = baseSize + outputSize + inputSize + messageSize;
    
    // 1 sat/byte, minimum 546 sats
    return Math.max(546, totalSize);
  };

  const estimateMessage = (params: ActionFeeEstimateParams): number => {
    const { message = '' } = params;
    
    // Transaction OP_RETURN pure:
    // - Base: ~200 bytes (inputs + version + locktime)
    // - OP_RETURN: 10-15 bytes overhead + message.length
    // - Change output: 34 bytes
    
    const messageSize = message ? message.length : 0;
    const baseSize = 200;
    const opReturnOverhead = 15;
    const changeOutput = 34;
    
    const totalSize = baseSize + opReturnOverhead + messageSize + changeOutput;
    
    // 1 sat/byte, minimum 546 sats (dust limit)
    return Math.max(546, totalSize);
  };

  const formatFee = (sats: number | null): string => {
    if (!sats) return '...';
    const xec = sats / 100;
    return xec.toFixed(xec < 1 ? 2 : 0);
  };

  return (
    <div style={{ 
      padding: '12px 16px', 
      backgroundColor: 'var(--bg-secondary, #f8fafc)', 
      borderRadius: '8px', 
      fontSize: '0.9rem', 
      color: 'var(--text-secondary, #475569)', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px' 
    }}>
      <span style={{ fontSize: '1.2rem' }}>💡</span> 
      <span>
        {isCalculating ? (
          'Calcul des frais...'
        ) : (
          <>
            Frais de réseau estimés : ~{formatFee(estimatedFee)} XEC
            {actionType === 'airdrop' && params.recipients > 1 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginLeft: '8px' }}>
                (pour {params.recipients} destinataires)
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
};

export default ActionFeeEstimate;