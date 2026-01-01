import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader, Badge, Tabs, Textarea, StatusBadge } from '../components/UI';
import AdminProfilCard from '../components/Admin/AdminProfilCard';
import AdminReportCard from '../components/Admin/AdminReportCard';
import { useAdmin } from '../hooks/useAdmin';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { notificationAtom } from '../atoms';
import { useSetAtom } from 'jotai';
import { ProfilService } from '../services/profilService';
import { syncTokenData } from '../utils/tokenSync';
import { supabase } from '../services/supabaseClient';
import { ProfilStatusActions, ReportActions } from '../components/Admin/ProfilStatusActions';
import { AdminChatSection, AdminReportMessaging, BlockedProfileManagement } from '../components/Admin';

const AdminVerificationPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  const { 
    processing, 
    updateStatus, 
    sendMessage, 
    closeConversation,
    ignoreReports: ignoreReportsHook,
    toggleReportVisibility: toggleVisibilityHook
  } = useProfileStatus();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokensInfo, setTokensInfo] = useState({});
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  
  // Chat
  const [replyMessage, setReplyMessage] = useState('');
  const [activeChatProfilId, setActiveChatProfilId] = useState(null);
  const [showAllMessages, setShowAllMessages] = useState({});
  
  // Badges de notification par onglet
  const [unreadCounts, setUnreadCounts] = useState({
    pending: 0,
    reported: 0,
    all: 0
  });
  
  // Filtre de recherche
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin, activeTab]);

  // Calculer le nombre de fermes avec nouveau message du créateur pour tous les onglets
  const calculateUnreadCounts = async () => {
    try {
      // Récupérer toutes les fermes
      const allProfils = await ProfilService.getPendingProfils();
      // Charger les profils signalés
      const reported = await ProfilService.getReportedProfils();
      
      const hasUnreadMessage = (profil) => {
        const history = profil.communication_history;
        if (!history || history.length === 0) return false;
        const lastMsg = history[history.length - 1];
        return lastMsg.author !== 'admin' && lastMsg.author !== 'system';
      };
      
      const counts = {
        pending: allProfils.filter(f => 
          ['pending', 'info_requested'].includes(f.verification_status) && hasUnreadMessage(f)
        ).length,
        reported: (reported || []).filter(item => hasUnreadMessage(item.profil)).length,
        all: allProfils.filter(hasUnreadMessage).length
      };
      
      console.log('Badges:', counts);
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Erreur calcul badges:', err);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      // 1. Charger les profils bloqués (temporairement désactivé)
      // await loadBlockedProfiles();
      
      // 2. Récupérer les données selon l'onglet actif
      let filtered = [];
      
      if (activeTab === 'pending') {
        // Demandes en attente de badge (pending + info_requested)
        const allProfils = await ProfilService.getPendingProfils();
        filtered = allProfils.filter(f => ['pending', 'info_requested'].includes(f.verification_status));
      } else if (activeTab === 'blocked') {
        // Profils bloqués (déjà chargés via loadBlockedProfiles)
        filtered = blockedProfiles;
      } else if (activeTab === 'reported') {
        // Fermes signalées
        const reported = await ProfilService.getReportedProfils();
        filtered = reported || [];
      } else if (activeTab === 'all') {
        // Tous les profils (tous statuts)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        filtered = data || [];
      }

      setRequests(filtered);

      // 2. Enrichir avec infos blockchain (si wallet connecté)
      if (wallet && filtered.length > 0) {
        const infos = {};
        // Extraction sécurisée des profils selon le type d'objet
        const profilsToScan = activeTab === 'reported' 
          ? filtered.map(r => r.profil).filter(Boolean) 
          : filtered;
        
        for (const profil of profilsToScan) {
          if (Array.isArray(profil.tokens)) {
            for (const token of profil.tokens) {
              try {
                // On charge sans bloquer l'UI
                syncTokenData(token.tokenId, wallet).then(data => {
                  setTokensInfo(prev => ({ ...prev, [token.tokenId]: data }));
                });
              } catch (err) { console.warn(err); }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Erreur chargement données' });
    } finally {
      setLoading(false);
    }
    
    // Calculer les badges après chargement (avec données en mémoire)
    await calculateUnreadCounts();
  };

  const handleUpdateStatus = async (profilId, newStatus, message = '') => {
    await updateStatus(profilId, newStatus, message, async () => {
      await loadRequests();
      await calculateUnreadCounts();
    });
  };

  const handleSendMessage = async (profil, messageText, messageType = 'verification') => {
    await sendMessage(profil, messageText, messageType, async () => {
      await loadRequests();
      await calculateUnreadCounts();
    });
  };

  const handleCloseConversation = async (profil) => {
    await closeConversation(profil, async () => {
      await loadRequests();
      await calculateUnreadCounts();
    });
  };

  if (!isAdmin) return <MobileLayout><div className="p-8 text-center">Accès refusé</div></MobileLayout>;

  // Filtrer les requêtes selon la recherche
  const filteredRequests = (activeTab === 'blocked' ? blockedProfiles : requests).filter(item => {
    const profil = activeTab === 'reported' ? item.profil : item;
    if (!profil) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      profil.name?.toLowerCase().includes(query) ||
      profil.email?.toLowerCase().includes(query) ||
      profil.owner_address?.toLowerCase().includes(query)
    );
  });

  const pageContent = (
    <PageLayout hasBottomNav>
      <Stack spacing="md">
        {!embedded && (
          <PageHeader 
            icon="🛡️" 
            title="Administration" 
            subtitle="Validation et Modération"
          />
        )}

        {/* Filtre de recherche */}
        <Card>
          <CardContent style={{ padding: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, email ou adresse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                  fontSize: '0.95rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </CardContent>
          </Card>

          <Tabs 
            tabs={[
              { 
                id: 'pending', 
                label: `⏳ En Attente (${activeTab === 'pending' ? requests.length : unreadCounts.pending}) ${unreadCounts.pending > 0 ? '🔴' : ''}` 
              },
              { 
                id: 'reported', 
                label: `🚨 Signalés (${activeTab === 'reported' ? requests.length : unreadCounts.reported}) ${unreadCounts.reported > 0 ? '🔴' : ''}` 
              },
              { 
                id: 'blocked', 
                label: `🚫 Bloqués (${activeTab === 'blocked' ? blockedProfiles.length : blockedProfiles.length})` 
              },
              { 
                id: 'all', 
                label: `📊 Tous les profils (${activeTab === 'all' ? requests.length : unreadCounts.all}) ${unreadCounts.all > 0 ? '🔴' : ''}` 
              }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {loading ? (
            <div className="text-center p-8 text-gray-500">Chargement...</div>
          ) : activeTab === 'blocked' ? (
            <BlockedProfileManagement 
              blockedProfiles={filteredRequests.length > 0 ? filteredRequests : blockedProfiles}
              onUnblock={loadRequests}
              onNotification={setNotification}
              adminAddress={wallet?.address}
            />
          ) : filteredRequests.length === 0 ? (
            <Card><CardContent className="text-center p-8"><div className="text-4xl mb-2">✅</div><p>{searchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucune demande à traiter.'}</p></CardContent></Card>
          ) : (
            filteredRequests.map(item => {
              // Si onglet 'reported', la structure est { profil: {...}, reports: [...] }
              // Sinon, item est directement l'objet profil
              const isReportedTab = activeTab === 'reported';
              const profil = isReportedTab ? item.profil : item;
              const reports = isReportedTab ? item.reports : [];
              
              if (!profil) return null;

              // Rendu selon le type d'onglet
              if (isReportedTab) {
                return (
                  <AdminReportCard
                    key={profil.id}
                    profil={profil}
                    reports={reports}
                    onUpdateStatus={handleUpdateStatus}
                    onSendReportMessage={async (message, showToCreator) => {
                      await handleSendMessage(profil, message, showToCreator ? 'general' : 'report');
                      
                      if (showToCreator && reports.length > 0) {
                        for (const report of reports) {
                          if (!report.visible_to_creator) {
                            await toggleVisibilityHook(report.id, true, loadRequests);
                          }
                        }
                      }
                    }}
                    onToggleReportVisibility={(reportId, visible) => 
                      toggleVisibilityHook(reportId, visible, loadRequests)
                    }
                    onIgnoreReports={async (profilId) => {
                      await ignoreReportsHook(profilId, supabase, loadRequests);
                    }}
                    processing={processing === profil.id}
                  />
                );
              } else {
                return (
                  <AdminProfilCard
                    key={profil.id}
                    profil={profil}
                    onUpdateStatus={handleUpdateStatus}
                    onSendMessage={(message, type) => handleSendMessage(profil, message, type)}
                    onCloseConversation={() => handleCloseConversation(profil)}
                    showActions={activeTab === 'pending'}
                    processing={processing === profil.id}
                  />
                );
              }
            })
          )}
        </Stack>
      </PageLayout>
  );

  return embedded ? pageContent : (
    <MobileLayout title="Admin Panel">
      {pageContent}
    </MobileLayout>
  );
};

export default AdminVerificationPage;