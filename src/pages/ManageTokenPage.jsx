import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom, useAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/BlockchainStatus';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useAdmin } from '../hooks/useAdmin';
import { useFarms } from '../hooks/useFarms';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader } from '../components/UI';
import ImportTokenModal from '../components/ImportTokenModal';
import '../styles/token-details.css';

const ManageTokenPage = () => {
  const navigate = useNavigate();
  const { wallet, address } = useEcashWallet();
  const { farms } = useFarms();
  const { isAdmin } = useAdmin();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  const setNotification = useSetAtom(notificationAtom);

  const [tokens, setTokens] = useState([]);
  const [allFarmTokens, setAllFarmTokens] = useState([]); // Pour l'admin: tous les tokens Farm-Wallet
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [xecBalance, setXecBalance] = useState(0);
  const [activeFilter, setActiveFilter] = useState('active'); // 'active', 'inactive', 'pending', 'all'
  const [faqOpen, setFaqOpen] = useState(null);
  const [myFarm, setMyFarm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Debug: tracker les changements du modal
  useEffect(() => {
    console.log('🔍 showImportModal changé:', showImportModal);
  }, [showImportModal]);

  // Load mint batons with enriched metadata
  useEffect(() => {
    const loadData = async () => {
      if (!wallet) {
        setLoadingTokens(false);
        return;
      }

      try {
        setLoadingTokens(true);
        
        // Charger MA ferme (créateur ou admin)
        if (address && farms.length > 0) {
          const myFarmData = farms.find(f => f.owner_address === address);
          setMyFarm(myFarmData || null);
          console.log('🏠 Ma ferme:', myFarmData);
          console.log('📍 Mon address:', address);
          console.log('📋 Farms disponibles:', farms.map(f => ({ name: f.name, owner: f.owner_address })));
        }
        
        // Charger le solde XEC
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);
        
        const batons = await wallet.getMintBatons();
        if (import.meta.env.DEV) console.log('🔑 Mint Batons chargés:', batons);
        
        // Construire le Set des tokenIds Farm-Wallet AVANT tout (admin ET creator)
        const farmWalletTokenIds = new Set();
        const allTokensFromFarms = [];
        
        if (import.meta.env.DEV) {
          console.log('🔍 Analyse farms pour extraire tokens:', farms.length, 'farms');
        }
        farms.forEach(farm => {
          if (import.meta.env.DEV) {
            console.log('🔍 Farm:', farm.name, '| tokens:', farm.tokens, '| isArray:', Array.isArray(farm.tokens));
          }
          if (Array.isArray(farm.tokens)) {
            farm.tokens.forEach(tokenEntry => {
              if (import.meta.env.DEV) {
                console.log('  ➕ Ajout token:', tokenEntry.tokenId);
              }
              farmWalletTokenIds.add(tokenEntry.tokenId);
              allTokensFromFarms.push({
                ...tokenEntry,
                farmName: farm.name,
                farmVerified: farm.verified,
                farmStatus: farm.verification_status
              });
            });
          }
        });
        
        console.log('📋 TokenIds Farm-Wallet dans Supabase:', Array.from(farmWalletTokenIds));
        console.log('📊 Tokens extraits des farms:', allTokensFromFarms.length);
        
        // Si admin: charger TOUS les tokens Farm-Wallet (même sans mintBaton)
        let allFarmTokensData = [];
        if (isAdmin) {
          console.log('👑 Mode ADMIN activé');
          console.log('📋 Farms dans Supabase:', farms.length);
          console.log('🔑 Batons possédés:', batons.map(b => b.tokenId.substring(0, 8)));
          
          allFarmTokensData = await Promise.all(allTokensFromFarms.map(async (tokenEntry) => {
            // Vérifier si l'admin possède le baton
            const hasBaton = batons.some(b => b.tokenId === tokenEntry.tokenId);
            
            // Info Blockchain
            let info = { genesisInfo: {} };
            try {
              info = await wallet.getTokenInfo(tokenEntry.tokenId);
            } catch (e) {
              console.warn(`⚠️ Erreur info ${tokenEntry.tokenId}:`, e);
            }
            
            // Solde
            let balance = '0';
            try {
              const balanceData = await wallet.getTokenBalance(tokenEntry.tokenId);
              balance = balanceData.balance || '0';
            } catch (e) {
              console.warn(`⚠️ Erreur solde ${tokenEntry.tokenId}:`, e);
            }
            
            // Supply
            const circulatingSupply = info.genesisInfo?.circulatingSupply || '0';
            const isActive = BigInt(circulatingSupply) > 0n;
            
            // Détection Farm-Wallet via Supabase
            // Si le tokenId existe dans farm.tokens[], c'est un token Farm-Wallet
            const isFromFarmWallet = farmWalletTokenIds.has(tokenEntry.tokenId);
            
            return {
              tokenId: tokenEntry.tokenId,
              name: tokenEntry.farmName || info.genesisInfo?.tokenName || 'Inconnu',
              ticker: info.genesisInfo?.tokenTicker || tokenEntry.ticker || 'UNK',
              decimals: info.genesisInfo?.decimals || 0,
              image: 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"400\"%3E%3Crect fill=\"%23ddd\" width=\"400\" height=\"400\"/%3E%3Ctext fill=\"%23999\" font-size=\"48\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\"%3EToken%3C/text%3E%3C/svg%3E',
              protocol: 'ALP',
              website: '',
              balance: balance,
              isReferenced: true,
              isFromFarmWallet: isFromFarmWallet,
              isActive: isActive,
              verified: tokenEntry.farmVerified || false,
              verificationStatus: tokenEntry.farmStatus || 'unverified',
              hasMintBaton: hasBaton,
              isFixed: !hasBaton
            };
          }));
          
          setAllFarmTokens(allFarmTokensData);
          console.log(`✅ Admin: ${allFarmTokensData.length} tokens chargés`);
          console.log('📋 Tokens admin détaillés:', allFarmTokensData.map(t => ({
            name: t.name,
            ticker: t.ticker,
            balance: t.balance,
            decimals: t.decimals,
            hasBaton: t.hasMintBaton,
            isFW: t.isFromFarmWallet
          })));
        }
        
        // Enrichir chaque baton avec les métadonnées blockchain et annuaire
        const enriched = await Promise.all(batons.map(async (b) => {
          // 1. Info Blockchain
          let info = { genesisInfo: { tokenName: 'Inconnu', tokenTicker: '???' } };
          try { 
            info = await wallet.getTokenInfo(b.tokenId);
            console.log(`📊 Token info pour ${b.tokenId}:`, info);
          } catch(e) {
            console.warn(`⚠️ Impossible de récupérer info pour ${b.tokenId}:`, e);
          }
          
          // 2. Info Annuaire (Image, Website)
          const farmInfo = farms.find(f => f.tokenId === b.tokenId);
          console.log(`🗂️ Farm info pour ${b.tokenId}:`, farmInfo);
          
          // 2b. Chercher l'entrée spécifique du token dans farm.tokens[] (pour purpose/counterpart/image)
          let tokenDetails = null;
          for (const farm of farms) {
            if (Array.isArray(farm.tokens)) {
              const foundToken = farm.tokens.find(t => t.tokenId === b.tokenId);
              if (foundToken) {
                tokenDetails = foundToken;
                break;
              }
            }
          }
          console.log(`📝 Token details pour ${b.tokenId}:`, tokenDetails);
          
          // 3. Solde du token
          let balance = '0';
          try {
            const balanceData = await wallet.getTokenBalance(b.tokenId);
            balance = balanceData.balance || '0';
          } catch (e) {
            console.warn(`⚠️ Impossible de récupérer le solde pour ${b.tokenId}:`, e);
          }
          
          // Déterminer si le token est actif (circulating supply > 0)
          const circulatingSupply = info.genesisInfo?.circulatingSupply || '0';
          const genesisSupply = info.genesisInfo?.genesisSupply || '0';
          const isActive = BigInt(circulatingSupply) > 0n;
          
          // NOUVEAU : Détecter si token "supprimé" (fixe + baton détruit)
          // Un token fixe a genesisSupply > 0 mais authPubkey vide
          const isFixed = !info.genesisInfo?.authPubkey || info.genesisInfo.authPubkey === '';
          const isDeleted = isFixed && !isActive && BigInt(genesisSupply) > 0n;
          
          console.log(`🔍 Token ${b.tokenId.substring(0, 8)}:`, {
            circulatingSupply,
            genesisSupply,
            isActive,
            isFixed,
            isDeleted
          });
          
          // RÈGLE : Différencier tokens Farm-Wallet vs autres apps
          // Un token est "FromFarmWallet" s'il existe dans farm.tokens[] OU s'il a tokenDetails
          const isFromFarmWallet = farmWalletTokenIds.has(b.tokenId) || !!tokenDetails;
          const isReferenced = !!farmInfo;
          
          console.log(`🔍 Token ${b.tokenId.substring(0, 8)}: isFromFarmWallet=${isFromFarmWallet}, isReferenced=${isReferenced}, hasTokenDetails=${!!tokenDetails}`);
          
          // Critères d'affichage:
          // 1. Créateur possède le baton → TOUJOURS afficher (Farm-Wallet ou non)
          // 2. Admin sans baton → afficher seulement si référencé dans farms.json
          // 3. Token référencé → afficher
          // Note: Les tokens non-référencés + non-Farm-Wallet seront visibles mais marqués
          
          return {
            ...b, // utxo, tokenId, isMintBaton
            name: farmInfo?.name || info.genesisInfo?.tokenName || "Jeton Non Référencé",
            ticker: info.genesisInfo?.tokenTicker || "UNK",
            decimals: info.genesisInfo?.decimals || 0,
            image: tokenDetails?.image || farmInfo?.image || info.genesisInfo?.url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EToken%3C/text%3E%3C/svg%3E",
            protocol: farmInfo?.protocol || "ALP",
            website: farmInfo?.website || "",
            purpose: tokenDetails?.purpose || '',
            counterpart: tokenDetails?.counterpart || '',
            isFixed: false, // Si on a le baton, c'est variable
            balance: balance,
            isReferenced: isReferenced,
            isFromFarmWallet: isFromFarmWallet,
            isActive: isActive,
            isDeleted: isDeleted,
            verified: farmInfo?.verified || false,
            verificationStatus: farmInfo?.verificationStatus || (farmInfo?.verified ? 'verified' : 'unverified'),
            hasMintBaton: true // Puisqu'on itère sur les batons
          };
        }));
        
        // Tous les tokens du créateur sont visibles (Farm-Wallet ou pas)
        const validTokens = enriched.filter(t => t !== null);
        console.log(`✅ Jetons enrichis: ${validTokens.length} tokens avec mintBaton`);
        setTokens(validTokens);
      } catch (err) {
        console.error('❌ Erreur chargement données jetons:', err);
        setNotification({ 
          type: 'error', 
          message: 'Impossible de charger les jetons' 
        });
      } finally {
        setLoadingTokens(false);
      }
    };

    loadData();
  }, [wallet, farms, isAdmin, address]); // Dependencies: recharger si wallet/farms/admin/address change

  // Callback après import réussi pour recharger les données
  const handleImportSuccess = () => {
    // Recharger les farms (cela déclenchera useEffect)
    window.location.reload(); // Solution simple, ou implémenter un rechargement plus élégant
  };

  // Copier l'ID du jeton dans le presse-papier
  const handleCopyTokenId = (tokenId, e) => {
    e.stopPropagation(); // Empêcher la navigation
    navigator.clipboard.writeText(tokenId).then(
      () => {
        setNotification({ 
          type: 'success', 
          message: 'ID du jeton copié !' 
        });
      },
      (err) => {
        console.error('❌ Échec de la copie:', err);
        setNotification({ 
          type: 'error', 
          message: 'Échec de la copie' 
        });
      }
    );
  };

  // Formater le solde avec décimales
  const formatBalance = (balance, decimals = 0) => {
    if (!balance || balance === '0') return '0';
    try {
      const balanceNum = typeof balance === 'string' ? BigInt(balance) : BigInt(balance.toString());
      const divisor = BigInt(Math.pow(10, decimals));
      const wholePart = balanceNum / divisor;
      const remainder = balanceNum % divisor;
      
      if (remainder === 0n) {
        return wholePart.toString();
      }
      
      const decimalPart = remainder.toString().padStart(decimals, '0');
      return `${wholePart}.${decimalPart}`.replace(/\.?0+$/, '');
    } catch (err) {
      console.warn('⚠️ Erreur formatage balance:', err);
      return balance.toString();
    }
  };

  // Naviguer vers la page de détails du jeton
  const handleViewToken = (token) => {
    navigate(`/manage-token/${token.tokenId}`);
  };

  // Créer une carte exemple pour les admins (mode debug)
  const renderAdminDebugCard = () => (
    <Card className="opacity-70 border-dashed relative">
      <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
        SIMULATION
      </div>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-4">
          <img 
            src="https://placehold.co/64x64?text=TEST" 
            alt="Test"
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">Exemple Admin</div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">DEMO</div>
          </div>
        </div>
        <div className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-bold uppercase">
          DEBUG
        </div>
      </div>
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400">Token ID</div>
        <div className="text-sm font-semibold font-mono text-gray-900 dark:text-white">
          abc123...xyz789
        </div>
      </div>
    </Card>
  );

  return (
    <MobileLayout title="Gestionnaire de Jetons">
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
        <PageHeader 
          icon="🔑"
          title="Gestionnaire de Jetons"
          subtitle={
            myFarm ? (
              <>
                <span>Gérez vos jetons à offre variable</span>
                <br />
                {myFarm.verification_status === 'verified' && (
                  <span className="verified-badge verified" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    ✅ Ferme vérifiée
                  </span>
                )}
                {myFarm.verification_status === 'pending' && (
                  <span className="verified-badge pending" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    ⏳ Validation en cours
                  </span>
                )}
                {myFarm.verification_status === 'unverified' && (
                  <span className="verified-badge unverified" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    ⚠️ Ferme non vérifiée
                  </span>
                )}
                {myFarm.verification_status === 'info_requested' && (
                  <span 
                    className="verified-badge" 
                    style={{ 
                      fontSize: '14px', 
                      padding: '4px 12px', 
                      backgroundColor: '#f59e0b', 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={() => {
                      const firstToken = tokens.find(t => t.hasMintBaton && t.isFromFarmWallet);
                      if (firstToken) {
                        navigate(`/manage-farm/${firstToken.tokenId}`);
                      }
                    }}
                  >
                    🔔 Message admin - Cliquez ici
                  </span>
                )}
              </>
            ) : "Gérez vos jetons à offre variable"
          }
          action={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Button
                  onClick={() => navigate('/create-token')}
                  variant="primary"
                  icon="➕"
                  fullWidth
                >
                  Créer un jeton
                </Button>
                <Button
                  onClick={() => {
                    console.log('🔘 Clic sur Importer un jeton');
                    console.log('📊 Wallet:', wallet ? 'Connecté' : 'Non connecté');
                    console.log('📊 showImportModal avant:', showImportModal);
                    setShowImportModal(true);
                    console.log('📊 setShowImportModal(true) appelé');
                  }}
                  variant="secondary"
                  icon="📥"
                  fullWidth
                  style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', color: '#fff' }}
                >
                  Importer un jeton
                </Button>
              </div>
              <Button
                onClick={() => {
                  // Trouver le premier token actif du créateur
                  const firstToken = tokens.find(t => t.hasMintBaton && t.isFromFarmWallet);
                  if (firstToken) {
                    navigate(`/manage-farm/${firstToken.tokenId}`);
                  } else {
                    navigate('/manage-farm');
                  }
                }}
                variant="secondary"
                icon="🏡"
                fullWidth
              >
                Gérer ma ferme
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => {
                    console.log('🔘 Clic sur "Vérifier les fermes" - Navigation vers /admin/verification');
                    console.log('👤 isAdmin:', isAdmin);
                    navigate('/admin/verification');
                  }}
                  variant="secondary"
                  icon="🛡️"
                  fullWidth
                  style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                >
                  Vérifier les fermes
                </Button>
              )}
            </div>
          }
        />

        {/* Balance Card (WalletDashboard style) */}
        <Card>
          <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">💰 eCash disponible</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {xecBalance.toFixed(2)} XEC
              </div>
            </div>
            
            <div className="w-px h-16 bg-gray-200 dark:bg-gray-700 mx-4"></div>
            
            <div 
              className="flex-1 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg p-2"
              onClick={() => navigate('/settings')}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">💱 Valeur estimée</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {price && typeof price.convert === 'function' 
                  ? (() => {
                      const converted = price.convert(xecBalance, currency);
                      return converted !== null ? `${converted.toFixed(2)} ${currency}` : '...';
                    })()
                  : '...'
                }
              </div>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* État de chargement */}
        {loadingTokens ? (
          <Card>
            <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-600 dark:text-gray-400">
              Recherche des jetons en cours...
            </p>
            </CardContent>
          </Card>
        ) : tokens.length === 0 ? (
          /* Aucun jeton trouvé */
          <>
            <Card>
              <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4 opacity-30">🔑</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Aucun jeton géré
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Créez un jeton avec offre <strong>variable</strong> pour pouvoir le gérer ici.
              </p>
              </CardContent>
            </Card>

            {/* Carte de simulation pour les admins */}
            {isAdmin && (
              <>
                <Card variant="highlight" padding="small" className="text-center">
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    👑 MODE ADMIN : Carte de débogage
                  </p>
                </Card>
                {renderAdminDebugCard()}
              </>
            )}
          </>
        ) : (
          /* Liste des jetons */
          <>
            {/* Filtres Admin */}
            {isAdmin && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveFilter('active')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        activeFilter === 'active'
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      🟢 Mes Actifs ({tokens.filter(t => t.isActive && t.hasMintBaton && t.isFromFarmWallet).length})
                    </button>
                    <button
                      onClick={() => setActiveFilter('inactive')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        activeFilter === 'inactive'
                          ? 'bg-gray-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      ⚫ Mes Inactifs ({tokens.filter(t => !t.isActive && !t.isDeleted && t.hasMintBaton).length})
                    </button>
                    <button
                      onClick={() => setActiveFilter('deleted')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        activeFilter === 'deleted'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      🗑️ Supprimés ({tokens.filter(t => t.isDeleted).length})
                    </button>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        activeFilter === 'all'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      📋 Tous ({(() => {
                        const allTokensCreatedInApp = [...allFarmTokens, ...tokens.filter(t => t.isFromFarmWallet && !allFarmTokens.some(ft => ft.tokenId === t.tokenId))];
                        return allTokensCreatedInApp.length;
                      })()})
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info : Filtre actuel */}
            <Card>
              <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/30">
              <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
                {isAdmin ? (
                  activeFilter === 'active' ? '🟢 Vos tokens actifs (offre > 0)' :
                  activeFilter === 'inactive' ? '⚫ Vos tokens inactifs (offre = 0)' :
                  activeFilter === 'pending' ? '⏳ Tokens en attente de vérification' :
                  '📋 Tous les tokens Farm-Wallet référencés'
                ) : (
                  'ℹ️ Tous vos tokens sont affichés ci-dessous (actifs et inactifs)'
                )}
              </p>
              </CardContent>
            </Card>
            
            {(() => {
              // Logique de filtrage
              let displayTokens = [];
              
              if (isAdmin) {
                if (activeFilter === 'all') {
                  // TOUS = Tokens Supabase (farms) + tokens wallet Farm-Wallet sans doublon
                  const supabaseTokenIds = new Set(allFarmTokens.map(t => t.tokenId));
                  const walletOnlyFarmTokens = tokens.filter(t => 
                    t.isFromFarmWallet && !supabaseTokenIds.has(t.tokenId)
                  );
                  
                  displayTokens = [...allFarmTokens, ...walletOnlyFarmTokens]
                    .filter(t => t.isFromFarmWallet); // Ne garder QUE Farm-Wallet
                } else if (activeFilter === 'active') {
                  // Mes Actifs = tokens Farm-Wallet actifs avec baton
                  displayTokens = tokens.filter(t => t.hasMintBaton && t.isActive && t.isFromFarmWallet);
                } else if (activeFilter === 'inactive') {
                  // Inactifs = supply = 0 mais pas supprimés
                  displayTokens = tokens.filter(t => t.hasMintBaton && !t.isActive && !t.isDeleted);
                } else if (activeFilter === 'deleted') {
                  // Supprimés = tokens fixes dont le baton est détruit
                  displayTokens = tokens.filter(t => t.isDeleted);
                }
              } else {
                // Créateur : filtrer selon la supply blockchain (pas le solde du créateur)
                if (activeFilter === 'active') {
                  displayTokens = tokens.filter(t => t.isActive && !t.isDeleted);
                } else if (activeFilter === 'inactive') {
                  displayTokens = tokens.filter(t => !t.isActive && !t.isDeleted);
                } else if (activeFilter === 'deleted') {
                  displayTokens = tokens.filter(t => t.isDeleted);
                } else {
                  displayTokens = tokens;
                }
              }
              
              console.log('🎯 Filtrage tokens:', {
                isAdmin,
                activeFilter,
                tokensCount: tokens.length,
                allFarmTokensCount: allFarmTokens.length,
                displayTokensCount: displayTokens?.length || 0
              });

              return (displayTokens || [])
              .sort((a, b) => {
                // Trier: Actifs en premier, puis par date de création (plus récent d'abord)
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return 0;
              })
              .map((token) => (
              <Card
                key={token.tokenId}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                {/* Header: Image + Info + Badges */}
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src={token.image} 
                    alt={token.name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100 dark:border-gray-700"
                    loading="lazy"
                    style={{ imageRendering: 'crisp-edges' }}
                    onError={(e) => {
                      if (e.target.src !== 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3Ctext fill="%23999" font-size="12" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EToken%3C/text%3E%3C/svg%3E') {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3Ctext fill="%23999" font-size="12" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EToken%3C/text%3E%3C/svg%3E';
                      }
                    }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                        {token.name}
                      </h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        token.isReferenced 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-400 text-white'
                      }`}>
                        {token.isReferenced ? '✓ RÉFÉRENCÉ' : 'NON RÉFÉRENCÉ'}
                      </span>
                      {/* Badge Farm-Wallet */}
                      {token.isFromFarmWallet && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                          🏡 Farm-Wallet
                        </span>
                      )}
                      {/* Badge Admin: Pas de MintBaton */}
                      {isAdmin && !token.hasMintBaton && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                          ⚠️ Pas de MintBaton
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">
                      {token.ticker}
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                    token.isActive 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-400 text-white'
                  }`}>
                    {token.isActive ? '✓ ACTIF' : '⚠ INACTIF'}
                  </div>
                </div>

                {/* Balance Section */}
                <Card className="mb-4">
                  <CardContent className="p-4 bg-muted/50">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    💼 Solde en ma possession
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatBalance(token.balance, token.decimals)} {token.ticker}
                  </div>
                  </CardContent>
                </Card>

                {/* Token ID */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Token ID</div>
                    <div className="text-xs font-mono text-gray-900 dark:text-gray-100 truncate">
                      {token.tokenId}
                    </div>
                  </div>
                  <Button
                    onClick={(e) => handleCopyTokenId(token.tokenId, e)}
                    size="sm"
                    variant="outline"
                  >
                    📋 Copier
                  </Button>
                </div>

                {/* Boutons d'actions rapides */}
                {token.hasMintBaton && (
                  <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/token/${token.tokenId}`);
                    }}
                    size="sm"
                    variant="outline"
                    fullWidth
                  >
                    📊 Détails
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Naviguer vers TokenDetailsPage et l'onglet airdrop sera sélectionnable là-bas
                      navigate(`/token/${token.tokenId}`);
                    }}
                    size="sm"
                    variant="outline"
                    fullWidth
                  >
                    🎁 Airdrop
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Naviguer vers TokenDetailsPage et l'onglet send sera sélectionnable là-bas
                      navigate(`/token/${token.tokenId}`);
                    }}
                    size="sm"
                    variant="outline"
                    fullWidth
                  >
                    📤 Envoyer
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/manage-farm/${token.tokenId}`);
                    }}
                    size="sm"
                    variant="outline"
                    fullWidth
                  >
                    🏡 Modifier Ferme
                  </Button>
                </div>
                {/* Bouton Demander Référencement si non référencé */}
                {!token.isReferenced && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/request-listing/${token.tokenId}`);
                    }}
                    size="sm"
                    variant="primary"
                    fullWidth
                    className="mt-2"
                  >
                    📝 Demander Référencement
                  </Button>
                )}
                  </>
                )}

                {/* Admin sans MintBaton: actions limitées */}
                {isAdmin && !token.hasMintBaton && (
                  <Card className="mt-3">
                    <CardContent className="p-4 bg-orange-50 dark:bg-orange-950/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 m-0 mb-3">
                        ⚠️ Vous n'avez pas le MintBaton de ce jeton. Actions limitées.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/token/${token.tokenId}`);
                          }}
                          size="sm"
                          variant="outline"
                          fullWidth
                        >
                          📊 Détails
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/manage-farm/${token.tokenId}`);
                          }}
                          size="sm"
                          variant="outline"
                          fullWidth
                        >
                          🏡 Voir Ferme
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                </CardContent>
              </Card>
            ));
            })()}
          </>
        )}

        {/* FAQ Gestionnaire */}
        {tokens.length > 0 && (
          <Card>
            <CardContent className="p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="text-2xl">❓</span>
              FAQ Gestionnaire
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Tout savoir sur la gestion de vos jetons
            </p>

            <div className="space-y-3">
              {[
                {
                  question: "🏭 C'est quoi Émettre (Mint) ?",
                  answer: "Émettre (ou \"Mint\") permet de créer de nouveaux jetons et d'augmenter l'offre en circulation. Cette action est réservée aux jetons à offre variable (ceux pour lesquels vous possédez le baton de mint). Les nouveaux jetons sont automatiquement ajoutés à votre solde."
                },
                {
                  question: "🔥 C'est quoi Détruire (Burn) ?",
                  answer: "Détruire (ou \"Burn\") permet de supprimer définitivement des jetons de la circulation. Cette action est irréversible. Les jetons brûlés disparaissent de votre solde et réduisent l'offre totale. Si vous brûlez tous les jetons (supply = 0), le jeton devient INACTIF."
                },
                {
                  question: "🎁 C'est quoi Distribuer (Airdrop) ?",
                  answer: "Distribuer permet d'envoyer des XEC (frais réseau) à tous les détenteurs de votre jeton en une seule opération. Vous pouvez choisir le mode Égalitaire (montant identique pour tous) ou Pro-Rata (proportionnel aux soldes). Utile pour récompenser votre communauté ou financer leurs transactions."
                },
                {
                  question: "📊 Génèse vs En circulation ?",
                  answer: "La \"Génèse\" représente la quantité totale de jetons créés depuis l'origine (incluant ceux détruits). L'\"En circulation\" représente la quantité actuellement disponible (Génèse - Jetons brûlés). Pour les jetons à offre fixe, ces deux valeurs sont identiques."
                },
                {
                  question: "⚠️ Pourquoi mon jeton est INACTIF ?",
                  answer: "Un jeton devient INACTIF lorsque son offre en circulation est égale à 0 (tous les jetons ont été détruits). Un jeton inactif ne peut plus être échangé mais peut être réactivé en émettant de nouveaux jetons si vous possédez toujours le baton de mint."
                },
                {
                  question: "🔐 ALP vs SLP ?",
                  answer: "ALP (Augmented Lokad Protocol) et SLP (Simple Ledger Protocol) sont deux standards de jetons sur eCash. ALP est plus récent, plus efficace et offre des fonctionnalités avancées. SLP est le standard historique. Farm Wallet utilise principalement ALP pour ses avantages techniques."
                },
                {
                  question: "📋 Pourquoi \"Non Listé\" ?",
                  answer: "Un jeton \"Non Listé\" n'apparaît pas encore dans l'annuaire public des fermes. Pour le faire référencer, contactez l'équipe Farm Wallet avec les informations de votre ferme (nom, description, image, coordonnées). Le référencement est gratuit."
                },
                {
                  question: "🔄 Offre Variable vs Fixe ?",
                  answer: "Offre Variable : vous pouvez émettre de nouveaux jetons à tout moment (vous possédez le baton de mint). Offre Fixe : la quantité totale est déterminée à la création et ne peut plus être modifiée. Vous pouvez toujours détruire des jetons, mais pas en créer de nouveaux."
                }
              ].map((faq, index) => (
                <div
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFaqOpen(faqOpen === index ? null : index);
                  }}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {faq.question}
                      </span>
                      <span className="text-xl text-gray-600 dark:text-gray-400">
                        {faqOpen === index ? '−' : '+'}
                      </span>
                    </div>
                    {faqOpen === index && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        )}

        {/* Blockchain Status */}
        <div className="mt-2">
          <BlockchainStatus />
        </div>
        </Stack>

        {/* Modal d'importation - Toujours rendu, contrôlé par isOpen */}
        {wallet && (
          <ImportTokenModal 
            isOpen={showImportModal}
            onClose={() => {
              console.log('🔘 Fermeture du modal');
              setShowImportModal(false);
            }}
            onImportSuccess={handleImportSuccess}
          />
        )}
      </PageLayout>
    </MobileLayout>
  );
};

export default ManageTokenPage;
