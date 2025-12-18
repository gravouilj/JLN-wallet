import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../UI';
import { supabase } from '../../services/supabaseClient';
import { useEcashWallet } from '../../hooks/useEcashWallet';

/**
 * AdminStats - Statistiques de l'application
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Métriques affichées :
 * - Nombre de créateurs (par statut)
 * - Nombre de clients actifs
 * - Nombre de tokens créés/importés
 * - Transactions totales et par token
 * - Commissions collectées
 * 
 * @param {Object} props
 * @param {Function} props.onNotification - Callback pour afficher des notifications
 */
const AdminStats = ({ onNotification }) => {
  const { wallet } = useEcashWallet();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    creators: {
      total: 0,
      verified: 0,
      pending: 0,
      rejected: 0,
      suspended: 0,
      banned: 0
    },
    clients: {
      total: 0,
      active_30d: 0
    },
    tokens: {
      total: 0,
      created: 0,
      imported: 0,
      list: []
    },
    transactions: {
      total: 0,
      total_volume: 0,
      by_token: []
    },
    commissions: {
      total_xec: 0,
      total_eur: 0
    }
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Charger les stats des créateurs
      const { data: profils, error: profilsError } = await supabase
        .from('profiles')
        .select('verification_status, status, tokens');

      if (profilsError) throw profilsError;
      const creatorStats = {
        total: profils.length,
        verified: profils.filter(f => f.verification_status === 'verified').length,
        pending: profils.filter(f => f.verification_status === 'pending').length,
        rejected: profils.filter(f => f.verification_status === 'rejected').length,
        suspended: profils.filter(f => f.status === 'suspended').length,
        banned: profils.filter(f => f.status === 'banned').length
      };

      // Collecter tous les tokens
      const allTokens = profils.flatMap(f => f.tokens || []);
      const tokenStats = {
        total: allTokens.length,
        created: allTokens.filter(t => t.isCreated).length,
        imported: allTokens.filter(t => !t.isCreated).length,
        list: allTokens
      };

      // Stats clients (basé sur wallet addresses uniques)
      // TODO: Implémenter un système de tracking des utilisateurs
      const clientStats = {
        total: 0, // À implémenter
        active_30d: 0 // À implémenter
      };

      // Stats transactions (nécessite historique blockchain)
      // TODO: Implémenter avec chronik ou API
      const txStats = {
        total: 0,
        total_volume: 0,
        by_token: []
      };

      // Commissions (si implémentées)
      const commissionStats = {
        total_xec: 0,
        total_eur: 0
      };

      setStats({
        creators: creatorStats,
        clients: clientStats,
        tokens: tokenStats,
        transactions: txStats,
        commissions: commissionStats
      });
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors du chargement des statistiques' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8 text-secondary">
        ⏳ Chargement des statistiques...
      </div>
    );
  }

  return (
    <div className="admin-stats">
      {/* En-tête */}
      <div className="d-flex align-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            📊 Vue d'ensemble
          </h2>
          <p className="text-sm text-secondary">
            Statistiques en temps réel de la plateforme
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadStats}
        >
          🔄 Actualiser
        </Button>
      </div>

      {/* Cartes de statistiques */}
      <div className="stats-grid mb-5" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Créateurs */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">👨‍🌾</div>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>
              {stats.creators.total}
            </div>
            <div className="text-sm text-secondary">Créateurs</div>
            <div className="text-xs text-secondary mt-2">
              ✅ {stats.creators.verified} vérifiés
            </div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-success)' }}>
              {stats.clients.total || 'N/A'}
            </div>
            <div className="text-sm text-secondary">Clients</div>
            <div className="text-xs text-secondary mt-2">
              🟢 {stats.clients.active_30d || 'N/A'} actifs (30j)
            </div>
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">🪙</div>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-warning)' }}>
              {stats.tokens.total}
            </div>
            <div className="text-sm text-secondary">Tokens</div>
            <div className="text-xs text-secondary mt-2">
              ✨ {stats.tokens.created} créés | 📥 {stats.tokens.imported} importés
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">💸</div>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>
              {stats.transactions.total || 'N/A'}
            </div>
            <div className="text-sm text-secondary">Transactions</div>
            <div className="text-xs text-secondary mt-2">
              💰 {stats.transactions.total_volume || 'N/A'} XEC
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails Créateurs */}
      <Card className="mb-5">
        <CardContent className="p-5">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            👨‍🌾 Répartition des Créateurs
          </h3>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-center justify-between p-3 rounded" style={{
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <span className="text-sm">✅ Vérifiés</span>
              <span className="font-bold" style={{ color: 'var(--accent-success)' }}>
                {stats.creators.verified}
              </span>
            </div>
            <div className="d-flex align-center justify-between p-3 rounded" style={{
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <span className="text-sm">⏳ En attente</span>
              <span className="font-bold" style={{ color: 'var(--accent-warning)' }}>
                {stats.creators.pending}
              </span>
            </div>
            <div className="d-flex align-center justify-between p-3 rounded" style={{
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <span className="text-sm">🚫 Refusés</span>
              <span className="font-bold" style={{ color: 'var(--accent-danger)' }}>
                {stats.creators.rejected}
              </span>
            </div>
            <div className="d-flex align-center justify-between p-3 rounded" style={{
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <span className="text-sm">⏸️ Suspendus</span>
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                {stats.creators.suspended}
              </span>
            </div>
            <div className="d-flex align-center justify-between p-3 rounded" style={{
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <span className="text-sm">🛑 Bannis</span>
              <span className="font-bold" style={{ color: 'var(--accent-danger)' }}>
                {stats.creators.banned}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des Tokens */}
      {stats.tokens.list.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              🪙 Tokens de la Plateforme ({stats.tokens.total})
            </h3>
            <div className="d-flex flex-column gap-2">
              {stats.tokens.list.map((token, index) => (
                <div
                  key={index}
                  className="d-flex align-center justify-between p-3 rounded hover-lift"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(`/token/${token.tokenId}`, '_blank')}
                >
                  <div className="d-flex align-center gap-3">
                    <span className="text-2xl">🪙</span>
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {token.ticker || 'UNK'}
                      </div>
                      <div className="text-xs text-secondary" style={{ fontFamily: 'monospace' }}>
                        {token.tokenId?.substring(0, 16)}...
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-center gap-2">
                    {token.isCreated ? (
                      <span className="text-xs px-2 py-1 rounded" style={{
                        backgroundColor: 'var(--accent-success-light)',
                        color: 'var(--accent-success)'
                      }}>
                        ✨ Créé
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded" style={{
                        backgroundColor: 'var(--info-light)',
                        color: 'var(--text-info)'
                      }}>
                        📥 Importé
                      </span>
                    )}
                    <span className="text-lg">→</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note implémentation future */}
      <Card className="mt-5">
        <CardContent className="p-4" style={{
          backgroundColor: 'var(--info-light)',
          border: '1px solid var(--border-info)'
        }}>
          <div className="d-flex align-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-info)' }}>
                Statistiques avancées à venir
              </p>
              <p className="text-xs" style={{ color: 'var(--text-info)', opacity: 0.8 }}>
                Les statistiques de clients, transactions et commissions nécessitent un système de tracking à implémenter.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStats;
