import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom, useAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/BlockchainStatus';
import HistoryList from '../components/HistoryList';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useAdmin } from '../hooks/useAdmin';
import { useProfiles } from '../hooks/useProfiles';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader } from '../components/UI';
import ImportTokenModal from '../components/ImportTokenModal';
import { getGlobalHistory } from '../services/historyService';
import { NetworkFeesAvail, AddressHistory, TokenCard } from '../components/TokenPage';
import AddressBook from '../components/AddressBook';

const ManageTokenPage = () => {
  const navigate = useNavigate();
  const { wallet, address } = useEcashWallet();
  const { profiles } = useProfiles();
  const { isAdmin } = useAdmin();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  const setNotification = useSetAtom(notificationAtom);

  const [tokens, setTokens] = useState([]);
  const [allJlnTokens, setAllJlnTokens] = useState([]); // Pour l'admin: tous les tokens JLN-Wallet
  const [allProfileTokens, setAllProfileTokens] = useState([]); // Pour l'admin: tous les tokens des profiles
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [xecBalance, setXecBalance] = useState(0);
  const [activeFilter, setActiveFilter] = useState('active'); // 'active', 'inactive', 'pending', 'all'
  const [myProfile, setMyProfile] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showXecHistory, setShowXecHistory] = useState(false);
  const [showGlobalAddressBook, setShowGlobalAddressBook] = useState(false); // Carnet d'adresses global

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
        
        // Charger Mon Profil directement depuis Supabase (sans filtre de visibilité)
        // IMPORTANT: En tant que créateur, je dois voir mon profil même si tous mes tokens sont masqués
        if (address) {
          try {
            const { supabase } = await import('../services/supabaseClient');
            const { data: myProfileData, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('owner_address', address)
              .maybeSingle(); // maybeSingle() ne lance pas d'erreur si aucun résultat
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
              console.error('❌ Erreur chargement ma ferme:', error);
            } else {
              setMyProfile(myProfileData || null);
              console.log('🏠 Ma ferme (chargement direct):', myProfileData);
            }
          } catch (err) {
            console.error('❌ Erreur chargement ma ferme:', err);
          }
        }
        
        // Si admin: charger le nombre de demandes en attente
        if (isAdmin) {
          try {
            const { default: ProfilService } = await import('../services/profilService');
            const pendingProfiles = await ProfilService.getPendingProfils();
            setPendingCount(pendingProfiles?.length || 0);
            console.log('🔔 Demandes en attente:', pendingProfiles?.length || 0);
          } catch (err) {
            console.error('❌ Erreur chargement demandes admin:', err);
          }
        }
        
        // Charger le solde XEC
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);
        
        const batons = await wallet.getMintBatons();
        if (import.meta.env.DEV) console.log('🔑 Mint Batons chargés:', batons);
        
        // Construire le Set des tokenIds JlnWallet AVANT tout (admin ET creator)
        // IMPORTANT: Inclure Mon profil (myProfile) même si non visible + les profiles publiques
        const jlnWalletTokenIds = new Set();
        const allTokensFromProfiles = [];
        
        // Créer une liste complète : Mon profil + profiles publiques (sans doublons)
        const allProfilesToProcess = [];
        if (myProfile) {
          allProfilesToProcess.push(myProfile); // Mon profil en premier (même si tokens masqués)
        }
        // Ajouter les autres profiles (venant du hook useProfiles filtré pour l'annuaire)
        profiles.forEach(profile => {
          if (!myProfile || profile.id !== myProfile.id) { // Éviter les doublons
            allProfilesToProcess.push(profile);
          }
        });
        
        if (import.meta.env.DEV) {
          console.log('🔍 Analyse profiles pour extraire tokens:', allProfilesToProcess.length, 'profiles (mon profil + publiques)');
        }
        
        allProfilesToProcess.forEach(profile => {
          if (import.meta.env.DEV) {
            console.log('🔍 Profile:', profile.name, '| tokens:', profile.tokens, '| isArray:', Array.isArray(profile.tokens));
          }
          if (Array.isArray(profile.tokens)) {
            profile.tokens.forEach(tokenEntry => {
              if (import.meta.env.DEV) {
                console.log('  ➕ Ajout token:', tokenEntry.tokenId, '| visible:', tokenEntry.isVisible);
              }
              jlnWalletTokenIds.add(tokenEntry.tokenId);
              allTokensFromProfiles.push({
                ...tokenEntry,
                profileName: profile.name,
                profileVerified: profile.verified,
                profileStatus: profile.verification_status,
                isMyToken: myProfile && profile.id === myProfile.id // Marquer mes tokens
              });
            });
          }
        });
        
        console.log('📋 TokenIds JlnWallet dans Supabase:', Array.from(jlnWalletTokenIds));
        console.log('📊 Tokens extraits des profiles:', allTokensFromProfiles.length);
        if (myProfile) {
          console.log('✅ Mon profil inclus:', myProfile.name, '| Mes tokens:', allTokensFromProfiles.filter(t => t.isMyToken).length);
        }
        
        // Si admin: charger TOUS les tokens JlnWallet (même sans mintBaton)
        let allProfileTokensData = [];
        if (isAdmin) {
          console.log('👑 Mode ADMIN activé');
          console.log('📋 Profiles dans Supabase:', profiles.length);
          console.log('🔑 Batons possédés:', batons.map(b => b.tokenId.substring(0, 8)));
          
          allProfileTokensData = await Promise.all(allTokensFromProfiles.map(async (tokenEntry) => {
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
            
            // Détection JlnWallet via Supabase
            // Si le tokenId existe dans profile.tokens[], c'est un token JlnWallet
            const isFromJlnWallet = jlnWalletTokenIds.has(tokenEntry.tokenId);
            
            return {
              tokenId: tokenEntry.tokenId,
              name: info.genesisInfo?.tokenName || tokenEntry.profileName || 'Inconnu',
              ticker: info.genesisInfo?.tokenTicker || tokenEntry.ticker || 'UNK',
              decimals: info.genesisInfo?.decimals || 0,
              image: tokenEntry.image || info.genesisInfo?.url || 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"400\"%3E%3Crect fill=\"%23ddd\" width=\"400\" height=\"400\"/%3E%3Ctext fill=\"%23999\" font-size=\"48\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\"%3EToken%3C/text%3E%3C/svg%3E',
              protocol: 'ALP',
              website: '',
              profileName: tokenEntry.profileName || null, // Nom du profil associé
              balance: balance,
              isReferenced: true,
              isFromJlnWallet: isFromJlnWallet,
              isActive: isActive,
              verified: tokenEntry.profileVerified || false,
              verificationStatus: tokenEntry.profileStatus || 'none',
              hasMintBaton: hasBaton,
              isFixed: !hasBaton
            };
          }));
          
          setAllProfileTokens(allProfileTokensData);
          console.log(`✅ Admin: ${allProfileTokensData.length} tokens chargés`);
          console.log('📋 Tokens admin détaillés:', allProfileTokensData.map(t => ({
            name: t.name,
            ticker: t.ticker,
            balance: t.balance,
            decimals: t.decimals,
            hasBaton: t.hasMintBaton,
            isJlnWallet: t.isFromJlnWallet
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
          const profileInfo = profiles.find(f => f.tokenId === b.tokenId);
          console.log(`🗂️ Profile info pour ${b.tokenId}:`, profileInfo);
          
          // 2b. Chercher l'entrée spécifique du token dans profile.tokens[] (pour purpose/counterpart/image)
          let tokenDetails = null;
          for (const profile of profiles) {
            if (Array.isArray(profile.tokens)) {
              const foundToken = profile.tokens.find(t => t.tokenId === b.tokenId);
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
          
          // 4. Nombre de détenteurs
          let holdersCount = 0;
          try {
            const airdropData = await wallet.calculateAirdropHolders(b.tokenId, 0);
            holdersCount = airdropData?.count || 0;
          } catch (e) {
            console.warn(`⚠️ Impossible de calculer les détenteurs pour ${b.tokenId}:`, e);
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
          
          // RÈGLE : Différencier tokens Jln-Wallet vs autres apps
          // Un token est "FromJlnWallet" s'il existe dans profile.tokens[] OU s'il a tokenDetails
          const isFromJlnWallet = jlnWalletTokenIds.has(b.tokenId) || !!tokenDetails;
          const isReferenced = !!profileInfo;
          
          console.log(`🔍 Token ${b.tokenId.substring(0, 8)}: isFromJlnWallet=${isFromJlnWallet}, isReferenced=${isReferenced}, hasTokenDetails=${!!tokenDetails}`);
          
          // Critères d'affichage:
          // 1. Créateur possède le baton → TOUJOURS afficher (Jln-Wallet ou non)
          // 2. Admin sans baton → afficher seulement si référencé dans profiles.json
          // 3. Token référencé → afficher
          // Note: Les tokens non-référencés + non-Jln-Wallet seront visibles mais marqués
          
          return {
            ...b, // utxo, tokenId, isMintBaton
            name: info.genesisInfo?.tokenName || profileInfo?.name || "Jeton Non Référencé",
            ticker: info.genesisInfo?.tokenTicker || "UNK",
            decimals: info.genesisInfo?.decimals || 0,
            image: tokenDetails?.image || profileInfo?.image || info.genesisInfo?.url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EToken%3C/text%3E%3C/svg%3E",
            protocol: profileInfo?.protocol || "ALP",
            website: profileInfo?.website || "",
            profileName: profileInfo?.name || null, // Nom de la ferme (différent du nom du token)
            purpose: tokenDetails?.purpose || '',
            counterpart: tokenDetails?.counterpart || '',
            isFixed: false, // Si on a le baton, c'est variable
            balance: balance,
            holdersCount: holdersCount, // Ajouter le nombre de détenteurs
            isReferenced: isReferenced,
            isFromJlnWallet: isFromJlnWallet,
            isActive: isActive,
            isDeleted: isDeleted,
            verified: profileInfo?.verified || false,
            verificationStatus: profileInfo?.verificationStatus || (profileInfo?.verified ? 'verified' : 'unverified'),
            hasMintBaton: true, // Puisqu'on itère sur les batons
            // Ajouter isLinked et isVisible depuis tokenDetails (MA ferme)
            isVisible: tokenDetails?.isVisible !== false, // Par défaut true si non défini
            isLinked: tokenDetails?.isLinked !== false // Par défaut true si non défini
          };
        }));
        
        // Tous les tokens du créateur sont visibles (Jln-Wallet ou pas)
        const validTokens = enriched.filter(t => t !== null);
        console.log(`✅ Jetons enrichis: ${validTokens.length} tokens avec mintBaton`);
        
        // NOUVEAU: Charger aussi les jetons à offre fixe créés par l'utilisateur
        // (ceux sans MintBaton mais possédés + référencés dans Jln-Wallet)
        const fixedSupplyTokens = [];
        
        // Parcourir les tokens Jln-Wallet pour trouver ceux sans baton mais créés par moi
        for (const tokenEntry of allTokensFromProfiles) {
          const alreadyInList = validTokens.some(t => t.tokenId === tokenEntry.tokenId);
          if (alreadyInList) continue; // Déjà dans la liste (avec baton)
          
          try {
            const info = await wallet.getTokenInfo(tokenEntry.tokenId);
            
            // Récupérer le solde d'abord
            let balance = '0';
            try {
              const balanceData = await wallet.getTokenBalance(tokenEntry.tokenId);
              balance = balanceData.balance || '0';
            } catch (e) {
              console.warn(`⚠️ Erreur solde ${tokenEntry.tokenId}:`, e);
              continue; // Pas de balance = pas mon token
            }
            
            // Vérifier si je possède des tokens (créateur probable)
            const hasTokens = BigInt(balance) > 0n;
            if (!hasTokens) continue; // Pas de tokens = pas créateur
            
            console.log(`🔒 Jeton à offre fixe créé par moi: ${tokenEntry.tokenId}`, {
              balance,
              tokenId: tokenEntry.tokenId.substring(0, 8)
            });
            
            // Supply
            const circulatingSupply = info.genesisInfo?.circulatingSupply || '0';
            const isActive = BigInt(circulatingSupply) > 0n;
            
            // Info annuaire
            const profileInfo = allProfilesToProcess.find(f => f.tokenId === tokenEntry.tokenId);
            let tokenDetails = null;
            for (const profile of allProfilesToProcess) {
              if (Array.isArray(profile.tokens)) {
                const foundToken = profile.tokens.find(t => t.tokenId === tokenEntry.tokenId);
                if (foundToken) {
                  tokenDetails = foundToken;
                  break;
                }
              }
            }
            
            const isFromJlnWallet = jlnWalletTokenIds.has(tokenEntry.tokenId);
            const isReferenced = !!profileInfo;
            
            fixedSupplyTokens.push({
              tokenId: tokenEntry.tokenId,
              name: info.genesisInfo?.tokenName || profileInfo?.name || "Jeton Non Référencé",
              ticker: info.genesisInfo?.tokenTicker || "UNK",
              decimals: info.genesisInfo?.decimals || 0,
              image: tokenDetails?.image || profileInfo?.image || info.genesisInfo?.url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EToken%3C/text%3E%3C/svg%3E",
              protocol: profileInfo?.protocol || "ALP",
              website: profileInfo?.website || "",
              profileName: profileInfo?.name || null,
              purpose: tokenDetails?.purpose || '',
              counterpart: tokenDetails?.counterpart || '',
              isFixed: true, // Offre fixe confirmée
              balance: balance,
              isReferenced: isReferenced,
              isFromJlnWallet: isFromJlnWallet,
              isActive: isActive,
              isDeleted: false,
              verified: profileInfo?.verified || false,
              verificationStatus: profileInfo?.verificationStatus || (profileInfo?.verified ? 'verified' : 'none'),
              hasMintBaton: false, // Pas de baton
              isCreator: true, // Mais je suis créateur
              // Ajouter isLinked et isVisible depuis tokenDetails (MA ferme)
              isVisible: tokenDetails?.isVisible !== false,
              isLinked: tokenDetails?.isLinked !== false
            });
          } catch (err) {
            console.warn(`⚠️ Erreur chargement token fixe ${tokenEntry.tokenId}:`, err);
          }
        }
        
        console.log(`🔒 Jetons à offre fixe créés par moi: ${fixedSupplyTokens.length}`);
        
        if (fixedSupplyTokens.length > 0) {
          console.log('📋 Détails jetons à offre fixe:', fixedSupplyTokens.map(t => ({
            tokenId: t.tokenId.substring(0, 8),
            name: t.name,
            balance: t.balance,
            isActive: t.isActive,
            isCreator: t.isCreator,
            isFromJlnWallet: t.isFromJlnWallet
          })));
        }
        
        // Fusionner les deux listes
        const allMyTokens = [...validTokens, ...fixedSupplyTokens];
        console.log(`✅ Total jetons (variable + fixe): ${allMyTokens.length}`, {
          variable: validTokens.length,
          fixe: fixedSupplyTokens.length
        });
        setTokens(allMyTokens);
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
  }, [wallet, profiles, isAdmin, address, setNotification]); // Dependencies: recharger si wallet/profiles/admin/address change

  // Charger l'historique global
  useEffect(() => {
    const loadGlobalHistory = async () => {
      if (!address) return;
      
      setLoadingHistory(true);
      try {
        const historyData = await getGlobalHistory(address);
        setGlobalHistory(historyData);
        console.log(`📜 Historique Créateur chargé: ${historyData.length} entrées`);
      } catch (err) {
        console.error('❌ Erreur chargement historique créateur:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    // Charger uniquement au montage (pas de polling automatique)
    loadGlobalHistory();
  }, [address]);

  // Callback après import réussi pour recharger les données
  const handleImportSuccess = () => {
    // Recharger les profiles (cela déclenchera useEffect)
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

  return (
    <MobileLayout title="Gestionnaire de Jetons">
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
        {/* En-tête avec statut profile */}
        {myProfile && (
          <Card>
            <CardContent style={{ padding: '16px' }}>
              <div className="section-header">
                <span className="section-icon">🏡</span>
                <div className="section-header-content">
                  <h2 className="section-title">
                    {myProfile.name}
                  </h2>
                  <p className="section-subtitle">
                    Créez, Importez & Gérez vos jetons à offre variable ou fixe.
                  </p>
                </div>
              </div>
              {myProfile.verification_status === 'verified' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#10b981', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                  ✅ Profil vérifié
                </div>
              )}
              {myProfile.verification_status === 'pending' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#f59e0b', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                  ⏳ Validation en cours
                </div>
              )}
              {myProfile.verification_status === 'none' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#6b7280', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                  ⚠️ Profil non vérifié
                </div>
              )}
              {myProfile.verification_status === 'rejected' && myProfile.status !== 'banned' && myProfile.status !== 'deleted' && (
                <button
                  onClick={() => navigate('/manage-profile')}
                  style={{ 
                    width: '100%',
                    padding: '8px 12px', 
                    backgroundColor: '#fee2e2', 
                    color: '#991b1b', 
                    borderRadius: '8px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    textAlign: 'center', 
                    border: '1px solid #f87171',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
                >
                  🚫 Refusé : {myProfile.admin_message?.substring(0, 40) || 'Voir détails'}{myProfile.admin_message?.length > 40 ? '...' : ''} - Profil masqué (Cliquez)
                </button>
              )}
              {(myProfile.status === 'banned' || myProfile.status === 'deleted') && (
                <div style={{ padding: '8px 12px', backgroundColor: '#450a0a', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center', border: '2px solid #ef4444' }}>
                  🛑 {myProfile.status === 'banned' ? 'FERME BANNIE' : 'SUPPRESSION EN COURS'} - {myProfile.deletion_reason || myProfile.admin_message || 'Contactez l\'administrateur'}
                </div>
              )}
              {myProfile.verification_status === 'info_requested' && (() => {
                // Ne montrer le badge que si le dernier message est de l'admin
                const history = myProfile.communication_history;
                const hasAdminMessage = Array.isArray(history) && history.length > 0 && 
                  history[history.length - 1].author === 'admin';
                
                if (!hasAdminMessage) return null;
                
                return (
                  <button
                    onClick={() => navigate('/manage-profile')}
                    style={{ 
                      width: '100%',
                      padding: '8px 12px', 
                      backgroundColor: '#f59e0b', 
                      color: '#fff', 
                      borderRadius: '8px', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    🔔 Message admin - Cliquez ici
                  </button>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Boutons d'action principaux - Grille 2 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Button
            onClick={() => navigate('/create-token')}
            variant="primary"
            fullWidth
            style={{ height: '80px', fontSize: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span style={{ fontSize: '1.5rem' }}>🔨</span>
            <span>Créer un jeton</span>
          </Button>
          <Button
            onClick={() => {
              console.log('🔘 Clic sur Importer un jeton');
              setShowImportModal(true);
            }}
            style={{ 
              height: '80px', 
              fontSize: '1rem', 
              backgroundColor: '#8b5cf6', 
              color: '#fff',
              border: '2px solid #8b5cf6',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: '600'
            }}
            fullWidth
          >
            <span style={{ fontSize: '1.5rem' }}>📥</span>
            <span>Importer</span>
          </Button>
        </div>

        {/* Actions contextuelles - Profil & Admin (affichage horizontal) */}
        <Card>
          <CardContent style={{ padding: '12px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: (() => {
                // Calculer le nombre de boutons à afficher
                const hasVerifyButton = myProfile && myProfile.verification_status === 'none';
                const hasManageButton = true; // Toujours affiché
                const hasAdminButton = isAdmin;
                
                const count = (hasVerifyButton ? 1 : 0) + (hasManageButton ? 1 : 0) + (hasAdminButton ? 1 : 0);
                return `repeat(${count}, 1fr)`;
              })(),
              gap: '8px'
            }}>
              {/* CTA Vérification si profil non vérifié */}
              {myProfile && myProfile.verification_status === 'none' && (
                <Button
                  onClick={() => navigate('/manage-profile', { state: { activeTab: 'verification' } })}
                  variant="primary"
                  icon="✅"
                  style={{ minHeight: '48px', fontSize: '0.875rem' }}
                >
                  Vérifier mon profil
                </Button>
              )}
              
              <Button
                onClick={() => navigate('/manage-profile')}
                variant="primary"
                icon={myProfile ? "🏡" : "🌱"}
                style={{
                  minHeight: '48px',
                  fontSize: '0.875rem',
                  backgroundColor: (() => {
                    // Orange si message admin non lu
                    if (myProfile?.verification_status === 'info_requested') {
                      const history = myProfile.communication_history;
                      if (Array.isArray(history) && history.length > 0 && history[history.length - 1].author === 'admin') {
                        return '#f97316';
                      }
                    }
                    // Bleu par défaut
                    return '#3b82f6';
                  })(),
                  borderColor: (() => {
                    if (myProfile?.verification_status === 'info_requested') {
                      const history = myProfile.communication_history;
                      if (Array.isArray(history) && history.length > 0 && history[history.length - 1].author === 'admin') {
                        return '#f97316';
                      }
                    }
                    return '#3b82f6';
                  })(),
                  color: '#fff'
                }}
              >
                {myProfile ? 'Gérer mon profil' : 'Créer mon profil'}
              </Button>
              
              {isAdmin && (
                <Button
                  onClick={() => {
                    console.log('🔘 Navigation vers /admin (AdminDashboard)');
                    navigate('/admin');
                  }}
                  variant={pendingCount > 0 ? 'primary' : 'secondary'}
                  style={{ 
                    minHeight: '48px',
                    fontSize: '0.875rem',
                    backgroundColor: pendingCount > 0 ? '#ef4444' : '#6b7280', 
                    borderColor: pendingCount > 0 ? '#ef4444' : '#6b7280', 
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>🛡️</span>
                  <span style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Admin
                  </span>
                  {pendingCount > 0 && (
                    <span style={{
                      backgroundColor: '#fff',
                      color: '#ef4444',
                      padding: '2px 6px',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balance XEC et Valeur estimée */}
        <NetworkFeesAvail 
          compact={true} 
          showActions={true} 
          xecBalance={xecBalance}
          fiatValue={price && typeof price.convert === 'function' 
            ? price.convert(xecBalance, currency)?.toFixed(2) || '...'
            : '...'
          }
          currency={currency}
        />

        {/* État de chargement */}
        {loadingTokens ? (
          <Card>
            <CardContent style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
                Recherche des jetons en cours...
              </p>
            </CardContent>
          </Card>
        ) : tokens.length === 0 ? (
          /* Aucun jeton trouvé */
          <>
            <Card>
              <CardContent style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '5rem', marginBottom: '16px', opacity: 0.3 }}>🔑</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Aucun jeton géré
                </h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Créez un jeton avec offre <strong>variable</strong> pour pouvoir le gérer ici.
                </p>
              </CardContent>
            </Card>

            {/* Carte de simulation pour les admins */}
            {isAdmin && (
              <>
                <Card style={{ border: '2px dashed var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                  <CardContent style={{ padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#3b82f6', margin: 0 }}>
                      👑 MODE ADMIN : Carte de débogage
                    </p>
                  </CardContent>
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
              <>
                <Card>
                  <CardContent style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        onClick={() => setActiveFilter('active')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: activeFilter === 'active' ? '#10b981' : 'var(--bg-secondary)',
                          color: activeFilter === 'active' ? '#fff' : 'var(--text-primary)',
                          boxShadow: activeFilter === 'active' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        🟢 En Circulation ({tokens.filter(t => t.isActive && !t.isDeleted && t.isFromJlnWallet).length})
                      </button>
                      <button
                        onClick={() => setActiveFilter('inactive')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: activeFilter === 'inactive' ? '#6b7280' : 'var(--bg-secondary)',
                          color: activeFilter === 'inactive' ? '#fff' : 'var(--text-primary)',
                          boxShadow: activeFilter === 'inactive' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        ⚫ Inactifs ({tokens.filter(t => !t.isActive && !t.isDeleted && t.isFromJlnWallet).length})
                      </button>
                      <button
                        onClick={() => setActiveFilter('deleted')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: activeFilter === 'deleted' ? '#ef4444' : 'var(--bg-secondary)',
                          color: activeFilter === 'deleted' ? '#fff' : 'var(--text-primary)',
                          boxShadow: activeFilter === 'deleted' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        🗑️ Supprimés ({tokens.filter(t => t.isDeleted && t.isFromJlnWallet).length})
                      </button>
                      <button
                        onClick={() => setActiveFilter('all')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: activeFilter === 'all' ? '#3b82f6' : 'var(--bg-secondary)',
                          color: activeFilter === 'all' ? '#fff' : 'var(--text-primary)',
                          boxShadow: activeFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        📋 Tous ({(() => {
                          const allTokensCreatedInApp = [...allJlnTokens, ...tokens.filter(t => t.isFromJlnWallet && !allJlnTokens.some(ft => ft.tokenId === t.tokenId))];
                          return allTokensCreatedInApp.length;
                        })()})
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Info : Filtre actuel */}
                <Card style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd' }}>
                  <CardContent style={{ padding: '12px' }}>
                    <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                      {activeFilter === 'active' ? '🟢 Jetons avec offre en circulation (offre > 0)' :
                       activeFilter === 'inactive' ? '⚫ Jetons sans circulation (offre = 0)' :
                       activeFilter === 'deleted' ? '🗑️ Jetons supprimés ou signalés' :
                       '📋 Tous vos jetons créés ou importés'}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
            
            {(() => {
              // Logique de filtrage unifiée
              let displayTokens = [];
              
              if (activeFilter === 'active') {
                // En circulation: offre > 0 ET JLN-Wallet uniquement
                displayTokens = tokens.filter(t => t.isActive && !t.isDeleted && t.isFromJlnWallet);
              } else if (activeFilter === 'inactive') {
                // Inactifs: offre = 0 ET JLN-Wallet uniquement
                displayTokens = tokens.filter(t => !t.isActive && !t.isDeleted && t.isFromJlnWallet);
              } else if (activeFilter === 'deleted' && isAdmin) {
                // Supprimés: tokens marqués comme supprimés (admin uniquement)
                displayTokens = tokens.filter(t => t.isDeleted && t.isFromJlnWallet);
              } else if (activeFilter === 'all' && isAdmin) {
                // Tous: tous les tokens JLN-Wallet (créés ou importés)
                const supabaseTokenIds = new Set(allJlnTokens.map(t => t.tokenId));
                const walletOnlyJlnTokens = tokens.filter(t => 
                  t.isFromJlnWallet && !supabaseTokenIds.has(t.tokenId)
                );
                
                displayTokens = [...allJlnTokens, ...walletOnlyJlnTokens]
                  .filter(t => t.isFromJlnWallet);
              } else {
                // Par défaut: afficher tous les tokens JLN-Wallet
                displayTokens = tokens.filter(t => t.isFromJlnWallet);
              }
              
              console.log('🎯 Filtrage tokens:', {
                isAdmin,
                activeFilter,
                tokensCount: tokens.length,
                allJlnTokensCount: allJlnTokens.length,
                displayTokensCount: displayTokens?.length || 0
              });

              return (displayTokens || [])
              .sort((a, b) => {
                // Trier: Actifs en premier, puis par date de création (plus récent d'abord)
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return 0;
              })
              .map((token) => {
                const showToggles = !!myProfile && token.isFromjlnWallet === true;
                console.log('🔍 Debug TokenCard:', {
                  tokenId: token.tokenId.substring(0, 8),
                  hasProfile: !!myProfile,
                  isFromjlnWallet: token.isFromjlnWallet,
                  showToggles
                });
                
                return (
                  <TokenCard
                    key={token.tokenId}
                    token={{
                      ...token,
                      balance: formatBalance(token.balance, token.decimals)
                    }}
                    profileId={myProfile?.id}
                    showLinkedToggle={showToggles}
                    showVisibleToggle={showToggles}
                    onUpdate={async (updatedToken) => {
                    // Recharger uniquement ma ferme depuis Supabase après mise à jour
                    console.log('🔄 Token mis à jour, rechargement de ma ferme...', updatedToken);
                    try {
                      const { supabase } = await import('../services/supabaseClient');
                      const { data: freshProfile, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('owner_address', address)
                        .maybeSingle();
                      
                      if (!error && freshProfile) {
                        setMyProfile(freshProfile);
                        console.log('✅ Profile rechargé avec tokens mis à jour');
                        
                        // Mettre à jour les tokens affichés avec les nouvelles valeurs
                        setTokens(prevTokens => prevTokens.map(t => {
                          if (t.tokenId === updatedToken.tokenId) {
                            // Trouver les nouvelles valeurs dans freshProfile.tokens
                            const freshTokenData = freshProfile.tokens?.find(ft => ft.tokenId === t.tokenId);
                            if (freshTokenData) {
                              return {
                                ...t,
                                isVisible: freshTokenData.isVisible !== false,
                                isLinked: freshTokenData.isLinked !== false,
                                purpose: freshTokenData.purpose || t.purpose,
                                counterpart: freshTokenData.counterpart || t.counterpart,
                                image: freshTokenData.image || t.image
                              };
                            }
                          }
                          return t;
                        }));
                      }
                    } catch (err) {
                      console.error('❌ Erreur rechargement ferme:', err);
                    }
                  }}
                />
              );
            });
            })()}
          </>
        )}

        {/* Section Carnet d'Adresses Global */}
        {address && (
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div className="section-header">
                <span className="section-icon">📇</span>
                <div className="section-header-content">
                  <h2 className="section-title">
                    Carnet d'Adresses Complet
                  </h2>
                  <p className="section-subtitle">
                    Gérez tous vos contacts eCash enregistrés.
                  </p>
                </div>
                <button
                  onClick={() => setShowGlobalAddressBook(!showGlobalAddressBook)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: showGlobalAddressBook ? '#3b82f6' : 'var(--bg-secondary)',
                    color: showGlobalAddressBook ? '#fff' : 'var(--text-primary)',
                    border: showGlobalAddressBook ? 'none' : '1px solid var(--border-color)',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {showGlobalAddressBook ? '👁️ Masquer' : '👁️‍🗨️ Afficher'}
                </button>
              </div>

              {showGlobalAddressBook && (
                <div style={{ marginTop: '20px' }}>
                  <AddressBook tokenId={null} compact={false} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section Historique Créateur */}
        {address && (
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div className="section-header">
                <span className="section-icon">📜</span>
                <div className="section-header-content">
                  <h2 className="section-title">
                    Historique Créateur
                  </h2>
                  <p className="section-subtitle">
                    Toutes vos actions sur les jetons gérés depuis ce portefeuille.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setLoadingHistory(true);
                    try {
                      const historyData = await getGlobalHistory(address);
                      setGlobalHistory(historyData);
                      setNotification({ type: 'success', message: 'Historique actualisé !' });
                    } catch (err) {
                      setNotification({ type: 'error', message: 'Erreur lors de l\'actualisation' });
                    } finally {
                      setLoadingHistory(false);
                    }
                  }}
                  disabled={loadingHistory}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    cursor: loadingHistory ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !loadingHistory && (e.target.style.backgroundColor = 'var(--bg-tertiary)')}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                >
                  🔄 {loadingHistory ? 'Chargement...' : 'Actualiser'}
                </button>
              </div>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  ⏳ Chargement de l'historique...
                </div>
              ) : (
                <HistoryList history={globalHistory} compact={false} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Section Dernières transactions XEC */}
        {address && (
          <Card>
            <CardContent style={{ padding: '20px' }}>
              <div 
                onClick={() => setShowXecHistory(!showXecHistory)}
                className="collapsible-header"
              >
                <span className="section-icon">💸</span>
                <div className="section-header-content">
                  <h2 className="section-title" style={{ fontSize: '1.125rem' }}>
                    Dernières transactions XEC
                  </h2>
                  <p className="section-subtitle" style={{ fontSize: '0.8rem' }}>
                    Historique de vos transactions en temps réel depuis la blockchain.
                  </p>
                </div>
                <span className={`collapsible-arrow ${showXecHistory ? 'open' : ''}`}>
                  ▼
                </span>
              </div>
              
              {showXecHistory && (
                <div style={{ marginTop: '16px' }}>
                  <AddressHistory address={address} currency={currency} />
                </div>
              )}
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
