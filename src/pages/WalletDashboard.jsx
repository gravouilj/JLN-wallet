import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import QrCodeScanner from '../components/QrCodeScanner';
import MobileLayout from '../components/Layout/MobileLayout';
import { useTranslation } from '../hooks/useTranslation';
import { useFarms } from '../hooks/useFarms';
import { useEcashBalance, useEcashToken, useEcashWallet } from '../hooks/useEcashWallet';
import { useXecPrice } from '../hooks/useXecPrice';
import { sanitizeInput, isValidXECAddress, isValidAmount } from '../utils/validation';
import { 
  walletConnectedAtom, 
  selectedFarmAtom, 
  currentTokenIdAtom, 
  walletAtom,
  favoriteFarmsAtom,
  notificationAtom,
  currencyAtom
} from '../atoms';

const WalletDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('receive'); // 'receive' or 'send'
  const [showScanner, setShowScanner] = useState(false);
  
  // Page title
  const pageTitle = '💼 Mon Portefeuille';
  
  // Wallet hooks
  const { balance, balanceBreakdown, loading: balanceLoading } = useEcashBalance();
  const { address } = useEcashWallet();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  
  // Send form state
  const [sendForm, setSendForm] = useState({ address: '', amount: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [activeTokenBalance, setActiveTokenBalance] = useState(null);
  
  // Token balances for hub view
  const [tokenBalances, setTokenBalances] = useState({});
  
  // My tokens: farms with positive balance (auto-detected)
  const [myTokens, setMyTokens] = useState([]);
  
  // Scan loading state
  const [scanLoading, setScanLoading] = useState(false);
  
  // Atoms
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [selectedFarm, setSelectedFarm] = useAtom(selectedFarmAtom);
  const [currentTokenId] = useAtom(currentTokenIdAtom);
  const [wallet] = useAtom(walletAtom);
  const [favoriteFarmIds] = useAtom(favoriteFarmsAtom);
  const setNotification = useSetAtom(notificationAtom);
  
  // Load farms data
  const { farms } = useFarms();
  
  // Token hook for selected farm
  const { 
    tokenInfo, 
    tokenBalance, 
    loading: tokenLoading 
  } = useEcashToken(currentTokenId);
  
  // Get favorite farms
  const favoriteFarms = farms.filter(farm => favoriteFarmIds.includes(farm.id));
  
  // Setter for favorite farms
  const setFavoriteFarmIds = useSetAtom(favoriteFarmsAtom);

  // Load all token balances for hub view (SCAN GLOBAL - Source: wallet.listETokens())
  useEffect(() => {
    if (!wallet || !walletConnected || selectedFarm !== null) return;
    
    const loadAllTokenBalances = async () => {
      setScanLoading(true);
      console.log('🔍 SCAN GLOBAL: Scan des jetons dans le wallet...');
      
      try {
        // 1. Source de vérité: tous les tokens possédés dans le wallet
        const walletTokens = await wallet.listETokens();
        console.log(`📦 ${walletTokens.length} jeton(s) détecté(s) dans le wallet`);
        
        const balances = {};
        const tokensWithBalance = [];
        const newFavoritesToAdd = [];
        
        // 2. Pour chaque token trouvé dans le wallet
        for (const walletToken of walletTokens) {
          const { tokenId, balance: rawBalance } = walletToken;
          
          // Ignorer les soldes nuls
          const balanceNum = BigInt(rawBalance || '0');
          if (balanceNum === 0n) continue;
          
          // 3. Récupérer les métadonnées blockchain (ticker, decimals TOUJOURS depuis blockchain)
          let tokenInfo = { genesisInfo: { tokenName: 'Inconnu', tokenTicker: '???', decimals: 0 } };
          try {
            tokenInfo = await wallet.getTokenInfo(tokenId);
          } catch (e) {
            console.warn(`⚠️ Impossible de récupérer infos blockchain pour ${tokenId}:`, e);
          }
          
          const ticker = tokenInfo.genesisInfo?.tokenTicker || 'UNK';
          const decimals = tokenInfo.genesisInfo?.decimals || 0;
          const blockchainName = tokenInfo.genesisInfo?.tokenName || 'Token Inconnu';
          
          // 4. Chercher si le token existe dans farms.json (pour image, description, vérification)
          const farmMatch = farms.find(f => f.tokenId === tokenId);
          
          if (farmMatch) {
            // ✅ Token référencé dans farms.json
            const formattedBalance = formatTokenBalance(rawBalance, decimals);
            balances[tokenId] = formattedBalance;
            
            console.log(`✅ Jeton référencé: ${farmMatch.name} (${ticker}) - Solde: ${formattedBalance}`);
            
            // Utiliser les infos du JSON (image, description) + blockchain (ticker, decimals)
            tokensWithBalance.push({
              ...farmMatch,
              ticker: ticker, // OVERRIDE: toujours blockchain
              decimals: decimals, // OVERRIDE: toujours blockchain
              verified: true,
              balance: formattedBalance
            });
            
            // Auto-ajout aux favoris si pas déjà présent
            if (!favoriteFarmIds.includes(farmMatch.id)) {
              console.log(`⭐ Auto-ajout aux favoris: ${farmMatch.name}`);
              newFavoritesToAdd.push(farmMatch.id);
            }
          } else {
            // ⚠️ Token NON référencé - utiliser infos blockchain uniquement
            console.log(`⚠️ Jeton non-référencé détecté: ${tokenId}`);
            
            const formattedBalance = formatTokenBalance(rawBalance, decimals);
            balances[tokenId] = formattedBalance;
            
            console.log(`📡 Infos blockchain: ${blockchainName} (${ticker})`);
            
            // Créer un objet "farm" synthétique avec infos blockchain
            tokensWithBalance.push({
              id: tokenId,
              tokenId: tokenId,
              name: blockchainName,
              ticker: ticker,
              decimals: decimals,
              description: 'Jeton non référencé dans l\'annuaire',
              verified: false, // Marquer comme non-vérifié
              balance: formattedBalance,
              // Image par défaut
              image: null,
              region: 'Inconnu',
              country: 'Inconnu'
            });
          }
        }
        
        setTokenBalances(balances);
        setMyTokens(tokensWithBalance);
        
        // Mise à jour des favoris (seulement pour les tokens référencés)
        if (newFavoritesToAdd.length > 0) {
          console.log(`💾 Ajout de ${newFavoritesToAdd.length} ferme(s) référencée(s) aux favoris`);
          setFavoriteFarmIds([...favoriteFarmIds, ...newFavoritesToAdd]);
        }
        
        console.log(`📊 RÉSULTAT SCAN: ${tokensWithBalance.length} jeton(s) avec solde positif`);
        console.log(`   - Référencés: ${tokensWithBalance.filter(t => t.verified).length}`);
        console.log(`   - Non-référencés: ${tokensWithBalance.filter(t => !t.verified).length}`);
        
      } catch (error) {
        console.error('❌ Erreur lors du scan des jetons:', error);
      } finally {
        setScanLoading(false);
      }
    };
    
    loadAllTokenBalances();
  }, [wallet, walletConnected, farms, selectedFarm, favoriteFarmIds, setFavoriteFarmIds]);

  // Calculate active token balance for detailed view
  useEffect(() => {
    // CRITICAL: Reset balance immediately when farm changes to avoid ghost balance
    setActiveTokenBalance(null);
    
    if (selectedFarm && tokenInfo && selectedFarm.tokenId === currentTokenId) {
      const balance = formatTokenBalance(tokenBalance, tokenInfo.genesisInfo?.decimals || 0);
      setActiveTokenBalance(balance);
    }
  }, [selectedFarm, tokenInfo, currentTokenId, tokenBalance]);

  // Format token balance with decimals
  const formatTokenBalance = (balance, decimals = 0) => {
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

  // Handle farm selection from dropdown
  const handleFarmSelect = (farm) => {
    setSelectedFarm(farm);
    setNotification({ 
      type: 'success', 
      message: `${farm.name} ${t('wallet.farmSelected') || 'sélectionnée'}` 
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

  // Format address for display (shortened)
  const formatAddress = (addressRaw) => {
    if (!addressRaw) return '';
    const address = typeof addressRaw === 'string' ? addressRaw : addressRaw?.toString() || '';
    if (!address) return '';
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  // Handle send form submit
  const handleSendSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDATION STRICTE AU DÉBUT
    if (!sendForm.address || !sendForm.amount) {
      setNotification({ type: 'error', message: 'Veuillez renseigner un destinataire et un montant.' });
      return;
    }
    
    if (!wallet || !walletConnected) {
      setNotification({ type: 'error', message: 'Wallet non connecté' });
      return;
    }

    // Validation des champs vides
    if (!sendForm.address || !sendForm.address.trim()) {
      setNotification({ type: 'error', message: 'Veuillez remplir le destinataire et le montant.' });
      return;
    }

    if (!sendForm.amount || sendForm.amount.trim() === '') {
      setNotification({ type: 'error', message: 'Veuillez remplir le destinataire et le montant.' });
      return;
    }

    const sanitizedAddress = sanitizeInput(sendForm.address, 'address');
    const sanitizedAmount = sanitizeInput(sendForm.amount, 'amount');

    if (!sanitizedAddress || !isValidXECAddress(sanitizedAddress)) {
      setNotification({ type: 'error', message: 'Adresse invalide' });
      return;
    }

    if (!sanitizedAmount || !isValidAmount(sanitizedAmount, 'etoken')) {
      setNotification({ type: 'error', message: 'Montant invalide' });
      return;
    }

    const amount = parseFloat(sanitizedAmount);
    if (amount <= 0) {
      setNotification({ type: 'error', message: 'Le montant doit être positif' });
      return;
    }

    setSendLoading(true);
    try {
      const cleanAmount = String(amount).replace(',', '.');
      
      let result;
      if (selectedFarm) {
        // ENVOI DE TOKEN
        console.log(`Envoi Token ${selectedFarm.ticker} (${selectedFarm.protocol})`);
        result = await wallet.sendToken(
          selectedFarm.tokenId,
          sanitizedAddress,
          cleanAmount,
          tokenInfo.genesisInfo?.decimals || 0,
          selectedFarm.protocol || 'SLP'
        );
      } else {
        // ENVOI XEC
        result = await wallet.sendXec(sanitizedAddress, cleanAmount);
      }
      
      setNotification({ 
        type: 'success', 
        message: `Transaction envoyée ! TXID: ${result.txid.substring(0, 8)}...` 
      });
      
      // Reset form
      setSendForm({ address: '', amount: '' });
      
    } catch (error) {
      console.error('Erreur envoi:', error);
      setNotification({ type: 'error', message: error.message || 'Échec de l\'envoi' });
    } finally {
      setSendLoading(false);
    }
  };

  // Set max amount
  const setMaxAmount = () => {
    if (selectedFarm && activeTokenBalance) {
      setSendForm(prev => ({ ...prev, amount: activeTokenBalance }));
    } else if (balanceBreakdown?.spendableBalance) {
      const maxXec = Math.max(0, balanceBreakdown.spendableBalance - 3.1);
      setSendForm(prev => ({ ...prev, amount: maxXec.toFixed(2) }));
    }
  };

  // Handle QR code address detection
  const handleAddressDetected = (detectedAddress) => {
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
        
        {/* 1. Farm Selector Header */}
        <div className="farm-selector-section">
          {favoriteFarms.length > 0 ? (
            <select 
              className="farm-dropdown"
              value={selectedFarm?.id || 'hub'}
              onChange={(e) => {
                if (e.target.value === 'hub') {
                  setSelectedFarm(null);
                } else {
                  const farm = favoriteFarms.find(f => f.id === e.target.value);
                  if (farm) handleFarmSelect(farm);
                }
              }}
            >
              <option value="hub">🧺 {t('wallet.allTokens') || 'Tous mes jetons fermiers'}</option>
              {favoriteFarms.map(farm => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
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

        {/* 2. Hub View (when no farm selected) */}
        {selectedFarm === null ? (
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
                    Analyse de {farms.length} ferme(s) pour détecter vos jetons
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
                      {myTokens.map((farm, index) => (
                        <tr 
                          key={farm.id} 
                          onClick={() => handleFarmSelect(farm)}
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
                              <span>{farm.name}</span>
                              {/* Badge: Actif dans l'annuaire */}
                              {farm.verified && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  backgroundColor: '#e8f5e9',
                                  color: '#2e7d32',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }} title="Jeton actif dans l'annuaire Farm Wallet">
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
                            {tokenBalances[farm.tokenId] !== undefined 
                              ? tokenBalances[farm.tokenId] 
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
                            {farm.ticker || farm.name.substring(0, 3).toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* XEC Balance Footer */}
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
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                    💎 {t('wallet.ecashAvailable') || '💎CreaeCash (XEC) disponible'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {t('wallet.networkFees') || 'Frais réseau'}
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {balanceLoading ? '...' : Number(balance).toFixed(2)} XEC
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Detailed View (when farm is selected) */
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
                  {selectedFarm.ticker || selectedFarm.name.substring(0, 3).toUpperCase()}
                </div>
                <div className="balance-farm-name">{selectedFarm.name}</div>
              </div>

              {/* Vertical Separator */}
              <div className="balance-separator"></div>

              {/* Right: XEC Balance (30%) */}
              <div 
                className="balance-right clickable-balance" 
                onClick={() => navigate('/settings')}
                style={{ cursor: 'pointer' }}
              >
                <div className="balance-xec-label">{t('wallet.ecashAvailable') || '💎 eCash(XEC) disponible'}</div>
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
                <div className="balance-xec-sublabel">{t('wallet.networkFees') || 'Frais réseau'}</div>
              </div>
            </div>

            {/* Action Tabs */}
            <div className="action-tabs">
              <button 
                className={`tab-button ${activeTab === 'receive' ? 'active' : ''}`}
                onClick={() => setActiveTab('receive')}
              >
                📥 {t('wallet.receive') || 'Recevoir'}
              </button>
              <button 
                className={`tab-button ${activeTab === 'send' ? 'active' : ''}`}
                onClick={() => setActiveTab('send')}
              >
                📤 {t('wallet.send') || 'Envoyer eCash (XEC)'}
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

              {activeTab === 'send' && (
                <div className="send-content">
                  <form onSubmit={handleSendSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
                    {/* Destinataire */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                        {t('xec.recipient') || 'Destinataire'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={sendForm.address}
                          onChange={(e) => setSendForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder={t('xec.recipientPlaceholder') || 'ecash:qp...'}
                          disabled={sendLoading}
                          style={{
                            width: '100%',
                            height: '48px',
                            padding: '0 48px 0 16px',
                            fontSize: '14px',
                            border: '1px solid var(--border-color, #ddd)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-primary, #fff)',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowScanner(true)}
                          disabled={sendLoading}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '8px',
                            fontSize: '18px',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary, #666)',
                            cursor: sendLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color, #0074e4)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary, #666)'}
                          title={t('common.qrScan') || 'Scanner QR'}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* QR Scanner Modal */}
                      {showScanner && (
                        <div style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.9)',
                          zIndex: 9999,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '20px'
                        }}>
                          <button
                            type="button"
                            onClick={() => setShowScanner(false)}
                            style={{
                              position: 'absolute',
                              top: '20px',
                              right: '20px',
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: '500',
                              border: 'none',
                              borderRadius: '8px',
                              backgroundColor: '#fff',
                              color: '#000',
                              cursor: 'pointer'
                            }}
                          >
                            ✕ {t('common.close') || 'Fermer'}
                          </button>
                          <QrCodeScanner onAddressDetected={handleAddressDetected} />
                        </div>
                      )}
                    </div>

                    {/* Montant */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                        {t('xec.amount') || 'Montant'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={sendForm.amount}
                          onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          disabled={sendLoading}
                          style={{
                            width: '100%',
                            height: '48px',
                            padding: '0 70px 0 16px',
                            fontSize: '14px',
                            border: '1px solid var(--border-color, #ddd)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-primary, #fff)',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={setMaxAmount}
                          disabled={sendLoading}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: '1px solid var(--primary-color, #0074e4)',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-primary, #fff)',
                            color: 'var(--primary-color, #0074e4)',
                            cursor: 'pointer'
                          }}
                        >
                          MAX
                        </button>
                      </div>
                      <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '12px' }}>
                        {t('wallet.available') || 'Solde'}: {activeTokenBalance !== null ? activeTokenBalance : '...'} {selectedFarm.ticker}
                      </small>
                      {!selectedFarm && price && typeof price.convert === 'function' && sendForm.amount && (() => {
                        const converted = price.convert(Number(sendForm.amount || 0), currency);
                        return converted !== null ? (
                          <small style={{ display: 'block', marginTop: '4px', color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                            ≈ {converted.toFixed(4)} {currency}
                          </small>
                        ) : null;
                      })()}
                    </div>

                    {/* Info Frais */}
                    <div style={{ 
                      padding: '10px', 
                      marginBottom: '12px',
                      backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      💡 Frais de réseau estimés : ~5 XEC {price && typeof price.convert === 'function' && (() => {
                        const converted = price.convert(5, currency);
                        return converted !== null ? `(≈ ${converted.toFixed(4)} ${currency})` : '';
                      })()}
                    </div>

                    {/* Bouton Confirmer */}
                    <button
                      type="submit"
                      disabled={sendLoading || !sendForm.address || !sendForm.amount}
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '16px',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: sendLoading ? '#ccc' : 'var(--primary-color, #0074e4)',
                        color: '#fff',
                        cursor: sendLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {sendLoading ? '⌛ Envoi en cours...' : `✔️ ${t('common.confirmSend') || 'Confirmer l’envoi'}`}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default WalletDashboard;
