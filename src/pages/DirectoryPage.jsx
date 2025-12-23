import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { selectedProfileAtom, favoriteProfilesAtom, toggleProfileFavoriteAtom, walletConnectedAtom, currentTokenIdAtom, walletModalOpenAtom } from '../atoms';
import { useProfiles } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { useEcashWallet, useEcashToken } from '../hooks/useEcashWallet';
import { useAdmin } from '../hooks/useAdmin';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';
import OnboardingModal from '../components/eCash/OnboardingModal';
import SearchFilters from '../components/SearchFilters';
import { CreatorProfileCard, CreatorProfileModal } from '../components/Creators/CreatorProfile';
import { Button } from '../components/UI';
import { CTACard, useCTAInjection } from '../components/Admin/CTA';
import FloatingAdminButton from '../components/Admin/FloatingAdminButton';

/**
 * Directory Page - Creator selection interface
 * This is the entry point of the Creator Wallet Platform
 */
const DirectoryPage = () => {
  const { t } = useTranslation();
  const { profiles, loading, error } = useProfiles();
  const { wallet } = useEcashWallet();
  const { isAdmin } = useAdmin();
  const [, setSelectedProfile] = useAtom(selectedProfileAtom);
  const [favoriteProfileIds] = useAtom(favoriteProfilesAtom);
  const [, toggleFavorite] = useAtom(toggleProfileFavoriteAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [isWalletModalOpen, setIsWalletModalOpen] = useAtom(walletModalOpenAtom);
  const navigate = useNavigate();
  
  // State pour les tickers blockchain
  const [profileTickers, setProfileTickers] = useState({});

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(4); // Pagination: show 4 profiles by default
  
  // Modal state
  const [modalProfile, setModalProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get unique countries from profiles
  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(profiles.map(profile => profile.location_country).filter(Boolean))];
    return uniqueCountries.sort();
  }, [profiles]);

  // Get unique regions - filtered by selected country (cascading)
  const regions = useMemo(() => {
    let filteredProfiles = profiles;
    if (selectedCountry !== 'all') {
      filteredProfiles = profiles.filter(profile => profile.location_country === selectedCountry);
    }
    const uniqueRegions = [...new Set(filteredProfiles.map(profile => profile.location_region).filter(Boolean))];
    return uniqueRegions.sort();
  }, [profiles, selectedCountry]);
  
  // Get unique departments - filtered by selected country and region (cascading)
  const departments = useMemo(() => {
    let filteredProfiles = profiles;
    if (selectedCountry !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_country === selectedCountry);
    }
    if (selectedRegion !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_region === selectedRegion);
    }
    const uniqueDepartments = [...new Set(filteredProfiles.map(profile => profile.location_department).filter(Boolean))];
    return uniqueDepartments.sort();
  }, [profiles, selectedCountry, selectedRegion]);
  
  // Get unique products - filtered by current geographic selection (cascading)
  const products = useMemo(() => {
    let filteredProfiles = profiles;
    if (selectedCountry !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_country === selectedCountry);
    }
    if (selectedRegion !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_region === selectedRegion);
    }
    if (selectedDepartment !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_department === selectedDepartment);
    }
    const allProducts = filteredProfiles.flatMap(profile => profile.products || []);
    const uniqueProducts = [...new Set(allProducts)];
    return uniqueProducts.sort();
  }, [profiles, selectedCountry, selectedRegion, selectedDepartment]);
  
  // Get unique services - filtered by current geographic selection (cascading)
  const services = useMemo(() => {
    let filteredProfiles = profiles;
    if (selectedCountry !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_country === selectedCountry);
    }
    if (selectedRegion !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_region === selectedRegion);
    }
    if (selectedDepartment !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => profile.location_department === selectedDepartment);
    }
    const allServices = filteredProfiles.flatMap(profile => profile.services || []);
    const uniqueServices = [...new Set(allServices)];
    return uniqueServices.sort();
  }, [profiles, selectedCountry, selectedRegion, selectedDepartment]);
  
  // Charger les tickers depuis la blockchain
  useEffect(() => {
    const loadTickers = async () => {
      if (!wallet || !profiles || profiles.length === 0) return;
      
      const tickers = {};
      for (const profile of profiles) {
        // Gérer le nouveau format: tokens array JSONB
        if (profile.tokens && Array.isArray(profile.tokens)) {
          for (const token of profile.tokens) {
            if (token.tokenId && token.isVisible) {
              try {
                const info = await wallet.getTokenInfo(token.tokenId);
                tickers[token.tokenId] = info.genesisInfo?.tokenTicker || token.ticker || 'UNK';
              } catch (e) {
                // Silencieux pour éviter de polluer la console en prod
                tickers[token.tokenId] = token.ticker || '???';
              }
            }
          }
        }
      }
      setProfileTickers(tickers);
    };
    
    loadTickers();
  }, [wallet, profiles]);

  // Vérifier si l'utilisateur est créateur de profil
  const userProfiles = useMemo(() => {
    if (!walletConnected || !wallet?.address) return [];
    return profiles.filter(profile => profile.owner_address === wallet.address);
  }, [profiles, walletConnected, wallet]);

  const isCreator = userProfiles.length > 0;

  // Filter profiles based on search, country, region, department, products, services, and favorites
  const filteredProfiles = useMemo(() => {
    // Montrer TOUTES les profils actifs (avec ou sans badge) dans l'annuaire
    let filtered = profiles.filter(profile => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = profile.name.toLowerCase().includes(searchLower) ||
                           profile.description.toLowerCase().includes(searchLower) ||
                           (profile.location_country && profile.location_country.toLowerCase().includes(searchLower)) ||
                           (profile.location_region && profile.location_region.toLowerCase().includes(searchLower)) ||
                           (profile.location_department && profile.location_department.toLowerCase().includes(searchLower)) ||
                           (profile.products && profile.products.some(p => p.toLowerCase().includes(searchLower))) ||
                           (profile.services && profile.services.some(s => s.toLowerCase().includes(searchLower)));
      const matchesCountry = selectedCountry === 'all' || profile.location_country === selectedCountry;
      const matchesRegion = selectedRegion === 'all' || profile.location_region === selectedRegion;
      const matchesDepartment = selectedDepartment === 'all' || profile.location_department === selectedDepartment;
      const matchesProduct = selectedProduct === 'all' || (profile.products && profile.products.includes(selectedProduct));
      const matchesService = selectedService === 'all' || (profile.services && profile.services.includes(selectedService));
      const matchesFavorite = !showFavoritesOnly || favoriteProfileIds.includes(profile.id);
      
      return matchesSearch && matchesCountry && matchesRegion && matchesDepartment && matchesProduct && matchesService && matchesFavorite;
    });
    
    // Sort favorites first if wallet is connected
    if (walletConnected && favoriteProfileIds.length > 0) {
      filtered = filtered.sort((a, b) => {
        const aIsFavorite = favoriteProfileIds.includes(a.id);
        const bIsFavorite = favoriteProfileIds.includes(b.id);
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      });
    }
    
    return filtered;
  }, [profiles, searchQuery, selectedCountry, selectedRegion, selectedDepartment, selectedProduct, selectedService, showFavoritesOnly, walletConnected, favoriteProfileIds]);

  // Contexte utilisateur pour les CTA
  const userContext = useMemo(() => ({
    isCreator: userProfiles.length > 0,
  }), [userProfiles]);
  
  // Contexte des filtres pour les CTA
  const filterContext = useMemo(() => ({
    searchQuery,
    selectedCountry,
    selectedRegion,
    selectedDepartment,
    selectedProduct,
    selectedService,
  }), [searchQuery, selectedCountry, selectedRegion, selectedDepartment, selectedProduct, selectedService]);
  
  // Utiliser le hook pour injecter les CTA dans la liste (sans logs bruyants)
  const profilesWithCTAs = useCTAInjection(filteredProfiles, userContext, filterContext);

  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile);
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

  const handleRegisterProfile = () => {
    navigate('/landingpage');
  };
  
  const handleCardClick = (profile) => {
    setModalProfile(profile);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalProfile(null);
  };
  
  const handleSelectFromModal = () => {
    if (modalProfile) {
      if (!walletConnected) {
        // Si non connecté, ouvrir le modal wallet
        handleCloseModal();
        setIsWalletModalOpen(true);
      } else {
        // Si connecté, sélectionner la ferme
        handleSelectProfile(modalProfile);
        handleCloseModal();
      }
    }
  };
  
  const getGoogleMapsLink = (profile) => {
    const location = [
      profile.address,
      profile.location_region || profile.region,
      profile.location_country || 'France'
    ].filter(Boolean).join(', ');
    const query = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (loading) {
    return (
      <div className="directory-container">
        <div className="directory-loading">
          <div className="loading-spinner"></div>
          <p>{t('directory.loading') || 'Loading profiles...'}</p>
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
      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('directory.searchPlaceholder') || 'Rechercher une ferme...'}
        leftActions={
          walletConnected && favoriteProfileIds.length > 0 ? (
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="cursor-pointer hover-lift"
              style={{
                background: showFavoritesOnly ? 'var(--accent-primary)' : 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                color: showFavoritesOnly ? 'white' : 'inherit'
              }}
              title={showFavoritesOnly ? 'Afficher toutes les fermes' : 'Afficher uniquement mes favoris'}
            >
              {showFavoritesOnly ? '⭐' : '☆'}
            </button>
          ) : null
        }
        filters={[
          {
            id: 'country',
            label: t('directory.allCountries') || 'Tous les pays',
            icon: '🌍',
            value: selectedCountry,
            options: countries.map(country => ({ value: country, label: country })),
            onChange: (value) => {
              setSelectedCountry(value);
              setSelectedRegion('all');
              setSelectedDepartment('all');
            }
          },
          {
            id: 'region',
            label: t('directory.allRegions') || 'Toutes les régions',
            icon: '📍',
            value: selectedRegion,
            options: regions.map(region => ({ value: region, label: region })),
            onChange: (value) => {
              setSelectedRegion(value);
              setSelectedDepartment('all');
            }
          },
          {
            id: 'department',
            label: t('directory.allDepartments') || 'Tous les départements',
            icon: '🏘️',
            value: selectedDepartment,
            options: departments.map(dept => ({ value: dept, label: dept })),
            onChange: setSelectedDepartment
          },
          {
            id: 'product',
            label: t('directory.allProducts') || 'Tous les produits',
            icon: '🥬',
            value: selectedProduct,
            options: products.map(product => ({ value: product, label: product })),
            onChange: setSelectedProduct
          },
          {
            id: 'service',
            label: t('directory.allServices') || 'Tous les services',
            icon: '🛠️',
            value: selectedService,
            options: services.map(service => ({ value: service, label: service })),
            onChange: setSelectedService
          }
        ]}
        hasActiveFilters={
          searchQuery || 
          selectedCountry !== 'all' || 
          selectedRegion !== 'all' || 
          selectedDepartment !== 'all' || 
          selectedProduct !== 'all' || 
          selectedService !== 'all' || 
          showFavoritesOnly
        }
        onClearAll={() => {
          setSearchQuery('');
          setSelectedCountry('all');
          setSelectedRegion('all');
          setSelectedDepartment('all');
          setSelectedProduct('all');
          setSelectedService('all');
          setShowFavoritesOnly(false);
        }}
      />

      {/* Results count */}
      {!loading && !error && (
        <div className="results-count">
          {filteredProfiles.length === profiles.length ? (
            <p>
              {profiles.length} {t('directory.profilesAvailable') || 'profiles available'}
            </p>
          ) : (
            <p>
              {filteredProfiles.length} {t('directory.resultsFound') || 'results found'} {t('directory.outOf') || 'out of'} {profiles.length}
            </p>
          )}
        </div>
      )}

      {/* Profiles Grid */}
      <div className="profiles-grid">
        {profilesWithCTAs.length === 0 ? (
          <div className="no-profiles">
            <p>
              {searchQuery || selectedRegion !== 'all' 
                ? (t('directory.noResults') || 'No profiles match your filters')
                : (t('directory.noProfiles') || 'No profiles available yet')
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
            {profilesWithCTAs.slice(0, displayCount).map((item) => (
              item.isCTA ? (
                <CTACard 
                  key={item.id}
                  cta={item}
                  ctaConfig={item.ctaConfig}
                />
              ) : (
                <CreatorProfileCard
                  key={item.id}
                  profile={item}
                  profileTickers={profileTickers}
                  onCardClick={handleCardClick}
                />
              )
            ))}
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {profilesWithCTAs.length > displayCount && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={() => setDisplayCount(displayCount + 4)}
          >
            ➕ {t('directory.viewMore') || 'Voir plus'}
          </button>
        </div>
      )}

      {displayCount > 4 && profilesWithCTAs.length > 4 && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn secondary"
            onClick={() => setDisplayCount(4)}
          >
            ➖ {t('directory.viewLess') || 'Voir moins'}
          </button>
        </div>
      )}

      {/* Register Profile CTA - Attractive Call To Action */}
      <div className="register-profile-cta">
        <div className="register-profile-cta-card">
          <div className="register-profile-cta-content">
            <div className="register-profile-cta-icon">🌾</div>
            <h2 className="register-profile-cta-title">
              {t('directory.registerCTATitle') || 'Vous êtes producteur ?'}
            </h2>
            <p className="register-profile-cta-subtitle">
              {t('directory.registerCTASubtitle') || 'Rejoignez la première plateforme de financement participatif décentralisé pour l’agriculture locale'}
            </p>
            
            <div className="register-profile-cta-features">
              <div className="register-profile-cta-feature">
                <span>✔️</span>
                <span>{t('directory.registerFeature1') || 'Gratuit et sans commission'}</span>
              </div>
              <div className="register-profile-cta-feature">
                <span>✔️</span>
                <span>{t('directory.registerFeature2') || 'Visibilité instantanée'}</span>
              </div>
              <div className="register-profile-cta-feature">
                <span>✔️</span>
                <span>{t('directory.registerFeature3') || 'Paiements sécurisés'}</span>
              </div>
            </div>
            
            <Button
              variant="primary"
              icon="🚀"
              onClick={handleRegisterProfile}
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
              {t('directory.registerProfileButton') || 'Être référencé gratuitement'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Profile Details Modal */}
      <CreatorProfileModal
        profile={modalProfile}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        profileTickers={profileTickers}
      />
      
      {/* OnboardingModal - Modal pédagogique de connexion/création/import */}
      <OnboardingModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnected={() => setIsWalletModalOpen(false)}
      />
      
      {/* Floating Admin Button - Only visible for admins */}
      <FloatingAdminButton />
      
      {/* Bottom Navigation - show if wallet is connected */}
      {walletConnected && (
        <div className="directory-bottom-nav">
          <BottomNavigation />
        </div>
      )}
    </div>
  );
};

export default DirectoryPage;