import React from 'react';
import { Badge } from '../UI';
import * as ecashaddrjs from 'ecashaddrjs';

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
        // Trouver l'adresse source (premier input)
        const firstInput = tx.inputs?.[0];
        if (firstInput?.outputScript) {
          try {
            return ecashaddrjs.encodeOutputScript(firstInput.outputScript);
          } catch (err) {
            console.log('⚠️ Impossible de décoder outputScript input');
            return tx.txid?.substring(0, 16) + '...' || 'Inconnu';
          }
        }
      } else if (tx.type === 'sent') {
        // Trouver l'adresse destination (premier output qui n'est pas notre adresse)
        try {
          const ourOutputScript = ecashaddrjs.getOutputScriptFromAddress(address);
          
          const recipientOutput = tx.outputs?.find(output => {
            return output?.outputScript && output.outputScript !== ourOutputScript;
          });
          
          if (recipientOutput?.outputScript) {
            return ecashaddrjs.encodeOutputScript(recipientOutput.outputScript);
          }
        } catch (err) {
          console.log('⚠️ Erreur décodage adresse envoi:', err);
          return tx.txid?.substring(0, 16) + '...' || 'Inconnu';
        }
      }
      
      // Fallback: afficher le txid comme identifiant
      return tx.txid?.substring(0, 16) + '...' || 'Inconnu';
    } catch (err) {
      console.error('Erreur getOtherParty:', err);
      return 'Adresse inconnue';
    }
  };

  const otherParty = getOtherParty();
  const txDate = new Date(tx.timestamp * 1000);
  const dateStr = txDate.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const timeStr = txDate.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Calculer la valeur en fiat
  const fiatValue = price && typeof price.convert === 'function' 
    ? price.convert(parseFloat(tx.amount), currency)?.toFixed(2)
    : null;

  return (
    <div className="tx-container">
      {/* Colonne gauche : Type de transaction */}
      <div className="tx-icon-badge">
        <span style={{ fontSize: '1.5rem' }}>
          {tx.type === 'received' ? '📥' : tx.type === 'sent' ? '📤' : '🔄'}
        </span>
        <Badge
          variant={tx.type === 'received' ? 'success' : tx.type === 'sent' ? 'danger' : 'neutral'}
          style={{ fontSize: '0.65rem', padding: '2px 6px' }}
        >
          {tx.type === 'received' ? 'Reçu' : tx.type === 'sent' ? 'Envoyé' : 'Interne'}
        </Badge>
      </div>

      {/* Colonne centrale : Détails de la transaction */}
      <div className="tx-details">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          <span className="tx-label">
            {tx.type === 'received' ? 'De:' : tx.type === 'sent' ? 'À:' : 'Interne:'}
          </span>
          <a
            href={`https://explorer.e.cash/address/${otherParty}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-address"
            style={{ flex: 1, minWidth: '120px' }}
          >
            {otherParty.length > 42 
              ? `${otherParty.substring(0, 15)}...${otherParty.substring(otherParty.length - 15)}`
              : otherParty
            }
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              // TODO: Implémenter l'ajout au carnet d'adresses
              console.log('📒 Ajouter au carnet:', otherParty);
            }}
            className="icon-btn"
            style={{ 
              width: '28px', 
              height: '28px', 
              fontSize: '1.1rem',
              padding: '2px'
            }}
            title="Ajouter au carnet d'adresses"
          >
            👤
          </button>
        </div>

        <div className="tx-date">
          {dateStr} • {timeStr}
        </div>
      </div>

      {/* Colonne droite : Montant et lien explorer */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
      }}>
        <a
          href={`https://explorer.e.cash/tx/${tx.txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-link"
          style={{
            fontSize: '1.25rem',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
          title="Voir sur explorer.e.cash"
        >
          🔗
        </a>
        
        <div className={`tx-amount ${tx.type === 'sent' ? 'negative' : 'positive'}`}>
          {tx.type === 'sent' ? '-' : '+'}{tx.amount} XEC
        </div>

        {fiatValue && (
          <div className="tx-fiat">
            ≈ {fiatValue} {currency}
          </div>
        )}
      </div>
    </div>
  );
};

export default TxType;
