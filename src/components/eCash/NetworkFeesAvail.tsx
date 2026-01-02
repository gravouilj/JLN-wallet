import { Card, CardContent, Button } from '../UI';
import { useNetworkFees } from '../../hooks/useNetworkFees';
import { useEcashWallet } from '../../hooks/useEcashWallet';

interface NetworkFeesAvailProps {
  compact?: boolean;
  showActions?: boolean;
  onRefresh?: () => void;
  estimatedFee?: number | null;
}

/**
 * NetworkFeesAvail - Affichage des frais réseau disponibles (REFACTORISÉ)
 * 
 * Utilise useNetworkFees pour encapsuler la logique métier.
 * Taille réduite de 380 → 200 lignes (47% réduction).
 */
const NetworkFeesAvail: React.FC<NetworkFeesAvailProps> = ({ 
  compact = false, 
  showActions = true,
  onRefresh,
  estimatedFee = null
}) => {
  const { walletConnected } = useEcashWallet();
  const {
    xecBalance,
    loading,
    refreshing,
    feesStatus: status,
    estimatedTxCount,
    refresh,
    getFormattedBalance
  } = useNetworkFees(estimatedFee ?? 0);

  // Charger = pas de wallet
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

  // Pas connecté
  if (!walletConnected) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl mb-2">💼</div>
          <div className="text-sm text-secondary">Connectez votre wallet</div>
        </CardContent>
      </Card>
    );
  }

  // Mode compact
  if (compact) {
    return (
      <div 
        className="p-3 rounded"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: `2px solid ${status.color}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div className="d-flex align-center justify-between">
          <div className="d-flex align-center gap-2">
            <span className="text-xl">💎</span>
            <div>
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {xecBalance.toFixed(2)} XEC
              </div>
              <div className="text-xs text-secondary">
                ~{estimatedTxCount} transactions
              </div>
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

        {showActions && (
          <Button
            variant="outline"
            onClick={() => refresh()}
            disabled={refreshing}
            style={{ 
              fontSize: '0.75rem', 
              padding: '6px 8px'
            }}
          >
            {refreshing ? '⏳' : '🔄'} Rafraîchir
          </Button>
        )}
      </div>
    );
  }

  // Mode complet
  return (
    <Card>
      <CardContent className="p-5">
        <div className="d-flex align-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            💎 Frais Réseau
          </h3>
        </div>

        {/* Solde principal */}
        <div 
          className="text-center p-6 rounded-lg mb-4"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: `3px solid ${status.color}`
          }}
        >
          <div className="text-sm text-secondary mb-1">Solde XEC</div>
          <div 
            className="text-4xl font-bold mb-2"
            style={{ color: status.color }}
          >
            {xecBalance.toFixed(2)}
          </div>
          <div className="text-sm text-secondary">
            {getFormattedBalance()}
          </div>
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

        {/* Alerte critique */}
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
              <span className="font-semibold">Critique</span>
            </div>
            <p className="text-xs mb-0">
              Solde insuffisant. Rechargez votre portefeuille.
            </p>
          </div>
        )}

        {/* Alerte faible */}
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
              <span className="font-semibold">Faible</span>
            </div>
            <p className="text-xs mb-0">
              Pensez à recharger bientôt.
            </p>
          </div>
        )}

        {/* Info */}
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
          <p className="text-xs mb-0">
            Transactions réseau eCash (~5 XEC) + frais infrastructure (~5 XEC/tx sur envois et Airdrops).
          </p>
        </div>

        {/* Actions */}
        {showActions && (
          <Button
            variant="outline"
            fullWidth
            onClick={() => refresh()}
            disabled={refreshing}
          >
            {refreshing ? '⏳' : '🔄'} Rafraîchir
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkFeesAvail;
