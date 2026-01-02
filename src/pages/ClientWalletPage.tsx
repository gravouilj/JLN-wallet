import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import QrCodeScanner from '../components/eCash/QrCodeScanner';
import MobileLayout from '../components/Layout/MobileLayout';
import AddressBook from '../components/AddressBook/AddressBook';
import { useTranslation } from '../hooks/useTranslation';
import { useProfiles } from '../hooks/useProfiles';
import { useEcashBalance, useEcashToken, useEcashWallet } from '../hooks/useEcashWallet';
import { useWalletScan } from '../hooks/useWalletScan';
import { useXecPrice } from '../hooks/useXecPrice';
import { sanitizeInput, isValidXECAddress, isValidAmount } from '../utils/validation';
import { 
  walletConnectedAtom, 
  selectedProfileAtom, 
  currentTokenIdAtom, 
  walletAtom,
  favoriteProfilesAtom,
  notificationAtom,
  currencyAtom
} from '../atoms';

// Type definitions
interface TokenInfo {
  genesisInfo: {
    tokenName: string;
    tokenTicker: string;
    decimals: number;
  };
  [key: string]: any;
}

interface Profile {
  id: string;
  name: string;
  tokenId: string;
  verified?: boolean;
  ticker?: string;
  creatorProfileId?: string;
  [key: string]: any;
}

interface SendFormState {
  address: string;
  amount: string;
}

interface TokenBalances {
  [tokenId: string]: string;
}

interface MyToken extends Profile {
  balance?: string;
}

interface TokenBalances {
  [tokenId: string]: string;
}

const ClientWalletPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'receive' | 'addressbook'>('receive');
  
  // Page title
  const pageTitle = '💼 Mon Portefeuille';
  
  // Wallet hooks
  const { balance, balanceBreakdown, loading: balanceLoading } = useEcashBalance();
  const { address } = useEcashWallet();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  
  // ✅ HOOK PRINCIPAL: Scan du wallet avec dépendances optimisées
  const { myTokens, tokenBalances, scanLoading } = useWalletScan();
  
  // Token-selected view
  const [activeTokenBalance, setActiveTokenBalance] = useState<string | null>(null);
  
  // Atoms
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [selectedProfile, setSelectedProfile] = useAtom(selectedProfileAtom);
  const [currentTokenId] = useAtom(currentTokenIdAtom);
  const [wallet] = useAtom(walletAtom);
  const [favoriteProfileIds] = useAtom(favoriteProfilesAtom);
  const setNotification = useSetAtom(notificationAtom);
  
  // Load profile data
  const { profiles } = useProfiles() as { profiles: Profile[] };
  
  // Token hook for selected profile
  const { 
    tokenInfo, 
    tokenBalance, 
    loading: tokenLoading 
  } = useEcashToken(currentTokenId);
  // Get favorite profiles
  const favoriteProfiles: Profile[] = Array.isArray(profiles) ? profiles.filter((profile: Profile) => favoriteProfileIds.includes(profile.id)) : [];

  // Calculate active token balance for detailed view
  useEffect(() => {
    // CRITICAL: Reset balance immediately when profile changes to avoid ghost balance
    setActiveTokenBalance(null);
    
    if (selectedProfile && tokenInfo && selectedProfile.tokenId === currentTokenId) {
      const balance = formatTokenBalance(tokenBalance, tokenInfo.genesisInfo?.decimals || 0);
      setActiveTokenBalance(balance);
    }
  }, [selectedProfile, tokenInfo, currentTokenId, tokenBalance]);

  // Format token balance with decimals
  const formatTokenBalance = (balance: string | bigint, decimals: number = 0): string => {
    if (!balance) return '0';
    const balanceNum = typeof balance === 'string' ? BigInt(balance) : BigInt(balance.toString());
    const divisor = BigInt(Math.pow(10, decimals));
    const wholePart = balanceNum / divisor;
    const remainder = balanceNum % divisor;
    
    if (remainder === 0n) {
      return wholePart.toString();
    }
    
    const decimalPart = remainder.toString().padStart(decimals, '0');
    return `${wholePart}.${decimalPart}`.replace(/\.?0+$/, '');
  };

  // Handle profile selection from dropdown
  const handleProfileSelect = (profile: Profile): void => {
    setSelectedProfile({ tokenId: profile.tokenId });
    setNotification({ 
      type: 'success', 
      message: `${profile.name} ${t('wallet.profileSelected') || 'sélectionnée'}` 
    });
  };

  // Copy address to clipboard
  const copyToClipboard = () => {
    console.log('📋 Tentative copie:', address);
    
    if (address && address.length > 0) {
      navigator.clipboard.writeText(address).then(() => {
        console.log('✅ Copie réussie:', address);
        setNotification({ 
          type: 'success', 
          message: t('wallet.addressCopied') || 'Adresse copiée !' 
        });
      }).catch(err => {
        console.error('❌ Échec de la copie:', err);
        setNotification({ 
          type: 'error', 
          message: t('wallet.copyFailed') || 'Échec de la copie' 
        });
      });
    } else {
      console.error('❌ Impossible de copier : adresse vide');
      setNotification({ 
        type: 'error', 
        message: t('wallet.copyFailed') || 'Adresse non disponible' 
      });
    }
  };

  // Format address for display (shortened) - Reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatAddress = (addressRaw: string): string => {
    if (!addressRaw) return '';
    if (!addressRaw) return '';
    return `${addressRaw.slice(0, 10)}...${addressRaw.slice(-8)}`;
  };

  // Handle send form submit

  // Set max amount
  const setMaxAmount = () => {
    if (selectedProfile && activeTokenBalance) {
      setSendForm(prev => ({ ...prev, amount: activeTokenBalance }));
    } else if (balanceBreakdown?.spendableBalance) {
      const maxXec = Math.max(0, balanceBreakdown.spendableBalance - 3.1);
      setSendForm(prev => ({ ...prev, amount: maxXec.toFixed(2) }));
    }
  };

  // Handle QR code address detection
  const handleAddressDetected = (detectedAddress: string): void => {
    console.log('📷 Adresse scannée:', detectedAddress);
    setSendForm(prev => ({ ...prev, address: detectedAddress }));
    setShowScanner(false);
    setNotification({ 
      type: 'success', 
      message: t('token.addressScanned') || 'Adresse scannée avec succès' 
    });
  };

  return (
    <MobileLayout title={t('wallet.title')}>
      <div className="dashboard-content">
        <h1 className="page-header-title">{pageTitle}</h1>
        
        {/* 1. Profile Selector Header */}
        <div className="profile-selector-section">
          {favoriteProfiles.length > 0 ? (
            <select 
              className="profile-dropdown"
              value={selectedProfile?.id || 'hub'}
              onChange={(e) => {
                if (e.target.value === 'hub') {
                  setSelectedProfile(null);
                } else {
                  const profile = favoriteProfiles.find(f => f.id === e.target.value);
                  if (profile) handleProfileSelect(profile);
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
              onClick={() => navigate('/')}
            >
              ➕ {t('wallet.addFavorite') || 'Choisir une ferme favorite'}
            </button>
          )}
        </div>

        {/* 2. Hub View (when no profile selected) */}
        {selectedProfile === null ? (
          <div className="hub-view">
            {/* QR Code Section */}
            {walletConnected && wallet && address && (
              <div 
                className="hub-qr-section" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '16px',
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  📥 {t('wallet.receive') || 'Recevoir'}
                </h3>
                <QRCodeSVG
                  value={address}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={true}
                  style={{ cursor: 'pointer', borderRadius: '8px' }}
                  onClick={copyToClipboard}
                />
                <p 
                  className="break-all text-xs text-center select-all" 
                  style={{ 
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary, #666)',
                    wordBreak: 'break-all',
                    userSelect: 'all',
                    maxWidth: '240px',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    borderRadius: '6px',
                    margin: 0
                  }}
                >
                  {address}
                </p>
                <button 
                  className="copy-btn"
                  onClick={copyToClipboard}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '1px solid var(--primary-color, #0074e4)',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--primary-color, #0074e4)'
                  }}
                >
                  📋 {t('common.copy') || 'Copier'}
                </button>
              </div>
            )}

            {/* Token Table */}
            <div className="hub-token-section">
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🌾 {t('wallet.myTokens') || 'Mes jetons fermiers'}
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '400', 
                  color: '#666',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {myTokens.length}
                </span>
              </h3>

              {scanLoading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px'
                }}>
                  <div style={{ 
                    fontSize: '32px', 
                    marginBottom: '16px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}>
                    🔍
                  </div>
                  <p style={{ marginBottom: '8px', color: '#666', fontSize: '15px', fontWeight: '500' }}>
                    Scan en cours...
                  </p>
                  <p style={{ color: '#999', fontSize: '13px' }}>
                    Analyse de {profiles.length} profile(s) pour détecter vos jetons
                  </p>
                </div>
              ) : myTokens.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px 20px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px'
                }}>
                  <p style={{ marginBottom: '8px', color: '#666', fontSize: '15px', fontWeight: '500' }}>
                    🔍 Scan terminé
                  </p>
                  <p style={{ marginBottom: '16px', color: '#999', fontSize: '13px' }}>
                    Aucun jeton détecté dans ce portefeuille.
                  </p>
                  <p style={{ marginBottom: '16px', color: '#666', fontSize: '13px' }}>
                    Achetez des jetons depuis l'annuaire ou demandez à un producteur de vous en envoyer.
                  </p>
                  <button 
                    onClick={() => navigate('/')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid var(--primary-color, #0074e4)',
                      backgroundColor: 'var(--primary-color, #0074e4)',
                      color: '#fff'
                    }}
                  >
                    🗂️ Parcourir l'annuaire
                  </button>
                </div>
              ) : (
                <div style={{ 
                  border: '1px solid var(--border-color, #ddd)',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: 'var(--bg-primary, #fff)'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary, #f5f5f5)' }}>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#666'
                        }}>
                          Ferme
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'right', 
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#666'
                        }}>
                          Solde
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#666',
                          width: '80px'
                        }}>
                          Ticker
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {myTokens.map((profile, index) => (
                        <tr 
                          key={profile.id} 
                          onClick={() => handleProfileSelect(profile)}
                          style={{ 
                            cursor: 'pointer',
                            borderTop: index === 0 ? 'none' : '1px solid var(--border-color, #ddd)',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f9f9f9)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ 
                            padding: '14px 12px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{profile.name}</span>
                              {/* Badge: Actif dans l'annuaire */}
                              {profile.verified && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  backgroundColor: '#e8f5e9',
                                  color: '#2e7d32',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }} title="Jeton actif dans l'annuaire du site">
                                  🏡 Actif dans l'annuaire
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '14px 12px',
                            textAlign: 'right',
                            fontSize: '15px',
                            fontWeight: '600',
                            color: 'var(--text-primary, #000)'
                          }}>
                            {tokenBalances[profile.tokenId] !== undefined 
                              ? tokenBalances[profile.tokenId] 
                              : '...'
                            }
                          </td>
                          <td style={{ 
                            padding: '14px 12px',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'var(--primary-color, #0074e4)',
                            backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                            borderRadius: '6px'
                          }}>
                            {profile.ticker || profile.name.substring(0, 3).toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Network Fuel Indicator (Hub View) */}
              <div 
                onClick={() => navigate('/settings')}
                style={{ 
                  marginTop: '20px',
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color, #ddd)'
                }}
                title="Carburant réseau nécessaire pour envoyer des jetons"
              >
                <div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>
                    ⛽ Carburant Réseau
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    XEC · Nécessaire pour les transactions
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {balanceLoading ? '...' : Number(balance).toFixed(2)} XEC
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Detailed View (when profile is selected) */
          <>
            {/* Balance Display (Side by Side) */}
            <div className="balance-card-split">
              {/* Left: Token Balance (70%) */}
              <div className="balance-left">
                <div className="balance-main-amount">
                  {tokenLoading ? (
                    <span className="loading-pulse">...</span>
                  ) : activeTokenBalance !== null ? (
                    activeTokenBalance
                  ) : (
                    '0'
                  )}
                </div>
                <div className="balance-token-ticker">
                  {selectedProfile.ticker || selectedProfile.name.substring(0, 3).toUpperCase()}
                </div>
                <div className="balance-profile-name">{selectedProfile.name}</div>
              </div>

              {/* Vertical Separator */}
              <div className="balance-separator"></div>

              {/* Right: Network Fuel (Carburant Réseau) - Token-First Design */}
              <div 
                className="balance-right clickable-balance" 
                onClick={() => navigate('/settings')}
                style={{ cursor: 'pointer' }}
                title="Carburant réseau (XEC) - Nécessaire pour envoyer des jetons"
              >
                <div className="balance-xec-label">⛽ {t('wallet.networkFuel') || 'Carburant Réseau'}</div>
                <div className="balance-xec-amount">
                  {balanceLoading ? (
                    <span className="loading-pulse">...</span>
                  ) : (
                    Number(balance).toFixed(2)
                  )}
                </div>
                {price && typeof price.convert === 'function' && !balanceLoading && (() => {
                  const converted = price.convert(balanceBreakdown?.totalBalance || 0, currency);
                  return converted !== null ? (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      ≈ {converted.toFixed(2)} {currency}
                    </div>
                  ) : null;
                })()}
                <div className="balance-xec-sublabel">XEC</div>
              </div>
            </div>

            {/* Action Tabs - Token-First: pas d'onglet "Envoyer XEC" */}
            <div className="action-tabs">
              <button 
                className={`tab-button ${activeTab === 'receive' ? 'active' : ''}`}
                onClick={() => setActiveTab('receive')}
              >
                📥 {t('wallet.receive') || 'Recevoir'}
              </button>
              <button 
                className={`tab-button ${activeTab === 'addressbook' ? 'active' : ''}`}
                onClick={() => setActiveTab('addressbook')}
              >
                📇 Carnet d'adresses
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'receive' && walletConnected && wallet && (
                <div className="receive-content">
                  {address ? (
                    <>
                      {/* QR Code - Cliquable */}
                      <div 
                        className="qr-code-display" 
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
                      >
                        <QRCodeSVG
                          value={address}
                          size={220}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                          includeMargin={true}
                          style={{ cursor: 'pointer' }}
                          onClick={copyToClipboard}
                        />
                        
                        {/* Adresse complète sous le QR code - Sélectionnable */}
                        <p 
                           className="break-all text-xs text-center select-all" 
                           style={{ 
                             fontSize: '0.75rem',
                             color: 'var(--text-secondary, #666)',
                             wordBreak: 'break-all',
                             userSelect: 'all',
                             maxWidth: '280px',
                             padding: '8px 10px',
                             backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                             borderRadius: '8px',
                             margin: 0
                           }}>
                          {address}
                        </p>
                        
                        {/* Bouton Copier */}
                        <button 
                          className="copy-btn"
                          onClick={copyToClipboard}
                          style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid var(--border-color, #ddd)',
                            backgroundColor: 'var(--bg-primary, #fff)',
                            color: 'var(--text-primary, #000)'
                          }}
                        >
                          📋 {t('common.copy') || 'Copier'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p>Chargement de l'adresse...</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addressbook' && (
                <div style={{ marginTop: '16px' }}>
                  <AddressBook tokenId={null} compact={false} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default ClientWalletPage;
