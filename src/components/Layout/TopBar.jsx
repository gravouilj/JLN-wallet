import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { 
  mnemonicAtom,           // ✅ Source de vérité pour la connexion
  hasEncryptedWalletAtom, // ✅ Pour savoir si on doit déverrouiller
  notificationAtom, 
  walletModalOpenAtom 
} from '../../atoms';
import { useTranslation } from '../../hooks/useTranslation';
import { useEcashBalance, useEcashWallet } from '../../hooks/useEcashWallet';
import { useIsCreator } from '../../hooks/useIsCreator';
import ThemeToggle from '../ThemeToggle';
import LanguageToggle from '../LanguageToggle';
import NotificationBell from '../NotificationBell';

const TopBar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // États globaux
  const mnemonic = useAtomValue(mnemonicAtom); // Est-on connecté ?
  const hasEncryptedWallet = useAtomValue(hasEncryptedWalletAtom); // A-t-on un wallet local ?
  const setWalletModalOpen = useSetAtom(walletModalOpenAtom);
  const setNotification = useSetAtom(notificationAtom);

  const { loading, refreshBalance } = useEcashBalance();
  const { resetWallet } = useEcashWallet();
  const isCreator = useIsCreator();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Vérification de connexion basée sur la présence du mnemonic en RAM
  const isWalletConnected = !!mnemonic;

  // Logique d'affichage
  const isHomePage = location.pathname === '/landingpage' || location.pathname === '/';
  const showBackButton = !isHomePage;
  
  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefreshClick = async () => {
    if (!refreshBalance || loading || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // --- LOGIQUE DE CONNEXION / DECONNEXION ---

  const handleAuthClick = () => {
    if (isWalletConnected) {
      // Cas 1: Déjà connecté -> On ouvre la modale de déconnexion
      setShowLogoutModal(true);
    } else {
      // Cas 2: Pas connecté
      if (hasEncryptedWallet) {
        // Un wallet existe -> On va sur /wallet pour déclencher le "Unlock Screen"
        navigate('/wallet');
      } else {
        // Rien n'existe -> On ouvre le modal de création
        setWalletModalOpen(true);
      }
    }
  };

  const handleLogoutConfirm = () => {
    console.log('🚪 Logout confirmed...');
    setShowLogoutModal(false);
    setNotification({
      type: 'success',
      message: t('common.logoutSuccess') || 'Déconnexion réussie'
    });
    resetWallet(); // Ceci recharge la page et vide la RAM
  };

  return (
    <div className="top-bar top-bar-solid">
      <div className="top-bar-content">
        {/* GAUCHE : Bouton Retour */}
        <div className="top-bar-spacer">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="back-button"
              title={t('common.back') || 'Retour'}
              aria-label={t('common.back') || 'Retour'}
            >
              ←
            </button>
          )}
        </div>

        {/* CENTRE : Titre Cliquable */}
        <div className="page-title">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>
                JLN WALLET
            </Link>
        </div>

        {/* DROITE : Actions */}
        <div className="top-bar-spacer">
          {/* Raccourci Créateur */}
          {isCreator && (
            <button
              onClick={() => navigate('/manage-token')}
              className="creator-shortcut"
              title={t('topBar.creatorDashboard') || 'Tableau de bord créateur'}
            >
              🗝️
            </button>
          )}
          
          {/* FAQ */}
          <button
            onClick={() => navigate('/faq')}
            className="support-link"
            title={t('support.help') || 'Aide'}
          >
            ❓
          </button>

          {/* Notifications (Seulement si connecté) */}
          {isWalletConnected && <NotificationBell compact={true} />}
          
          {/* Bouton Principal Auth (Connexion / Déconnexion / Déverrouiller) */}
          <button
            onClick={handleAuthClick}
            className={`auth-button ${isWalletConnected ? 'auth-button-connected' : 'auth-button-primary'}`}
            title={isWalletConnected ? t('common.disconnect') : (hasEncryptedWallet ? 'Déverrouiller' : t('common.connect'))}
          >
            <span className="auth-icon">{isWalletConnected ? '🔓' : (hasEncryptedWallet ? '🔑' : '🚀')}</span>
            <span className="auth-text">
                {isWalletConnected 
                    ? (t('common.disconnect') || 'Déconnexion')
                    : (hasEncryptedWallet ? 'Déverrouiller' : (t('common.connect') || 'Connexion'))
                }
            </span>
          </button>

          <LanguageToggle />
          <ThemeToggle compact={true} />
        </div>
      </div>

      {/* Modal de Confirmation Déconnexion */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header">
              <h2>{t('common.logout') || 'Déconnexion'}</h2>
            </div>
            <div className="logout-modal-body">
              <p>{t('wallet.disconnectConfirm') || 'Voulez-vous vraiment vous déconnecter ?'}</p>
            </div>
            <div className="logout-modal-footer">
              <button 
                className="logout-modal-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                {t('common.cancel') || 'Annuler'}
              </button>
              <button 
                className="logout-modal-confirm"
                onClick={handleLogoutConfirm}
              >
                {t('common.disconnect') || 'Se déconnecter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;