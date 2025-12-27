import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom, useAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/eCash/BlockchainStatus';
import HistoryList from '../components/eCash/TokenActions/HistoryList';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useAdmin } from '../hooks/useAdmin';
import { useProfiles } from '../hooks/useProfiles';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader, Tabs } from '../components/UI';
import ImportTokenModal from '../components/Creators/ImportTokenModal';
import CreateTokenModal from '../components/Creators/CreateTokenModal';
import { getGlobalHistory } from '../services/historyService';
import { NetworkFeesAvail, AddressHistory, TokenCard } from '../components/TokenPage';
import AddressBook from '../components/AddressBook/AddressBook';

/**
 * BlockedProfileCard - Carte d'affichage d'un profil bloqué avec bouton de déblocage
 */
const BlockedProfileCard = ({ profile, onUnblock }) => {
  const [unblockReason, setUnblockReason] = useState('');
  const [showUnblockForm, setShowUnblockForm] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const handleUnblock = async () => {
    if (!unblockReason.trim()) {
      alert('Veuillez fournir une raison de déblocage');
      return;
    }

    setIsUnblocking(true);
    try {
      await onUnblock(profile.id, unblockReason);
      setShowUnblockForm(false);
      setUnblockReason('');
    } catch (error) {
      console.error('❌ Erreur déblocage:', error);
    } finally {
      setIsUnblocking(false);
    }
  };

  return (
    <Card style={{ border: '2px solid #f59e0b', backgroundColor: '#fffbeb' }}>
      <CardContent style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#92400e', margin: '0 0 8px 0' }}>
              {profile.name || 'Sans nom'}
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}>
              <strong>Adresse :</strong> {profile.owner_address?.substring(0, 20)}...
            </div>
            <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}>
              <strong>Statut :</strong> {profile.status}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}>
              <strong>Bloqué le :</strong> {new Date(profile.blocked_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <div style={{ fontSize: '2rem' }}>🚫</div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
            Raison du blocage :
          </div>
          <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
            {profile.blocked_reason}
          </div>
        </div>

        {!showUnblockForm ? (
          <Button
            onClick={() => setShowUnblockForm(true)}
            variant="primary"
            fullWidth
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            🔓 Débloquer ce profil
          </Button>
        ) : (
          <div style={{ marginTop: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#92400e',
              marginBottom: '8px'
            }}>
              Raison du déblocage :
            </label>
            <textarea
              value={unblockReason}
              onChange={(e) => setUnblockReason(e.target.value)}
              placeholder="Ex: Tickets résolus, fausse alerte, etc."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #fbbf24',
                borderRadius: '8px',
                fontSize: '0.875rem',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                marginBottom: '12px'
              }}
              disabled={isUnblocking}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={handleUnblock}
                variant="primary"
                fullWidth
                disabled={isUnblocking}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                {isUnblocking ? '⏳ Déblocage...' : '✅ Confirmer le déblocage'}
              </Button>
              <Button
                onClick={() => {
                  setShowUnblockForm(false);
                  setUnblockReason('');
                }}
                variant="outline"
                fullWidth
                disabled={isUnblocking}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * ManageTokenPage - Gestionnaire de jetons pour créateurs
 * 
 * Fonctionnalités principales:
 * - Liste des tokens avec MintBaton (tokens gérables par le créateur)
 * - Filtres admin: actifs, inactifs, supprimés, tous
 * - Import de tokens existants
 * - Historique des actions créateur et transactions XEC
 * - Gestion des profils et vérification
 * 
 * Architecture:
 * - États centralisés avec commentaires explicatifs
 * - Fonctions utilitaires extraites pour meilleure lisibilité
 * - Chargement optimisé avec Promise.all pour paralléliser
 * - Logique de filtrage simplifiée dans getFilteredTokens()
 * 
 * Optimisations:
 * - Suppression des états inutilisés (allProfileTokens, showXecHistory)
 * - Extraction de fonctions utilitaires (loadMyProfile, buildJlnWalletTokenIds, etc.)
 * - Réduction des logs de debug en production
 * - Simplification de la logique de filtrage avec switch/case
 */

const ManageTokenPage = () => {
  const navigate = useNavigate();
  const { wallet, address } = useEcashWallet();
  const { profiles } = useProfiles();
  const { isAdmin } = useAdmin();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  const setNotification = useSetAtom(notificationAtom);

  // ============================================
  // ÉTATS PRINCIPAUX
  // ============================================
  
  // Tokens avec MintBaton (tokens gérables)
  const [tokens, setTokens] = useState([]);
  
  // Tokens JLN-Wallet (pour admin: tous les tokens de Supabase)
  const [allJlnTokens, setAllJlnTokens] = useState([]);
  
  // États de chargement
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Profil de l'utilisateur connecté
  const [myProfile, setMyProfile] = useState(null);
  
  // Solde XEC du wallet
  const [xecBalance, setXecBalance] = useState(0);
  
  // Filtres admin: 'active' | 'inactive' | 'deleted' | 'blocked' | 'all'
  const [activeFilter, setActiveFilter] = useState('active');
  
  // Profils bloqués pour anti-fraude (admin)
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  
  // Historique des actions créateur
  const [globalHistory, setGlobalHistory] = useState([]);
  
  // Onglet historique actif: 'creator' | 'xec'
  const [activeHistoryTab, setActiveHistoryTab] = useState('creator');
  
  // Nombre de demandes de vérification en attente (admin)
  const [pendingCount, setPendingCount] = useState(0);
  
  // États d'affichage des modales/sections
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGlobalAddressBook, setShowGlobalAddressBook] = useState(false);

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  /**
   * Charge le profil de l'utilisateur depuis Supabase
   * @returns {Promise<Object|null>} Profil ou null si non trouvé
   */
  const loadMyProfile = async () => {
    if (!address) return null;
    
    try {
      const { supabase } = await import('../services/supabaseClient');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_address', address)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur chargement profil:', error);
        return null;
      }
      
      console.log('🏠 Profil chargé:', data?.name || 'Aucun');
      return data || null;
    } catch (err) {
      console.error('❌ Erreur chargement profil:', err);
      return null;
    }
  };

  /**
   * Charge les profils bloqués (admin uniquement)
   * @returns {Promise<void>}
   */
  const loadBlockedProfiles = async () => {
    if (!isAdmin) return;
    
    try {
      const { supabase } = await import('../services/supabaseClient');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, owner_address, name, blocked_reason, blocked_at, status')
        .eq('is_blocked_from_creating', true)
        .order('blocked_at', { ascending: false });
      
      if (error) throw error;
      setBlockedProfiles(data || []);
      console.log('🚫 Profils bloqués chargés:', data?.length || 0);
    } catch (error) {
      console.error('❌ Erreur chargement profils bloqués:', error);
    }
  };

  /**
   * Charge le nombre de demandes de vérification en attente (admin uniquement)
   * @returns {Promise<number>} Nombre de demandes
   */
  const loadPendingCount = async () => {
    if (!isAdmin) return 0;
    
    try {
      const { default: ProfilService } = await import('../services/profilService');
      const pendingProfiles = await ProfilService.getPendingProfils();
      const count = pendingProfiles?.length || 0;
      console.log('🔔 Demandes en attente:', count);
      return count;
    } catch (err) {
      console.error('❌ Erreur chargement demandes:', err);
      return 0;
    }
  };

  /**
   * Construit un Set des tokenIds référencés dans Supabase
   * @param {Object} myProfile - Profil de l'utilisateur
   * @param {Array} profiles - Liste des profils publics
   * @returns {Set<string>} Set des tokenIds JLN-Wallet
   */
  const buildJlnWalletTokenIds = (myProfile, profiles) => {
    const tokenIds = new Set();
    
    // Inclure les tokens de mon profil
    if (myProfile && Array.isArray(myProfile.tokens)) {
      myProfile.tokens.forEach(t => tokenIds.add(t.tokenId));
    }
    
    // Inclure les tokens des profils publics
    profiles.forEach(profile => {
      if (Array.isArray(profile.tokens)) {
        profile.tokens.forEach(t => tokenIds.add(t.tokenId));
      }
    });
    
    return tokenIds;
  };

  /**
   * Copie un tokenId dans le presse-papier
   */
  const handleCopyTokenId = (tokenId, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tokenId).then(
      () => setNotification({ type: 'success', message: 'ID du jeton copié !' }),
      (err) => {
        console.error('❌ Échec copie:', err);
        setNotification({ type: 'error', message: 'Échec de la copie' });
      }
    );
  };

  /**
   * Formate un solde avec décimales
   * @param {string|BigInt} balance - Solde brut
   * @param {number} decimals - Nombre de décimales
   * @returns {string} Solde formaté
   */
  const formatBalance = (balance, decimals = 0) => {
    if (!balance || balance === '0') return '0';
    try {
      const balanceNum = typeof balance === 'string' ? BigInt(balance) : BigInt(balance.toString());
      const divisor = BigInt(Math.pow(10, decimals));
      const wholePart = balanceNum / divisor;
      const remainder = balanceNum % divisor;
      
      if (remainder === 0n) return wholePart.toString();
      
      const decimalPart = remainder.toString().padStart(decimals, '0');
      return `${wholePart}.${decimalPart}`.replace(/\.?0+$/, '');
    } catch (err) {
      console.warn('⚠️ Erreur formatage:', err);
      return balance.toString();
    }
  };

  /**
   * Navigate vers la page de détails du token
   */
  const handleViewToken = (token) => navigate(`/manage-token/${token.tokenId}`);

  /**
   * Callback après import de token réussi
   */
  const handleImportSuccess = () => window.location.reload();

  /**
   * Filtre les tokens selon le filtre actif (admin uniquement pour certains filtres)
   * @returns {Array} Liste des tokens filtrés
   */
  const getFilteredTokens = () => {
    let displayTokens = [];
    
    switch (activeFilter) {
      case 'active':
        // En circulation: offre > 0 ET JLN-Wallet uniquement
        displayTokens = tokens.filter(t => t.isActive && !t.isDeleted && t.isFromJlnWallet);
        break;
        
      case 'inactive':
        // Inactifs: offre = 0 ET JLN-Wallet uniquement
        displayTokens = tokens.filter(t => !t.isActive && !t.isDeleted && t.isFromJlnWallet);
        break;
        
      case 'deleted':
        // Supprimés: admin uniquement
        if (isAdmin) {
          displayTokens = tokens.filter(t => t.isDeleted && t.isFromJlnWallet);
        }
        break;
      
      case 'blocked':
        // Profils bloqués: admin uniquement (pas de tokens, affichage spécial des profils)
        if (isAdmin) {
          displayTokens = []; // Pas de tokens ici
        }
        break;
        
      case 'all':
        // Profils bloqués: admin uniquement (affichage spécial)
        if (isAdmin) {
          displayTokens = []; // Pas de tokens, on affiche les profils bloqués à la place
        }
        break;
        
      case 'all':
        // Tous: admin uniquement
        if (isAdmin) {
          const supabaseTokenIds = new Set(allJlnTokens.map(t => t.tokenId));
          const walletOnlyTokens = tokens.filter(t => 
            t.isFromJlnWallet && !supabaseTokenIds.has(t.tokenId)
          );
          displayTokens = [...allJlnTokens, ...walletOnlyTokens]
            .filter(t => t.isFromJlnWallet);
        }
        break;
        
      default:
        // Par défaut: tous les tokens JLN-Wallet
        displayTokens = tokens.filter(t => t.isFromJlnWallet);
    }
    
    // Trier: Actifs en premier
    return displayTokens.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return 0;
    });
  };

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  // Charger les tokens avec MintBaton + métadonnées enrichies
  useEffect(() => {
    const loadData = async () => {
      if (!wallet) {
        setLoadingTokens(false);
        return;
      }

      try {
        setLoadingTokens(true);
        
        // Charger le profil utilisateur et les stats admin en parallèle
        const [myProfileData, pendingCountData] = await Promise.all([
          loadMyProfile(),
          loadPendingCount()
        ]);
        
        setMyProfile(myProfileData);
        setPendingCount(pendingCountData);
        
        // Si admin, charger les profils bloqués
        if (isAdmin) {
          await loadBlockedProfiles();
        }
        
        // Charger le solde XEC
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);
        
        const batons = await wallet.getMintBatons();
        console.log('🔑 Mint Batons:', batons.length);
        
        // Construire le Set des tokenIds référencés dans Supabase (JLN-Wallet)
        const jlnWalletTokenIds = buildJlnWalletTokenIds(myProfileData, profiles);
        console.log('📋 Tokens JLN-Wallet:', jlnWalletTokenIds.size);
        
        // Extraire les métadonnées des tokens depuis les profils
        const allTokensFromProfiles = [];
        [myProfileData, ...profiles]
          .filter(Boolean)
          .filter((p, i, arr) => arr.findIndex(x => x?.id === p?.id) === i) // Dédupliquer
          .forEach(profile => {
            if (Array.isArray(profile.tokens)) {
              profile.tokens.forEach(tokenEntry => {
                allTokensFromProfiles.push({
                  ...tokenEntry,
                  profileName: profile.name,
                  profileVerified: profile.verified,
                  profileStatus: profile.verification_status,
                  isMyToken: myProfileData && profile.id === myProfileData.id
                });
              });
            }
          });
        
        console.log('📊 Tokens des profils:', allTokensFromProfiles.length);
        
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
            profileName: profileInfo?.name || null, // Nom de mon profil (différent du nom du token)
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
            // Ajouter isLinked et isVisible depuis tokenDetails (Mon profil)
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
            
            // Info annuaire - utiliser la liste des profils (mon profil + profils publics)
            const allProfiles = [myProfileData, ...profiles].filter(Boolean);
            const profileInfo = allProfiles.find(f => f.tokenId === tokenEntry.tokenId);
            let tokenDetails = null;
            for (const profile of allProfiles) {
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
              // Ajouter isLinked et isVisible depuis tokenDetails (Mon profil)
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
  }, [wallet, profiles, isAdmin, address, setNotification]);

  // Charger l'historique des actions créateur
  useEffect(() => {
    const loadGlobalHistory = async () => {
      if (!address) return;
      
      setLoadingHistory(true);
      try {
        const historyData = await getGlobalHistory(address);
        setGlobalHistory(historyData);
        console.log(`📜 Historique: ${historyData.length} entrées`);
      } catch (err) {
        console.error('❌ Erreur historique:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    loadGlobalHistory();
  }, [address]);

  // ============================================
  // RENDU DU COMPOSANT
  // ============================================

  return (
    <MobileLayout title="Gestionnaire de Jetons">
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
        {/* En-tête amélioré avec bouton profil et statuts */}
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              {/* Bouton profil ou créer profil */}
              <div style={{ flex: 1 }}>
                {myProfile ? (
                  <button
                    onClick={() => navigate('/manage-profile', { state: { activeTab: 'info' } })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '12px 16px',
                      backgroundColor: 'var(--surface-secondary, #f5f5f5)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: '1px solid var(--border-primary, #e5e7eb)',
                      transition: 'all 0.2s',
                      width: '100%',
                      maxWidth: '300px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, #e5e7eb)';
                      e.currentTarget.style.borderColor = 'var(--primary-color, #0074e4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-secondary, #f5f5f5)';
                      e.currentTarget.style.borderColor = 'var(--border-primary, #e5e7eb)';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      width: '100%'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>🏡</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}>
                        {myProfile.name}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary, #6b7280)',
                      fontWeight: '500'
                    }}>
                      Gérer votre profil
                    </span>
                  </button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/manage-profile', { state: { activeTab: 'info' } })}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🌱</span>
                    <span>Créer mon profil</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Légende */}
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary, #6b7280)',
              margin: '0 0 16px 0'
            }}>
              Créez, Importez & Gérez vos jetons à offre variable ou fixe.
            </p>

            {/* Étiquettes de statut */}
            {myProfile && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px',
                marginTop: '12px'
              }}>
                {/* Statut de visibilité du profil */}
                <button
                  onClick={() => navigate('/manage-profile', { state: { activeTab: 'security' } })}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: myProfile.status === 'active' ? '#3b82f6' : '#6b7280', 
                    color: '#fff', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title={myProfile.status === 'active' ? 'Profil visible dans l\'annuaire - Cliquez pour modifier' : 'Profil en mode brouillon - Cliquez pour activer'}
                >
                  {myProfile.status === 'active' ? '🌐 Profil public' : '📝 Brouillon'}
                </button>

                {myProfile.verification_status === 'verified' && (
                  <div style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#10b981', 
                    color: '#fff', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    ✅ Profil vérifié
                  </div>
                )}
                {myProfile.verification_status === 'pending' && (
                  <div style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#f59e0b', 
                    color: '#fff', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    ⏳ Validation en cours
                  </div>
                )}
                {myProfile.verification_status === 'none' && (
                  <>
                    <div style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#6b7280', 
                      color: '#fff', 
                      borderRadius: '20px', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      ⚠️ Profil non vérifié
                    </div>
                    <button
                      onClick={() => navigate('/manage-profile', { state: { activeTab: 'verification' } })}
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#10b981', 
                        color: '#fff', 
                        borderRadius: '20px', 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10b981';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                      }}
                      title="Demander la vérification de votre établissement"
                    >
                      ✅ Vérifier mon profil
                    </button>
                  </>
                )}
                {myProfile.verification_status === 'rejected' && myProfile.status !== 'banned' && myProfile.status !== 'deleted' && (
                  <button
                    onClick={() => navigate('/manage-profile', { state: { activeTab: 'verification' } })}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#fee2e2', 
                      color: '#991b1b', 
                      borderRadius: '20px', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      border: '1px solid #f87171',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                    title="Cliquez pour voir les détails et re-soumettre"
                  >
                    🚫 Refusé - Voir détails
                  </button>
                )}
                {(myProfile.status === 'banned' || myProfile.status === 'deleted') && (
                  <div style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#450a0a', 
                    color: '#fff', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    border: '2px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🛑 {myProfile.status === 'banned' ? 'BANNI' : 'SUPPRESSION EN COURS'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boutons d'action principaux - Grille 2 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Button
            onClick={() => {
              console.log('🔘 Clic sur Créer un jeton');
              setShowCreateModal(true);
            }}
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
                        onClick={() => setActiveFilter('blocked')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: activeFilter === 'blocked' ? '#f59e0b' : 'var(--bg-secondary)',
                          color: activeFilter === 'blocked' ? '#fff' : 'var(--text-primary)',
                          boxShadow: activeFilter === 'blocked' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        🚫 Bloqués ({blockedProfiles.length})
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
                       activeFilter === 'blocked' ? '🚫 Profils bloqués pour création/importation de jetons' :
                       '📋 Tous vos jetons créés ou importés'}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
            
            {/* Liste des profils bloqués (admin, filtre "Bloqués") */}
            {activeFilter === 'blocked' && isAdmin && (
              <>
                {blockedProfiles.length === 0 ? (
                  <Card>
                    <CardContent style={{ padding: '24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                      <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Aucun profil bloqué actuellement
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  blockedProfiles.map((profile) => (
                    <BlockedProfileCard
                      key={profile.id}
                      profile={profile}
                      onUnblock={async (profileId, reason) => {
                        try {
                          const { default: adminService } = await import('../services/adminService');
                          await adminService.adminUnblockProfile(profileId, address, reason);
                          setNotification({
                            type: 'success',
                            message: `✅ Profil ${profile.name} débloqué avec succès`
                          });
                          await loadBlockedProfiles(); // Recharger la liste
                        } catch (error) {
                          console.error('❌ Erreur déblocage:', error);
                          setNotification({
                            type: 'error',
                            message: `❌ Erreur lors du déblocage: ${error.message}`
                          });
                        }
                      }}
                    />
                  ))
                )}
              </>
            )}
            
            {/* Liste des tokens filtrés */}
            {activeFilter !== 'blocked' && getFilteredTokens().map((token) => {
              const showToggles = !!myProfile && token.isFromjlnWallet === true;
              
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
                    // Recharger le profil après mise à jour
                    console.log('🔄 Rechargement profil après update');
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
                      console.error('❌ Erreur rechargement profil:', err);
                    }
                  }}
                />
              );
            })}
          </>
        )}
 
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
        {/* Section Carnet d'Adresses */}
        {address && (
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div className="section-header">
                <span className="section-icon">📇</span>
                <div className="section-header-content">
                  <h2 className="section-title">
                    Carnet d'Adresses
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

        {/* Historique avec onglets: Actions créateurs + Transactions XEC */}
        {address && (
          <Card>
            <CardContent style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div className="section-header-content">
                  <h2 className="section-title" style={{ fontSize: '1.125rem', marginBottom: '4px' }}>
                    📊 Historique & Transactions
                  </h2>
                  <p className="section-subtitle" style={{ fontSize: '0.8rem' }}>
                    Suivez vos actions créateur et transactions blockchain en temps réel.
                  </p>
                </div>
              </div>

              {/* Onglets */}
              <Tabs
                tabs={[
                  { id: 'creator', label: '🛠️ Actions Créateur' },
                  { id: 'xec', label: '💸 Transactions XEC' }
                ]}
                activeTab={activeHistoryTab}
                onChange={setActiveHistoryTab}
              />

              {/* Contenu onglet Actions Créateur */}
              {activeHistoryTab === 'creator' && (
                <div style={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  padding: '24px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <p style={{ 
                      fontSize: '0.9rem', 
                      color: 'var(--text-secondary)',
                      margin: 0
                    }}>
                      Toutes vos actions sur les jetons gérés depuis ce portefeuille.
                    </p>
              </div>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  ⏳ Chargement de l'historique...
                </div>
              ) : (
                <HistoryList history={globalHistory} compact={false} />
              )}
                </div>
              )}

              {/* Contenu onglet Transactions XEC */}
              {activeHistoryTab === 'xec' && (
                <div style={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  padding: '24px'
                }}>
                  <p style={{ 
                    fontSize: '0.9rem', 
                    color: 'var(--text-secondary)',
                    marginBottom: '16px'
                  }}>
                    Historique de vos transactions en temps réel depuis la blockchain.
                  </p>
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

        {/* Modal de création de token - Wizard 5 étapes */}
        {wallet && (
          <CreateTokenModal
            isOpen={showCreateModal}
            onClose={() => {
              console.log('🔘 Fermeture du modal création');
              setShowCreateModal(false);
            }}
            onSuccess={(tokenData) => {
              console.log('✅ Token créé:', tokenData);
              setShowCreateModal(false);
              // Recharger les tokens après création
              loadTokens();
            }}
          />
        )}
      </PageLayout>
    </MobileLayout>
  );
};

export default ManageTokenPage;
