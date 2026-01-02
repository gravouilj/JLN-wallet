import { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, Button, Stack, Badge } from '../UI';
// Supabase est importé mais n'était pas utilisé selon tes logs, je l'ai commenté pour nettoyer
// import { supabase } from '../../services/supabaseClient';
import adminService from '../../services/adminService';
import { useEcashWallet } from '../../hooks/useEcashWallet';

// 1. Définition des types pour les enregistrements Admin
interface AdminRecord {
  id: string;
  admin_name: string;
  admin_role: 'moderator' | 'super_admin';
  wallet_address: string;
  added_at: string;
  added_by: string | null;
}

// 2. Définition des types pour l'historique des actions
interface AdminAction {
  id: string;
  action_type: 'add_admin' | 'remove_admin' | 'unblock_profile' | 'block_profile';
  admin_wallet: string;
  created_at: string;
  reason: string;
}

// 3. Typage des notifications
interface NotificationPayload {
  type: 'success' | 'error';
  message: string;
}

interface AdminManagementProps {
  onNotification?: (notif: NotificationPayload) => void;
}

const AdminManagement = ({ onNotification }: AdminManagementProps) => {
  const { address } = useEcashWallet();
  
  // 4. Typage des States (Adieu le type 'never')
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  const [newAdminWallet, setNewAdminWallet] = useState<string>('');
  const [newAdminName, setNewAdminName] = useState<string>('');
  // Rôle limité aux valeurs autorisées
  const [newAdminRole, setNewAdminRole] = useState<'moderator' | 'super_admin'>('moderator');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  useEffect(() => {
    loadAdminData();
  }, [address]);

  const loadAdminData = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const adminStatus = await adminService.checkIsAdmin(address);
      setIsSuperAdmin(adminStatus.role === 'super_admin');

      const adminList = await adminService.getAdminList() as AdminRecord[];
      setAdmins(adminList);

      const actions = await adminService.getAdminActionsHistory(20) as AdminAction[];
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

    if (!newAdminWallet.startsWith('ecash:')) {
      onNotification?.({ type: 'error', message: 'Adresse doit commencer par "ecash:"' });
      return;
    }

    setIsAdding(true);
    try {
      await adminService.addAdmin(newAdminWallet, newAdminName, newAdminRole, address);
      onNotification?.({ type: 'success', message: `✅ Admin ${newAdminName} ajouté` });
      
      setNewAdminWallet('');
      setNewAdminName('');
      setNewAdminRole('moderator');
      setShowAddForm(false);
      
      await loadAdminData();
    } catch (error: any) {
      console.error('❌ Erreur ajout admin:', error);
      onNotification?.({ type: 'error', message: `Erreur: ${error.message}` });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminWallet: string, adminName: string) => {
    if (!confirm(`Confirmer le retrait de ${adminName} ?`)) return;

    const reason = prompt('Raison du retrait:');
    if (!reason) return;

    try {
      await adminService.removeAdmin(adminWallet, address, reason);
      onNotification?.({ type: 'success', message: `✅ ${adminName} retiré` });
      await loadAdminData();
    } catch (error: any) {
      console.error('❌ Erreur retrait admin:', error);
      onNotification?.({ type: 'error', message: `Erreur: ${error.message}` });
    }
  };

  // 5. Gestion des types pour les formulaires
  const handleRoleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setNewAdminRole(e.target.value as 'moderator' | 'super_admin');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
            <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <div style={{ border: '2px solid #ef4444', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
          <CardContent>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚫</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                Accès réservé aux Super Admin
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0 }}>
                Seuls les Super Admin peuvent gérer la whitelist des administrateurs.
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Stack spacing="md">
      <Card>
        <CardContent>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                // @ts-ignore - Si le composant Button ne supporte pas style dans ses props TS
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                ➕ Ajouter un admin
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <div style={{ border: '2px solid #10b981', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <CardContent>
              <div style={{ padding: '20px' }}>
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
                      onChange={handleRoleChange}
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
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>
          👥 Liste des administrateurs
        </h3>
        <Stack spacing="sm">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent>
                <div style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  border: admin.admin_role === 'super_admin' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}>
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

      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>
          📜 Historique des actions (20 dernières)
        </h3>
        {/* Correction de spacing="xs" vers "sm" car xs n'existe probablement pas dans tes types Stack */}
        <Stack spacing="sm">
          {adminActions.length === 0 ? (
            <Card>
              <CardContent>
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Aucune action enregistrée
                </div>
              </CardContent>
            </Card>
          ) : (
            adminActions.map((action) => (
              <Card key={action.id}>
                <CardContent>
                  <div style={{ padding: '12px', backgroundColor: '#f9fafb', fontSize: '0.85rem' }}>
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