import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/BlockchainStatus';
import QrCodeScanner from '../components/QrCodeScanner';
import { Card, CardContent, Button, PageLayout, Badge, Tabs, BalanceCard, Stack, Input, Modal, Switch } from '../components/UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useFarms } from '../hooks/useFarms';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { syncTokenData, getCachedTokenData, cacheTokenData } from '../utils/tokenSync';
import FarmService from '../services/farmService';
import '../styles/token-details.css';

const TokenDetailsPage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const { farms, refreshFarms, loading: loadingFarms } = useFarms();
  const setNotification = useSetAtom(notificationAtom);

  // États de chargement et données
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [farmInfo, setFarmInfo] = useState(null);
  const [myBalance, setMyBalance] = useState('0');
  const [isCreator, setIsCreator] = useState(false);
  
  // États des onglets
  const [activeTab, setActiveTab] = useState('send'); // 'send', 'airdrop', 'mint' ou 'burn'
  
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
  
  // État visibilité du jeton dans l'annuaire
  const [isTokenVisible, setIsTokenVisible] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  
  // États pour l'édition des objectifs/contreparties
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [editingCounterpart, setEditingCounterpart] = useState(false);
  const [editPurpose, setEditPurpose] = useState('');
  const [editCounterpart, setEditCounterpart] = useState('');
  const [savingPurpose, setSavingPurpose] = useState(false);
  const [savingCounterpart, setSavingCounterpart] = useState(false);
  
  // États pour l'édition de l'image
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Hooks pour le prix et la devise
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);

  // Flag pour éviter les reloads après le premier chargement
  const hasLoadedOnce = useRef(false);

  // Charger les données complètes du jeton
  useEffect(() => {
    const loadTokenData = async () => {
      if (!wallet || !tokenId) {
        setLoading(false);
        return;
      }
      
      // ⏳ CRITIQUE: Attendre que les fermes soient chargées avant de chercher
      if (loadingFarms) {
        console.log('⏳ Attente du chargement des fermes...');
        return;
      }
      
      // Si déjà chargé avec succès, ignorer les mises à jour de farms
      if (hasLoadedOnce.current && farms.length > 0) {
        console.log('✅ Données déjà chargées, skip reload');
        return;
      }
      
      console.log(`🚀 Démarrage loadTokenData avec ${farms.length} fermes disponibles`);

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
        
        // 4. Récupérer l'adresse du wallet AVANT toute vérification
        const walletAddress = wallet.getAddress();
        console.log('💳 Adresse wallet:', walletAddress);
        
        // 5. DÉTECTION STRICTE DU CRÉATEUR
        const batons = await wallet.getMintBatons();
        const hasMintBaton = batons.some((b) => b.tokenId === tokenId);
        
        let isTokenCreator = false;
        let myFarm = null; // La ferme qui m'appartient ET contient ce token
        
        console.log(`🔍 RECHERCHE FERME pour token ${tokenId.substring(0, 8)}:`, {
          totalFarms: farms.length,
          walletAddress,
          farmsDetails: farms.map(f => ({
            name: f.name,
            owner: f.owner_address,
            ownerMatch: f.owner_address === walletAddress,
            mainToken: f.tokenId?.substring(0, 8),
            tokensArray: f.tokens?.map(t => t.tokenId?.substring(0, 8))
          }))
        });
        
        // Règle A (Variable): Possède le Mint Baton
        if (hasMintBaton) {
          isTokenCreator = true;
          console.log(`✅ Créateur VARIABLE détecté: Mint Baton possédé pour ${tokenId.substring(0, 8)}`);
          
          // Trouver MA ferme (pour affichage des infos)
          myFarm = farms.find(f => 
            f.owner_address === walletAddress &&
            (f.tokenId === tokenId || (Array.isArray(f.tokens) && f.tokens.some(t => t.tokenId === tokenId)))
          );
        } 
        // Règle B (Fixe/Importé): Propriétaire de la ferme qui contient le token
        else {
          // Chercher MA ferme qui contient ce token
          myFarm = farms.find(f => 
            f.owner_address === walletAddress &&
            (f.tokenId === tokenId || (Array.isArray(f.tokens) && f.tokens.some(t => t.tokenId === tokenId)))
          );
          
          if (myFarm) {
            isTokenCreator = true;
            console.log(`✅ Créateur FIXE/IMPORTÉ détecté: owner_address match pour ${tokenId.substring(0, 8)}`, {
              farm: myFarm.name,
              owner: myFarm.owner_address
            });
          } else {
            console.log(`❌ NON créateur:`, {
              tokenId: tokenId.substring(0, 8),
              walletAddress: walletAddress?.substring(0, 16),
              farmsCount: farms.length,
              myFarmFound: false
            });
          }
        }
        
        setIsCreator(isTokenCreator);

        // 6. Récupérer mon solde
        let balance = '0';
        try {
          const balanceData = await wallet.getTokenBalance(tokenId);
          balance = balanceData.balance || '0';
        } catch (e) {
          console.warn('⚠️ Balance non disponible:', e);
        }

        setTokenInfo(info);
        setFarmInfo(myFarm); // Utiliser myFarm (la ferme qui m'appartient)
        setMyBalance(balance);
        
        // 6b. Charger l'état de visibilité du token
        if (myFarm && Array.isArray(myFarm.tokens)) {
          const tokenEntry = myFarm.tokens.find(t => t.tokenId === tokenId);
          if (tokenEntry) {
            setIsTokenVisible(tokenEntry.isVisible !== false); // Par défaut visible si non défini
            console.log(`👁️ Visibilité du token: ${tokenEntry.isVisible !== false ? 'Visible' : 'Masqué'}`);
          }
        }

        // DEBUG: Vérifier pourquoi la section ne s'affiche pas
        console.log('🐛 DEBUG Section Visibilité:', {
          isCreator: isTokenCreator,
          farmInfo: myFarm ? `${myFarm.name} (${myFarm.owner_address?.substring(0, 8)})` : 'null',
          shouldShowSection: isTokenCreator && !!myFarm,
          hasMintBaton,
          walletAddress: wallet.getAddress()?.substring(0, 8)
        });

        // 7. Récupérer le solde XEC pour les frais
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);

        // 8. Charger le nombre de détenteurs
        fetchHolderCount();

        // Marquer comme chargé avec succès
        hasLoadedOnce.current = true;

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
  }, [tokenId, wallet, loadingFarms]); // NE PAS inclure farms pour éviter boucle infinie

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

  // Fonction de rafraîchissement silencieux (sans reload)
  const refreshTokenData = async () => {
    if (!wallet || !tokenId) return;
    
    try {
      console.log('🔄 Rafraîchissement des données...');
      
      // Recharger le solde
      const balanceData = await wallet.getTokenBalance(tokenId);
      setMyBalance(balanceData.balance || '0');
      
      // Recharger les infos token depuis blockchain
      const info = await wallet.chronik.token(tokenId);
      setTokenInfo(info);
      
      // Recharger les détenteurs
      fetchHolderCount();
      
      // Recharger les données de la ferme (pour récupérer les métadonnées mises à jour)
      const walletAddress = wallet.getAddress();
      const updatedFarm = await FarmService.getFarmByOwner(walletAddress);
      
      if (updatedFarm) {
        setFarmInfo(updatedFarm);
        
        // Mettre à jour l'état de visibilité si disponible
        const tokenEntry = updatedFarm.tokens?.find(t => t.tokenId === tokenId);
        if (tokenEntry) {
          setIsTokenVisible(tokenEntry.isVisible !== false);
        }
      }
      
      // Synchroniser avec les autres pages
      refreshFarms();
      
      console.log('✅ Données rafraîchies avec succès');
    } catch (err) {
      console.warn('⚠️ Erreur lors du rafraîchissement:', err);
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
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 2000);
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
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 2000);
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
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 2000);
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

  // Toggle visibilité du jeton dans l'annuaire
  const handleToggleVisibility = async () => {
    if (!farmInfo || !isCreator) {
      setNotification({ 
        type: 'error', 
        message: 'Vous devez être le créateur du jeton pour modifier sa visibilité' 
      });
      return;
    }

    setTogglingVisibility(true);
    try {
      const walletAddress = wallet.getAddress();
      
      // Utiliser updateTokenMetadata pour la cohérence
      await FarmService.updateTokenMetadata(walletAddress, tokenId, {
        isVisible: !isTokenVisible
      });
      
      // Recharger les données de la ferme pour synchroniser l'UI
      const updatedFarm = await FarmService.getFarmByOwner(walletAddress);
      setFarmInfo(updatedFarm);
      
      // Notifier les autres composants (ManageFarmPage) du changement
      refreshFarms();
      
      // Mettre à jour l'état local
      setIsTokenVisible(!isTokenVisible);
      
      setNotification({
        type: 'success',
        message: !isTokenVisible 
          ? '✅ Le jeton est maintenant visible dans l\'annuaire public'
          : '✅ Le jeton est maintenant masqué de l\'annuaire public'
      });
      
      console.log(`✅ Visibilité mise à jour: ${!isTokenVisible ? 'Visible' : 'Masqué'}`);
      
    } catch (err) {
      console.error('❌ Erreur toggle visibilité:', err);
      setNotification({ 
        type: 'error', 
        message: err.message || 'Impossible de modifier la visibilité du jeton' 
      });
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Sauvegarder l'objectif
  const handleSavePurpose = async () => {
    if (!farmInfo || !isCreator) {
      setNotification({ 
        type: 'error', 
        message: 'Vous devez être le créateur du jeton pour modifier ces informations' 
      });
      return;
    }

    setSavingPurpose(true);
    try {
      const walletAddress = wallet.getAddress();
      
      await FarmService.updateTokenMetadata(walletAddress, tokenId, {
        purpose: editPurpose.trim()
      });
      
      const updatedFarm = await FarmService.getFarmByOwner(walletAddress);
      setFarmInfo(updatedFarm);
      refreshFarms();
      
      setEditingPurpose(false);
      setNotification({
        type: 'success',
        message: '✅ Objectif mis à jour avec succès'
      });
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde objectif:', err);
      setNotification({ 
        type: 'error', 
        message: err.message || 'Impossible de sauvegarder l\'objectif' 
      });
    } finally {
      setSavingPurpose(false);
    }
  };

  // Sauvegarder la contrepartie
  const handleSaveCounterpart = async () => {
    if (!farmInfo || !isCreator) {
      setNotification({ 
        type: 'error', 
        message: 'Vous devez être le créateur du jeton pour modifier ces informations' 
      });
      return;
    }

    setSavingCounterpart(true);
    try {
      const walletAddress = wallet.getAddress();
      
      await FarmService.updateTokenMetadata(walletAddress, tokenId, {
        counterpart: editCounterpart.trim()
      });
      
      const updatedFarm = await FarmService.getFarmByOwner(walletAddress);
      setFarmInfo(updatedFarm);
      refreshFarms();
      
      setEditingCounterpart(false);
      setNotification({
        type: 'success',
        message: '✅ Contrepartie mise à jour avec succès'
      });
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde contrepartie:', err);
      setNotification({ 
        type: 'error', 
        message: err.message || 'Impossible de sauvegarder la contrepartie' 
      });
    } finally {
      setSavingCounterpart(false);
    }
  };

  // 🖼️ Gérer le changement d'image
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: '⚠️ Veuillez sélectionner une image valide' });
      return;
    }

    // Vérifier la taille (200 Ko max)
    const maxSize = 200 * 1024;
    const idealSize = 50 * 1024;
    if (file.size > maxSize) {
      setNotification({ type: 'error', message: '⚠️ Image trop volumineuse. Maximum 200 Ko.' });
      return;
    }
    if (file.size > idealSize) {
      setNotification({ type: 'warning', message: '⚠️ Image > 50 Ko. Idéalement < 50 Ko pour optimisation.' });
    }

    // Vérifier les dimensions (256x256 pixels)
    const img = new Image();
    img.onload = () => {
      if (img.width !== 256 || img.height !== 256) {
        setNotification({ type: 'error', message: '⚠️ L\'image doit faire exactement 256x256 pixels.' });
        URL.revokeObjectURL(img.src);
        return;
      }

      // Tout est OK - stocker l'image
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setNotification({ type: 'success', message: `✅ Image validée (${(file.size / 1024).toFixed(1)} Ko)` });
    };
    img.onerror = () => {
      setNotification({ type: 'error', message: '⚠️ Impossible de charger l\'image' });
    };
    img.src = URL.createObjectURL(file);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSaveImage = async () => {
    if (!imageFile || !farmInfo) {
      setNotification({ type: 'error', message: 'Aucune image sélectionnée' });
      return;
    }

    setUploadingImage(true);
    try {
      const { supabase } = await import('../services/supabaseClient');
      
      // Générer un nom unique pour l'image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `token_${tokenId}_${Date.now()}.${fileExt}`;
      
      // Upload dans le bucket 'token-images'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('token-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('token-images')
        .getPublicUrl(fileName);

      const tokenImageUrl = urlData.publicUrl;
      
      // Mettre à jour l'image dans la base de données
      const walletAddress = wallet.getAddress();
      await FarmService.updateTokenImage(walletAddress, tokenId, tokenImageUrl);
      
      // Rafraîchir les données
      const updatedFarm = await FarmService.getFarmByOwner(walletAddress);
      setFarmInfo(updatedFarm);
      refreshFarms();
      
      // Fermer le modal et nettoyer
      setShowImageModal(false);
      handleRemoveImage();
      
      setNotification({
        type: 'success',
        message: '✅ Image du jeton mise à jour avec succès'
      });
      
      // Rafraîchir l'affichage
      setTimeout(() => refreshTokenData(), 500);
      
    } catch (err) {
      console.error('❌ Erreur upload image:', err);
      setNotification({ 
        type: 'error', 
        message: err.message || 'Impossible de mettre à jour l\'image' 
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // 🔗 Associer un token créé (Mint Baton) à la ferme de l'utilisateur
  const handleAssociateToFarm = async () => {
    if (!wallet || !tokenInfo) {
      setNotification({
        type: 'error',
        message: '⚠️ Données insuffisantes pour l\'association'
      });
      return;
    }

    setProcessing(true);
    try {
      const walletAddress = wallet.getAddress();
      
      // Vérifier si l'utilisateur a déjà une ferme
      const existingFarm = await FarmService.getMyFarm(walletAddress);
      
      if (!existingFarm) {
        // Pas de ferme : rediriger vers la création avec le tokenId
        console.log('➡️ Redirection vers création de ferme avec token');
        setNotification({
          type: 'info',
          message: '📋 Créez d\'abord votre profil de ferme'
        });
        navigate(`/manage-farm/${tokenId}`);
        return;
      }
      
      // Ferme existante : ajouter le token
      const tokenData = {
        tokenId: tokenId,
        ticker: tokenInfo.genesisInfo.tokenTicker,
        name: tokenInfo.genesisInfo.tokenName,
        decimals: tokenInfo.genesisInfo.decimals || 0,
        image: tokenInfo.genesisInfo.url || '',
        purpose: '',
        counterpart: ''
      };
      
      await FarmService.addTokenToFarm(walletAddress, tokenData);
      
      // Recharger les données pour synchroniser
      const updatedFarm = await FarmService.getFarmByOwner(walletAddress);
      setFarmInfo(updatedFarm);
      refreshFarms();
      
      setNotification({
        type: 'success',
        message: `✅ Le jeton ${tokenData.ticker} est maintenant associé à votre ferme !`
      });
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 1000);
      
    } catch (err) {
      console.error('❌ Erreur association:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Impossible d\'associer le jeton à votre ferme'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingFarms) {
    return (
      <MobileLayout title="Chargement...">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Stack spacing="md">
            <Card>
              <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-gray-900 dark:text-white">Chargement des fermes...</p>
              </CardContent>
            </Card>
          </Stack>
        </PageLayout>
      </MobileLayout>
    );
  }

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
              {/* Image du jeton (cliquable si créateur) */}
              <div style={{ position: 'relative' }}>
                <img
                  src={tokenDetails?.image || genesisInfo.url || 'https://placehold.co/64x64?text=Token'}
                  alt={name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                  onError={(e) => { e.target.src = 'https://placehold.co/64x64?text=Token'; }}
                  style={{
                    cursor: isCreator && farmInfo ? 'pointer' : 'default'
                  }}
                  onClick={() => isCreator && farmInfo && setShowImageModal(true)}
                />
                {/* Overlay au survol (si créateur) */}
                {isCreator && farmInfo && (
                  <div
                    onClick={() => setShowImageModal(true)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    <span style={{ fontSize: '1.5rem' }}>📷</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {name}
                </h1>
                <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                  {ticker}
                </div>
                {/* Token ID avec raccourcis oneClick */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>
                  <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tokenId}
                  </span>
                  <button
                    onClick={handleCopyTokenId}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      backgroundColor: 'var(--primary-color)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title="Copier le Token ID"
                  >
                    📋
                  </button>
                  <a
                    href={`https://explorer.e.cash/tx/${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      backgroundColor: 'var(--primary-color)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      flexShrink: 0
                    }}
                    title="Voir sur Explorer"
                  >
                    🔍
                  </a>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="primary">{protocol}</Badge>
              {isCreator ? (
                <Badge variant="success">
                  {genesisInfo.authPubkey ? '🔄 Variable' : '🔒 Fixe'}
                </Badge>
              ) : (
                <Badge variant="warning">🔒 Fixe</Badge>
              )}
              {/* Badge: Actif dans l'annuaire (visible par tous) */}
              {isListed && (
                <Badge variant="success">
                  🏡 Actif dans l'annuaire
                </Badge>
              )}
              {/* Badge En Circulation/Inactif: basé sur circulatingSupply */}
              {BigInt(genesisInfo.circulatingSupply || '0') > 0n ? (
                <Badge variant="success">
                  🟢 En Circulation
                </Badge>
              ) : (
                <Badge variant="secondary">
                  ⚫ Inactif
                </Badge>
              )}
            </div>
            </CardContent>
          </Card>

          {/* 🔗 CTA: ASSOCIER LE JETON À LA FERME (si créateur mais pas de ferme liée) */}
          {isCreator && !farmInfo && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔗</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-2">
                      ⚠️ Jeton non lié à votre ferme
                    </h3>
                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                      Vous êtes le créateur de ce jeton (Mint Baton possédé), mais il n'est pas encore associé à votre profil de ferme. 
                      Associez-le pour gérer sa visibilité publique, ses objectifs et contreparties.
                    </p>
                    <Button
                      onClick={handleAssociateToFarm}
                      disabled={processing}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {processing ? '⏳ Association...' : '🔗 Associer à ma Ferme'}
                    </Button>
                  </div>
                </div>
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

          {/* GESTION VISIBILITÉ (Si Créateur) */}
          {isCreator && farmInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: 'var(--bg-primary, #fff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: '0 0 4px 0'
                }}>
                  👁️ Visible dans l'annuaire
                </h3>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #6b7280)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {isTokenVisible 
                    ? 'Les visiteurs peuvent voir ce jeton sur votre profil'
                    : 'Ce jeton est masqué de votre profil public'}
                </p>
              </div>
              <Switch
                checked={isTokenVisible}
                onChange={handleToggleVisibility}
                disabled={togglingVisibility}
              />
            </div>
          )}

          {isCreator && !farmInfo && (
            <Card style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              marginBottom: '16px'
            }}>
              <CardContent className="p-4">
                <p style={{
                  fontSize: '0.85rem',
                  color: '#92400e',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  ⚠️ Ce jeton n'est pas encore lié à une ferme. Associez-le pour contrôler sa visibilité publique.
                </p>
              </CardContent>
            </Card>
          )}

{/* ACTIONS UTILISATEUR */}
          <Tabs
            tabs={[
              { id: 'send', label: '📤 Envoyer' },
              { id: 'airdrop', label: '🎁 Distribuer' },
              ...(isCreator && genesisInfo.authPubkey ? [{ id: 'mint', label: '🏭 Émettre' }] : []),
              ...(isCreator ? [{ id: 'burn', label: '🔥 Détruire' }] : [])
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="rounded-b-none"
          />
          {/* Contenu Onglet ENVOYER */}
          {activeTab === 'send' && (
            <Card className="rounded-t-none border-t-0" style={{ marginTop: '0' }}>
              <CardContent className="p-6">
              <form onSubmit={handleSendToken} className="space-y-6">
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
                  helperText={`Solde disponible : ${formatAmount(myBalance, decimals)} ${ticker}`}
                />

                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>💡</span>
                  <span>Frais de réseau estimés : ~5 XEC</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
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
            <Card className="rounded-t-none border-t-0" style={{ marginTop: '0' }}>
              <CardContent className="p-6">
              <form className="space-y-6">
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-sm text-blue-900 dark:text-blue-100 m-0">
                    💡 <strong>Distribution de XEC uniquement</strong> : Envoyez des eCash (XEC) à tous les détenteurs de {ticker} pour couvrir leurs frais de transactions.
                  </p>
                  </CardContent>
                </Card>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Mode de distribution
                  </label>
                  <div className="flex items-center justify-center gap-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <span className={`text-sm font-medium ${airdropMode === 'equal' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Égalitaire
                    </span>
                    <Switch
                      checked={airdropMode === 'prorata'}
                      onChange={(checked) => setAirdropMode(checked ? 'prorata' : 'equal')}
                    />
                    <span className={`text-sm font-medium ${airdropMode === 'prorata' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Pro-Rata
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                    {airdropMode === 'equal' ? 'Montant identique pour tous' : 'Proportionnel au solde'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ignoreCreator"
                    checked={ignoreCreator}
                    onChange={(e) => setIgnoreCreator(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="ignoreCreator" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Ignorer le créateur
                  </label>
                </div>

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
                  helperText={`Disponible : ${xecBalance.toFixed(2)} XEC`}
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

                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>💡</span>
                  <span>Scan des détenteurs et distribution automatique en 1 clic</span>
                </div>

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

          {/* Contenu Onglet MINT */}
          {activeTab === 'mint' && isCreator && (
            <Card className="rounded-t-none border-t-0" style={{ marginTop: '0' }}>
              <CardContent className="p-6">
              <form onSubmit={handleMint} className="space-y-6">
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-sm text-blue-900 dark:text-blue-100 m-0">
                    💡 Créez de nouveaux jetons {ticker} (offre variable uniquement)
                  </p>
                  </CardContent>
                </Card>
                
                <Input
                  label="Quantité à émettre"
                  type="number"
                  step="1"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="1000"
                  disabled={!isCreator || processing}
                />

                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>💡</span>
                  <span>Frais de réseau estimés : ~5 XEC</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={!genesisInfo.authPubkey || processing || !mintAmount}
                >
                  {!genesisInfo.authPubkey ? '🔒 Offre Fixe (Mint impossible)' : processing ? '⏳ Émission...' : "✔️ Confirmer l'émission"}
                </Button>
              </form>
              </CardContent>
            </Card>
          )}

          {/* Contenu Onglet BURN */}
          {activeTab === 'burn' && isCreator && (
            <Card className="rounded-t-none border-t-0" style={{ marginTop: '0' }}>
              <CardContent className="p-6">
              <form onSubmit={handleBurn} className="space-y-6">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-900 dark:text-yellow-200 font-medium m-0">
                    ⚠️ Action irréversible : les jetons détruits ne peuvent pas être récupérés
                  </p>
                </div>
                
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
                  helperText={`Solde disponible : ${formatAmount(myBalance, decimals)} ${ticker}`}
                />

                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>💡</span>
                  <span>Frais de réseau estimés : ~5 XEC</span>
                </div>

                <Button
                  type="submit"
                  variant="danger"
                  className="w-full mt-6"
                  disabled={processing || !burnAmount}
                >
                  {processing ? '⏳ Destruction...' : '🔥 Détruire Définitivement'}
                </Button>
              </form>
              </CardContent>
            </Card>
          )}

          {/* OBJECTIF ET CONTREPARTIE DU JETON - Toujours visible */}
          {isCreator && !editingPurpose && !editingCounterpart && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              border: '2px solid #10b981',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#10b981',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✏️ Informations modifiables
              </h3>
              <p style={{
                fontSize: '0.85rem',
                color: '#047857',
                margin: 0,
                lineHeight: '1.5'
              }}>
                En tant que créateur, vous pouvez mettre à jour l'objectif et la contrepartie de ce jeton
              </p>
            </div>
          )}

          {/* OBJECTIF DU JETON */}
          <Card>
            <CardContent className="p-6">
              {/* En-tête avec titre et icône crayon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: editingPurpose ? '16px' : '12px'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🎯 Objectif du Jeton
                </h3>
                {isCreator && farmInfo && !editingPurpose && (
                  <button
                    onClick={() => {
                      setEditPurpose(tokenDetails?.purpose || '');
                      setEditingPurpose(true);
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.9rem',
                      backgroundColor: 'transparent',
                      color: 'var(--primary-color, #007bff)',
                      border: '1px solid var(--primary-color, #007bff)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-color, #007bff)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--primary-color, #007bff)';
                    }}
                  >
                    ✏️
                  </button>
                )}
              </div>
              
              {editingPurpose ? (
                <>
                  {/* Choix suggérés pour l'objectif */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    {[
                      'Jeton de fidélité',
                      'Récompense client',
                      'Monnaie locale',
                      'Cashback',
                      'Points de fidélité',
                      'Accès exclusif',
                      'Carte cadeau'
                    ].map((suggestion) => {
                      const currentTags = editPurpose.split(',').map(t => t.trim()).filter(Boolean);
                      const isSelected = currentTags.includes(suggestion);
                      
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              const newTags = currentTags.filter(t => t !== suggestion);
                              setEditPurpose(newTags.join(', '));
                            } else {
                              const newValue = editPurpose.trim() 
                                ? `${editPurpose.trim()}, ${suggestion}`
                                : suggestion;
                              setEditPurpose(newValue);
                            }
                          }}
                          disabled={savingPurpose}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            backgroundColor: isSelected ? 'var(--primary-color, #007bff)' : 'var(--bg-secondary, #f5f5f5)',
                            color: isSelected ? '#fff' : 'var(--text-primary, #333)',
                            border: '1px solid var(--border-color, #ddd)',
                            borderRadius: '16px',
                            cursor: savingPurpose ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: savingPurpose ? 0.6 : 1
                          }}
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    placeholder="Ex: Jeton de fidélité pour achats directs à la ferme, points de récompense, prévente de récoltes..."
                    disabled={savingPurpose}
                    rows={3}
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #ddd)',
                      backgroundColor: 'var(--bg-primary, #fff)',
                      color: 'var(--text-primary, #000)',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: '6px'
                    }}
                  />
                  <small style={{
                    display: 'block',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary, #666)',
                    lineHeight: '1.4'
                  }}>
                    💡 Décrivez brièvement l'utilité de ce jeton ({editPurpose.length}/500 caractères)
                  </small>
                  
                  {/* Boutons en bas du formulaire */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={() => setEditingPurpose(false)}
                      disabled={savingPurpose}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color, #ddd)',
                        borderRadius: '6px',
                        cursor: savingPurpose ? 'not-allowed' : 'pointer',
                        opacity: savingPurpose ? 0.6 : 1
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSavePurpose}
                      disabled={savingPurpose}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--primary-color, #007bff)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingPurpose ? 'not-allowed' : 'pointer',
                        opacity: savingPurpose ? 0.6 : 1
                      }}
                    >
                      {savingPurpose ? '⏳ Sauvegarde...' : '✅ Sauvegarder'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                    borderRadius: '8px',
                    margin: 0,
                    lineHeight: '1.6',
                    color: 'var(--text-primary)'
                  }}>
                    {tokenDetails?.purpose || (isCreator ? 'Aucun objectif défini. Cliquez sur l\'icône crayon pour en ajouter un.' : 'Aucun objectif défini.')}
                  </p>
                  {tokenDetails?.purposeUpdatedAt && (
                    <small style={{
                      display: 'block',
                      marginTop: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary, #666)'
                    }}>
                      Modifié le {new Date(tokenDetails.purposeUpdatedAt).toLocaleDateString('fr-FR')}
                    </small>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* CONTREPARTIE DU JETON */}
          <Card>
            <CardContent className="p-6">
              {/* En-tête avec titre et icône crayon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: editingCounterpart ? '16px' : '12px'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🤝 Contrepartie du Jeton
                </h3>
                {isCreator && farmInfo && !editingCounterpart && (
                  <button
                    onClick={() => {
                      setEditCounterpart(tokenDetails?.counterpart || '');
                      setEditingCounterpart(true);
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.9rem',
                      backgroundColor: 'transparent',
                      color: 'var(--primary-color, #007bff)',
                      border: '1px solid var(--primary-color, #007bff)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-color, #007bff)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--primary-color, #007bff)';
                    }}
                  >
                    ✏️
                  </button>
                )}
              </div>
              
              {editingCounterpart ? (
                <>
                  {/* Choix suggérés pour la contrepartie */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    {[
                      '1 jeton = 1€ de réduction',
                      'Réduction de 10%',
                      'Accès prioritaire',
                      'Produit gratuit',
                      'Livraison offerte',
                      'Droit de vote',
                      'Événements exclusifs'
                    ].map((suggestion) => {
                      const currentTags = editCounterpart.split(',').map(t => t.trim()).filter(Boolean);
                      const isSelected = currentTags.includes(suggestion);
                      
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              const newTags = currentTags.filter(t => t !== suggestion);
                              setEditCounterpart(newTags.join(', '));
                            } else {
                              const newValue = editCounterpart.trim() 
                                ? `${editCounterpart.trim()}, ${suggestion}`
                                : suggestion;
                              setEditCounterpart(newValue);
                            }
                          }}
                          disabled={savingCounterpart}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            backgroundColor: isSelected ? 'var(--primary-color, #007bff)' : 'var(--bg-secondary, #f5f5f5)',
                            color: isSelected ? '#fff' : 'var(--text-primary, #333)',
                            border: '1px solid var(--border-color, #ddd)',
                            borderRadius: '16px',
                            cursor: savingCounterpart ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: savingCounterpart ? 0.6 : 1
                          }}
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={editCounterpart}
                    onChange={(e) => setEditCounterpart(e.target.value)}
                    placeholder="Ex: Réduction de 10% sur les achats, Accès prioritaire aux nouveaux produits, Droit de vote sur les décisions de la ferme..."
                    disabled={savingCounterpart}
                    rows={3}
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #ddd)',
                      backgroundColor: 'var(--bg-primary, #fff)',
                      color: 'var(--text-primary, #000)',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: '6px'
                    }}
                  />
                  <small style={{
                    display: 'block',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary, #666)',
                    lineHeight: '1.4'
                  }}>
                    💡 Quelle contrepartie offrez-vous aux détenteurs ? ({editCounterpart.length}/500 caractères)
                  </small>
                  
                  {/* Boutons en bas du formulaire */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={() => setEditingCounterpart(false)}
                      disabled={savingCounterpart}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color, #ddd)',
                        borderRadius: '6px',
                        cursor: savingCounterpart ? 'not-allowed' : 'pointer',
                        opacity: savingCounterpart ? 0.6 : 1
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveCounterpart}
                      disabled={savingCounterpart}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--primary-color, #007bff)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingCounterpart ? 'not-allowed' : 'pointer',
                        opacity: savingCounterpart ? 0.6 : 1
                      }}
                    >
                      {savingCounterpart ? '⏳ Sauvegarde...' : '✅ Sauvegarder'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                    borderRadius: '8px',
                    margin: 0,
                    lineHeight: '1.6',
                    color: 'var(--text-primary)'
                  }}>
                    {tokenDetails?.counterpart || (isCreator ? 'Aucune contrepartie définie. Cliquez sur l\'icône crayon pour en ajouter une.' : 'Aucune contrepartie définie.')}
                  </p>
                  {tokenDetails?.counterpartUpdatedAt && (
                    <small style={{
                      display: 'block',
                      marginTop: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary, #666)'
                    }}>
                      Modifié le {new Date(tokenDetails.counterpartUpdatedAt).toLocaleDateString('fr-FR')}
                    </small>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* STATISTIQUES */}
          <Card>
            <CardContent className="p-6">
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Statistiques
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              {/* En Circulation */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #6b7280)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  En Circulation
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {formatAmount(genesisInfo.circulatingSupply || '0', decimals)}
                </div>
              </div>

              {/* Genèse */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #6b7280)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Genèse
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {formatAmount(genesisInfo.genesisSupply || '0', decimals)}
                </div>
              </div>

              {/* Mon Solde */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #6b7280)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Mon Solde
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {formatAmount(myBalance, decimals)}
                </div>
              </div>

              {/* Date Création */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #6b7280)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Date Création
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {formatDate(tokenInfo.timeFirstSeen)}
                </div>
              </div>

              {/* Décimales */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #6b7280)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Décimales
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {decimals}
                </div>
              </div>

              {/* Détenteurs */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #6b7280)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Détenteurs
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {loadingHolders ? '⏳...' : holdersCount !== null ? holdersCount : 'N/A'}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

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

      {/* Modal de modification d'image */}
      <Modal isOpen={showImageModal} onClose={() => {
        setShowImageModal(false);
        handleRemoveImage();
      }}>
        <Modal.Header>📷 Modifier l'image du jeton</Modal.Header>
        <Modal.Body>
          <div style={{ padding: '16px' }}>
            {/* Aperçu de l'image actuelle */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}>
                Image actuelle :
              </p>
              <img
                src={tokenDetails?.image || genesisInfo.url || 'https://placehold.co/64x64?text=Token'}
                alt="Actuelle"
                style={{
                  width: '128px',
                  height: '128px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '2px solid var(--border-color)',
                  margin: '0 auto'
                }}
                onError={(e) => { e.target.src = 'https://placehold.co/64x64?text=Token'; }}
              />
            </div>

            {/* Preview de la nouvelle image */}
            {imagePreview && (
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px'
                }}>
                  Nouvelle image :
                </p>
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '2px solid var(--primary-color)',
                    margin: '0 auto'
                  }}
                />
                <button
                  onClick={handleRemoveImage}
                  style={{
                    marginTop: '12px',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Supprimer
                </button>
              </div>
            )}

            {/* Sélecteur de fichier */}
            <div style={{
              padding: '20px',
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="token-image-upload"
              />
              <label
                htmlFor="token-image-upload"
                style={{
                  padding: '10px 20px',
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-block',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
              >
                📁 Choisir une image
              </label>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginTop: '12px',
                lineHeight: '1.4'
              }}>
                Format : 256x256 pixels • Max : 200 Ko<br />
                Types acceptés : JPG, PNG, WebP
              </p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline"
            onClick={() => {
              setShowImageModal(false);
              handleRemoveImage();
            }}
            disabled={uploadingImage}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveImage}
            disabled={!imageFile || uploadingImage}
          >
            {uploadingImage ? '⏳ Upload...' : '✅ Sauvegarder'}
          </Button>
        </Modal.Footer>
      </Modal>
    </MobileLayout>
  );
};

export default TokenDetailsPage;
