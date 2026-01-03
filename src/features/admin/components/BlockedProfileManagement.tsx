import { useState } from 'react';
import { Card, CardContent, Button, Stack } from '../../../components/UI';
import adminService from '../../../services/adminService';

/**
 * BlockedProfileManagement - Affichage et gestion des profils bloqués
 * Pour les administrateurs dans AdminVerificationPage
 */
const BlockedProfileManagement = ({ blockedProfiles, onUnblock, onNotification, adminAddress }) => {
  const [unblockForms, setUnblockForms] = useState({});
  const [unblockReasons, setUnblockReasons] = useState({});
  const [isUnblocking, setIsUnblocking] = useState({});

  const toggleUnblockForm = (profileId) => {
    setUnblockForms(prev => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  const handleUnblock = async (profile) => {
    const reason = unblockReasons[profile.id];
    
    if (!reason?.trim()) {
      onNotification?.({ type: 'error', message: 'Veuillez fournir une raison de déblocage' });
      return;
    }

    setIsUnblocking(prev => ({ ...prev, [profile.id]: true }));
    try {
      await adminService.adminUnblockProfile(profile.id, adminAddress, reason);
      onNotification?.({ type: 'success', message: `✅ Profil ${profile.name} débloqué` });
      
      // Réinitialiser le formulaire
      setUnblockForms(prev => ({ ...prev, [profile.id]: false }));
      setUnblockReasons(prev => ({ ...prev, [profile.id]: '' }));
      
      // Callback pour recharger
      if (onUnblock) await onUnblock();
    } catch (error) {
      console.error('❌ Erreur déblocage:', error);
      onNotification?.({ type: 'error', message: `Erreur: ${error.message}` });
    } finally {
      setIsUnblocking(prev => ({ ...prev, [profile.id]: false }));
    }
  };

  if (!blockedProfiles || blockedProfiles.length === 0) {
    return (
      <Card>
        <CardContent style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>
            Aucun profil bloqué
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Tous les profils sont actuellement en règle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing="md">
      <Card style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
        <CardContent style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>🚫</span>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#92400e', margin: '0 0 4px 0' }}>
                {blockedProfiles.length} profil{blockedProfiles.length > 1 ? 's' : ''} bloqué{blockedProfiles.length > 1 ? 's' : ''}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#78350f', margin: 0 }}>
                Ces profils ne peuvent pas créer ou importer de jetons
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {blockedProfiles.map((profile) => (
        <Card key={profile.id} style={{ border: '2px solid #f59e0b', backgroundColor: '#fffbeb' }}>
          <CardContent style={{ padding: '20px' }}>
            {/* En-tête du profil */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#92400e', margin: '0 0 8px 0' }}>
                  {profile.name || 'Sans nom'}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}>
                  <strong>Adresse :</strong> {profile.owner_address?.substring(0, 25)}...
                </div>
                <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}>
                  <strong>Email :</strong> {profile.email || 'Non renseigné'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}>
                  <strong>Statut :</strong> {profile.status}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                  <strong>Bloqué le :</strong> {new Date(profile.blocked_at).toLocaleString('fr-FR')}
                </div>
              </div>
              <div style={{ fontSize: '2rem' }}>🚫</div>
            </div>

            {/* Raison du blocage */}
            <div style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                📋 Raison du blocage :
              </div>
              <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                {profile.blocked_reason}
              </div>
            </div>

            {/* Compteurs (si disponibles) */}
            {(profile.active_reports_count !== undefined || profile.unresolved_tickets_count !== undefined) && (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                {profile.active_reports_count !== undefined && (
                  <div style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: '700', color: '#991b1b' }}>
                      {profile.active_reports_count}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7f1d1d' }}>
                      Signalement{profile.active_reports_count > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                {profile.unresolved_tickets_count !== undefined && (
                  <div style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: '700', color: '#92400e' }}>
                      {profile.unresolved_tickets_count}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                      Ticket{profile.unresolved_tickets_count > 1 ? 's' : ''} ouvert{profile.unresolved_tickets_count > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bouton de déblocage / Formulaire */}
            {!unblockForms[profile.id] ? (
              <Button
                onClick={() => toggleUnblockForm(profile.id)}
                variant="primary"
                fullWidth
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                🔓 Débloquer ce profil
              </Button>
            ) : (
              <div style={{ marginTop: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#92400e',
                  marginBottom: '8px'
                }}>
                  Raison du déblocage :
                </label>
                <textarea
                  value={unblockReasons[profile.id] || ''}
                  onChange={(e) => setUnblockReasons(prev => ({ ...prev, [profile.id]: e.target.value }))}
                  placeholder="Ex: Tickets résolus, fausse alerte, etc."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #fbbf24',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    marginBottom: '12px'
                  }}
                  disabled={isUnblocking[profile.id]}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    onClick={() => handleUnblock(profile)}
                    variant="primary"
                    fullWidth
                    disabled={isUnblocking[profile.id]}
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  >
                    {isUnblocking[profile.id] ? '⏳ Déblocage...' : '✅ Confirmer le déblocage'}
                  </Button>
                  <Button
                    onClick={() => toggleUnblockForm(profile.id)}
                    variant="outline"
                    fullWidth
                    disabled={isUnblocking[profile.id]}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default BlockedProfileManagement;
