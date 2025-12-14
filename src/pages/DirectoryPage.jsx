import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { selectedFarmAtom, favoriteFarmsAtom, toggleFarmFavoriteAtom, walletConnectedAtom, currentTokenIdAtom, walletModalOpenAtom } from '../atoms';
import { useFarms } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { useEcashWallet, useEcashToken } from '../hooks/useEcashWallet';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';
import WalletConnect from '../components/WalletConnect';
import { FarmProfileCard, FarmProfileModal } from '../components/FarmProfile';
import { Button } from '../components/UI';
import { CTACard, useCTAInjection } from '../components/CTA';
import '../styles/directory.css';

/**
 * Directory Page - Farm selection interface
 * This is the entry point of the Farm Wallet Platform
 */
const DirectoryPage = () => {
  const { t } = useTranslation();
  const { farms, loading, error } = useFarms();
  const { wallet } = useEcashWallet();
  const [, setSelectedFarm] = useAtom(selectedFarmAtom);
  const [favoriteFarmIds] = useAtom(favoriteFarmsAtom);
  const [, toggleFavorite] = useAtom(toggleFarmFavoriteAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [isWalletModalOpen, setIsWalletModalOpen] = useAtom(walletModalOpenAtom);
  const navigate = useNavigate();
  
  // State pour les tickers blockchain
  const [farmTickers, setFarmTickers] = useState({});

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(4); // Pagination: show 4 farms by default
  
  // Modal state
  const [modalFarm, setModalFarm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // The wallet modal is controlled by isWalletModalOpen atom
  // TopBar can set it to true to open the modal from anywhere
  // The modal closes itself when connection succeeds or user clicks X

  // Get unique countries from farms
  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(farms.map(farm => farm.location_country).filter(Boolean))];
    return uniqueCountries.sort();
  }, [farms]);

  // Get unique regions - filtered by selected country (cascading)
  const regions = useMemo(() => {
    let filteredFarms = farms;
    if (selectedCountry !== 'all') {
      filteredFarms = farms.filter(farm => farm.location_country === selectedCountry);
    }
    const uniqueRegions = [...new Set(filteredFarms.map(farm => farm.location_region).filter(Boolean))];
    return uniqueRegions.sort();
  }, [farms, selectedCountry]);
  
  // Get unique departments - filtered by selected country and region (cascading)
  const departments = useMemo(() => {
    let filteredFarms = farms;
    if (selectedCountry !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_country === selectedCountry);
    }
    if (selectedRegion !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_region === selectedRegion);
    }
    const uniqueDepartments = [...new Set(filteredFarms.map(farm => farm.location_department).filter(Boolean))];
    return uniqueDepartments.sort();
  }, [farms, selectedCountry, selectedRegion]);
  
  // Get unique products - filtered by current geographic selection (cascading)
  const products = useMemo(() => {
    let filteredFarms = farms;
    if (selectedCountry !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_country === selectedCountry);
    }
    if (selectedRegion !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_region === selectedRegion);
    }
    if (selectedDepartment !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_department === selectedDepartment);
    }
    const allProducts = filteredFarms.flatMap(farm => farm.products || []);
    const uniqueProducts = [...new Set(allProducts)];
    return uniqueProducts.sort();
  }, [farms, selectedCountry, selectedRegion, selectedDepartment]);
  
  // Get unique services - filtered by current geographic selection (cascading)
  const services = useMemo(() => {
    let filteredFarms = farms;
    if (selectedCountry !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_country === selectedCountry);
    }
    if (selectedRegion !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_region === selectedRegion);
    }
    if (selectedDepartment !== 'all') {
      filteredFarms = filteredFarms.filter(farm => farm.location_department === selectedDepartment);
    }
    const allServices = filteredFarms.flatMap(farm => farm.services || []);
    const uniqueServices = [...new Set(allServices)];
    return uniqueServices.sort();
  }, [farms, selectedCountry, selectedRegion, selectedDepartment]);
  
  // Charger les tickers depuis la blockchain
  useEffect(() => {
    const loadTickers = async () => {
      if (!wallet || !farms || farms.length === 0) return;
      
      const tickers = {};
      for (const farm of farms) {
        // Gérer le nouveau format: tokens array JSONB
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
  }, [wallet, farms]);

  // Vérifier si l'utilisateur est créateur de ferme
  const userFarms = useMemo(() => {
    if (!walletConnected || !wallet?.address) return [];
    return farms.filter(farm => farm.wallet_address === wallet.address);
  }, [farms, walletConnected, wallet]);

  const isCreator = userFarms.length > 0;

  // Filter farms based on search, country, region, department, products, services, and favorites
  const filteredFarms = useMemo(() => {
    // Montrer TOUTES les fermes actives (avec ou sans badge) dans l'annuaire
    let filtered = farms.filter(farm => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = farm.name.toLowerCase().includes(searchLower) ||
                           farm.description.toLowerCase().includes(searchLower) ||
                           (farm.location_country && farm.location_country.toLowerCase().includes(searchLower)) ||
                           (farm.location_region && farm.location_region.toLowerCase().includes(searchLower)) ||
                           (farm.location_department && farm.location_department.toLowerCase().includes(searchLower)) ||
                           (farm.products && farm.products.some(p => p.toLowerCase().includes(searchLower))) ||
                           (farm.services && farm.services.some(s => s.toLowerCase().includes(searchLower)));
      const matchesCountry = selectedCountry === 'all' || farm.location_country === selectedCountry;
      const matchesRegion = selectedRegion === 'all' || farm.location_region === selectedRegion;
      const matchesDepartment = selectedDepartment === 'all' || farm.location_department === selectedDepartment;
      const matchesProduct = selectedProduct === 'all' || (farm.products && farm.products.includes(selectedProduct));
      const matchesService = selectedService === 'all' || (farm.services && farm.services.includes(selectedService));
      const matchesFavorite = !showFavoritesOnly || favoriteFarmIds.includes(farm.id);
      
      return matchesSearch && matchesCountry && matchesRegion && matchesDepartment && matchesProduct && matchesService && matchesFavorite;
    });
    
    // Sort favorites first if wallet is connected
    if (walletConnected && favoriteFarmIds.length > 0) {
      filtered = filtered.sort((a, b) => {
        const aIsFavorite = favoriteFarmIds.includes(a.id);
        const bIsFavorite = favoriteFarmIds.includes(b.id);
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      });
    }
    
    return filtered;
  }, [farms, searchQuery, selectedCountry, selectedRegion, selectedDepartment, selectedProduct, selectedService, showFavoritesOnly, walletConnected, favoriteFarmIds]);

  // Contexte utilisateur pour les CTA
  const userContext = useMemo(() => ({
    isCreator: userFarms.length > 0,
  }), [userFarms]);
  
  // Contexte des filtres pour les CTA
  const filterContext = useMemo(() => ({
    searchQuery,
    selectedCountry,
    selectedRegion,
    selectedDepartment,
    selectedProduct,
    selectedService,
  }), [searchQuery, selectedCountry, selectedRegion, selectedDepartment, selectedProduct, selectedService]);
  
  // Utiliser le hook pour injecter les CTA dans la liste
  const farmsWithCTAs = useCTAInjection(filteredFarms, userContext, filterContext);
  
  // Debug: Log pour voir ce qui est retourné
  useEffect(() => {
    console.log('🔍 Debug CTA:');
    console.log('- filteredFarms:', filteredFarms.length);
    console.log('- farmsWithCTAs:', farmsWithCTAs.length);
    console.log('- userContext:', userContext);
    console.log('- CTA items:', farmsWithCTAs.filter(f => f.isCTA));
  }, [filteredFarms, farmsWithCTAs, userContext]);

  const handleSelectFarm = (farm) => {
    console.log('Selected farm:', farm);
    setSelectedFarm(farm);
    navigate('/wallet');
  };

  const handleLogout = () => {
    if (window.confirm(t('wallet.disconnectConfirm'))) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleLogin = () => {
    setIsWalletModalOpen(true);
  };

  const handleRegisterFarm = () => {
    navigate('/farmer-info');
  };
  
  const handleCardClick = (farm) => {
    // Les CTA sont gérés directement par le composant CTACard
    setModalFarm(farm);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalFarm(null);
  };
  
  const handleSelectFromModal = () => {
    if (modalFarm) {
      if (!walletConnected) {
        // Si non connecté, ouvrir le modal wallet
        handleCloseModal();
        setIsWalletModalOpen(true);
      } else {
        // Si connecté, sélectionner la ferme
        handleSelectFarm(modalFarm);
        handleCloseModal();
      }
    }
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
        <div className="directory-loading">
          <div className="loading-spinner"></div>
          <p>{t('directory.loading') || 'Loading farms...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="directory-container">
        <div className="directory-error">
          <h2>❌ {t('directory.error') || 'Error'}</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="directory-container">
      <TopBar />

      <header className="directory-header">
        <h1>Soutenez vos producteurs locaux en direct 🇫🇷</h1>
        <p className="directory-subtitle">
          {t('directory.subtitle') || 'La plateforme de crowdfunding local décentralisé sur eCash'}
        </p>
      </header>

      {/* Filters Section */}
      <div className="directory-filters-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {/* Bouton Favoris - visible seulement si connecté */}
          {walletConnected && favoriteFarmIds.length > 0 && (
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.3rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title={showFavoritesOnly ? 'Afficher toutes les fermes' : 'Afficher uniquement mes favoris'}
            >
              {showFavoritesOnly ? '⭐' : '☆'}
            </button>
          )}
          
          <div className="search-container" style={{ flex: 1, margin: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={t('directory.searchPlaceholder') || 'Rechercher une ferme...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid - toujours visible */}
        <div className="filters-grid" style={{ display: 'grid' }}>
          <div className="filter-group">
            <select
              className="filter-select modern"
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedRegion('all');
                setSelectedDepartment('all');
              }}
            >
              <option value="all">🌍 {t('directory.allCountries')}</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              className="filter-select modern"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedDepartment('all');
              }}
            >
              <option value="all">📍 {t('directory.allRegions')}</option>
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              className="filter-select modern"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">🏘️ {t('directory.allDepartments')}</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              className="filter-select modern"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="all">🥬 {t('directory.allProducts')}</option>
              {products.map((product) => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              className="filter-select modern"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="all">🛠️ {t('directory.allServices')}</option>
              {services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Bouton Clear All Filters - visible si au moins un filtre est actif */}
        {(searchQuery || selectedCountry !== 'all' || selectedRegion !== 'all' || selectedDepartment !== 'all' || selectedProduct !== 'all' || selectedService !== 'all' || showFavoritesOnly) && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <Button
              variant="ghost"
              icon="✕"
              onClick={() => {
                setSearchQuery('');
                setSelectedCountry('all');
                setSelectedRegion('all');
                setSelectedDepartment('all');
                setSelectedProduct('all');
                setSelectedService('all');
                setShowFavoritesOnly(false);
              }}
            >
              {t('directory.clearAllFilters')}
            </Button>
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="results-count">
          {filteredFarms.length === farms.length ? (
            <p>
              {farms.length} {t('directory.farmsAvailable') || 'farms available'}
            </p>
          ) : (
            <p>
              {filteredFarms.length} {t('directory.resultsFound') || 'results found'} {t('directory.outOf') || 'out of'} {farms.length}
            </p>
          )}
        </div>
      )}

      {/* Farms Grid */}
      <div className="farms-grid">
        {farmsWithCTAs.length === 0 ? (
          <div className="no-farms">
            <p>
              {searchQuery || selectedRegion !== 'all' 
                ? (t('directory.noResults') || 'No farms match your filters')
                : (t('directory.noFarms') || 'No farms available yet')
              }
            </p>
            {(searchQuery || selectedCountry !== 'all' || selectedRegion !== 'all' || selectedDepartment !== 'all' || selectedProduct !== 'all' || selectedService !== 'all' || showFavoritesOnly) && (
              <button
                className="reset-filters-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCountry('all');
                  setSelectedRegion('all');
                  setSelectedDepartment('all');
                  setSelectedProduct('all');
                  setSelectedService('all');
                  setShowFavoritesOnly(false);
                }}
              >
                {t('directory.resetFilters') || 'Réinitialiser les filtres'}
              </button>
            )}
          </div>
        ) : (
          <>
            {farmsWithCTAs.slice(0, displayCount).map((item) => (
              item.isCTA ? (
                <CTACard 
                  key={item.id}
                  cta={item}
                  ctaConfig={item.ctaConfig}
                />
              ) : (
                <FarmProfileCard
                  key={item.id}
                  farm={item}
                  farmTickers={farmTickers}
                  onCardClick={handleCardClick}
                />
              )
            ))}
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {farmsWithCTAs.length > displayCount && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={() => setDisplayCount(displayCount + 4)}
          >
            ➕ {t('directory.viewMore') || 'Voir plus'}
          </button>
        </div>
      )}

      {displayCount > 4 && farmsWithCTAs.length > 4 && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn secondary"
            onClick={() => setDisplayCount(4)}
          >
            ➖ {t('directory.viewLess') || 'Voir moins'}
          </button>
        </div>
      )}

      {/* Register Farm CTA - Attractive Call To Action */}
      <div className="register-farm-cta">
        <div className="register-farm-cta-card">
          <div className="register-farm-cta-content">
            <div className="register-farm-cta-icon">🌾</div>
            <h2 className="register-farm-cta-title">
              {t('directory.registerCTATitle') || 'Vous êtes producteur ?'}
            </h2>
            <p className="register-farm-cta-subtitle">
              {t('directory.registerCTASubtitle') || 'Rejoignez la première plateforme de financement participatif décentralisé pour l’agriculture locale'}
            </p>
            
            <div className="register-farm-cta-features">
              <div className="register-farm-cta-feature">
                <span>✔️</span>
                <span>{t('directory.registerFeature1') || 'Gratuit et sans commission'}</span>
              </div>
              <div className="register-farm-cta-feature">
                <span>✔️</span>
                <span>{t('directory.registerFeature2') || 'Visibilité instantanée'}</span>
              </div>
              <div className="register-farm-cta-feature">
                <span>✔️</span>
                <span>{t('directory.registerFeature3') || 'Paiements sécurisés'}</span>
              </div>
            </div>
            
            <Button
              variant="primary"
              icon="🚀"
              onClick={handleRegisterFarm}
              style={{ 
                backgroundColor: 'white', 
                color: '#667eea',
                fontWeight: '700',
                fontSize: '1.1rem',
                padding: '0 32px',
                minHeight: '56px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {t('directory.registerFarmButton') || 'Être référencé gratuitement'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Farm Details Modal */}
      <FarmProfileModal
        farm={modalFarm}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        farmTickers={farmTickers}
      />
      
      {/* Wallet Connection Modal */}
      {isWalletModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWalletModalOpen(false)}>
          <div className="modal-container wallet-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setIsWalletModalOpen(false)}
            >
              ✕
            </button>
            
            <div className="modal-content" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Connexion Requise
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                Connectez votre portefeuille eCash pour gérer vos fermes, vos jetons et accéder à toutes les fonctionnalités.
              </p>

              {/* Le composant gère lui-même les boutons (Importer / Créer) */}
              <div style={{ textAlign: 'left' }}>
                <WalletConnect onConnected={() => setIsWalletModalOpen(false)} />
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  onClick={() => { setIsWalletModalOpen(false); navigate('/faq'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Besoin d'aide ?
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation - show if wallet is connected */}
      {walletConnected && (
        <div className="directory-bottom-nav">
          <BottomNavigation />
        </div>
      )}
    </div>
  );
};

/**
 * Smart FarmCard Component - Shows Pay button if user holds tokens, Select otherwise
 */
const FarmCard = ({ farm, isFavorite, onCardClick, onSelectClick, onReport, farmTickers }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [, setSelectedFarm] = useAtom(selectedFarmAtom);
  const [, setCurrentTokenId] = useAtom(currentTokenIdAtom);
  const [, toggleFavorite] = useAtom(toggleFarmFavoriteAtom);
  
  // Get visible tokens from farm
  const visibleTokens = farm.tokens?.filter(token => token.isVisible) || [];
  const primaryToken = visibleTokens[0]; // Premier token comme token principal
  
  // Check token balance for primary token
  const { tokenBalance, loading: balanceLoading } = useEcashToken(primaryToken?.tokenId);
  
  const hasTokens = walletConnected && Number(tokenBalance) > 0;

  const handleSelectFarm = (e) => {
    e.stopPropagation();
    if (!walletConnected) {
      // Si non connecté, ouvrir le modal wallet
      onSelectClick();
    } else {
      // Si connecté, sélectionner la ferme avec le premier token
      setSelectedFarm(farm);
      setCurrentTokenId(primaryToken?.tokenId);
      navigate('/wallet');
    }
  };

  const handlePayFarm = (e) => {
    e.stopPropagation();
    setSelectedFarm(farm);
    setCurrentTokenId(primaryToken?.tokenId);
    navigate('/send');
  };

  const handleCardClick = () => {
    onCardClick(farm);
  };

  return (
    <div className="farm-card" onClick={handleCardClick}>
      <div className="farm-card-content">
        {/* Favorite star - only show if connected */}
        {walletConnected && (
          <button
            className={`favorite-star-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(farm.id);
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        )}
        
        <h3 className="farm-name">
          {farm.name}
        </h3>
        <p className="farm-region">📍 {farm.location_region || farm.region || 'Non renseigné'}</p>
        <p className="farm-description">{farm.description}</p>
        
        {/* Tokens visibles - Section modernisée */}
        {visibleTokens.length > 0 && (
          <div style={{ 
            marginTop: '12px', 
            padding: '12px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            color: 'white'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '6px', opacity: 0.9 }}>
              💎 {visibleTokens.length === 1 ? 'Token disponible' : `${visibleTokens.length} Tokens disponibles`}
            </div>
            {visibleTokens.map((token, idx) => (
              <div key={token.tokenId} style={{ 
                marginTop: idx > 0 ? '8px' : '0',
                paddingTop: idx > 0 ? '8px' : '0',
                borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                  {farmTickers[token.tokenId] || token.ticker || 'Token'}
                </div>
                {token.purpose && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px' }}>
                    {token.purpose}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Rewards banner - show if defined */}
        {farm.rewards && (
          <div className="farm-rewards-banner">
            🎁 {farm.rewards}
          </div>
        )}
        
        {/* Token balance - show if user has tokens */}
        {hasTokens && !balanceLoading && primaryToken && (
          <div className="farm-balance-display">
            💰 {t('directory.yourBalance') || 'Votre solde'}: <strong>{Number(tokenBalance).toLocaleString()} {farmTickers[primaryToken.tokenId] || primaryToken.ticker || 'tokens'}</strong>
          </div>
        )}
        
        {/* Product badges */}
        {farm.products && farm.products.length > 0 && (
          <div className="product-badges">
            {farm.products.map((product, idx) => (
              <span key={idx} className="product-badge">
                {product}
              </span>
            ))}
          </div>
        )}
        
        <div className="farm-footer">
          <div className="farm-badges">
            {farm.verification_status === 'verified' ? (
              <StatusBadge status="verified" type="verification" />
            ) : farm.verification_status === 'pending' ? (
              <StatusBadge status="pending" type="verification" />
            ) : farm.verification_status === 'info_requested' ? (
              <StatusBadge status="info_requested" type="verification" />
            ) : (
              <StatusBadge status="none" type="verification" />
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Report button - only show if connected */}
            {walletConnected && (
              <button 
                className="report-farm-btn"
                onClick={(e) => onReport(e, farm)}
                title="Signaler cette ferme"
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  background: 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#ef4444';
                }}
              >
                🚨
              </button>
            )}
            
            {/* Smart button - Pay if has tokens, Select otherwise */}
            {hasTokens ? (
              <button 
                className="pay-farm-btn"
                onClick={handlePayFarm}
              >
                {t('directory.pay') || 'Pay'} 💳
              </button>
            ) : (
              <button 
                className="select-farm-btn"
                onClick={handleSelectFarm}
              >
                {t('directory.select') || 'Select'} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectoryPage;
