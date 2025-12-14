import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom, useAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import BlockchainStatus from '../components/BlockchainStatus';
import HistoryList from '../components/HistoryList';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useAdmin } from '../hooks/useAdmin';
import { useFarms } from '../hooks/useFarms';
import { useXecPrice } from '../hooks/useXecPrice';
import { notificationAtom, currencyAtom } from '../atoms';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader } from '../components/UI';
import ImportTokenModal from '../components/ImportTokenModal';
import { getGlobalHistory } from '../services/historyService';

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
  const [myFarm, setMyFarm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
        
        // Charger MA ferme directement depuis Supabase (sans filtre de visibilité)
        // IMPORTANT: En tant que créateur, je dois voir mon profil même si tous mes tokens sont masqués
        if (address) {
          try {
            const { supabase } = await import('../services/supabaseClient');
            const { data: myFarmData, error } = await supabase
              .from('farms')
              .select('*')
              .eq('owner_address', address)
              .maybeSingle(); // maybeSingle() ne lance pas d'erreur si aucun résultat
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
              console.error('❌ Erreur chargement ma ferme:', error);
            } else {
              setMyFarm(myFarmData || null);
              console.log('🏠 Ma ferme (chargement direct):', myFarmData);
            }
          } catch (err) {
            console.error('❌ Erreur chargement ma ferme:', err);
          }
        }
        
        // Si admin: charger le nombre de demandes en attente
        if (isAdmin) {
          try {
            const { default: FarmService } = await import('../services/farmService');
            const pendingFarms = await FarmService.FarmService.getPendingFarms();
            setPendingCount(pendingFarms?.length || 0);
            console.log('🔔 Demandes en attente:', pendingFarms?.length || 0);
          } catch (err) {
            console.error('❌ Erreur chargement demandes admin:', err);
          }
        }
        
        // Charger le solde XEC
        const xecBalanceData = await wallet.getBalance();
        setXecBalance(xecBalanceData.balance || 0);
        
        const batons = await wallet.getMintBatons();
        if (import.meta.env.DEV) console.log('🔑 Mint Batons chargés:', batons);
        
        // Construire le Set des tokenIds Farm-Wallet AVANT tout (admin ET creator)
        // IMPORTANT: Inclure MA ferme (myFarm) même si non visible + les farms publiques
        const farmWalletTokenIds = new Set();
        const allTokensFromFarms = [];
        
        // Créer une liste complète : MA ferme + farms publiques (sans doublons)
        const allFarmsToProcess = [];
        if (myFarm) {
          allFarmsToProcess.push(myFarm); // MA ferme en premier (même si tokens masqués)
        }
        // Ajouter les autres farms (venant du hook useFarms filtré pour l'annuaire)
        farms.forEach(farm => {
          if (!myFarm || farm.id !== myFarm.id) { // Éviter les doublons
            allFarmsToProcess.push(farm);
          }
        });
        
        if (import.meta.env.DEV) {
          console.log('🔍 Analyse farms pour extraire tokens:', allFarmsToProcess.length, 'farms (ma ferme + publiques)');
        }
        
        allFarmsToProcess.forEach(farm => {
          if (import.meta.env.DEV) {
            console.log('🔍 Farm:', farm.name, '| tokens:', farm.tokens, '| isArray:', Array.isArray(farm.tokens));
          }
          if (Array.isArray(farm.tokens)) {
            farm.tokens.forEach(tokenEntry => {
              if (import.meta.env.DEV) {
                console.log('  ➕ Ajout token:', tokenEntry.tokenId, '| visible:', tokenEntry.isVisible);
              }
              farmWalletTokenIds.add(tokenEntry.tokenId);
              allTokensFromFarms.push({
                ...tokenEntry,
                farmName: farm.name,
                farmVerified: farm.verified,
                farmStatus: farm.verification_status,
                isMyToken: myFarm && farm.id === myFarm.id // Marquer mes tokens
              });
            });
          }
        });
        
        console.log('📋 TokenIds Farm-Wallet dans Supabase:', Array.from(farmWalletTokenIds));
        console.log('📊 Tokens extraits des farms:', allTokensFromFarms.length);
        if (myFarm) {
          console.log('✅ MA ferme incluse:', myFarm.name, '| Mes tokens:', allTokensFromFarms.filter(t => t.isMyToken).length);
        }
        
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
              name: info.genesisInfo?.tokenName || tokenEntry.farmName || 'Inconnu',
              ticker: info.genesisInfo?.tokenTicker || tokenEntry.ticker || 'UNK',
              decimals: info.genesisInfo?.decimals || 0,
              image: tokenEntry.image || info.genesisInfo?.url || 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"400\"%3E%3Crect fill=\"%23ddd\" width=\"400\" height=\"400\"/%3E%3Ctext fill=\"%23999\" font-size=\"48\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\"%3EToken%3C/text%3E%3C/svg%3E',
              protocol: 'ALP',
              website: '',
              farmName: tokenEntry.farmName || null, // Nom de la ferme associée
              balance: balance,
              isReferenced: true,
              isFromFarmWallet: isFromFarmWallet,
              isActive: isActive,
              verified: tokenEntry.farmVerified || false,
              verificationStatus: tokenEntry.farmStatus || 'none',
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
            name: info.genesisInfo?.tokenName || farmInfo?.name || "Jeton Non Référencé",
            ticker: info.genesisInfo?.tokenTicker || "UNK",
            decimals: info.genesisInfo?.decimals || 0,
            image: tokenDetails?.image || farmInfo?.image || info.genesisInfo?.url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EToken%3C/text%3E%3C/svg%3E",
            protocol: farmInfo?.protocol || "ALP",
            website: farmInfo?.website || "",
            farmName: farmInfo?.name || null, // Nom de la ferme (différent du nom du token)
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
        
        // NOUVEAU: Charger aussi les jetons à offre fixe créés par l'utilisateur
        // (ceux sans MintBaton mais possédés + référencés dans Farm-Wallet)
        const fixedSupplyTokens = [];
        
        // Parcourir les tokens Farm-Wallet pour trouver ceux sans baton mais créés par moi
        for (const tokenEntry of allTokensFromFarms) {
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
            const farmInfo = farms.find(f => f.tokenId === tokenEntry.tokenId);
            let tokenDetails = null;
            for (const farm of farms) {
              if (Array.isArray(farm.tokens)) {
                const foundToken = farm.tokens.find(t => t.tokenId === tokenEntry.tokenId);
                if (foundToken) {
                  tokenDetails = foundToken;
                  break;
                }
              }
            }
            
            const isFromFarmWallet = farmWalletTokenIds.has(tokenEntry.tokenId);
            const isReferenced = !!farmInfo;
            
            fixedSupplyTokens.push({
              tokenId: tokenEntry.tokenId,
              name: info.genesisInfo?.tokenName || farmInfo?.name || "Jeton Non Référencé",
              ticker: info.genesisInfo?.tokenTicker || "UNK",
              decimals: info.genesisInfo?.decimals || 0,
              image: tokenDetails?.image || farmInfo?.image || info.genesisInfo?.url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EToken%3C/text%3E%3C/svg%3E",
              protocol: farmInfo?.protocol || "ALP",
              website: farmInfo?.website || "",
              farmName: farmInfo?.name || null,
              purpose: tokenDetails?.purpose || '',
              counterpart: tokenDetails?.counterpart || '',
              isFixed: true, // Offre fixe confirmée
              balance: balance,
              isReferenced: isReferenced,
              isFromFarmWallet: isFromFarmWallet,
              isActive: isActive,
              isDeleted: false,
              verified: farmInfo?.verified || false,
              verificationStatus: farmInfo?.verificationStatus || (farmInfo?.verified ? 'verified' : 'none'),
              hasMintBaton: false, // Pas de baton
              isCreator: true // Mais je suis créateur
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
            isFromFarmWallet: t.isFromFarmWallet
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
  }, [wallet, farms, isAdmin, address, setNotification]); // Dependencies: recharger si wallet/farms/admin/address change

  // Charger l'historique global
  useEffect(() => {
    const loadGlobalHistory = async () => {
      if (!address) return;
      
      setLoadingHistory(true);
      try {
        const historyData = await getGlobalHistory(address);
        setGlobalHistory(historyData);
        console.log(`📜 Historique global chargé: ${historyData.length} entrées`);
      } catch (err) {
        console.error('❌ Erreur chargement historique global:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    // Charger uniquement au montage (pas de polling automatique)
    loadGlobalHistory();
  }, [address]);

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
        {/* En-tête avec statut ferme */}
        {myFarm && (
          <Card>
            <CardContent style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px' }}>🏡</span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                    {myFarm.name}
                  </h2>
                  <p style={{ fontSize: '0.875rem', margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                    Créez, Importez & Gérez vos jetons à offre variable ou fixe.
                  </p>
                </div>
              </div>
              {myFarm.verification_status === 'verified' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#10b981', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                  ✅ Ferme vérifiée
                </div>
              )}
              {myFarm.verification_status === 'pending' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#f59e0b', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                  ⏳ Validation en cours
                </div>
              )}
              {myFarm.verification_status === 'none' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#6b7280', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                  ⚠️ Profil non vérifié
                </div>
              )}
              {myFarm.verification_status === 'rejected' && myFarm.status !== 'banned' && myFarm.status !== 'deleted' && (
                <button
                  onClick={() => navigate('/manage-farm')}
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
                  🚫 Refusé : {myFarm.admin_message?.substring(0, 40) || 'Voir détails'}{myFarm.admin_message?.length > 40 ? '...' : ''} - Profil masqué (Cliquez)
                </button>
              )}
              {(myFarm.status === 'banned' || myFarm.status === 'deleted') && (
                <div style={{ padding: '8px 12px', backgroundColor: '#450a0a', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'center', border: '2px solid #ef4444' }}>
                  🛑 {myFarm.status === 'banned' ? 'FERME BANNIE' : 'SUPPRESSION EN COURS'} - {myFarm.deletion_reason || myFarm.admin_message || 'Contactez l\'administrateur'}
                </div>
              )}
              {myFarm.verification_status === 'info_requested' && (() => {
                // Ne montrer le badge que si le dernier message est de l'admin
                const history = myFarm.communication_history;
                const hasAdminMessage = Array.isArray(history) && history.length > 0 && 
                  history[history.length - 1].author === 'admin';
                
                if (!hasAdminMessage) return null;
                
                return (
                  <button
                    onClick={() => navigate('/manage-farm')}
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

        {/* Actions contextuelles - Profil & Admin */}
        <Card>
          <CardContent style={{ padding: '12px' }}>
            <Stack spacing="sm">
              {/* CTA Vérification si profil non vérifié */}
              {myFarm && myFarm.verification_status === 'none' && (
                <Button
                  onClick={() => navigate('/manage-farm', { state: { activeTab: 'verification' } })}
                  variant="primary"
                  icon="✅"
                  fullWidth
                >
                  Vérifier mon profil
                </Button>
              )}
              <Button
                onClick={() => navigate('/manage-farm')}
                variant="primary"
                icon={myFarm ? "🏡" : "🌱"}
                fullWidth
                style={{
                  backgroundColor: (() => {
                    // Orange si message admin non lu
                    if (myFarm?.verification_status === 'info_requested') {
                      const history = myFarm.communication_history;
                      if (Array.isArray(history) && history.length > 0 && history[history.length - 1].author === 'admin') {
                        return '#f97316';
                      }
                    }
                    // Bleu par défaut
                    return '#3b82f6';
                  })(),
                  borderColor: (() => {
                    if (myFarm?.verification_status === 'info_requested') {
                      const history = myFarm.communication_history;
                      if (Array.isArray(history) && history.length > 0 && history[history.length - 1].author === 'admin') {
                        return '#f97316';
                      }
                    }
                    return '#3b82f6';
                  })(),
                  color: '#fff'
                }}
              >
                {myFarm ? 'Gérer mon profil' : 'Créer mon profil'}
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => {
                    console.log('🔘 Navigation vers /admin/verification');
                    navigate('/admin/verification');
                  }}
                  variant={pendingCount > 0 ? 'primary' : 'secondary'}
                  fullWidth
                  style={{ 
                    backgroundColor: pendingCount > 0 ? '#ef4444' : '#6b7280', 
                    borderColor: pendingCount > 0 ? '#ef4444' : '#6b7280', 
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <span style={{ fontWeight: '600' }}>Vérification des profils publics</span>
                  {pendingCount > 0 && (
                    <span style={{
                      backgroundColor: '#fff',
                      color: '#ef4444',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Balance XEC */}
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                  💰 eCash disponible
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {xecBalance.toFixed(2)} XEC
                </div>
              </div>
              
              <div style={{ width: '1px', height: '60px', backgroundColor: 'var(--border-primary)', margin: '0 16px' }}></div>
              
              <button
                onClick={() => navigate('/settings')}
                style={{
                  flex: 1,
                  textAlign: 'right',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                  💱 Valeur estimée
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {price && typeof price.convert === 'function' 
                    ? (() => {
                        const converted = price.convert(xecBalance, currency);
                        return converted !== null ? `${converted.toFixed(2)} ${currency}` : '...';
                      })()
                    : '...'
                  }
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

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
                        🟢 En Circulation ({tokens.filter(t => t.isActive && !t.isDeleted && t.isFromFarmWallet).length})
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
                        ⚫ Inactifs ({tokens.filter(t => !t.isActive && !t.isDeleted && t.isFromFarmWallet).length})
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
                        🗑️ Supprimés ({tokens.filter(t => t.isDeleted && t.isFromFarmWallet).length})
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
                          const allTokensCreatedInApp = [...allFarmTokens, ...tokens.filter(t => t.isFromFarmWallet && !allFarmTokens.some(ft => ft.tokenId === t.tokenId))];
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
                // En circulation: offre > 0 ET Farm-Wallet uniquement
                displayTokens = tokens.filter(t => t.isActive && !t.isDeleted && t.isFromFarmWallet);
              } else if (activeFilter === 'inactive') {
                // Inactifs: offre = 0 ET Farm-Wallet uniquement
                displayTokens = tokens.filter(t => !t.isActive && !t.isDeleted && t.isFromFarmWallet);
              } else if (activeFilter === 'deleted' && isAdmin) {
                // Supprimés: tokens marqués comme supprimés (admin uniquement)
                displayTokens = tokens.filter(t => t.isDeleted && t.isFromFarmWallet);
              } else if (activeFilter === 'all' && isAdmin) {
                // Tous: tous les tokens Farm-Wallet (créés ou importés)
                const supabaseTokenIds = new Set(allFarmTokens.map(t => t.tokenId));
                const walletOnlyFarmTokens = tokens.filter(t => 
                  t.isFromFarmWallet && !supabaseTokenIds.has(t.tokenId)
                );
                
                displayTokens = [...allFarmTokens, ...walletOnlyFarmTokens]
                  .filter(t => t.isFromFarmWallet);
              } else {
                // Par défaut: afficher tous les tokens Farm-Wallet
                displayTokens = tokens.filter(t => t.isFromFarmWallet);
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
              <Card key={token.tokenId}>
                <CardContent style={{ padding: '16px' }}>
                  {/* Header: Image + Info + Status */}
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                    {/* Image 48x48 */}
                    <img 
                      src={token.image} 
                      alt={token.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid var(--border-primary)',
                        flexShrink: 0
                      }}
                      loading="lazy"
                      onError={(e) => {
                        if (e.target.src !== 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23ddd" width="48" height="48"/%3E%3Ctext fill="%23999" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E') {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23ddd" width="48" height="48"/%3E%3Ctext fill="%23999" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';
                        }
                      }}
                    />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ 
                          fontSize: '1rem', 
                          fontWeight: '700', 
                          color: 'var(--text-primary)', 
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {token.name}
                        </h3>
                        {token.isFromFarmWallet && token.isReferenced && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            whiteSpace: 'nowrap'
                          }}>
                            🏡
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        color: 'var(--text-secondary)', 
                        textTransform: 'uppercase',
                        marginBottom: '4px'
                      }}>
                        {token.ticker}
                      </div>
                      {/* Token ID cliquable */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTokenId(token.tokenId, e);
                        }}
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          color: 'var(--text-tertiary)',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                          display: 'block'
                        }}
                        title="Cliquez pour copier"
                        onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
                      >
                        {token.tokenId}
                      </button>
                    </div>
                    
                    {/* Badge statut */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: token.isActive ? '#10b981' : '#6b7280',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {token.isActive ? 'ACTIF' : 'INACTIF'}
                    </div>
                  </div>

                  {/* Balance + Type */}
                  <div style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)', 
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}>
                          💼 Solde
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {formatBalance(token.balance, token.decimals)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)', 
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}>
                          Type
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          color: token.hasMintBaton ? '#10b981' : '#f59e0b'
                        }}>
                          {token.hasMintBaton ? '🔄 Variable' : '🔒 Fixe'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grille de boutons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/token/${token.tokenId}`);
                      }}
                      size="sm"
                      variant="secondary"
                      fullWidth
                      style={{ fontSize: '0.75rem', padding: '8px' }}
                    >
                      📊 Détails
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/token/${token.tokenId}`, { state: { activeTab: 'send' } });
                      }}
                      size="sm"
                      variant="secondary"
                      fullWidth
                      style={{ fontSize: '0.75rem', padding: '8px' }}
                    >
                      📤 Envoyer
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/token/${token.tokenId}`, { state: { activeTab: 'airdrop' } });
                      }}
                      size="sm"
                      variant="secondary"
                      fullWidth
                      style={{ fontSize: '0.75rem', padding: '8px' }}
                    >
                      🎁 Distribuer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ));
            })()}
          </>
        )}

        {/* Section Historique Global */}
        {address && (
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '2rem' }}>📜</span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                    Historique Global
                  </h2>
                  <p style={{ fontSize: '0.875rem', margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                    Toutes vos actions sur les tokens
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
