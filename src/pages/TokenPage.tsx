import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/eCash/BlockchainStatus';
import HistoryList from '../features/token-management/components/HistoryList';
import NetworkFeesAvail from '../components/eCash/NetworkFeesAvail';
import NotificationBell from '../components/NotificationBell';
import { Card, CardContent, Button, PageLayout, Badge, Tabs, BalanceCard, Stack, Input, Modal, Switch, VisibilityToggle } from '../components/UI';
import Faq from '../components/Faq';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useProfiles } from '../hooks/useProfiles';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { syncTokenData, getCachedTokenData, cacheTokenData } from '../utils/tokenSync';
import { profilService } from '../services/profilService';
import { addEntry, getHistoryByToken, ACTION_TYPES } from '../services/historyService';
import { supabase } from '../services/supabaseClient';

// Import des composants d'actions depuis token-management feature
import { 
  Send, 
  Airdrop, 
  Mint, 
  Burn, 
  Message,
  // Available but not yet integrated: useTokenMetadata, useTokenImage, useTokenPageData
} from '../features/token-management';
import ClientTicketForm from '../features/support/components/ClientTicketForm';

// Import des composants TokenPage
import { 
  Statistics, 
  TokenIDCompact, 
  TokenBadge, 
  ObjectivesCounterparts, 
  TokenVisible, 
  TokenLinked 
} from '../components/TokenPage';

