import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from './UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useXecPrice } from '../hooks/useXecPrice';
import { useAtom } from 'jotai';
import { currencyAtom } from '../atoms';

/**
 * NetworkFeesAvail - Affichage des frais réseau disponibles
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Ce composant affiche le solde XEC disponible pour payer les frais de transaction.
 * Il aide les créateurs à suivre leurs frais réseau et à savoir quand ils doivent
 * recharger leur portefeuille.
 * 
 * @param {Object} props
 * @param {boolean} props.compact - Mode compact (sans titre)
 * @param {boolean} props.showActions - Afficher les boutons d'action
 * @param {Function} props.onRefresh - Callback lors du rafraîchissement
 */
const NetworkFeesAvail = ({ 
  compact = false, 
  showActions = true,
  onRefresh,
  estimatedFee = null // Fee estimé pour l'action en cours (en sats)
}) => {
  const navigate = useNavigate();
  const { wallet, walletConnected } = useEcashWallet();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  
  const [xecBalance, setXecBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBalance();
  }, [wallet, walletConnected]);

  const loadBalance = async () => {
    if (!wallet || !walletConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const balanceData = await wallet.getBalance();
      setXecBalance(balanceData.balance || 0);
    } catch (err) {
      console.error('❌ Erreur chargement solde XEC:', err);
      setXecBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBalance();
    setRefreshing(false);
    onRefresh?.();
  };

  // Statut des frais
  const getFeesStatus = () => {
    if (xecBalance >= 1000) return { level: 'good', label: 'Excellent', color: 'var(--accent-success)' };
    if (xecBalance >= 100) return { level: 'ok', label: 'Suffisant', color: 'var(--accent-primary)' };
    if (xecBalance >= 50) return { level: 'low', label: 'Faible', color: 'var(--accent-warning)' };
    return { level: 'critical', label: 'Critique', color: 'var(--accent-danger)' };
  };

  const status = getFeesStatus();

  // Estimation nombre de transactions possibles
  // Si estimatedFee fourni, utiliser sa valeur, sinon 5 XEC par défaut
  const feePerTx = estimatedFee ? estimatedFee / 100 : 5; // Conversion sats -> XEC
  const estimatedTxCount = Math.floor(xecBalance / feePerTx);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-sm text-secondary">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!walletConnected) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl mb-2">💼</div>
          <div className="text-sm text-secondary">Connectez votre portefeuille</div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div 
        className="p-3 rounded"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: `2px solid ${status.color}`,
          display: 'flex',
          flexDirection: 'column', // Changé en colonne pour empiler les boutons si nécessaire
          gap: '8px'
        }}
      >
        {/* Ligne du haut : Solde et Badge */}
        <div className="d-flex align-center justify-between">
          <div className="d-flex align-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {xecBalance.toFixed(2)} XEC
              </div>
              {price && xecBalance > 0 && (
                <div className="text-xs text-secondary">
                  ≈ {(() => {
                    try {
                      const fiatAmount = price.convert(xecBalance, currency);
                      return fiatAmount > 0 ? `${fiatAmount.toFixed(2)} ${currency}` : '';
                    } catch (e) {
                      console.warn('Conversion FIAT error:', e);
                      return '';
                    }
                  })()} • ~{estimatedTxCount} transactions
                </div>
              )}
              {(!price || xecBalance === 0) && (
                <div className="text-xs text-secondary">
                  ~{estimatedTxCount} transactions
                </div>
              )}
            </div>
          </div>
          <div 
            className="text-xs font-semibold px-2 py-1 rounded"
            style={{
              backgroundColor: `${status.color}20`,
              color: status.color
            }}
          >
            {status.label}
          </div>
        </div>

        {/* NOUVEAU : Boutons d'action en mode compact */}
        {showActions && (
          <div className="d-flex gap-2 mt2">
            <Button
              variant="outline" // Style plus léger pour le mode compact
              onClick={() => navigate('/settings')}
              style={{ 
                fontSize: '0.75rem', 
                padding: '4px 8px', 
                height: '',
                flex: 1
              }}
            >
              💳 Gérer
            </Button>

            <a
          href="https://docs.e.cash/guides/get-ecash"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm hover-underline"
          style={{
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            padding: '8px',
            display: 'none' // Masqué
          }}
        >
          📚 Obtenir des 💎 eCash
        </a>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-sm px-2 rounded hover-lift"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.6 : 1,
                display: 'none' // Masqué
              }}
            >
              {refreshing ? '⏳' : '🔄'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        {/* En-tête */}
        <div className="d-flex align-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            💰 Frais Réseau
          </h3>
          {false && showActions && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-sm px-3 py-1 rounded hover-lift"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.6 : 1
              }}
            >
              {refreshing ? '⏳' : '🔄'} Actualiser
            </button>
          )}
        </div>

        {/* Solde principal */}
        <div 
          className="text-center p-6 rounded-lg mb-4"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: `3px solid ${status.color}`
          }}
        >
          <div className="text-sm text-secondary mb-1">
            Solde disponible
          </div>
          <div 
            className="text-4xl font-bold mb-2"
            style={{ color: status.color }}
          >
            {xecBalance.toFixed(2)}
          </div>
          <div className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            XEC
          </div>
          
          {/* Conversion fiat */}
          {price && xecBalance > 0 && (
            <div className="text-sm text-secondary">
              ≈ {(() => {
                try {
                  const fiatAmount = price.convert(xecBalance, currency);
                  return fiatAmount > 0 ? `${fiatAmount.toFixed(2)} ${currency}` : '';
                } catch (e) {
                  console.warn('Conversion FIAT error:', e);
                  return '';
                }
              })()}
            </div>
          )}
        </div>

        {/* Statut et estimation */}
        <div className="d-flex flex-column gap-3 mb-4">
          <div 
            className="d-flex align-center justify-between p-3 rounded"
            style={{
              backgroundColor: `${status.color}20`,
              border: `1px solid ${status.color}`
            }}
          >
            <span className="text-sm font-semibold" style={{ color: status.color }}>
              📊 Statut
            </span>
            <span className="font-bold" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>

          <div 
            className="d-flex align-center justify-between p-3 rounded"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🔢 Transactions estimées
            </span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              ~{estimatedTxCount}
            </span>
          </div>
        </div>

        {/* Alertes selon le niveau */}
        {status.level === 'critical' && (
          <div 
            className="p-3 rounded mb-4"
            style={{
              backgroundColor: 'var(--error-light)',
              border: '1px solid var(--accent-danger)',
              color: 'var(--error-dark)'
            }}
          >
            <div className="d-flex align-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <span className="font-semibold">Niveau critique</span>
            </div>
            <p className="text-xs mb-0" style={{ lineHeight: '1.4' }}>
              Votre solde 💎 XEC est insuffisant pour effectuer des transactions. 
              Rechargez votre portefeuille pour continuer à utiliser vos tokens.
            </p>
          </div>
        )}

        {status.level === 'low' && (
          <div 
            className="p-3 rounded mb-4"
            style={{
              backgroundColor: 'var(--warning-light)',
              border: '1px solid var(--accent-warning)',
              color: 'var(--warning-dark)'
            }}
          >
            <div className="d-flex align-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <span className="font-semibold">Niveau faible</span>
            </div>
            <p className="text-xs mb-0" style={{ lineHeight: '1.4' }}>
              Pensez à recharger votre solde 💎 XEC bientôt pour éviter les interruptions.
            </p>
          </div>
        )}

        {/* Info pédagogique */}
        <div 
          className="p-3 rounded mb-4"
          style={{
            backgroundColor: 'var(--info-light)',
            border: '1px solid var(--border-info)',
            color: 'var(--text-info)'
          }}
        >
          <div className="d-flex align-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-sm">Pourquoi des frais ?</span>
          </div>
          <p className="text-xs mb-0" style={{ lineHeight: '1.4' }}>
            Les transactions sur l'application nécessitent des frais pour le réseau eCash (environ 5 XEC par transaction) et pour les infrastructures de l'application (environ 5 XEC par transaction).<br />
            Les frais d'infrastructures sont uniquement appliqués sur les envois en eCash (XEC) et lors des Distributions (Airdrop) initiées par les Créateurs de jeton.
          </p>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="d-flex flex-column gap-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/settings')}
              style={{ display: 'none' }} // Masqué
            >
              💳 Gérer mes 💎 eCash (XEC)
            </Button>
            
            <a
              href="https://docs.e.cash/guides/get-ecash"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm hover-underline"
              style={{
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                padding: '8px',
                display: 'none' // Masqué
              }}
            >
               Obtenir des 💎 XEC
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkFeesAvail;
