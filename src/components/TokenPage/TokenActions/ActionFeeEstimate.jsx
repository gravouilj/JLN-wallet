import React, { useState, useEffect } from 'react';
import { TxBuilder, Script, shaRmd160, fromHex } from 'ecash-lib';
import * as ecashaddr from 'ecashaddrjs';

const DUST_LIMIT = 546n;
const SATS_PER_BYTE = 1n; // Fee rate standard eCash

/**
 * ActionFeeEstimate - Calcule les frais réels d'une transaction selon son type
 * @param {string} actionType - Type d'action: 'send', 'airdrop', 'mint', 'burn', 'message'
 * @param {object} params - Paramètres spécifiques à l'action
 * @param {function} onFeeCalculated - Callback optionnel appelé avec les frais calculés (en sats)
 */
export const ActionFeeEstimate = ({ actionType, params = {}, onFeeCalculated }) => {
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    calculateFee();
  }, [actionType, JSON.stringify(params)]);

  const calculateFee = async () => {
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
          // ~450 bytes
          feeInSats = 500; // ~5 XEC
          break;

        case 'burn':
          // Burn: 1 input token + 1 input XEC + OP_RETURN + potentiellement 1 change
          // ~400 bytes
          feeInSats = 450; // ~4.5 XEC
          break;

        case 'message':
          // Message: 1-2 inputs XEC + OP_RETURN (taille variable) + 1 change
          feeInSats = estimateMessage(params);
          break;

        default:
          feeInSats = 500; // Fallback
      }

      setEstimatedFee(feeInSats);
      
      // Appel du callback si fourni
      if (onFeeCalculated && typeof onFeeCalculated === 'function') {
        onFeeCalculated(feeInSats);
      }
    } catch (error) {
      console.error('Error calculating fee:', error);
      setEstimatedFee(500); // Fallback à 5 XEC
      if (onFeeCalculated && typeof onFeeCalculated === 'function') {
        onFeeCalculated(500);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const estimateTokenSend = (params) => {
    const { message = '' } = params;
    
    // Structure d'une transaction token send:
    // - Version: 4 bytes
    // - Input count varint: 1 byte (typiquement)
    // - Token input: ~180 bytes (prevOut 36 + scriptSig ~107 + sequence 4 + token data ~33)
    // - XEC input: ~150 bytes (prevOut 36 + scriptSig ~107 + sequence 4 + varint 1 + script 2)
    // - Output count varint: 1 byte
    // - OP_RETURN output: ~90 bytes (8 value + 1 varint + ~80 script)
    // - Destination output: ~34 bytes (8 value + 1 varint + 25 script)
    // - Change token output: ~34 bytes
    // - Change XEC output: ~34 bytes
    // - Locktime: 4 bytes
    
    const baseSize = 4 + 1 + 180 + 150 + 1 + 90 + 34 + 34 + 34 + 4;
    const messageSize = message ? message.length : 0;
    
    // Total avec marge de sécurité de 10%
    return Math.ceil((baseSize + messageSize) * 1.1);
  };

  const estimateAirdrop = (params) => {
    const { recipients = 1, distributionType = 'equal', message = '' } = params;
    
    // Structure airdrop (envoi XEC multiple):
    // - Base tx: ~250 bytes
    // - XEC inputs: ~150 bytes chacun (on en prend suffisamment pour couvrir les outputs)
    // - N outputs destinataires: 34 bytes chacun
    // - 1 change output: 34 bytes
    // - Message optionnel
    
    const numRecipients = Math.max(1, recipients);
    const baseSize = 250;
    
    // Nombre d'inputs nécessaires (estimation: 1 input par 5 outputs + 1 de sécurité)
    const inputCount = Math.ceil(numRecipients / 5) + 1;
    const inputSize = inputCount * 150;
    
    const outputSize = numRecipients * 34;
    const changeSize = 34;
    const messageSize = message ? message.length : 0;
    
    const totalSize = baseSize + inputSize + outputSize + changeSize + messageSize;
    
    // Marge proportionnelle au nombre de destinataires
    const margin = 1.1 + (numRecipients > 10 ? 0.05 : 0);
    return Math.ceil(totalSize * margin);
  };

  const estimateMessage = (params) => {
    const { message = '' } = params;
    
    // Structure OP_RETURN simple:
    // - Version: 4 bytes
    // - Input count: 1 byte
    // - 1-2 XEC inputs: ~150 bytes chacun
    // - Output count: 1 byte
    // - OP_RETURN output: 8 (value) + 1 (varint) + 1 (OP_RETURN) + varint_size + message_length
    // - Change output: 34 bytes
    // - Locktime: 4 bytes
    
    const messageSize = message ? message.length : 0;
    
    // Calcul de la taille du pushdata (1 byte si < 76, 2 bytes si < 256, etc.)
    const pushdataSize = messageSize < 76 ? 1 : messageSize < 256 ? 2 : 3;
    const opReturnOutputSize = 8 + 1 + 1 + pushdataSize + messageSize;
    
    const baseSize = 4 + 1 + 150 + 1 + opReturnOutputSize + 34 + 4;
    
    // Si message > 100 chars, possiblement besoin de 2 inputs
    const extraInputSize = messageSize > 100 ? 150 : 0;
    
    return Math.ceil((baseSize + extraInputSize) * 1.1);
  };

  const formatFee = (sats) => {
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