const TokenPage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet } = useEcashWallet();
  const { profiles, refreshProfiles, loading: loadingProfiles } = useProfiles();
  const setNotification = useSetAtom(notificationAtom);

  // États de chargement et données
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
  const [myBalance, setMyBalance] = useState('0');
  const [isCreator, setIsCreator] = useState(false);
  
  // États des onglets - Récupère l'onglet depuis la navigation
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'send'); // 'send', 'airdrop', 'mint' ou 'burn'
  
  // États des formulaires
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
  
  // États historique
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
  
  // États pour contacter le créateur
  const [showContactForm, setShowContactForm] = useState(false);
  
  // État pour la FAQ créateur
  const [showCreatorFaq, setShowCreatorFaq] = useState(false);
  
  
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
      
      // ⏳ CRITIQUE: Attendre que les profils soient chargés avant de chercher
      if (loadingProfiles) {
        console.log('⏳ Attente du chargement des profils...');
        return;
      }
      
      // Si déjà chargé avec succès, ignorer les mises à jour de profiles
      if (hasLoadedOnce.current && profiles.length > 0) {
        console.log('✅ Données déjà chargées, skip reload');
        return;
      }
      
      console.log(`🚀 Démarrage loadTokenData avec ${profiles.length} profils disponibles`);

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
        let myProfile = null; // Le profil qui m'appartient ET contient ce token
        
        console.log(`🔍 RECHERCHE PROFIL pour token ${tokenId.substring(0, 8)}:`, {
          totalProfiles: profiles.length,
          walletAddress,
          profilesDetails: profiles.map(p => ({
            name: p.name,
            owner: p.owner_address,
            ownerMatch: p.owner_address === walletAddress,
            mainToken: p.tokenId?.substring(0, 8),
            tokensArray: p.tokens?.map(t => t.tokenId?.substring(0, 8))
          }))
        });
        
        // Règle A (Variable): Possède le Mint Baton
        if (hasMintBaton) {
          isTokenCreator = true;
          console.log(`✅ Créateur VARIABLE détecté: Mint Baton possédé pour ${tokenId.substring(0, 8)}`);
          
          // Trouver MON profile (pour affichage des infos)
          myProfile = profiles.find(p => 
            p.owner_address === walletAddress &&
            (p.tokenId === tokenId || (Array.isArray(p.tokens) && p.tokens.some(t => t.tokenId === tokenId)))
          );
        } 
        // Règle B (Fixe/Importé): Propriétaire de mon profil qui contient le token
        else {
          // Chercher MON profile qui contient ce token
          myProfile = profiles.find(p => 
            p.owner_address === walletAddress &&
            (p.tokenId === tokenId || (Array.isArray(p.tokens) && p.tokens.some(t => t.tokenId === tokenId)))
          );
          
          if (myProfile) {
            isTokenCreator = true;
            console.log(`✅ Créateur FIXE/IMPORTÉ détecté: owner_address match pour ${tokenId.substring(0, 8)}`, {
              profile: myProfile.name,
              owner: myProfile.owner_address
            });
          } else {
            console.log(`❌ NON créateur:`, {
              tokenId: tokenId.substring(0, 8),
              walletAddress: walletAddress?.substring(0, 16),
              profilesCount: profiles.length,
              myProfileFound: false
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
        setProfileInfo(myProfile); // Utiliser myProfile (le profil qui m'appartient)
        setMyBalance(balance);
        
        // 6b. Charger l'état de visibilité du token
        if (myProfile && Array.isArray(myProfile.tokens)) {
          const tokenEntry = myProfile.tokens.find(t => t.tokenId === tokenId);
          if (tokenEntry) {
            setIsTokenVisible(tokenEntry.isVisible !== false); // Par défaut visible si non défini
            console.log(`👁️ Visibilité du token: ${tokenEntry.isVisible !== false ? 'Visible' : 'Masqué'}`);
          }
        }

        // DEBUG: Vérifier pourquoi la section ne s'affiche pas
        console.log('🐛 DEBUG Section Visibilité:', {
          isCreator: isTokenCreator,
          profileInfo: myProfile ? `${myProfile.name} (${myProfile.owner_address?.substring(0, 8)})` : 'null',
          shouldShowSection: isTokenCreator && !!myProfile,
          hasMintBaton,
          walletAddress: wallet.getAddress()?.substring(0, 8)
        });

        // 7. Récupérer le solde XEC pour les frais
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);

        // 8. Charger le nombre de détenteurs
        fetchHolderCount();
        
        // 9. Charger l'historique
        loadHistory();

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
  }, [tokenId, wallet, loadingProfiles]); // NE PAS inclure profiles pour éviter boucle infinie

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
      
      // Charger l'historique après le chargement initial
      loadHistory();
      
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
      
      // Recharger les données du profil (pour récupérer les métadonnées mises à jour)
      const walletAddress = wallet.getAddress();
      const updatedProfile = await profilService.getProfileByOwner(walletAddress);
      
      if (updatedProfile) {
        setProfileInfo(updatedProfile);
        
        // Mettre à jour l'état de visibilité si disponible
        const tokenEntry = updatedProfile.tokens?.find(t => t.tokenId === tokenId);
        if (tokenEntry) {
          setIsTokenVisible(tokenEntry.isVisible !== false);
        }
      }
      
      // Recharger l'historique
      loadHistory();
      
      // Synchroniser avec les autres pages
      refreshProfiles();
      
      console.log('✅ Données rafraîchies avec succès');
    } catch (err) {
      console.warn('⚠️ Erreur lors du rafraîchissement:', err);
    }
  };

  // Charger l'historique du token
  const loadHistory = async () => {
    if (!tokenId) return;
    
    setLoadingHistory(true);
    try {
      const historyData = await getHistoryByToken(tokenId);
      setHistory(historyData);
    } catch (err) {
      console.error('❌ Erreur chargement historique:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Copier le Token ID
  const handleCopyTokenId = () => {
    navigator.clipboard.writeText(tokenId).then(
      () => setNotification({ type: 'success', message: '✅ Token ID copié !' }),
      () => setNotification({ type: 'error', message: '❌ Échec de la copie' })
    );
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
    if (!profileInfo || !isCreator) {
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
      await profilService.updateTokenMetadata(walletAddress, tokenId, {
        isVisible: !isTokenVisible
      });
      
      // Recharger les données du profil pour synchroniser l'UI
      const updatedProfile = await profilService.getProfileByOwner(walletAddress);
      setProfileInfo(updatedProfile);
      
      // Notifier les autres composants (ManageProfilePage) du changement
      refreshProfiles();
      
      // Mettre à jour l'état local
      setIsTokenVisible(!isTokenVisible);
      
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
    if (!profileInfo || !isCreator) {
      setNotification({ 
        type: 'error', 
        message: 'Vous devez être le créateur du jeton pour modifier ces informations' 
      });
      return;
    }

    setSavingPurpose(true);
    try {
      const walletAddress = wallet.getAddress();
      
      await profilService.updateTokenMetadata(walletAddress, tokenId, {
        purpose: editPurpose.trim()
      });
      
      const updatedProfile = await profilService.getProfileByOwner(walletAddress);
      setProfileInfo(updatedProfile);
      refreshProfiles();
      
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
    if (!profileInfo || !isCreator) {
      setNotification({ 
        type: 'error', 
        message: 'Vous devez être le créateur du jeton pour modifier ces informations' 
      });
      return;
    }

    setSavingCounterpart(true);
    try {
      const walletAddress = wallet.getAddress();
      
      await profilService.updateTokenMetadata(walletAddress, tokenId, {
        counterpart: editCounterpart.trim()
      });
      
      const updatedProfile = await profilService.getProfileByOwner(walletAddress);
      setProfileInfo(updatedProfile);
      refreshProfiles();
      
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
    if (!imageFile || !profileInfo) {
      setNotification({ type: 'error', message: 'Aucune image sélectionnée' });
      return;
    }

    setUploadingImage(true);
    try {
      // 👇 MODIFICATION : Utilisation directe de supabase (import statique)
      // const { supabase } = await import('../services/supabaseClient'); ❌ SUPPRIMÉ
      
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
      await profilService.updateTokenImage(walletAddress, tokenId, tokenImageUrl);
      
      // Rafraîchir les données
      const updatedProfile = await profilService.getProfileByOwner(walletAddress);
      setProfileInfo(updatedProfile);
      refreshProfiles();
      
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

  // Extraction des données principales
  const genesisInfo = tokenInfo?.genesisInfo || {};
  const name = profileInfo?.name || genesisInfo.tokenName || 'Jeton Non Référencé';
  const ticker = genesisInfo.tokenTicker || 'UNK';
  const decimals = genesisInfo.decimals || 0;
  const protocol = profileInfo?.protocol || tokenInfo?.protocol || 'ALP';
  const isListed = !!profileInfo;
  const genesisSupply = BigInt(genesisInfo.mintAmount || '0');
  const isActive = genesisSupply > 0n;
  
  
  // Trouver le token spécifique dans profileInfo.tokens pour récupérer purpose/counterpart
  const tokenDetails = profileInfo?.tokens?.find(t => t.tokenId === tokenId) || null;

  return (
    <MobileLayout title={name}>
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
          
          {/* NOUVEAU HEADER CONFORME AUX SPECS */}
          <Card>
            <CardContent className="p-6">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto',
                gap: '1.5rem',
                alignItems: 'start'
              }}>
                {/* COLONNE GAUCHE */}
                <div>
                  {/* Nom du profil ou bouton créer */}
                  {profileInfo ? (
                    <div 
                      onClick={() => navigate('/manage-profile')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--surface-secondary)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '0.75rem',
                        transition: 'all 0.2s',
                        border: '1px solid var(--border-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🏡</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}>
                        {profileInfo.name}
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/manage-profile')}
                      style={{ marginBottom: '0.75rem' }}
                    >
                      🌱 Créer un profil
                    </Button>
                  )}
                </div>
                
                {/* COLONNE DROITE - Solde du jeton */}
                <div style={{
                  textAlign: 'right',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #e5e7eb)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #6b7280)',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px'
                  }}>
                    Mon solde
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: 'var(--primary-color, #0074e4)',
                    fontFamily: 'monospace'
                  }}>
                    {formatAmount(myBalance, decimals)}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #6b7280)',
                    fontWeight: '600',
                    marginTop: '2px'
                  }}>
                    {ticker}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4" style={{ marginTop: '1.5rem' }}>
                {/* Image du jeton (cliquable si créateur) */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={tokenDetails?.image || genesisInfo.url || 'https://placehold.co/64x64?text=Token'}
                    alt={name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.onerror = null; // Empêche la boucle infinie
                      e.currentTarget.src = 'https://placehold.co/64x64?text=Token';
                    }}
                    style={{
                      cursor: isCreator && profileInfo ? 'pointer' : 'default'
                    }}
                    onClick={() => isCreator && profileInfo && setShowImageModal(true)}
                  />
                  {/* Overlay au survol (si créateur) */}
                  {isCreator && profileInfo && (
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
                
                {/* Token Badges */}
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <TokenBadge 
                    tokenId={tokenId}
                    protocol={protocol} 
                    isCreator={isCreator} 
                    genesisInfo={genesisInfo} 
                  />
                  
                  {/* Étiquette ActiveProfile si jeton lié et profil public */}
                  {tokenDetails?.isLinked && profileInfo?.status === 'active' && (
                    <div style={{
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🌐 Profil public
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Token ID Compact - Amélioré */}
            <TokenIDCompact tokenId={tokenId} onCopy={handleCopyTokenId} />
            
            {/*  CREATEUR - Toggle avec Faq.jsx */}
            {isCreator && (
              <div style={{ marginTop: '16px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreatorFaq(!showCreatorFaq)}
                  fullWidth
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px' 
                  }}
                >
                  📖 {showCreatorFaq ? 'Masquer' : 'Afficher'} la FAQ Créateur
                </Button>
                
                {showCreatorFaq && (
                  <div style={{ 
                    marginTop: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px'
                  }}>
                    {/* Colonne 1: Fonctions créateur */}
                    <div>
                      <h4 style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: '600', 
                        color: 'var(--text-primary)', 
                        marginBottom: '12px' 
                      }}>
                        🛠️ Fonctions Créateur
                      </h4>
                      <Faq 
                        items={[
                          {
                            question: "Comment émettre des jetons ?",
                            answer: "Si votre jeton a une offre variable (mint baton), utilisez l'onglet 'Émettre' pour créer de nouveaux jetons. Entrez la quantité souhaitée et confirmez la transaction."
                          },
                          {
                            question: "Comment détruire des jetons ?",
                            answer: "Allez dans l'onglet 'Détruire' pour brûler définitivement des jetons. Cette action est irréversible. Si vous brûlez tous vos jetons avec le mint baton, vous ne pourrez plus en créer."
                          },
                          {
                            question: "Comment distribuer des XEC (Airdrop) ?",
                            answer: "Utilisez l'onglet 'Distribuer' pour envoyer des XEC à tous les détenteurs. Vous pouvez choisir une distribution égalitaire ou proportionnelle au nombre de jetons détenus."
                          },
                          {
                            question: "Comment envoyer un message on-chain ?",
                            answer: "L'onglet 'Message' permet d'enregistrer un message permanent dans la blockchain. Vous pouvez le crypter avec un mot de passe (220 caractères max)."
                          }
                        ]}
                        defaultOpenIndex={null}
                        allowMultiple={false}
                      />
                    </div>
                    
                    {/* Colonne 2: Options et paramétrages */}
                    <div>
                      <h4 style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: '600', 
                        color: 'var(--text-primary)', 
                        marginBottom: '12px' 
                      }}>
                        ⚙️ Options & Paramétrages
                      </h4>
                      <Faq 
                        items={[
                          {
                            question: "Qu'est-ce que l'objectif et la contrepartie ?",
                            answer: "L'objectif décrit l'usage du jeton (ex: fidélité, cashback). La contrepartie définit sa valeur (ex: 1 jeton = 1€, réduction de 10%). Ces infos aident les utilisateurs à comprendre votre token."
                          },
                          {
                            question: "Comment gérer la visibilité du jeton ?",
                            answer: "Le switch 'Visible dans l'annuaire' contrôle si votre jeton apparaît dans la liste publique. Désactivez-le pour un token privé ou en test."
                          },
                          {
                            question: "À quoi sert le carnet d'adresses ?",
                            answer: "Enregistrez les adresses fréquentes de vos clients/partenaires pour faciliter les envois. Chaque jeton a son propre carnet d'adresses."
                          },
                          {
                            question: "Comment gérer les frais réseau ?",
                            answer: "Les frais sont de 546 satoshis minimum (dust limit eCash). Les frais accumulés dans 'Frais Réseau Disponibles' peuvent être retirés vers votre wallet XEC."
                          }
                        ]}
                        defaultOpenIndex={null}
                        allowMultiple={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

          {/* ACTIONS UTILISATEUR */}
          <Tabs
            tabs={[
              { id: 'send', label: '📤 Envoyer' },
              { id: 'airdrop', label: '🎁 Distribuer' },
              ...(isCreator && genesisInfo.authPubkey ? [{ id: 'mint', label: '🏭 Émettre' }] : []),
              ...(isCreator ? [{ id: 'burn', label: '🔥 Détruire' }] : []),
              { id: 'message', label: '💬 Message' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="rounded-b-none"
          />

          {/* Composants d'actions */}
          <Send
            activeTab={activeTab}
            ticker={ticker}
            decimals={decimals}
            myBalance={myBalance}
            isCreator={isCreator}
            history={history}
            loadingHistory={loadingHistory}
            formatAmount={formatAmount}
            tokenId={tokenId}
            wallet={wallet}
            tokenInfo={tokenInfo}
            profileInfo={profileInfo}
            onHistoryUpdate={loadHistory}
          />

          <Airdrop
            activeTab={activeTab}
            ticker={ticker}
            xecBalance={xecBalance}
            isCreator={isCreator}
            history={history}
            loadingHistory={loadingHistory}
            loadingHolders={loadingHolders}
            tokenId={tokenId}
            wallet={wallet}
            tokenInfo={tokenInfo}
            onHistoryUpdate={loadHistory}
          />

          {isCreator && genesisInfo.authPubkey && (
            <Mint
              activeTab={activeTab}
              ticker={ticker}
              isCreator={isCreator}
              genesisInfo={genesisInfo}
              history={history}
              loadingHistory={loadingHistory}
              tokenId={tokenId}
              wallet={wallet}
              tokenInfo={tokenInfo}
              onHistoryUpdate={loadHistory}
            />
          )}

          {isCreator && (
            <Burn
              activeTab={activeTab}
              ticker={ticker}
              decimals={decimals}
              myBalance={myBalance}
              isCreator={isCreator}
              history={history}
              loadingHistory={loadingHistory}
              formatAmount={formatAmount}
              tokenId={tokenId}
              wallet={wallet}
              tokenInfo={tokenInfo}
              profileInfo={profileInfo}
              onHistoryUpdate={loadHistory}
            />
          )}

          <Message
            activeTab={activeTab}
            ticker={ticker}
            isCreator={isCreator}
            history={history}
            loadingHistory={loadingHistory}
            tokenId={tokenId}
            wallet={wallet}
            tokenInfo={tokenInfo}
            onHistoryUpdate={loadHistory}
          />

          {/* Section Contact Créateur - Visible uniquement si non-créateur et token isLinked */}
          {!isCreator && tokenDetails?.isLinked && profileInfo && (
            <Card>
              <CardContent className="p-6">
                {!showContactForm ? (
                  <div>
                    <div className="d-flex justify-between align-center mb-3">
                      <div>
                        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          💬 Contacter le créateur
                        </h3>
                        <p className="text-sm text-secondary mb-0">
                          Posez vos questions directement à {profileInfo.name || 'ce créateur'}
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => setShowContactForm(true)}
                      >
                        ✉️ Envoyer un message
                      </Button>
                    </div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)'
                    }}>
                      💡 <strong>Astuce :</strong> Le créateur recevra une notification et pourra vous répondre via le système de tickets.
                    </div>
                  </div>
                ) : (
                  <div>
                    <ClientTicketForm
                      type="creator"
                      tokenId={tokenId}
                      profilId={profileInfo?.id}
                      walletAddress={wallet?.getAddress()}
                      setNotification={setNotification}
                      onSubmit={(ticket) => {
                        setShowContactForm(false);
                      }}
                      onCancel={() => setShowContactForm(false)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section Gestion du jeton (Créateur uniquement) - Collapsible */}
          {isCreator && profileInfo && (
            <Card>
              <CardContent className="p-4">
                <div 
                  onClick={() => {
                    const section = document.getElementById('token-management-section');
                    const icon = document.getElementById('token-management-icon');
                    if (section.style.display === 'none') {
                      section.style.display = 'block';
                      icon.textContent = '🔽';
                    } else {
                      section.style.display = 'none';
                      icon.textContent = '▶️';
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span id="token-management-icon" style={{ fontSize: '1.2rem' }}>▶️</span>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', margin: 0 }}>
                    ⚙️ Gestion du jeton
                  </h3>
                </div>

                <div id="token-management-section" style={{ display: 'none', marginTop: '16px' }}>
                  {/* Objectifs et Contreparties */}
                  <ObjectivesCounterparts
                    isCreator={isCreator}
                    profileInfo={profileInfo}
                    tokenDetails={tokenDetails}
                    editingPurpose={editingPurpose}
                    editingCounterpart={editingCounterpart}
                    editPurpose={editPurpose}
                    editCounterpart={editCounterpart}
                    savingPurpose={savingPurpose}
                    savingCounterpart={savingCounterpart}
                    setEditingPurpose={setEditingPurpose}
                    setEditingCounterpart={setEditingCounterpart}
                    setEditPurpose={setEditPurpose}
                    setEditCounterpart={setEditCounterpart}
                    handleSavePurpose={handleSavePurpose}
                    handleSaveCounterpart={handleSaveCounterpart}
                  />

                  {/* Toggle Visibilité & Lié au profil */}
                  <div style={{
                    marginTop: '16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)'
                  }}>
                    <TokenVisible
                      tokenId={tokenId}
                      isVisible={tokenDetails?.isVisible ?? true}
                      disabled={togglingVisibility}
                    />

                    <TokenLinked
                      tokenId={tokenId}
                      isLinked={tokenDetails?.isLinked ?? false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
  
          {/* Statistiques du token */}
          <Statistics
            genesisInfo={genesisInfo}
            myBalance={myBalance}
            decimals={decimals}
            tokenInfo={tokenInfo}
            holdersCount={holdersCount}
            loadingHolders={loadingHolders}
            formatAmount={formatAmount}
            formatDate={formatDate}
            compact={true}
          />

          {/* Footer */}
          <BlockchainStatus />

        </Stack>
      </PageLayout>

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

export default TokenPage;