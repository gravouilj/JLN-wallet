import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { walletConnectedAtom } from '../../../atoms';
import { useAdmin } from '../../../hooks/useAdmin';
import { useTranslation } from '../../../hooks/useTranslation';

/**
 * FloatingAdminButton - Bouton flottant pour accès rapide au dashboard admin
 * 
 * Visible uniquement pour les administrateurs sur toutes les pages.
 * S'ajuste automatiquement en fonction de la présence de la bottom navigation.
 * 
 * @returns {JSX.Element|null} Bouton flottant ou null si non admin
 */
const FloatingAdminButton = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAdmin();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const navigate = useNavigate();

  // Ne pas afficher si l'utilisateur n'est pas admin
  if (!isAdmin) return null;

  return (
    <button
      onClick={() => navigate('/admin')}
      style={{
        position: 'fixed',
        bottom: walletConnected ? '92px' : '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: 'var(--admin-primary, #6366f1)',
        color: 'white',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        zIndex: 999
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
      }}
      title={t('admin.dashboard') || 'Tableau de bord admin'}
      aria-label="Accès admin"
    >
      🛡️
    </button>
  );
};

export default FloatingAdminButton;
