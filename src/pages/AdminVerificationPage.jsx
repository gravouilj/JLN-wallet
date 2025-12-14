import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader, Badge, Tabs, Textarea, StatusBadge } from '../components/UI';
import AdminProfilCard from '../components/Admin/AdminProfilCard';
import AdminReportCard from '../components/Admin/AdminReportCard';
import { useAdmin } from '../hooks/useAdmin';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useFarmStatus } from '../hooks/useFarmStatus';
import { notificationAtom } from '../atoms';
import { useSetAtom } from 'jotai';
import { FarmService } from '../services/farmService';
import { syncTokenData } from '../utils/tokenSync';
import { supabase } from '../services/supabaseClient';
import { FarmStatusActions, ReportActions } from '../components/Admin/FarmStatusActions';
import { AdminChatSection, AdminReportMessaging } from '../components/Communication';

const AdminVerificationPage = () => {
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
  } = useFarmStatus();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokensInfo, setTokensInfo] = useState({});
  
  // Chat
  const [replyMessage, setReplyMessage] = useState('');
  const [activeChatFarmId, setActiveChatFarmId] = useState(null);
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
      const allFarms = await FarmService.getPendingFarms();
      const reported = await FarmService.getReportedFarms();
      
      const hasUnreadMessage = (farm) => {
        const history = farm.communication_history;
        if (!history || history.length === 0) return false;
        const lastMsg = history[history.length - 1];
        return lastMsg.author !== 'admin' && lastMsg.author !== 'system';
      };
      
      const counts = {
        pending: allFarms.filter(f => 
          ['pending', 'info_requested'].includes(f.verification_status) && hasUnreadMessage(f)
        ).length,
        reported: (reported || []).filter(item => hasUnreadMessage(item.farm)).length,
        all: allFarms.filter(hasUnreadMessage).length
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
      // 1. Récupérer les données
      let filtered = [];
      
      if (activeTab === 'pending') {
        // Demandes en attente de badge (pending + info_requested)
        const allFarms = await FarmService.getPendingFarms();
        filtered = allFarms.filter(f => ['pending', 'info_requested'].includes(f.verification_status));
      } else if (activeTab === 'reported') {
        // Fermes signalées
        const reported = await FarmService.getReportedFarms();
        filtered = reported || [];
      } else if (activeTab === 'all') {
        // Tous les profils (tous statuts)
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        filtered = data || [];
      }

      setRequests(filtered);

      // 2. Enrichir avec infos blockchain (si wallet connecté)
      if (wallet && filtered.length > 0) {
        const infos = {};
        // Extraction sécurisée des fermes selon le type d'objet
        const farmsToScan = activeTab === 'reported' 
          ? filtered.map(r => r.farm).filter(Boolean) 
          : filtered;
        
        for (const farm of farmsToScan) {
          if (Array.isArray(farm.tokens)) {
            for (const token of farm.tokens) {
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

  const handleUpdateStatus = async (farmId, newStatus, message = '') => {
    await updateStatus(farmId, newStatus, message, async () => {
      await loadRequests();
      await calculateUnreadCounts();
    });
  };

  const handleSendMessage = async (farm, messageText, messageType = 'verification') => {
    await sendMessage(farm, messageText, messageType, async () => {
      await loadRequests();
      await calculateUnreadCounts();
    });
  };

  const handleCloseConversation = async (farm) => {
    await closeConversation(farm, async () => {
      await loadRequests();
      await calculateUnreadCounts();
    });
  };

  if (!isAdmin) return <MobileLayout><div className="p-8 text-center">Accès refusé</div></MobileLayout>;

  // Filtrer les requêtes selon la recherche
  const filteredRequests = requests.filter(item => {
    const farm = activeTab === 'reported' ? item.farm : item;
    if (!farm) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      farm.name?.toLowerCase().includes(query) ||
      farm.email?.toLowerCase().includes(query) ||
      farm.owner_address?.toLowerCase().includes(query)
    );
  });

  return (
    <MobileLayout title="Admin Panel">
      <PageLayout hasBottomNav>
        <Stack spacing="md">
          <PageHeader 
            icon="🛡️" 
            title="Administration" 
            subtitle="Validation et Modération"
          />

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
                id: 'all', 
                label: `📊 Tous les profils (${activeTab === 'all' ? requests.length : unreadCounts.all}) ${unreadCounts.all > 0 ? '🔴' : ''}` 
              }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {loading ? (
            <div className="text-center p-8 text-gray-500">Chargement...</div>
          ) : filteredRequests.length === 0 ? (
            <Card><CardContent className="text-center p-8"><div className="text-4xl mb-2">✅</div><p>{searchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucune demande à traiter.'}</p></CardContent></Card>
          ) : (
            filteredRequests.map(item => {
              // Si onglet 'reported', la structure est { farm: {...}, reports: [...] }
              // Sinon, item est directement l'objet farm
              const isReportedTab = activeTab === 'reported';
              const farm = isReportedTab ? item.farm : item;
              const reports = isReportedTab ? item.reports : [];
              
              if (!farm) return null;

              // Rendu selon le type d'onglet
              if (isReportedTab) {
                return (
                  <AdminReportCard
                    key={farm.id}
                    farm={farm}
                    reports={reports}
                    onUpdateStatus={handleUpdateStatus}
                    onSendReportMessage={async (message, showToFarmer) => {
                      await handleSendMessage(farm, message, showToFarmer ? 'general' : 'report');
                      
                      if (showToFarmer && reports.length > 0) {
                        for (const report of reports) {
                          if (!report.visible_to_farmer) {
                            await toggleVisibilityHook(report.id, true, loadRequests);
                          }
                        }
                      }
                    }}
                    onToggleReportVisibility={(reportId, visible) => 
                      toggleVisibilityHook(reportId, visible, loadRequests)
                    }
                    onIgnoreReports={async (farmId) => {
                      await ignoreReportsHook(farmId, supabase, loadRequests);
                    }}
                    processing={processing === farm.id}
                  />
                );
              } else {
                return (
                  <AdminProfilCard
                    key={farm.id}
                    farm={farm}
                    onUpdateStatus={handleUpdateStatus}
                    onSendMessage={(message, type) => handleSendMessage(farm, message, type)}
                    onCloseConversation={() => handleCloseConversation(farm)}
                    showActions={activeTab === 'pending'}
                    processing={processing === farm.id}
                  />
                );
              }
            })
          )}
        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default AdminVerificationPage;