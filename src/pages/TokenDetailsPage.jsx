import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/BlockchainStatus';
import QrCodeScanner from '../components/QrCodeScanner';
import { Card, CardContent, Button, PageLayout, Badge, Tabs, BalanceCard, Stack, Input, Modal } from '../components/UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useFarms } from '../hooks/useFarms';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { syncTokenData, getCachedTokenData, cacheTokenData } from '../utils/tokenSync';
import '../styles/token-details.css';

const TokenDetailsPage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const { farms } = useFarms();
  const setNotification = useSetAtom(notificationAtom);

  // États de chargement et données
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [farmInfo, setFarmInfo] = useState(null);
  const [myBalance, setMyBalance] = useState('0');
  const [isCreator, setIsCreator] = useState(false);
  
  // États des onglets
  const [activeTab, setActiveTab] = useState('send'); // 'send' ou 'airdrop'
  const [managementPanelOpen, setManagementPanelOpen] = useState(false);
  const [managementTab, setManagementTab] = useState('mint'); // 'mint' ou 'burn'
  
  // États des formulaires
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [xecBalance, setXecBalance] = useState(0);
  
  // États Airdrop
  const [airdropMode, setAirdropMode] = useState('equal'); // 'equal' ou 'prorata' - toggle
  const [ignoreCreator, setIgnoreCreator] = useState(false);
  const [airdropTotal, setAirdropTotal] = useState('');
  const [minEligible, setMinEligible] = useState('');
  const [airdropProcessing, setAirdropProcessing] = useState(false);
  const [holdersCount, setHoldersCount] = useState(null);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [calculatedHolders, setCalculatedHolders] = useState([]);
  const [isCalculationValid, setIsCalculationValid] = useState(false);
  
  // Hooks pour le prix et la devise
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);

  // Charger les données complètes du jeton
  useEffect(() => {
    const loadTokenData = async () => {
      if (!wallet || !tokenId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Vérifier le cache d'abord pour affichage immédiat
        const cachedData = getCachedTokenData(tokenId);
        if (cachedData) {
          console.log('📦 Données en cache disponibles:', cachedData);
          // Utiliser temporairement le cache pendant le chargement
        }

        // 2. Synchroniser depuis la blockchain (source de vérité)
        const dynamicData = await syncTokenData(tokenId, wallet);
        if (dynamicData) {
          cacheTokenData(tokenId, dynamicData);
          console.log('✅ Données synchronisées depuis blockchain:', dynamicData);
        }

        // 3. Récupérer les infos blockchain complètes
        const info = await wallet.getTokenInfo(tokenId);
        console.log('📊 Token Info Blockchain:', info);
        
        // 4. Récupérer les infos de l'annuaire
        const farm = farms.find((f) => f.tokenId === tokenId);
        console.log('🗂️ Farm Info:', farm);

        // 5. Vérifier si je suis le créateur (j'ai un Mint Baton)
        const batons = await wallet.getMintBatons();
        const hasBaton = batons.some((b) => b.tokenId === tokenId);
        setIsCreator(hasBaton);

        // 6. Récupérer mon solde
        let balance = '0';
        try {
          const balanceData = await wallet.getTokenBalance(tokenId);
          balance = balanceData.balance || '0';
        } catch (e) {
          console.warn('⚠️ Balance non disponible:', e);
        }

        setTokenInfo(info);
        setFarmInfo(farm);
        setMyBalance(balance);

        // 7. Récupérer le solde XEC pour les frais
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);

        // 8. Charger le nombre de détenteurs
        fetchHolderCount();

      } catch (err) {
        console.error('❌ Erreur chargement jeton:', err);
        setNotification({
          type: 'error',
          message: 'Impossible de charger les données du jeton'
        });
      } finally {
        setLoading(false);
      }
    };

    loadTokenData();
    
    // SYNC automatique toutes les 30 secondes avec centralisation
    const refreshInterval = setInterval(() => {
      console.log('🔄 Synchronisation automatique depuis blockchain...');
      loadTokenData();
    }, 30000); // 30 secondes
    
    return () => clearInterval(refreshInterval);
  }, [tokenId, wallet]);

  // Charger le nombre de détenteurs
  const fetchHolderCount = async () => {
    if (!wallet || !tokenId) return;
    
    try {
      setLoadingHolders(true);
      console.log('👥 Comptage des détenteurs...');
      
      // Récupérer tous les UTXOs du token
      const tokenUtxos = await wallet.chronik.tokenId(tokenId).utxos();
      
      // Agréger par adresse (similaire à la logique airdrop)
      const holderAddresses = new Set();
      
      for (const utxo of tokenUtxos.utxos) {
        if (!utxo.token || utxo.token.isMintBaton) continue;
        
        // Extraire l'adresse depuis le script P2PKH
        try {
          const scriptHex = utxo.script;
          const pkhHex = scriptHex.substring(6, 46);
          holderAddresses.add(pkhHex);
        } catch (e) {
          console.warn('Impossible de décoder adresse:', e);
        }
      }
      
      setHoldersCount(holderAddresses.size);
      console.log(`✅ ${holderAddresses.size} détenteurs trouvés`);
      
    } catch (err) {
      console.warn('⚠️ Impossible de compter les détenteurs:', err);
      setHoldersCount(null);
    } finally {
      setLoadingHolders(false);
    }
  };

  // Copier le Token ID
  const handleCopyTokenId = () => {
    navigator.clipboard.writeText(tokenId).then(
      () => setNotification({ type: 'success', message: '✅ Token ID copié !' }),
      () => setNotification({ type: 'error', message: '❌ Échec de la copie' })
    );
  };

  // Gérer l'envoi de tokens
  const handleSendToken = async (e) => {
    e.preventDefault();
    if (!sendAddress || !sendAmount) {
      setNotification({ type: 'error', message: 'Adresse et montant requis' });
      return;
    }

    setProcessing(true);
    try {
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const protocol = farmInfo?.protocol || tokenInfo?.protocol || 'ALP';
      const result = await wallet.sendToken(tokenId, sendAddress, sendAmount, decimals, protocol);
      
      setNotification({
        type: 'success',
        message: `✅ ${sendAmount} jetons envoyés ! TXID: ${result.txid.substring(0, 8)}...`
      });
      
      setSendAddress('');
      setSendAmount('');
      
      // Recharger le solde
      setTimeout(async () => {
        try {
          const balanceData = await wallet.getTokenBalance(tokenId);
          setMyBalance(balanceData.balance || '0');
        } catch (err) {
          console.warn('⚠️ Échec rechargement solde:', err);
        }
      }, 2000);
    } catch (err) {
      console.error('❌ Erreur envoi:', err);
      setNotification({ type: 'error', message: err.message || 'Échec de l\'envoi' });
    } finally {
      setProcessing(false);
    }
  };

  // Gérer le scan QR
  const handleQrScan = (scannedAddress) => {
    setSendAddress(scannedAddress);
    setShowQrScanner(false);
    setNotification({ type: 'success', message: '✅ Adresse scannée' });
  };

  // Gérer l'émission (Mint)
  const handleMint = async (e) => {
    e.preventDefault();
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      setNotification({ type: 'error', message: 'Montant invalide' });
      return;
    }

    setProcessing(true);
    try {
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const txid = await wallet.mintToken(tokenId, parseInt(mintAmount), decimals);
      
      setNotification({
        type: 'success',
        message: `✅ ${mintAmount} jetons émis ! TXID: ${txid.substring(0, 8)}...`
      });
      
      setMintAmount('');
      
      // Recharger le solde
      setTimeout(async () => {
        try {
          const balanceData = await wallet.getTokenBalance(tokenId);
          setMyBalance(balanceData.balance || '0');
        } catch (err) {
          console.warn('⚠️ Échec rechargement solde:', err);
        }
      }, 2000);
    } catch (err) {
      console.error('❌ Erreur mint:', err);
      setNotification({ type: 'error', message: err.message || 'Échec de l\'émission' });
    } finally {
      setProcessing(false);
    }
  };

  // Gérer la destruction (Burn)
  const handleBurn = async (e) => {
    e.preventDefault();
    if (!burnAmount || parseFloat(burnAmount) <= 0) {
      setNotification({ type: 'error', message: 'Montant invalide' });
      return;
    }

    // AVERTISSEMENT : Vérifier si on brûle tout + si on a un mint baton
    const burnAmountBigInt = BigInt(Math.round(parseFloat(burnAmount) * Math.pow(10, tokenInfo?.genesisInfo?.decimals || 0)));
    const myBalanceBigInt = BigInt(myBalance || '0');
    const isBurningAll = burnAmountBigInt >= myBalanceBigInt;
    
    if (isBurningAll && isCreator) {
      const confirmMsg = "⚠️ ATTENTION : Vous allez détruire TOUS vos tokens. Si le mint baton est inclus, vous ne pourrez PLUS JAMAIS créer de nouveaux tokens pour ce tokenId. Continuer ?";
      if (!window.confirm(confirmMsg)) {
        setProcessing(false);
        return;
      }
    } else if (parseFloat(burnAmount) > parseFloat(myBalance) * 0.5) {
      // Avertissement si burn > 50%
      if (!window.confirm(`⚠️ Vous allez détruire ${burnAmount} tokens (${((parseFloat(burnAmount) / parseFloat(myBalance)) * 100).toFixed(0)}% de votre solde). Continuer ?`)) {
        setProcessing(false);
        return;
      }
    }

    setProcessing(true);
    try {
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const protocol = farmInfo?.protocol || tokenInfo?.protocol || 'ALP';
      const result = await wallet.burnToken(tokenId, parseInt(burnAmount), decimals, protocol);
      const txid = result.txid || result;
      
      setNotification({
        type: 'success',
        message: `🔥 ${burnAmount} jetons détruits ! TXID: ${txid.substring(0, 8)}...`
      });
      
      setBurnAmount('');
      
      // Recharger le solde
      setTimeout(async () => {
        try {
          const balanceData = await wallet.getTokenBalance(tokenId);
          setMyBalance(balanceData.balance || '0');
        } catch (err) {
          console.warn('⚠️ Échec rechargement solde:', err);
        }
      }, 2000);
    } catch (err) {
      console.error('❌ Erreur burn:', err);
      setNotification({ type: 'error', message: err.message || 'Échec de la destruction' });
    } finally {
      setProcessing(false);
    }
  };

  // Définir le MAX pour burn
  const handleSetMaxBurn = () => {
    const decimals = tokenInfo?.genesisInfo?.decimals || 0;
    const maxAmount = formatAmount(myBalance, decimals);
    setBurnAmount(maxAmount);
  };

  // Définir le MAX pour airdrop
  const handleSetMaxAirdrop = () => {
    setAirdropTotal(xecBalance.toString());
  };

  // Calculer le nombre de détenteurs pour l'airdrop
  const handleCalculateAirdrop = async () => {
    if (!airdropTotal || parseFloat(airdropTotal) <= 0) {
      setNotification({ type: 'error', message: 'Montant total requis' });
      return;
    }

    setLoadingHolders(true);
    try {
      console.log('👥 Calcul des détenteurs éligibles...');
      
      const decimals = tokenInfo?.genesisInfo?.decimals || 0;
      const minTokens = minEligible ? parseFloat(minEligible) : 0;
      
      // Utiliser la méthode du wallet
      const result = await wallet.calculateAirdropHolders(
        tokenId, 
        minTokens, 
        ignoreCreator, 
        decimals
      );
      
      // Calculer le montant XEC pour chaque détenteur
      const totalXec = parseFloat(airdropTotal);
      const isProportional = airdropMode === 'prorata';
      
      let holdersWithXec = [];
      
      if (isProportional) {
        // Mode proportionnel : calculer la somme des tokens des détenteurs ÉLIGIBLES
        const totalEligibleTokens = result.holders.reduce((sum, h) => sum + h.balanceFormatted, 0);
        
        holdersWithXec = result.holders.map(holder => {
          const percentage = holder.balanceFormatted / totalEligibleTokens;
          const xecAmount = totalXec * percentage;
          return {
            ...holder,
            xecAmount: xecAmount.toFixed(2)
          };
        });
      } else {
        // Mode égalitaire : montant identique pour tous
        const xecPerHolder = totalXec / result.count;
        
        holdersWithXec = result.holders.map(holder => ({
          ...holder,
          xecAmount: xecPerHolder.toFixed(2)
        }));
      }
      
      setHoldersCount(result.count);
      setCalculatedHolders(holdersWithXec);
      setIsCalculationValid(true); // Marquer le calcul comme valide
      
      setNotification({
        type: 'success',
        message: `✅ ${result.count} détenteur${result.count > 1 ? 's' : ''} éligible${result.count > 1 ? 's' : ''} trouvé${result.count > 1 ? 's' : ''}`
      });
      
      console.log(`✅ Détenteurs éligibles: ${result.count}`, holdersWithXec.slice(0, 5));
      
    } catch (err) {
      console.error('❌ Erreur calcul détenteurs:', err);
      setNotification({ 
        type: 'error', 
        message: 'Impossible de calculer les détenteurs' 
      });
    } finally {
      setLoadingHolders(false);
    }
  };

  // Recalculer les montants XEC quand le montant total ou le mode change
  useEffect(() => {
    if (calculatedHolders.length === 0 || !airdropTotal || parseFloat(airdropTotal) <= 0) return;
    
    // Invalider le calcul car les param\u00e8tres ont chang\u00e9\n    setIsCalculationValid(false);
    
    const totalXec = parseFloat(airdropTotal);
    const isProportional = airdropMode === 'prorata';
    
    let holdersWithXec = [];
    
    if (isProportional) {
      // Calculer la somme des tokens des détenteurs éligibles
      const totalEligibleTokens = calculatedHolders.reduce((sum, h) => sum + h.balanceFormatted, 0);
      
      holdersWithXec = calculatedHolders.map(holder => {
        const percentage = holder.balanceFormatted / totalEligibleTokens;
        const xecAmount = totalXec * percentage;
        return {
          ...holder,
          xecAmount: xecAmount.toFixed(2)
        };
      });
    } else {
      const xecPerHolder = totalXec / calculatedHolders.length;
      
      holdersWithXec = calculatedHolders.map(holder => ({
        ...holder,
        xecAmount: xecPerHolder.toFixed(2)
      }));
    }
    
    setCalculatedHolders(holdersWithXec);
  }, [airdropTotal, airdropMode]);

  // Invalider le calcul quand les paramètres de filtrage changent
  useEffect(() => {
    if (isCalculationValid) {
      setIsCalculationValid(false);
    }
  }, [minEligible, ignoreCreator]);

  // Distribuer XEC aux détenteurs (Airdrop)
  const handleExecuteAirdrop = async () => {
    if (!holdersCount || holdersCount === 0) {
      setNotification({ type: 'error', message: 'Veuillez d\'abord calculer le nombre de détenteurs' });
      return;
    }

    if (!airdropTotal || parseFloat(airdropTotal) <= 0) {
      setNotification({ type: 'error', message: 'Montant total requis' });
      return;
    }

    const totalXec = parseFloat(airdropTotal);
    const isProportional = airdropMode === 'prorata';

    setAirdropProcessing(true);
    try {
      console.log(`🎁 Lancement Airdrop: ${totalXec} XEC (${isProportional ? 'Pro-Rata' : 'Égalitaire'})`);
      
      const result = await wallet.airdrop(tokenId, totalXec, isProportional, ignoreCreator, minEligible);
      
      setNotification({
        type: 'success',
        message: `🎉 Distribution réussie vers ${result.recipientsCount} destinataires ! TXID: ${result.txid.substring(0, 8)}...`
      });
      
      // Afficher détails dans la console
      console.log('📊 Résultat Airdrop:', result);
      
      // Réinitialiser le formulaire
      setAirdropTotal('');
      setMinEligible('');
      setHoldersCount(null);
      setCalculatedHolders([]);
      setIsCalculationValid(false);
      
      // Recharger le solde XEC
      setTimeout(async () => {
        try {
          const xecBalanceData = await wallet.getBalance(true);
          setXecBalance(xecBalanceData.balance || 0);
        } catch (err) {
          console.warn('⚠️ Échec rechargement solde XEC:', err);
        }
      }, 2000);
      
    } catch (err) {
      console.error('❌ Erreur Airdrop:', err);
      setNotification({ 
        type: 'error', 
        message: err.message || 'Échec de la distribution' 
      });
    } finally {
      setAirdropProcessing(false);
    }
  };

  // Formater un nombre avec décimales
  const formatAmount = (amount, decimals = 0) => {
    if (!amount || amount === '0') return '0';
    try {
      const num = BigInt(amount);
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      const remainder = num % divisor;
      
      if (remainder === 0n) return whole.toString();
      
      const decimal = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
      return decimal ? `${whole}.${decimal}` : whole.toString();
    } catch {
      return amount.toString();
    }
  };

  // Formater une date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Inconnue';
    try {
      return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Inconnue';
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Chargement...">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Stack spacing="md">
            <Card>
              <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-900 dark:text-white">Chargement des données...</p>
              </CardContent>
            </Card>
          </Stack>
        </PageLayout>
      </MobileLayout>
    );
  }

  if (!tokenInfo) {
    return (
      <MobileLayout title="Erreur">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Stack spacing="md">
            <Card>
              <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4 opacity-30">❌</div>
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Jeton introuvable
              </h3>
              <Button onClick={() => navigate('/manage-token')} className="w-full">
                ← Retour
              </Button>
              </CardContent>
            </Card>
          </Stack>
        </PageLayout>
      </MobileLayout>
    );
  }

  // Extraction des données principales
  const genesisInfo = tokenInfo.genesisInfo || {};
  const name = farmInfo?.name || genesisInfo.tokenName || 'Jeton Non Référencé';
  const ticker = genesisInfo.tokenTicker || 'UNK';
  const decimals = genesisInfo.decimals || 0;
  const protocol = farmInfo?.protocol || tokenInfo.protocol || 'ALP';
  const isListed = !!farmInfo;
  const genesisSupply = BigInt(genesisInfo.mintAmount || '0');
  const isActive = genesisSupply > 0n;
  
  // Trouver le token spécifique dans farmInfo.tokens pour récupérer purpose/counterpart
  const tokenDetails = farmInfo?.tokens?.find(t => t.tokenId === tokenId) || null;

  return (
    <MobileLayout title={name}>
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
          
          {/* EN-TÊTE */}
          <Card>
            <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={farmInfo?.image || genesisInfo.url || 'https://placehold.co/64x64?text=Token'}
                alt={name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                onError={(e) => { e.target.src = 'https://placehold.co/64x64?text=Token'; }}
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {name}
                </h1>
                <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                  {ticker}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="primary">{protocol}</Badge>
              <Badge variant={isCreator ? 'success' : 'warning'}>
                {isCreator ? '🔄 Variable' : '🔒 Fixe'}
              </Badge>
              <Badge variant={isListed ? 'success' : 'default'}>
                {isListed ? '✓ Listé' : 'Non Listé'}
              </Badge>
              <Badge variant={isActive ? 'success' : 'danger'}>
                {isActive ? '✓ Actif' : '⚠ Inactif'}
              </Badge>
            </div>
            </CardContent>
          </Card>

          {/* OBJECTIF ET CONTREPARTIE DU JETON */}
          {tokenDetails && (tokenDetails.purpose || tokenDetails.counterpart) && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  🎯 Objectif et Contrepartie du Jeton
                </h3>
                
                {tokenDetails.purpose && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      🎯 Objectif du Jeton
                    </div>
                    <p className="text-gray-900 dark:text-white leading-relaxed">
                      {tokenDetails.purpose}
                    </p>
                    {tokenDetails.purposeUpdatedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Modifié le {new Date(tokenDetails.purposeUpdatedAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                )}
                
                {tokenDetails.counterpart && (
                  <div>
                    <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      🤝 Contrepartie du Jeton
                    </div>
                    <p className="text-gray-900 dark:text-white leading-relaxed">
                      {tokenDetails.counterpart}
                    </p>
                    {tokenDetails.counterpartUpdatedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Modifié le {new Date(tokenDetails.counterpartUpdatedAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SOLDE ET FRAIS */}
          <BalanceCard
            leftContent={{
              label: ticker,
              value: formatAmount(myBalance, decimals),
              subtitle: name
            }}
            rightContent={{
              label: 'eCash (XEC)',
              value: xecBalance.toFixed(2),
              subtitle: 'Frais réseau',
              conversion: price && typeof price.convert === 'function' ? price.convert(xecBalance, currency) : null
            }}
            onRightClick={() => navigate('/settings')}
          />

          {/* ACTIONS UTILISATEUR */}
          <Tabs
            tabs={[
              { id: 'send', label: '📤 Envoyer ' + ticker },
              { id: 'airdrop', label: '🎁 Distribuer XEC' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Contenu Onglet ENVOYER */}
          {activeTab === 'send' && (
            <Card>
              <CardContent className="p-6">
              <form onSubmit={handleSendToken} className="space-y-4">
                <Input
                  label="Destinataire"
                  value={sendAddress}
                  onChange={(e) => setSendAddress(e.target.value)}
                  placeholder="ecash:qp..."
                  disabled={processing}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowQrScanner(true)}
                      disabled={processing}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </button>
                  }
                />

                <Input
                  label="Montant"
                  type="number"
                  step="0.01"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={processing}
                  actionButton={{
                    label: 'MAX',
                    onClick: () => setSendAmount(formatAmount(myBalance, decimals))
                  }}
                  helperText={`Solde: ${formatAmount(myBalance, decimals)} ${ticker}`}
                />

                <Card>
                  <CardContent className="p-4 bg-muted/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
                    💡 Frais de réseau estimés : ~5 XEC
                  </p>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={processing || !sendAddress || !sendAmount}
                >
                  {processing ? '⏳ Envoi en cours...' : '✔️ Confirmer l\'envoi'}
                </Button>
              </form>
              </CardContent>
            </Card>
          )}

          {/* Contenu Onglet AIRDROP */}
          {activeTab === 'airdrop' && (
            <Card>
              <CardContent className="p-6">
              <form className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Distribuez des XEC automatiquement à tous les détenteurs de {ticker}
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mode de distribution
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className={`text-sm ${airdropMode === 'equal' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                      Égalitaire
                    </span>
                    <button
                      type="button"
                      onClick={() => setAirdropMode(airdropMode === 'equal' ? 'prorata' : 'equal')}
                      className={`relative w-11 h-6 rounded-full transition-colors ${airdropMode === 'prorata' ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${airdropMode === 'prorata' ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                    <span className={`text-sm ${airdropMode === 'prorata' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                      Pro-Rata
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {airdropMode === 'equal' ? 'Montant identique pour tous' : 'Proportionnel au solde'}
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ignoreCreator}
                    onChange={(e) => setIgnoreCreator(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Ignorer le créateur
                  </span>
                </label>

                <Input
                  label="Montant total XEC à distribuer"
                  type="number"
                  step="0.01"
                  value={airdropTotal}
                  onChange={(e) => setAirdropTotal(e.target.value)}
                  placeholder="1000.00"
                  actionButton={{
                    label: 'MAX',
                    onClick: handleSetMaxAirdrop
                  }}
                  helperText={`Disponible: ${xecBalance.toFixed(2)} XEC`}
                />

                <Input
                  label="Solde minimum éligible (optionnel)"
                  type="number"
                  step="0.01"
                  value={minEligible}
                  onChange={(e) => setMinEligible(e.target.value)}
                  placeholder="0.00"
                  helperText="Seuls les détenteurs avec au moins ce montant recevront des XEC"
                />

                <Card>
                  <CardContent className="p-4 bg-muted/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
                    💡 Scan des détenteurs et distribution automatique en 1 clic
                  </p>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleCalculateAirdrop}
                    disabled={loadingHolders || !airdropTotal}
                  >
                    {loadingHolders ? '⏳ Calcul en cours...' : '🔍 Calculer les détenteurs'}
                  </Button>
                  
                  {holdersCount !== null && (
                    <>
                      <p className="text-sm text-center font-semibold">
                        ✅ {holdersCount} détenteur{holdersCount > 1 ? 's' : ''} éligible{holdersCount > 1 ? 's' : ''}
                      </p>
                      
                      {calculatedHolders.length > 0 && (
                        <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-800">
                          <p className="text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">
                            📋 Détails de la distribution ({airdropMode === 'prorata' ? 'Proportionnelle' : 'Égalitaire'}) :
                          </p>
                          <div className="space-y-1">
                            {calculatedHolders.map((holder, idx) => (
                              <div key={idx} className="text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                <div className="text-blue-600 dark:text-blue-400 truncate mb-1">
                                  {holder.address}
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {holder.balanceFormatted.toLocaleString()} tokens
                                  </span>
                                  <span className="text-green-600 dark:text-green-400 font-bold">
                                    → {holder.xecAmount} XEC
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleExecuteAirdrop}
                        disabled={airdropProcessing || holdersCount === 0 || !isCalculationValid}
                      >
                        {airdropProcessing ? '⏳ Distribution en cours...' : '🎁 Distribuer maintenant'}
                      </Button>
                      
                      {!isCalculationValid && holdersCount > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                          ⚠️ Paramètres modifiés - Recalculer avant de distribuer
                        </p>
                      )}
                    </>
                  )}
                </div>
              </form>
              </CardContent>
            </Card>
          )}

          {/* ACTIONS DE GESTION (Si Créateur) */}
          {isCreator && (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setManagementPanelOpen(!managementPanelOpen)}
              >
                ⚙️ Actions de Gestion {managementPanelOpen ? '▼' : '▶'}
              </Button>

              {managementPanelOpen && (
                <>
                  <Tabs
                    tabs={[
                      { id: 'mint', label: '🏭 Émettre' },
                      { id: 'burn', label: '🔥 Détruire' }
                    ]}
                    activeTab={managementTab}
                    onChange={setManagementTab}
                  />

                  {/* Contenu MINT */}
                  {managementTab === 'mint' && (
                    <Card>
                      <CardContent className="p-6">
                      <form onSubmit={handleMint} className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Créez de nouveaux jetons {ticker} si votre supply est variable
                        </p>
                        
                        <Input
                          label="Quantité à émettre"
                          type="number"
                          step="1"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                          placeholder="1000"
                          disabled={!isCreator || processing}
                        />

                        <Card>
                          <CardContent className="p-4 bg-muted/50">
                          <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
                            💡 Frais de réseau estimés : ~5 XEC
                          </p>
                          </CardContent>
                        </Card>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={!isCreator || processing || !mintAmount}
                        >
                          {!isCreator ? '🔒 Offre Fixe' : processing ? '⏳ Émission...' : "✔️ Confirmer l'émission"}
                        </Button>
                      </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Contenu BURN */}
                  {managementTab === 'burn' && (
                    <Card>
                      <CardContent className="p-6">
                      <form onSubmit={handleBurn} className="space-y-4">
                        <Card className="border-yellow-200 dark:border-yellow-800">
                          <CardContent className="p-4 bg-yellow-50 dark:bg-yellow-950/30">
                          <p className="text-sm font-medium m-0">
                            ⚠️ Action irréversible : les jetons détruits ne peuvent pas être récupérés
                          </p>
                          </CardContent>
                        </Card>
                        
                        <Input
                          label="Quantité à détruire"
                          type="number"
                          step="0.01"
                          value={burnAmount}
                          onChange={(e) => setBurnAmount(e.target.value)}
                          placeholder="100"
                          disabled={processing}
                          actionButton={{
                            label: 'MAX',
                            onClick: handleSetMaxBurn
                          }}
                          helperText={`Solde: ${formatAmount(myBalance, decimals)} ${ticker}`}
                          className="border-red-500 dark:border-red-400"
                        />

                        <Card className="border-red-200 dark:border-red-800">
                          <CardContent className="p-4 bg-red-50 dark:bg-red-950/30">
                          <p className="text-sm text-red-600 dark:text-red-400 m-0">
                            💡 Frais de réseau estimés : ~5 XEC
                          </p>
                          </CardContent>
                        </Card>

                        <Button
                          type="submit"
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                          disabled={processing || !burnAmount}
                        >
                          {processing ? '⏳ Destruction...' : '🔥 Détruire Définitivement'}
                        </Button>
                      </form>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* STATISTIQUES */}
          <Card>
            <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Statistiques
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 bg-muted/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  En Circulation
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(genesisInfo.circulatingSupply || '0', decimals)}
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 bg-muted/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  Genèse
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(genesisInfo.genesisSupply || '0', decimals)}
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 bg-muted/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  Mon Solde
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(myBalance, decimals)}
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 bg-muted/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  Date Création
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatDate(tokenInfo.timeFirstSeen)}
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 bg-muted/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  Décimales
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {decimals}
                </div>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardContent className="p-4 bg-muted/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  Détenteurs
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {loadingHolders ? '⏳...' : holdersCount !== null ? holdersCount : 'N/A'}
                </div>
                </CardContent>
              </Card>
            </div>
            </CardContent>
          </Card>

          {/* TECHNIQUE (Token ID) */}
          <Card>
            <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Informations Techniques
            </h3>
            
            <Card>
              <CardContent className="p-4 bg-muted/50">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                Token ID
              </div>
              <div className="font-mono text-xs break-all text-gray-900 dark:text-white mb-3 leading-relaxed">
                {tokenId}
              </div>
              <Button
                className="w-full"
                onClick={handleCopyTokenId}
              >
                📋 Copier Token ID
              </Button>
              </CardContent>
            </Card>
            </CardContent>
          </Card>

          {/* Actions Listing */}
          {!isListed && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                📋 Référencer ce jeton
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Votre jeton n'est pas encore listé dans l'annuaire public. Demandez son référencement pour le rendre visible à tous.
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate(`/request-listing/${tokenId}`)}
              >
                📝 Demander le listing
              </Button>
              </CardContent>
            </Card>
          )}

          {/* Bouton Retour */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/manage-token')}
          >
            ← Retour à la liste
          </Button>

          {/* Footer */}
          <BlockchainStatus />

        </Stack>
      </PageLayout>

      {/* QR Scanner Modal */}
      <Modal isOpen={showQrScanner} onClose={() => setShowQrScanner(false)}>
        <Modal.Header>Scanner un QR Code</Modal.Header>
        <Modal.Body>
          <QrCodeScanner onScan={handleQrScan} />
        </Modal.Body>
      </Modal>
    </MobileLayout>
  );
};

export default TokenDetailsPage;
