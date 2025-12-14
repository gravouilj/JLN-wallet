import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { favoriteFarmsAtom, selectedFarmAtom, toggleFarmFavoriteAtom, walletConnectedAtom } from '../atoms';
import { useFarms } from '../hooks/useFarms';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';
import { FarmProfileCard, FarmProfileModal } from '../components/FarmProfile';
import '../styles/directory.css';

const FavoritesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const { farms, loading, error } = useFarms();
  const [favoriteFarmIds] = useAtom(favoriteFarmsAtom);
  const [, setSelectedFarm] = useAtom(selectedFarmAtom);
  const [, toggleFavorite] = useAtom(toggleFarmFavoriteAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [modalFarm, setModalFarm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [farmTickers, setFarmTickers] = useState({});
  
  // Filter farms to only show favorites
  const favoriteFarms = farms.filter(farm => favoriteFarmIds.includes(farm.id));

  // Load tickers from blockchain
  useEffect(() => {
    const loadTickers = async () => {
      if (!wallet || !favoriteFarms || favoriteFarms.length === 0) return;
      
      const tickers = {};
      for (const farm of favoriteFarms) {
        if (farm.tokens && Array.isArray(farm.tokens)) {
          for (const token of farm.tokens) {
            if (token.tokenId && token.isVisible) {
              try {
                const info = await wallet.getTokenInfo(token.tokenId);
                tickers[token.tokenId] = info.genesisInfo?.tokenTicker || token.ticker || 'UNK';
              } catch (e) {
                console.warn(`⚠️ Impossible de charger ticker pour ${token.tokenId}`);
                tickers[token.tokenId] = token.ticker || '???';
              }
            }
          }
        }
      }
      setFarmTickers(tickers);
    };
    
    loadTickers();
  }, [wallet, favoriteFarms]);

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
    const location = [
      farm.address,
      farm.location_region || farm.region,
      farm.location_country || 'France'
    ].filter(Boolean).join(', ');
    const query = encodeURIComponent(location);
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
          <FarmProfileCard
            key={farm.id}
            farm={farm}
            farmTickers={farmTickers}
            onCardClick={handleOpenModal}
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
      <FarmProfileModal
        farm={modalFarm}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        farmTickers={farmTickers}
      />

      {walletConnected && <BottomNavigation />}
    </div>
  );
};

export default FavoritesPage;
