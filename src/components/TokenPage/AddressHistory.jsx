import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../UI';
import TxType from './TxType';
import { useXecPrice } from '../../hooks/useXecPrice';
import * as ecashaddrjs from 'ecashaddrjs';

/**
 * AddressHistory - Affiche l'historique des transactions XEC de l'adresse
 * Par défaut affiche les 4 dernières avec option "Voir plus"
 * @param {boolean} compact - Mode compact (affiche seulement 2 transactions par défaut)
 */
const AddressHistory = ({ address, currency = 'EUR', compact = false }) => {
  const price = useXecPrice();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [isCompact, setIsCompact] = useState(compact);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Chargement historique pour:', address);
        
        // Importer dynamiquement chronik-client
        const { ChronikClient } = await import('chronik-client');
        const chronik = new ChronikClient(['https://chronik-native2.fabien.cash']);
        
        // S'assurer que l'adresse a le bon préfixe
        const formatted = address.includes(':') ? address : `ecash:${address}`;
        setFormattedAddress(formatted);
        console.log('📍 Adresse formatée:', formatted);
        
        // Récupérer l'historique de l'adresse (pas de premier paramètre 'ecash')
        const history = await chronik.address(formatted).history();
        
        console.log('✅ Historique reçu:', history);
        console.log('📊 Nombre de transactions:', history?.txs?.length);
        
        if (!history || !history.txs || history.txs.length === 0) {
          setTransactions([]);
          setLoading(false);
          return;
        }
        
        // Debug: afficher la première transaction COMPLÈTE
        if (history.txs.length > 0) {
          const firstTx = history.txs[0];
          console.log('🔍 PREMIÈRE TRANSACTION COMPLÈTE:');
          console.log('  - txid:', firstTx.txid);
          console.log('  - inputs:', firstTx.inputs);
          console.log('  - outputs:', firstTx.outputs);
          console.log('  - Premier output sats:', firstTx.outputs?.[0]?.sats, 'type:', typeof firstTx.outputs?.[0]?.sats);
        }
        
        // Obtenir l'outputScript de notre adresse pour comparer
        const ourOutputScript = ecashaddrjs.getOutputScriptFromAddress(formatted);
        console.log('📝 Notre outputScript:', ourOutputScript);
        
        // Transformer les transactions en format lisible
        const formattedTxs = history.txs.map(tx => {
          // Déterminer si c'est envoyé ou reçu
          let hasInputFromAddress = false;
          let hasOutputToAddress = false;
          
          // Vérifier les inputs
          for (const input of tx.inputs || []) {
            if (input.outputScript === ourOutputScript) {
              hasInputFromAddress = true;
              break;
            }
          }
          
          // Vérifier les outputs
          for (const output of tx.outputs || []) {
            if (output.outputScript === ourOutputScript) {
              hasOutputToAddress = true;
              break;
            }
          }
          
          // Calculer le montant en satoshis
          let amountSats = 0;
          let type = 'received';
          
          if (hasInputFromAddress && hasOutputToAddress) {
            // Transaction interne
            type = 'internal';
            const totalIn = tx.inputs?.reduce((sum, input) => {
              const sats = Number(input.sats || input.value || 0);
              return sum + sats;
            }, 0) || 0;
            const totalOut = tx.outputs?.reduce((sum, output) => {
              const sats = Number(output.sats || output.value || 0);
              return sum + sats;
            }, 0) || 0;
            amountSats = Math.abs(totalIn - totalOut);
          } else if (hasInputFromAddress) {
            // Envoyé
            type = 'sent';
            tx.outputs?.forEach(output => {
              if (output.outputScript !== ourOutputScript) {
                amountSats += Number(output.sats || output.value || 0);
              }
            });
          } else if (hasOutputToAddress) {
            // Reçu
            type = 'received';
            tx.outputs?.forEach(output => {
              if (output.outputScript === ourOutputScript) {
                amountSats += Number(output.sats || output.value || 0);
              }
            });
          }
          
          console.log(`💰 TX ${tx.txid.substring(0, 8)}... - Type: ${type}, Montant: ${amountSats} sats = ${amountSats / 100} XEC`);
          
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
        console.log('✅ Transactions formatées:', formattedTxs);
        
      } catch (err) {
        console.error('❌ Erreur chargement historique:', err);
        setError(err.message || 'Erreur de chargement');
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
          <p className="loading-text">
            Chargement de l'historique...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-text">
            Erreur: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">
            Aucune transaction trouvée
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent style={{ padding: isCompact ? '16px' : '24px' }}>
        <div className="section-header">
          <span className="section-icon">🔄</span>
          <div className="section-header-content">
            <h2 className="section-title">
              Dernières transactions XEC
            </h2>
            <p className="section-subtitle">
              {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setIsCompact(!isCompact)}
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              backgroundColor: 'transparent',
              color: 'var(--primary-color, #0074e4)',
              border: '1px solid var(--primary-color, #0074e4)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isCompact ? 'Mode normal' : 'Mode compact'}
          >
            {isCompact ? '📖' : '📋'}
          </button>
        </div>

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
