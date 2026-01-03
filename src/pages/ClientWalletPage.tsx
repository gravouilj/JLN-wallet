/**
 * ClientWalletPage - Page Squelette
 * 
 * Cette page assemble les composants du module wallet.
 * Toute la logique métier est déléguée aux hooks et composants de features/wallet.
 * 
 * Architecture:
 * - HubView: Vue par défaut (QR + liste des tokens)
 * - TokenDetailView: Vue détaillée d'un token sélectionné
 * - useResolvedProfile: Résolution du profil sélectionné
 * - useSendTokenForm: Gestion du formulaire d'envoi
 */

import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { useTranslation } from '../hooks/useTranslation';
import { useProfiles } from '../hooks/useProfiles';
import { useEcashToken, useEcashWallet } from '../hooks/useEcashWallet';
import { useWalletScan } from '../hooks/useWalletScan';
import { 
  walletConnectedAtom, 
  selectedProfileAtom, 
  favoriteProfilesAtom,
  notificationAtom 
} from '../atoms';
import '../styles/wallet.css';

// Feature imports
import { 
  HubView, 
  TokenDetailView, 
  useResolvedProfile, 
  useSendTokenForm,
  deriveTicker 
} from '../features/wallet';

// Types
interface Profile {
  id: string;
  name: string;
  tokenId: string;
  ticker?: string;
  protocol?: string;
  verified?: boolean;
  creatorProfileId?: string;
  [key: string]: unknown;
}

/**
 * ClientWalletPage - Wallet principal du client
 * 
 * Page squelette qui assemble:
 * - Header avec sélecteur de profil
 * - HubView (tous les tokens) ou TokenDetailView (token sélectionné)
 */
const ClientWalletPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Page title
  const pageTitle = '💼 Mon Portefeuille';
  
  // Atoms
  const [_walletConnected] = useAtom(walletConnectedAtom);
  const [selectedProfile, setSelectedProfile] = useAtom(selectedProfileAtom);
  const [favoriteProfileIds] = useAtom(favoriteProfilesAtom);
  const setNotification = useSetAtom(notificationAtom);
  
  // Wallet scan for myTokens
  const { myTokens } = useWalletScan();
  
  // Resolved profile hook
  const {
    resolvedProfile,
    profileDisplayName,
    profileDisplayTicker,
    selectedProfileProtocol,
    isCreator,
    selectedTokenData,
  } = useResolvedProfile(myTokens);
  
  // Get profiles for favorites
  const { profiles } = useProfiles() as { profiles: Profile[] };
  const favoriteProfiles = Array.isArray(profiles) 
    ? profiles.filter((p: Profile) => favoriteProfileIds.includes(p.id)) 
    : [];
  
  // Token info for decimals
  const { tokenInfo } = useEcashToken(selectedProfile?.tokenId || null);
  const { address } = useEcashWallet();
  
  // Send form hook
  const {
    sendForm,
    setSendForm,
    sendLoading,
    handleSendSubmit,
    setMaxAmount,
  } = useSendTokenForm({
    tokenId: selectedProfile?.tokenId || null,
    tokenTicker: profileDisplayTicker,
    tokenDecimals: tokenInfo?.genesisInfo?.decimals || 0,
    protocol: selectedProfileProtocol,
    maxBalance: null, // Will be computed by TokenDetailView
  });

  // Handle profile selection from dropdown
  const handleProfileSelect = (profile: Profile): void => {
    const normalizedProfile = {
      id: profile.id,
      tokenId: profile.tokenId,
      name: profile.name,
      ticker: profile.ticker || deriveTicker(profile.ticker, profile.name),
      protocol: profile.protocol || 'ALP',
      creatorProfileId: profile.creatorProfileId,
    };
    setSelectedProfile(normalizedProfile);
    setNotification({ 
      type: 'success', 
      message: `${profile.name} ${t('wallet.profileSelected') || 'sélectionnée'}` 
    });
  };

  // Copy address to clipboard
  const copyToClipboard = () => {
    if (address && address.length > 0) {
      navigator.clipboard.writeText(address).then(() => {
        setNotification({ 
          type: 'success', 
          message: t('wallet.addressCopied') || 'Adresse copiée !' 
        });
      }).catch(() => {
        setNotification({ 
          type: 'error', 
          message: t('wallet.copyFailed') || 'Échec de la copie' 
        });
      });
    }
  };

  // Handle scanned address
  const handleAddressDetected = (detectedAddress: string): void => {
    setSendForm(prev => ({ ...prev, address: detectedAddress }));
    setNotification({ 
      type: 'success', 
      message: t('token.addressScanned') || 'Adresse scannée avec succès' 
    });
  };

  return (
    <MobileLayout title={t('wallet.title')}>
      <div className="dashboard-content">
        <h1 className="page-header-title">{pageTitle}</h1>
        
        {/* Profile Selector Header */}
        <ProfileSelectorHeader
          selectedProfile={selectedProfile}
          favoriteProfiles={favoriteProfiles}
          onProfileSelect={handleProfileSelect}
          onClearSelection={() => setSelectedProfile(null)}
          onNavigateToDirectory={() => navigate('/')}
        />

        {/* Main Content: Hub or Detail View */}
        {selectedProfile === null ? (
          <HubView 
            onProfileSelect={handleProfileSelect}
            onCopyAddress={copyToClipboard}
          />
        ) : (
          <TokenDetailView
            selectedProfile={selectedProfile as Profile}
            resolvedProfile={resolvedProfile}
            profileDisplayName={profileDisplayName}
            profileDisplayTicker={profileDisplayTicker}
            selectedProfileProtocol={selectedProfileProtocol}
            isCreator={isCreator}
            selectedTokenData={selectedTokenData}
            sendForm={sendForm}
            setSendForm={setSendForm}
            sendLoading={sendLoading}
            handleSendSubmit={handleSendSubmit}
            setMaxAmount={setMaxAmount}
            onCopyAddress={copyToClipboard}
            onAddressDetected={handleAddressDetected}
          />
        )}
      </div>
    </MobileLayout>
  );
};

// Sub-component for profile selector header

// ProfileData from atoms (minimal profile data stored)
interface ProfileData {
  tokenId: string;
  [key: string]: unknown;
}

interface ProfileSelectorHeaderProps {
  selectedProfile: ProfileData | null;
  favoriteProfiles: Profile[];
  onProfileSelect: (profile: Profile) => void;
  onClearSelection: () => void;
  onNavigateToDirectory: () => void;
}

const ProfileSelectorHeader: React.FC<ProfileSelectorHeaderProps> = ({
  selectedProfile,
  favoriteProfiles,
  onProfileSelect,
  onClearSelection,
  onNavigateToDirectory,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="profile-selector-section">
      {selectedProfile && (
        <button
          onClick={onClearSelection}
          className="back-to-hub-btn"
        >
          <span>←</span>
          <span>Hub</span>
        </button>
      )}
      <div className="profile-selector-dropdown">
        {favoriteProfiles.length > 0 ? (
          <select 
            className="profile-dropdown"
            value={(selectedProfile?.id as string) || 'hub'}
            onChange={(e) => {
              if (e.target.value === 'hub') {
                onClearSelection();
              } else {
                const profile = favoriteProfiles.find(f => f.id === e.target.value);
                if (profile) onProfileSelect(profile);
              }
            }}
          >
            <option value="hub">🧺 {t('wallet.allTokens') || 'Tous mes jetons fermiers'}</option>
            {favoriteProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        ) : (
          <button 
            className="add-favorite-btn"
            onClick={onNavigateToDirectory}
          >
            ➕ {t('wallet.addFavorite') || 'Choisir une ferme favorite'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ClientWalletPage;
