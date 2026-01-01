import React from 'react';
import { Badge } from '../UI'; // Assure-toi que ce chemin est bon aussi (../UI ou ../../UI ?)
import * as ecashaddrjs from 'ecashaddrjs';
// 👇 CORRECTION DU CHEMIN : ../../ au lieu de ../
import { APP_CONFIG } from '../../config/constants'; 

const TxType = ({ 
  tx, 
  address,
  currency = 'EUR',
  price = null 
}) => {
  // Déterminer l'autre partie de la transaction
  const getOtherParty = () => {
    try {
      if (!tx || !address) return 'Adresse inconnue';
      
      if (tx.type === 'received') {
        const firstInput = tx.inputs?.[0];
        if (firstInput?.outputScript) {
          try {
            return ecashaddrjs.encodeOutputScript(firstInput.outputScript);
          } catch (err) {
            return tx.txid?.substring(0, 16) + '...' || 'Inconnu';
          }
        }
      } else if (tx.type === 'sent') {
        try {
          const ourOutputScript = ecashaddrjs.getOutputScriptFromAddress(address);
          
          const recipientOutput = tx.outputs?.find(output => {
            return output?.outputScript && output.outputScript !== ourOutputScript;
          });
          
          if (recipientOutput?.outputScript) {
            return ecashaddrjs.encodeOutputScript(recipientOutput.outputScript);
          }
        } catch (err) {
          return tx.txid?.substring(0, 16) + '...' || 'Inconnu';
        }
      }
      return tx.txid?.substring(0, 16) + '...' || 'Inconnu';
    } catch (err) {
      return 'Adresse inconnue';
    }
  };

  const otherParty = getOtherParty();
  const txDate = new Date(tx.timestamp * 1000);
  const dateStr = txDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = txDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const fiatValue = price && typeof price.convert === 'function' 
    ? price.convert(parseFloat(tx.amount), currency)?.toFixed(2)
    : null;

  // Construction de l'URL Explorer via Config
  const explorerTxUrl = `${APP_CONFIG.EXPLORER_URL_TX}${tx.txid}`;

  return (
    <div className="tx-container">
      <div className="tx-icon-badge">
        <span style={{ fontSize: '1.5rem' }}>
          {tx.type === 'received' ? '📥' : tx.type === 'sent' ? '📤' : '🔄'}
        </span>
        <Badge variant={tx.type === 'received' ? 'success' : tx.type === 'sent' ? 'danger' : 'neutral'}>
          {tx.type === 'received' ? 'Reçu' : tx.type === 'sent' ? 'Envoyé' : 'Interne'}
        </Badge>
      </div>

      <div className="tx-details">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className="tx-label">{tx.type === 'received' ? 'De:' : tx.type === 'sent' ? 'À:' : 'Interne:'}</span>
          <span className="tx-address">
            {otherParty.length > 20 
              ? `${otherParty.substring(0, 8)}...${otherParty.substring(otherParty.length - 8)}`
              : otherParty
            }
          </span>
        </div>
        <div className="tx-date">{dateStr} • {timeStr}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <a
          href={explorerTxUrl} 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-link"
          title="Voir sur l'explorateur"
        >
          🔗
        </a>
        
        <div className={`tx-amount ${tx.type === 'sent' ? 'negative' : 'positive'}`}>
          {tx.type === 'sent' ? '-' : '+'}{tx.amount} XEC
        </div>

        {fiatValue && <div className="tx-fiat">≈ {fiatValue} {currency}</div>}
      </div>
    </div>
  );
};

export default TxType;