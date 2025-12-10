import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAtom, useSetAtom } from 'jotai';
import { walletConnectedAtom, notificationAtom, walletModalOpenAtom } from '../../atoms';
import { useBalance } from '../../hooks';
import { useTranslation } from '../../hooks/useTranslation';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { useIsCreator } from '../../hooks/useIsCreator';
import ThemeToggle from '../ThemeToggle';
import LanguageToggle from '../LanguageToggle';

const TopBar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const { loading, refreshBalance } = useBalance();
  const { resetWallet } = useEcashWallet();
  const isCreator = useIsCreator();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const setNotification = useSetAtom(notificationAtom);
  const setWalletModalOpen = useSetAtom(walletModalOpenAtom);

  // App name always displayed in center (dynamic based on route)
  const isHomePage = location.pathname === '/';
  const isFarmerInfoPage = location.pathname === '/farmer-info';
  const isCreateTokenPage = location.pathname === '/create-token';
  
  // Dynamic title based on current page
  let appName = '🌱 Farm Wallet';
  if (isCreateTokenPage) {
    appName = '🏭 Atelier Jeton';
  }
  
  const showBackButton = !isHomePage;
  const showFarmerLinkLeft = isHomePage && !isFarmerInfoPage;

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
      // Reset refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    console.log('🚪 Logout confirmed, resetting wallet...');
    
    // Close modal first
    setShowLogoutModal(false);
    
    // Show notification
    setNotification({
      type: 'success',
      message: t('common.logoutSuccess') || 'Déconnexion réussie'
    });
    
    // Use resetWallet from hook - it handles everything correctly
    resetWallet();
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleLogin = () => {
    // Navigate to home and open wallet modal
    if (location.pathname === '/') {
      // Already on home, just open modal
      setWalletModalOpen(true);
    } else {
      // Navigate to home first
      navigate('/');
      // Open modal after navigation (slight delay to ensure page loads)
      setTimeout(() => {
        setWalletModalOpen(true);
      }, 100);
    }
  };

  return (
    <div className="top-bar top-bar-solid">
      <div className="top-bar-content">
        {/* LEFT SECTION */}
        {showFarmerLinkLeft ? (
          <button
            onClick={() => navigate('/farmer-info')}
            className="farmer-text-link"
          >
            🌻 {t('topBar.iAmFarmer') || 'Je suis producteur'}
          </button>
        ) : showBackButton ? (
          <button
            onClick={handleBackClick}
            className="back-button"
            aria-label={t('common.back')}
          >
            ← {t('common.back')}
          </button>
        ) : (
          <div className="top-bar-left-spacer"></div>
        )}

        {/* CENTER SECTION - App Name */}
        <h1 className="page-title">{appName}</h1>

        {/* RIGHT SECTION - Always visible */}
        <div className="top-bar-spacer">
          {/* Creator shortcut - if user is creator (AVANT FAQ) */}
          {isCreator && (
            <button
              onClick={() => navigate('/manage-token')}
              className="creator-shortcut"
              title={t('topBar.manageTokens') || 'Gérer les tokens'}
              aria-label={t('topBar.manageTokens') || 'Gérer les tokens'}
            >
              🗝️
            </button>
          )}
          
          {/* FAQ button - TOUJOURS visible */}
          <button
            onClick={() => navigate('/faq')}
            className="support-link"
            title={t('support.help') || 'Aide'}
          >
            ❓
          </button>
          
          {/* Auth button - ALWAYS visible with primary background */}
          <button
            onClick={walletConnected ? handleLogoutClick : handleLogin}
            className="auth-button auth-button-primary"
            title={walletConnected ? t('common.disconnect') : t('common.connect')}
          >
            <span className="auth-icon">{walletConnected ? '🔓' : '🔒'}</span>
            <span className="auth-text">{walletConnected ? t('common.disconnect') : t('common.connect')}</span>
          </button>
          <LanguageToggle />
          <ThemeToggle compact={true} />
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={handleLogoutCancel}>
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
                onClick={handleLogoutCancel}
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

TopBar.propTypes = {};

export default TopBar;
