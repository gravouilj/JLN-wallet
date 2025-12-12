import { useState } from 'react';
import { useAtom } from 'jotai';
import { favoriteFarmsAtom, selectedFarmAtom, toggleFarmFavoriteAtom, walletConnectedAtom } from '../atoms';
import { useFarms } from '../hooks/useFarms';
import { useEcashToken } from '../hooks/useEcashWallet';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';
import '../styles/directory.css';

const FavoritesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { farms, loading, error } = useFarms();
  const [favoriteFarmIds] = useAtom(favoriteFarmsAtom);
  const [, setSelectedFarm] = useAtom(selectedFarmAtom);
  const [, toggleFavorite] = useAtom(toggleFarmFavoriteAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [modalFarm, setModalFarm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter farms to only show favorites
  const favoriteFarms = farms.filter(farm => favoriteFarmIds.includes(farm.id));

  const handleOpenModal = (farm) => {
    setModalFarm(farm);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalFarm(null);
  };

  const handlePayFarm = (farm) => {
    setSelectedFarm(farm);
    navigate('/wallet');
    handleCloseModal();
  };

  const handleRemoveFavorite = (e, farmId) => {
    e.stopPropagation();
    toggleFavorite(farmId);
  };

  const handleInviteFarmer = () => {
    const shareData = {
      title: 'Farm Wallet - Plateforme de monnaie locale',
      text: 'Découvre cette plateforme pour créer ta monnaie locale et financer ton exploitation de manière décentralisée. Rejoins la communauté des producteurs en circuit court !',
      url: window.location.origin
    };

    if (navigator.share) {
      navigator.share(shareData)
        .catch((error) => {
          if (error.name !== 'AbortError') {
            openMailtoFallback();
          }
        });
    } else {
      openMailtoFallback();
    }
  };

  const openMailtoFallback = () => {
    const subject = encodeURIComponent('Découvre Farm Wallet - Plateforme de monnaie locale');
    const body = encodeURIComponent(`Bonjour,

Je t'invite à découvrir Farm Wallet, une plateforme qui permet aux producteurs de créer leur propre monnaie locale pour :
- Financer leur(s) activité(s)
- Augmenter leurs ventes
- Développer leur réseau
- Fidéliser leur clientèle

Bref vendre en circuit ultra-court sans intermédiaire plus facilement !

C'est simple, gratuit et très simple à utiliser.

Découvre la plateforme : ${window.location.origin}

À bientôt !`);
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const getGoogleMapsLink = (farm) => {
    const query = encodeURIComponent(`${farm.name}, ${farm.region}, France`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (loading) {
    return (
      <div className="directory-container">
        <TopBar />
        <div className="directory-loading">
          <div className="loading-spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
        {walletConnected && <BottomNavigation />}
      </div>
    );
  }

  if (error) {
    return (
      <div className="directory-container">
        <TopBar />
        <div className="directory-error">
          <h2>❌ {t('directory.error') || 'Error'}</h2>
          <p>{error}</p>
        </div>
        {walletConnected && <BottomNavigation />}
      </div>
    );
  }

  if (favoriteFarms.length === 0) {
    return (
      <div className="directory-container">
        <TopBar />
        <div className="directory-header">
          <h1>🧑‍🌾 {t('favorites.title') || 'Mes producteurs'}</h1>
          <p className="directory-subtitle">
            {t('favorites.description') || 'Retrouvez ici vos producteurs préférés pour un accès rapide.'}
          </p>
        </div>
        <div className="empty-favorites">
          <p className="empty-message">{t('favorites.empty') || 'Aucun producteur favori. Ajoutez des fermes depuis le répertoire !'}</p>
          <button onClick={() => navigate('/')} className="primary-button">
            {t('favorites.goToDirectory') || 'Parcourir le répertoire'}
          </button>
        </div>

        <div className="invite-section">
          <h2>{t('favorites.inviteTitle') || 'Vous connaissez un producteur ?'}</h2>
          <p className="invite-description">
            {t('favorites.inviteDescription') || 'Partagez la plateforme avec les producteurs de votre région et aidez-les à créer leur monnaie locale.'}
          </p>
          <button onClick={handleInviteFarmer} className="invite-button">
            👨‍🌾 {t('favorites.inviteButton') || 'Inviter un fermier'}
          </button>
        </div>
        {walletConnected && <BottomNavigation />}
      </div>
    );
  }

  return (
    <div className="directory-container">
      <TopBar />
      
      <div className="directory-header">
        <h1>🧑‍🌾 {t('favorites.title') || 'Mes producteurs'}</h1>
        <p className="directory-subtitle">
          {t('favorites.description') || 'Retrouvez ici vos producteurs préférés pour un accès rapide.'}
        </p>
      </div>

      {/* Results count */}
      <div className="results-count">
        <p>
          {favoriteFarms.length} {favoriteFarms.length === 1 ? t('directory.farm') || 'farm' : t('directory.farms') || 'farms'}
        </p>
      </div>

      {/* Farms Grid */}
      <div className="farms-grid">
        {favoriteFarms.map((farm) => (
          <FavoriteFarmCard 
            key={farm.id}
            farm={farm}
            onCardClick={() => handleOpenModal(farm)}
            onRemoveFavorite={(e) => handleRemoveFavorite(e, farm.id)}
          />
        ))}
      </div>

      {/* Invitation Section */}
      <div className="invite-section">
        <h2>{t('favorites.inviteTitle') || 'Vous connaissez un producteur ?'}</h2>
        <p className="invite-description">
          {t('favorites.inviteDescription') || 'Partagez la plateforme avec les producteurs de votre région et aidez-les à créer leur monnaie locale.'}
        </p>
        <button onClick={handleInviteFarmer} className="invite-button">
          👨‍🌾 {t('favorites.inviteButton') || 'Inviter un fermier'}
        </button>
      </div>

      {/* Farm Details Modal */}
      {isModalOpen && modalFarm && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>
              ✕
            </button>
            
            <div className="modal-header">
              <h2>{modalFarm.name}</h2>
              {modalFarm.verified && (
                <span className="verified-badge verified modal-verified">
                  ✓ {t('directory.verified') || 'Verified'}
                </span>
              )}
            </div>
            
            <div className="modal-body">
              <div className="modal-info-row">
                <span className="modal-label">🌍 {t('directory.country') || 'Pays'}:</span>
                <span className="modal-value">{modalFarm.country}</span>
              </div>

              <div className="modal-info-row">
                <span className="modal-label">📍 {t('directory.region') || 'Région'}:</span>
                <span className="modal-value">{modalFarm.region}</span>
              </div>
              
              {modalFarm.department && (
                <div className="modal-info-row">
                  <span className="modal-label">🏛️ Département:</span>
                  <span className="modal-value">{modalFarm.department}</span>
                </div>
              )}
              
              <div className="modal-section">
                <h3>{t('directory.description') || 'Description'}</h3>
                <p>{modalFarm.description}</p>
              </div>
              
              {modalFarm.products && modalFarm.products.length > 0 && (
                <div className="modal-section">
                  <h3>👨‍🌾 Produits</h3>
                  <div className="product-badges">
                    {modalFarm.products.map((product, idx) => (
                      <span key={idx} className="product-badge">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {modalFarm.contactEmail && (
                <div className="modal-info-row">
                  <span className="modal-label">📧 {t('directory.contact') || 'Contact'}:</span>
                  <a href={`mailto:${modalFarm.contactEmail}`} className="modal-link">
                    {modalFarm.contactEmail}
                  </a>
                </div>
              )}
              
              {modalFarm.website && (
                <div className="modal-info-row">
                  <span className="modal-label">🌐 {t('directory.website') || 'Website'}:</span>
                  <a href={modalFarm.website} target="_blank" rel="noopener noreferrer" className="modal-link">
                    {modalFarm.website}
                  </a>
                </div>
              )}
              
              <div className="modal-actions">
                <a
                  href={getGoogleMapsLink(modalFarm)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-map-btn"
                >
                  🗺️ {t('directory.directions') || 'Itinéraire'}
                </a>
                <button onClick={() => handlePayFarm(modalFarm)} className="modal-select-btn">
                  💰 {t('directory.investNow') || 'Investir maintenant'} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {walletConnected && <BottomNavigation />}
    </div>
  );
};

/**
 * FavoriteFarmCard - Shows favorite farm with live balance
 */
const FavoriteFarmCard = ({ farm, onCardClick, onRemoveFavorite }) => {
  const { t } = useTranslation();
  const { tokenBalance, loading } = useEcashToken(farm.tokenId);
  
  return (
    <div className="farm-card" onClick={onCardClick}>
      <div className="card-header">
        <h3>{farm.name}</h3>
        <button
          className="favorite-btn active"
          onClick={onRemoveFavorite}
          title="Remove from favorites"
        >
          ⭐
        </button>
      </div>
      
      <div className="card-content">
        <p className="card-region">📍 {farm.region}</p>
        <p className="card-description">{farm.description}</p>
        
        {farm.products && farm.products.length > 0 && (
          <div className="card-products">
            {farm.products.slice(0, 3).map((product, idx) => (
              <span key={idx} className="product-tag">{product}</span>
            ))}
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <div className="card-balance">
          <span className="balance-label">{t('common.balance') || 'Solde'}:</span>
          <span className="balance-value">
            {loading ? (
              <span className="loading-text">{t('common.loading') || 'Chargement'}...</span>
            ) : (
              `${(Number(tokenBalance) / 100).toFixed(2)} ${farm.tokenSymbol || farm.name}`
            )}
          </span>
        </div>
        
        <button 
          className="pay-button"
          onClick={(e) => {
            e.stopPropagation();
            onCardClick();
          }}
        >
          💰 {t('common.invest') || 'Investir'}
        </button>
      </div>
    </div>
  );
};

export default FavoritesPage;
