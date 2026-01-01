import PropTypes from 'prop-types';
import { useTranslation } from '../hooks/useTranslation';

/**
 * LoadingScreen - Full screen loading component
 * Used during wallet initialization
 */
const LoadingScreen = ({ message }) => {
  const { t } = useTranslation();

  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        <div className="loading-logo">
          <div className="logo-pulse">🌱</div>
        </div>
        <div className="loading-spinner"></div>
        <p className="loading-text">
          {message || t('common.loadingWallet') || 'Chargement du portefeuille...'}
        </p>
      </div>
    </div>
  );
};

LoadingScreen.propTypes = {
  message: PropTypes.string
};

export default LoadingScreen;
