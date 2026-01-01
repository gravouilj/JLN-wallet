import React from 'react';
import { Button, ActionBar } from '../UI';

/**
 * ProfilStatusActions - Composant centralisé pour les actions de statut
 * Affiche uniquement les actions pertinentes selon l'état actuel du profil
 * 
 * @param {object} profil - Objet profil avec verification_status et status
 * @param {function} onStatusChange - Callback (profilId, newStatus)
 * @param {boolean} processing - État de chargement
 * @param {string} size - Taille des boutons ('sm' ou défaut)
 */
export const ProfilStatusActions = ({ 
  profil, 
  onStatusChange, 
  processing = false,
  size = 'sm'
}) => {
  if (!profil) return null;
  
  /**
   * Retourne la liste des actions disponibles selon l'état de la ferme
   * Logique centralisée unique pour éviter les incohérences
   */
  const getAvailableActions = () => {
    const { verification_status, status } = profil;
    
    // Cas 1: Ferme bannie ou supprimée
    if (status === 'banned' || status === 'deleted') {
      return [
        { 
          label: '♻️ Réhabiliter', 
          action: 'reactivate', 
          variant: 'primary',
          description: 'Réactiver la ferme'
        }
      ];
    }
    
    // Cas 2: En attente de vérification ou info demandée
    if (verification_status === 'pending' || verification_status === 'info_requested') {
      return [
        { 
          label: '✅ Valider', 
          action: 'verified', 
          variant: 'primary',
          style: { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
        },
        { 
          label: '🚫 Refuser', 
          action: 'rejected', 
          variant: 'danger',
          style: { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }
        }
      ];
    }
    
    // Cas 3: Vérifié
    if (verification_status === 'verified') {
      return [
        { 
          label: '↩️ Retirer le badge', 
          action: 'none', 
          variant: 'secondary',
          style: { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }
        },
        { 
          label: '🛑 Bannir', 
          action: 'banned', 
          variant: 'danger',
          style: { backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' }
        }
      ];
    }
    
    // Cas 4: Refusé
    if (verification_status === 'rejected') {
      return [
        { 
          label: '↩️ Réexaminer', 
          action: 'pending', 
          variant: 'primary',
          style: { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }
        }
      ];
    }
    
    // Cas 5: Non vérifié (suspendu)
    if (verification_status === 'none') {
      return [
        { 
          label: '🔄 Mettre en attente', 
          action: 'pending', 
          variant: 'primary',
          style: { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }
        },
        { 
          label: '✅ Valider directement', 
          action: 'verified', 
          variant: 'primary',
          style: { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
        }
      ];
    }
    
    // Aucune action disponible
    return [];
  };
  
  const actions = getAvailableActions();
  
  // Ne rien afficher si aucune action
  if (actions.length === 0) return null;
  
  return (
    <ActionBar title="⚡ Actions rapides">
      {actions.map((action, idx) => (
        <Button
          key={idx}
          variant={action.variant}
          size={size}
          onClick={() => onStatusChange(profil.id, action.action)}
          disabled={processing}
          style={{
            height: size === 'sm' ? '32px' : '40px',
            fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
            padding: size === 'sm' ? '0 12px' : '0 16px',
            ...action.style
          }}
          title={action.description}
        >
          {action.label}
        </Button>
      ))}
    </ActionBar>
  );
};

/**
 * ReportActions - Actions spécifiques pour l'onglet "Signalés"
 */
export const ReportActions = ({ 
  profil, 
  onIgnoreReports,
  onSuspend,
  onBan,
  processing = false 
}) => {
  if (!profil) return null;
  
  return (
    <ActionBar title="⚡ Actions de modération" variant="danger">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onIgnoreReports}
        disabled={processing}
        style={{ 
          height: '32px', 
          fontSize: '0.75rem',
          padding: '0 12px'
        }}
      >
        ✅ Ignorer signalements
      </Button>
      
      <Button 
        variant="secondary" 
        size="sm"
        onClick={onSuspend}
        disabled={processing}
        style={{ 
          height: '32px', 
          fontSize: '0.75rem',
          backgroundColor: '#f59e0b',
          borderColor: '#f59e0b',
          color: '#fff',
          padding: '0 12px'
        }}
      >
        ⏸️ Suspendre
      </Button>
      
      <Button 
        variant="danger" 
        size="sm"
        onClick={onBan}
        disabled={processing}
        style={{ 
          height: '32px', 
          fontSize: '0.75rem',
          padding: '0 12px'
        }}
      >
        🛑 Bannir
      </Button>
    </ActionBar>
  );
};
