import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Stack, Badge } from '../UI';
import { supabase } from '../../services/supabaseClient';
import adminService from '../../services/adminService';
import { useEcashWallet } from '../../hooks/useEcashWallet';

/**
 * AdminManagement - Gestion de la whitelist des administrateurs
 * Accessible uniquement aux Super Admin
 */
const AdminManagement = ({ onNotification }) => {
  const { address } = useEcashWallet();
  const [admins, setAdmins] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminActions, setAdminActions] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Formulaire d'ajout
  const [newAdminWallet, setNewAdminWallet] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('moderator');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, [address]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Vérifier si super_admin
      const adminStatus = await adminService.checkIsAdmin(address);
      setIsSuperAdmin(adminStatus.role === 'super_admin');

      // Charger la liste des admins
      const adminList = await adminService.getAdminList();
      setAdmins(adminList);

      // Charger l'historique des actions (dernières 20)
      const actions = await adminService.getAdminActionsHistory(20);
      setAdminActions(actions);
    } catch (error) {
      console.error('❌ Erreur chargement admins:', error);
      onNotification?.({ type: 'error', message: 'Erreur chargement des données admin' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminWallet.trim() || !newAdminName.trim()) {
      onNotification?.({ type: 'error', message: 'Adresse et nom requis' });
      return;
    }

    // Validation format adresse eCash
    if (!newAdminWallet.startsWith('ecash:')) {
      onNotification?.({ type: 'error', message: 'Adresse doit commencer par "ecash:"' });
      return;
    }

    setIsAdding(true);
    try {
      await adminService.addAdmin(newAdminWallet, newAdminName, newAdminRole, address);
      onNotification?.({ type: 'success', message: `✅ Admin ${newAdminName} ajouté` });
      
      // Réinitialiser le formulaire
      setNewAdminWallet('');
      setNewAdminName('');
      setNewAdminRole('moderator');
      setShowAddForm(false);
      
      // Recharger
      await loadAdminData();
    } catch (error) {
      console.error('❌ Erreur ajout admin:', error);
      onNotification?.({ type: 'error', message: `Erreur: ${error.message}` });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminWallet, adminName) => {
    if (!confirm(`Confirmer le retrait de ${adminName} ?`)) return;

    const reason = prompt('Raison du retrait:');
    if (!reason) return;

    try {
      await adminService.removeAdmin(adminWallet, address, reason);
      onNotification?.({ type: 'success', message: `✅ ${adminName} retiré` });
      await loadAdminData();
    } catch (error) {
      console.error('❌ Erreur retrait admin:', error);
      onNotification?.({ type: 'error', message: `Erreur: ${error.message}` });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card style={{ border: '2px solid #ef4444', backgroundColor: '#fef2f2' }}>
        <CardContent style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚫</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
            Accès réservé aux Super Admin
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0 }}>
            Seuls les Super Admin peuvent gérer la whitelist des administrateurs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing="md">
      {/* Header avec bouton d'ajout */}
      <Card>
        <CardContent style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', margin: '0 0 4px 0' }}>
                👥 Gestion des Administrateurs
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                {admins.length} administrateur{admins.length > 1 ? 's' : ''} actif{admins.length > 1 ? 's' : ''}
              </p>
            </div>
            {!showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                variant="primary"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                ➕ Ajouter un admin
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card style={{ border: '2px solid #10b981', backgroundColor: '#f0fdf4' }}>
          <CardContent style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#047857', marginBottom: '16px' }}>
              ➕ Ajouter un nouvel administrateur
            </h3>
            
            <Stack spacing="sm">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px' }}>
                  Adresse wallet eCash *
                </label>
                <input
                  type="text"
                  value={newAdminWallet}
                  onChange={(e) => setNewAdminWallet(e.target.value)}
                  placeholder="ecash:qz..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                  disabled={isAdding}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px' }}>
                  Nom de l'administrateur *
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                  disabled={isAdding}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px' }}>
                  Rôle
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                  disabled={isAdding}
                >
                  <option value="moderator">Modérateur (peut débloquer des profils)</option>
                  <option value="super_admin">Super Admin (peut gérer les admins)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button
                  onClick={handleAddAdmin}
                  variant="primary"
                  fullWidth
                  disabled={isAdding}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  {isAdding ? '⏳ Ajout...' : '✅ Ajouter'}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAdminWallet('');
                    setNewAdminName('');
                    setNewAdminRole('moderator');
                  }}
                  variant="outline"
                  fullWidth
                  disabled={isAdding}
                >
                  Annuler
                </Button>
              </div>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Liste des admins */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>
          👥 Liste des administrateurs
        </h3>
        <Stack spacing="sm">
          {admins.map((admin) => (
            <Card key={admin.id} style={{ border: admin.admin_role === 'super_admin' ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}>
              <CardContent style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                        {admin.admin_name}
                      </h4>
                      <Badge variant={admin.admin_role === 'super_admin' ? 'primary' : 'success'}>
                        {admin.admin_role === 'super_admin' ? '👑 Super Admin' : '🛡️ Modérateur'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <strong>Adresse :</strong> {admin.wallet_address.substring(0, 30)}...
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <strong>Ajouté le :</strong> {new Date(admin.added_at).toLocaleDateString('fr-FR')}
                    </div>
                    {admin.added_by && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Ajouté par :</strong> {admin.added_by}
                      </div>
                    )}
                  </div>
                  
                  {admin.wallet_address !== address && (
                    <Button
                      onClick={() => handleRemoveAdmin(admin.wallet_address, admin.admin_name)}
                      variant="outline"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    >
                      🗑️ Retirer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </div>

      {/* Historique des actions admin */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>
          📜 Historique des actions (20 dernières)
        </h3>
        <Stack spacing="xs">
          {adminActions.length === 0 ? (
            <Card>
              <CardContent style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Aucune action enregistrée
              </CardContent>
            </Card>
          ) : (
            adminActions.map((action) => (
              <Card key={action.id} style={{ backgroundColor: '#f9fafb' }}>
                <CardContent style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {action.action_type === 'add_admin' && '➕ Ajout d\'admin'}
                      {action.action_type === 'remove_admin' && '🗑️ Retrait d\'admin'}
                      {action.action_type === 'unblock_profile' && '🔓 Déblocage profil'}
                      {action.action_type === 'block_profile' && '🚫 Blocage profil'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <strong>Par :</strong> {action.admin_wallet.substring(0, 20)}... • {new Date(action.created_at).toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <strong>Raison :</strong> {action.reason}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      </div>
    </Stack>
  );
};

export default AdminManagement;
