import React, { useState, useEffect, useCallback } from 'react';
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

// 👇 IMPORTS STATIQUES AJOUTÉS (Plus de await import)
import { supabase } from '../services/supabaseClient';
import ProfilService from '../services/profilService';
import adminService from '../services/adminService'; 

// --- COMPOSANTS INTERNES ---

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
      // ✅ Utilisation directe de adminService
      await adminService.adminUnblockProfile(profile.id, null, unblockReason); // Note: address param removed if unused in service
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#92400e', margin: '0 0 8px 0' }}>{profile.name || 'Sans nom'}</h3>
            <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}><strong>Adresse :</strong> {profile.owner_address?.substring(0, 20)}...</div>
            <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}><strong>Statut :</strong> {profile.status}</div>
            <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '4px' }}><strong>Bloqué le :</strong> {new Date(profile.blocked_at).toLocaleDateString('fr-FR')}</div>
          </div>
          <div style={{ fontSize: '2rem' }}>🚫</div>
        </div>

        <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>Raison du blocage :</div>
          <div style={{ fontSize: '0.85rem', color: '#78350f' }}>{profile.blocked_reason}</div>
        </div>

        {!showUnblockForm ? (
          <Button onClick={() => setShowUnblockForm(true)} variant="primary" fullWidth style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>🔓 Débloquer ce profil</Button>
        ) : (
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>Raison du déblocage :</label>
            <textarea
              value={unblockReason}
              onChange={(e) => setUnblockReason(e.target.value)}
              placeholder="Ex: Tickets résolus, fausse alerte, etc."
              style={{ width: '100%', padding: '12px', border: '2px solid #fbbf24', borderRadius: '8px', fontSize: '0.875rem', minHeight: '80px', marginBottom: '12px' }}
              disabled={isUnblocking}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={handleUnblock} variant="primary" fullWidth disabled={isUnblocking} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                {isUnblocking ? '⏳ Déblocage...' : '✅ Confirmer'}
              </Button>
              <Button onClick={() => { setShowUnblockForm(false); setUnblockReason(''); }} variant="outline" fullWidth disabled={isUnblocking}>Annuler</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- COMPOSANT PRINCIPAL ---

const ManageTokenPage = () => {
  const navigate = useNavigate();
  const { wallet, address } = useEcashWallet();
  const { profiles } = useProfiles();
  const { isAdmin } = useAdmin();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  const setNotification = useSetAtom(notificationAtom);

  const [tokens, setTokens] = useState([]);
  const [allJlnTokens, setAllJlnTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [xecBalance, setXecBalance] = useState(0);
  const [activeFilter, setActiveFilter] = useState('active');
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('creator');
  const [pendingCount, setPendingCount] = useState(0);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGlobalAddressBook, setShowGlobalAddressBook] = useState(false);

  // --- HELPERS AVEC IMPORTS STATIQUES ---

  const loadMyProfile = async () => {
    if (!address) return null;
    try {
      // ✅ Utilisation directe de supabase (importé en haut)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_address', address)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur chargement profil:', error);
        return null;
      }
      return data || null;
    } catch (err) {
      console.error('❌ Erreur chargement profil:', err);
      return null;
    }
  };

  const loadBlockedProfiles = async () => {
    if (!isAdmin) return;
    try {
      // ✅ Utilisation directe de supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('id, owner_address, name, blocked_reason, blocked_at, status')
        .eq('is_blocked_from_creating', true)
        .order('blocked_at', { ascending: false });
      
      if (error) throw error;
      setBlockedProfiles(data || []);
    } catch (error) {
      console.error('❌ Erreur chargement profils bloqués:', error);
    }
  };

  const loadPendingCount = async () => {
    if (!isAdmin) return 0;
    try {
      // ✅ Utilisation directe de ProfilService
      const pendingProfiles = await ProfilService.getPendingProfils();
      return pendingProfiles?.length || 0;
    } catch (err) {
      return 0;
    }
  };

  const buildJlnWalletTokenIds = (myProfile, profiles) => {
    const tokenIds = new Set();
    if (myProfile && Array.isArray(myProfile.tokens)) {
      myProfile.tokens.forEach(t => tokenIds.add(t.tokenId));
    }
    profiles.forEach(profile => {
      if (Array.isArray(profile.tokens)) {
        profile.tokens.forEach(t => tokenIds.add(t.tokenId));
      }
    });
    return tokenIds;
  };

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
      return balance.toString();
    }
  };

  const handleImportSuccess = () => window.location.reload();

  const getFilteredTokens = () => {
    let displayTokens = [];
    
    switch (activeFilter) {
      case 'active':
        displayTokens = tokens.filter(t => t.isActive && !t.isDeleted && t.isFromJlnWallet);
        break;
      case 'inactive':
        displayTokens = tokens.filter(t => !t.isActive && !t.isDeleted && t.isFromJlnWallet);
        break;
      case 'deleted':
        if (isAdmin) displayTokens = tokens.filter(t => t.isDeleted && t.isFromJlnWallet);
        break;
      case 'blocked':
        if (isAdmin) displayTokens = []; 
        break;
      case 'all': 
        if (isAdmin) {
          const supabaseTokenIds = new Set(allJlnTokens.map(t => t.tokenId));
          const walletOnlyTokens = tokens.filter(t => t.isFromJlnWallet && !supabaseTokenIds.has(t.tokenId));
          displayTokens = [...allJlnTokens, ...walletOnlyTokens].filter(t => t.isFromJlnWallet);
        }
        break;
      default:
        displayTokens = tokens.filter(t => t.isFromJlnWallet);
    }
    
    return displayTokens.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return 0;
    });
  };

  const loadTokens = useCallback(async () => {
    if (!wallet) {
      setLoadingTokens(false);
      return;
    }

    try {
      setLoadingTokens(true);
      const [myProfileData, pendingCountData] = await Promise.all([
        loadMyProfile(),
        loadPendingCount()
      ]);
      
      setMyProfile(myProfileData);
      setPendingCount(pendingCountData);
      
      if (isAdmin) await loadBlockedProfiles();
      
      const xecBalanceData = await wallet.getBalance();
      setXecBalance(xecBalanceData.balance || 0);
      
      const batons = await wallet.getMintBatons();
      const jlnWalletTokenIds = buildJlnWalletTokenIds(myProfileData, profiles);
      
      const allTokensFromProfiles = [];
      [myProfileData, ...profiles]
        .filter(Boolean)
        .filter((p, i, arr) => arr.findIndex(x => x?.id === p?.id) === i)
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
      
      const enriched = await Promise.all(batons.map(async (b) => {
        let info = { genesisInfo: { tokenName: 'Inconnu', tokenTicker: '???' } };
        try { info = await wallet.getTokenInfo(b.tokenId); } catch(e) {}
        
        const profileInfo = profiles.find(f => f.tokenId === b.tokenId);
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
        
        let balance = '0';
        try {
          const balanceData = await wallet.getTokenBalance(b.tokenId);
          balance = balanceData.balance || '0';
        } catch (e) {}
        
        let holdersCount = 0;
        try {
          const airdropData = await wallet.calculateAirdropHolders(b.tokenId, 0);
          holdersCount = airdropData?.count || 0;
        } catch (e) {}
        
        const circulatingSupply = info.genesisInfo?.circulatingSupply || '0';
        const genesisSupply = info.genesisInfo?.genesisSupply || '0';
        const isActive = BigInt(circulatingSupply) > 0n;
        const isFixed = !info.genesisInfo?.authPubkey || info.genesisInfo.authPubkey === '';
        const isDeleted = isFixed && !isActive && BigInt(genesisSupply) > 0n;
        
        const isFromJlnWallet = jlnWalletTokenIds.has(b.tokenId) || !!tokenDetails;
        const isReferenced = !!profileInfo;
        
        return {
          ...b,
          name: info.genesisInfo?.tokenName || profileInfo?.name || "Jeton Non Référencé",
          ticker: info.genesisInfo?.tokenTicker || "UNK",
          decimals: info.genesisInfo?.decimals || 0,
          image: tokenDetails?.image || profileInfo?.image || info.genesisInfo?.url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EToken%3C/text%3E%3C/svg%3E",
          protocol: profileInfo?.protocol || "ALP",
          website: profileInfo?.website || "",
          profileName: profileInfo?.name || null,
          purpose: tokenDetails?.purpose || '',
          counterpart: tokenDetails?.counterpart || '',
          isFixed: false,
          balance: balance,
          holdersCount: holdersCount,
          isReferenced: isReferenced,
          isFromJlnWallet: isFromJlnWallet,
          isActive: isActive,
          isDeleted: isDeleted,
          verified: profileInfo?.verified || false,
          verificationStatus: profileInfo?.verificationStatus || (profileInfo?.verified ? 'verified' : 'unverified'),
          hasMintBaton: true,
          isVisible: tokenDetails?.isVisible !== false,
          isLinked: tokenDetails?.isLinked !== false
        };
      }));
      
      const validTokens = enriched.filter(t => t !== null);
      const fixedSupplyTokens = [];
      
      for (const tokenEntry of allTokensFromProfiles) {
        const alreadyInList = validTokens.some(t => t.tokenId === tokenEntry.tokenId);
        if (alreadyInList) continue;
        
        try {
          const info = await wallet.getTokenInfo(tokenEntry.tokenId);
          let balance = '0';
          try {
            const balanceData = await wallet.getTokenBalance(tokenEntry.tokenId);
            balance = balanceData.balance || '0';
          } catch (e) { continue; }
          
          const hasTokens = BigInt(balance) > 0n;
          if (!hasTokens) continue;
          
          const circulatingSupply = info.genesisInfo?.circulatingSupply || '0';
          const isActive = BigInt(circulatingSupply) > 0n;
          
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
            isFixed: true,
            balance: balance,
            isReferenced: isReferenced,
            isFromJlnWallet: isFromJlnWallet,
            isActive: isActive,
            isDeleted: false,
            verified: profileInfo?.verified || false,
            verificationStatus: profileInfo?.verificationStatus || (profileInfo?.verified ? 'verified' : 'none'),
            hasMintBaton: false,
            isCreator: true,
            isVisible: tokenDetails?.isVisible !== false,
            isLinked: tokenDetails?.isLinked !== false
          });
        } catch (err) {}
      }
      
      setTokens([...validTokens, ...fixedSupplyTokens]);
    } catch (err) {
      console.error('❌ Erreur chargement données jetons:', err);
      setNotification({ type: 'error', message: 'Impossible de charger les jetons' });
    } finally {
      setLoadingTokens(false);
    }
  }, [wallet, profiles, isAdmin, address, setNotification]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    const loadGlobalHistory = async () => {
      if (!address) return;
      setLoadingHistory(true);
      try {
        const historyData = await getGlobalHistory(address);
        setGlobalHistory(historyData);
      } catch (err) {
        console.error('❌ Erreur historique:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadGlobalHistory();
  }, [address]);

  const renderAdminDebugCard = () => (
    <Card style={{ marginTop: '12px', border: '1px solid #e5e7eb' }}>
      <CardContent style={{ padding: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>🔍 Admin Debug Info</h4>
        <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6b7280' }}>
          <div>Wallet: {address ? 'Connecté' : 'Déconnecté'}</div>
          <div>Balance XEC: {xecBalance}</div>
          <div>Jetons trouvés: {tokens.length}</div>
          <div>Profil chargé: {myProfile ? 'Oui' : 'Non'}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MobileLayout title="Gestionnaire de Jetons">
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
        
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                {myProfile ? (
                  <button
                    onClick={() => navigate('/manage-profile', { state: { activeTab: 'info' } })}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                      padding: '12px 16px', backgroundColor: 'var(--surface-secondary, #f5f5f5)',
                      borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-primary, #e5e7eb)',
                      transition: 'all 0.2s', width: '100%', maxWidth: '300px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <span style={{ fontSize: '1.2rem' }}>🏡</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>{myProfile.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #6b7280)', fontWeight: '500' }}>Gérer votre profil</span>
                  </button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => navigate('/manage-profile', { state: { activeTab: 'info' } })} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🌱</span><span>Créer mon profil</span>
                  </Button>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)', margin: '0 0 16px 0' }}>
              Créez, Importez & Gérez vos jetons à offre variable ou fixe.
            </p>

            {myProfile && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => navigate('/manage-profile', { state: { activeTab: 'security' } })}
                  style={{ padding: '8px 16px', backgroundColor: myProfile.status === 'active' ? '#3b82f6' : '#6b7280', color: '#fff', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}
                >
                  {myProfile.status === 'active' ? '🌐 Profil public' : '📝 Brouillon'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Button onClick={() => setShowCreateModal(true)} variant="primary" fullWidth style={{ height: '80px', fontSize: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>🔨</span><span>Créer un jeton</span>
          </Button>
          <Button onClick={() => setShowImportModal(true)} style={{ height: '80px', fontSize: '1rem', backgroundColor: '#8b5cf6', color: '#fff', border: '2px solid #8b5cf6', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }} fullWidth>
            <span style={{ fontSize: '1.5rem' }}>📥</span><span>Importer</span>
          </Button>
        </div>

        {loadingTokens ? (
          <Card><CardContent style={{ padding: '48px 24px', textAlign: 'center' }}><div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div><p>Recherche des jetons...</p></CardContent></Card>
        ) : tokens.length === 0 ? (
          <>
            <Card><CardContent style={{ padding: '48px 24px', textAlign: 'center' }}><div style={{ fontSize: '5rem', marginBottom: '16px', opacity: 0.3 }}>🔑</div><h3>Aucun jeton géré</h3><p>Créez un jeton avec offre variable pour le gérer ici.</p></CardContent></Card>
            {isAdmin && renderAdminDebugCard()}
          </>
        ) : (
          <>
            {isAdmin && (
              <Card>
                <CardContent style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button onClick={() => setActiveFilter('active')} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: activeFilter === 'active' ? '#10b981' : 'var(--bg-secondary)', color: activeFilter === 'active' ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>🟢 En Circulation</button>
                    <button onClick={() => setActiveFilter('inactive')} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: activeFilter === 'inactive' ? '#6b7280' : 'var(--bg-secondary)', color: activeFilter === 'inactive' ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>⚫ Inactifs</button>
                    <button onClick={() => setActiveFilter('deleted')} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: activeFilter === 'deleted' ? '#ef4444' : 'var(--bg-secondary)', color: activeFilter === 'deleted' ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>🗑️ Supprimés</button>
                    <button onClick={() => setActiveFilter('blocked')} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: activeFilter === 'blocked' ? '#f59e0b' : 'var(--bg-secondary)', color: activeFilter === 'blocked' ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>🚫 Bloqués</button>
                    <button onClick={() => setActiveFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: activeFilter === 'all' ? '#3b82f6' : 'var(--bg-secondary)', color: activeFilter === 'all' ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}>📋 Tous</button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {activeFilter === 'blocked' && isAdmin ? (
              blockedProfiles.map((p) => <BlockedProfileCard key={p.id} profile={p} onUnblock={() => {}} />)
            ) : (
              getFilteredTokens().map((token) => (
                <TokenCard
                  key={token.tokenId}
                  token={{ ...token, balance: formatBalance(token.balance, token.decimals) }}
                  profileId={myProfile?.id}
                  showLinkedToggle={!!myProfile && token.isFromJlnWallet === true}
                  showVisibleToggle={!!myProfile && token.isFromJlnWallet === true}
                  onUpdate={loadTokens}
                />
              ))
            )}
          </>
        )}
 
        <NetworkFeesAvail 
          compact={true} 
          showActions={true} 
          xecBalance={xecBalance}
          fiatValue={price && typeof price.convert === 'function' ? price.convert(xecBalance, currency)?.toFixed(2) : '...'}
          currency={currency}
        />

        {address && (
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div className="section-header">
                <span className="section-icon">📇</span>
                <div className="section-header-content">
                  <h2 className="section-title">Carnet d'Adresses</h2>
                  <p className="section-subtitle">Gérez vos contacts eCash.</p>
                </div>
                <button onClick={() => setShowGlobalAddressBook(!showGlobalAddressBook)} style={{ padding: '8px 16px', backgroundColor: showGlobalAddressBook ? '#3b82f6' : 'var(--bg-secondary)', color: showGlobalAddressBook ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                  {showGlobalAddressBook ? '👁️ Masquer' : '👁️‍🗨️ Afficher'}
                </button>
              </div>
              {showGlobalAddressBook && <div style={{ marginTop: '20px' }}><AddressBook tokenId={null} compact={false} /></div>}
            </CardContent>
          </Card>
        )}

        {address && (
          <Card>
            <CardContent style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 className="section-title">📊 Historique & Transactions</h2>
              </div>
              <Tabs tabs={[{ id: 'creator', label: '🛠️ Actions' }, { id: 'xec', label: '💸 Transactions' }]} activeTab={activeHistoryTab} onChange={setActiveHistoryTab} />
              
              {activeHistoryTab === 'creator' && (
                <div style={{ padding: '24px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
                  {loadingHistory ? <div style={{ textAlign: 'center', color: '#94a3b8' }}>⏳ Chargement...</div> : <HistoryList history={globalHistory} compact={false} />}
                </div>
              )}
              {activeHistoryTab === 'xec' && (
                <div style={{ padding: '24px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
                  <AddressHistory address={address} currency={currency} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-2"><BlockchainStatus /></div>
        </Stack>

        {wallet && <ImportTokenModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImportSuccess={handleImportSuccess} />}
        {wallet && <CreateTokenModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); loadTokens(); }} />}
      </PageLayout>
    </MobileLayout>
  );
};

export default ManageTokenPage;