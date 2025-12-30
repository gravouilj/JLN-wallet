import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../UI';
import TxType from './TxType';
import { useXecPrice } from '../../hooks/useXecPrice';
import * as ecashaddrjs from 'ecashaddrjs';
import { APP_CONFIG } from '../../config/constants'; // ✅ IMPORT CONFIG

/**
 * AddressHistory - Affiche l'historique des transactions XEC de l'adresse
 * Utilise la configuration centralisée pour la connexion Chronik
 */
const AddressHistory = ({ address, currency = 'EUR', compact = false }) => {
  const price = useXecPrice();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [isCompact] = useState(compact); // isCompact ne change pas, pas besoin de setIsCompact

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Import dynamique de chronik-client
        const { ChronikClient } = await import('chronik-client');
        
        // ✅ UTILISATION DE LA CONFIGURATION CENTRALISÉE
        const chronik = new ChronikClient(APP_CONFIG.CHRONIK_URLS);
        
        // Formatage adresse
        const formatted = address.includes(':') ? address : `ecash:${address}`;
        setFormattedAddress(formatted);
        
        // Récupération historique
        const history = await chronik.address(formatted).history();
        
        if (!history || !history.txs || history.txs.length === 0) {
          setTransactions([]);
          setLoading(false);
          return;
        }
        
        // Script de notre adresse pour comparaison
        const ourOutputScript = ecashaddrjs.getOutputScriptFromAddress(formatted);
        
        // Transformation des données
        const formattedTxs = history.txs.map(tx => {
          let hasInputFromAddress = false;
          let hasOutputToAddress = false;
          
          // Vérification Inputs
          for (const input of tx.inputs || []) {
            if (input.outputScript === ourOutputScript) {
              hasInputFromAddress = true;
              break;
            }
          }
          
          // Vérification Outputs
          for (const output of tx.outputs || []) {
            if (output.outputScript === ourOutputScript) {
              hasOutputToAddress = true;
              break;
            }
          }
          
          // Calcul montant & type
          let amountSats = 0;
          let type = 'received';
          
          if (hasInputFromAddress && hasOutputToAddress) {
            type = 'internal';
            const totalIn = tx.inputs?.reduce((sum, input) => sum + Number(input.sats || input.value || 0), 0) || 0;
            const totalOut = tx.outputs?.reduce((sum, output) => sum + Number(output.sats || output.value || 0), 0) || 0;
            amountSats = Math.abs(totalIn - totalOut);
          } else if (hasInputFromAddress) {
            type = 'sent';
            tx.outputs?.forEach(output => {
              if (output.outputScript !== ourOutputScript) {
                amountSats += Number(output.sats || output.value || 0);
              }
            });
          } else if (hasOutputToAddress) {
            type = 'received';
            tx.outputs?.forEach(output => {
              if (output.outputScript === ourOutputScript) {
                amountSats += Number(output.sats || output.value || 0);
              }
            });
          }
          
          return {
            txid: tx.txid,
            type,
            amount: (amountSats / 100).toFixed(2),
            timestamp: tx.timeFirstSeen || tx.block?.timestamp || Date.now() / 1000,
            blockHeight: tx.block?.height || null,
            inputs: tx.inputs,
            outputs: tx.outputs
          };
        });
        
        setTransactions(formattedTxs);
        
      } catch (err) {
        console.error('❌ Erreur chargement historique:', err);
        setError("Impossible de charger l'historique.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [address]);


  const defaultLimit = isCompact ? 2 : 4;
  const displayedTxs = showAll ? transactions : transactions.slice(0, defaultLimit);

  if (loading) {
    return (
      <Card>
        <CardContent className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p className="loading-text">Chargement de l'historique...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-text">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">Aucune transaction trouvée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent style={{ padding: isCompact ? '16px' : '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '8px' : '12px' }}>
          {displayedTxs.map((tx) => (
            <TxType
              key={tx.txid}
              tx={tx}
              address={formattedAddress}
              currency={currency}
              price={price}
            />
          ))}
        </div>

        {transactions.length > defaultLimit && (
          <div style={{ marginTop: isCompact ? '12px' : '16px', textAlign: 'center' }}>
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="secondary"
              size="sm"
            >
              {showAll ? 'Voir moins' : `Voir plus (${transactions.length - defaultLimit} autres)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddressHistory;