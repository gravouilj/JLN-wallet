import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader, Badge, Tabs, Textarea, StatusBadge } from '../components/UI';
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
              
              if (!farm) return null; // Évite le crash si farm est undefined

              // Détection nouveau message du créateur (exclure admin ET system)
              const lastMsg = farm.communication_history?.slice(-1)[0];
              const hasNewReply = lastMsg && lastMsg.author !== 'admin' && lastMsg.author !== 'system';

              return (
                <Card key={farm.id} style={{ borderLeft: hasNewReply ? '4px solid #3b82f6' : '1px solid #e5e7eb' }}>
                  <CardContent>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                          {farm.name}
                          {hasNewReply && <Badge variant="info">💬 Nouvelle réponse</Badge>}
                        </h3>
                        <div className="text-xs text-gray-500 font-mono mt-1">ID: {farm.owner_address.substring(0, 12)}...</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <StatusBadge 
                          status={farm.status} 
                          type="farm"
                        />
                        <StatusBadge 
                          status={farm.verification_status} 
                          type="verification"
                        />
                      </div>
                    </div>

                    {/* Infos Ferme */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded space-y-1">
                        <p><strong>📍 Adresse:</strong> {farm.street_address || farm.address || farm.city || 'Non renseignée'}</p>
                        <p><strong>🏙️ Ville:</strong> {farm.city || 'Non renseignée'} {farm.postal_code ? `(${farm.postal_code})` : ''}</p>
                        <p><strong>📧 Email:</strong> {farm.email ? <a href={`mailto:${farm.email}`} className="text-blue-500">{farm.email}</a> : 'Non renseigné'}</p>
                        <p><strong>📞 Tel:</strong> {farm.phone || 'Non renseigné'}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded space-y-1">
                        <p><strong>🏢 SIRET:</strong> {farm.certifications?.siret || 'Non renseigné'}</p>
                        {farm.certifications?.siret_link && (
                          <a href={farm.certifications.siret_link} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                            🔗 Vérifier la preuve
                          </a>
                        )}
                        <p><strong>👤 Représentant:</strong> {farm.certifications?.legal_representative || 'Non renseigné'}</p>
                      </div>
                    </div>

                    {/* SECTION SPÉCIALE SIGNALEMENTS - Dissociation Ouverts/Clos */}
                    {activeTab === 'reported' && reports.length > 0 && (() => {
                      const openReports = reports.filter(r => r.admin_status !== 'resolved');
                      const closedReports = reports.filter(r => r.admin_status === 'resolved');
                      
                      return (
                        <div className="mb-6">
                          {/* SIGNALEMENTS OUVERTS */}
                          {openReports.length > 0 && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                              <h4 className="font-bold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                                🚨 {openReports.length} Signalement(s) OUVERT{openReports.length > 1 ? 'S' : ''}
                              </h4>
                              <div className="space-y-3">
                                {openReports.map((report, idx) => (
                                  <div key={idx} className="text-sm bg-white dark:bg-gray-800 p-3 rounded border border-red-100 dark:border-red-900">
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                          Motif : "{report.reason}"
                                        </p>
                                        {report.details && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {report.details}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Toggle de visibilité */}
                                      <div className="flex flex-col items-end gap-2">
                                        <button
                                          onClick={async () => {
                                            await toggleVisibilityHook(
                                              report.id, 
                                              !report.visible_to_farmer, 
                                              loadRequests
                                            );
                                          }}
                                          disabled={processing === farm.id}
                                          className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
                                            report.visible_to_farmer 
                                              ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' 
                                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                          }`}
                                        >
                                          {report.visible_to_farmer ? '👁️ Visible' : '🙈 Masqué'}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                                      <div className="flex gap-3">
                                        <span>👤 Par : {report.reporter_address.substring(0, 10)}...</span>
                                        <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* SIGNALEMENTS CLOS */}
                          {closedReports.length > 0 && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-l-4 border-gray-400 rounded-r-lg">
                              <details>
                                <summary className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 cursor-pointer">
                                  ✓ {closedReports.length} Signalement(s) CLOS
                                </summary>
                                <div className="space-y-3 mt-3">
                                  {closedReports.map((report, idx) => (
                                    <div key={idx} className="text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 opacity-60">
                                      <div className="flex justify-between items-start gap-3 mb-2">
                                        <div className="flex-1">
                                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                            Motif : "{report.reason}"
                                          </p>
                                          {report.details && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                              {report.details}
                                            </p>
                                          )}
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
                                          ✓ Résolu
                                        </span>
                                      </div>
                                      
                                      <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span>👤 Par : {report.reporter_address.substring(0, 10)}...</span>
                                        <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Tokens Liés - Avec Liens */}
                    {farm.tokens && farm.tokens.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-xs text-gray-500 uppercase mb-2">Jetons associés</h4>
                        <div className="flex flex-wrap gap-2">
                          {farm.tokens.map((t, i) => (
                            <Button 
                              key={i} 
                              size="sm" 
                              variant="outline" 
                              style={{ fontSize: '0.75rem', height: '32px', padding: '0 12px' }}
                              onClick={() => navigate(`/token/${t.tokenId}`)}
                            >
                              🪙 {t.ticker || 'UNK'} ↗
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Admin - Selon l'onglet */}
                    {activeTab === 'reported' ? (
                      <AdminReportMessaging
                        farm={farm}
                        reports={reports}
                        onSendReportMessage={async (message, showToFarmer) => {
                          // Envoyer comme message général pour qu'il apparaisse dans la section Messages généraux
                          await handleSendMessage(farm, message, showToFarmer ? 'general' : 'report');
                          
                          // Si le message doit être visible, rendre tous les reports visibles
                          if (showToFarmer && reports.length > 0) {
                            for (const report of reports) {
                              if (!report.visible_to_farmer) {
                                await toggleVisibilityHook(report.id, true, loadRequests);
                              }
                            }
                          }
                        }}
                        onToggleReportVisibility={toggleVisibilityHook}
                        loading={processing === farm.id}
                      />
                    ) : (
                      <AdminChatSection
                        farm={farm}
                        onSendMessage={(message, type) => handleSendMessage(farm, message, type)}
                        onSendGeneralMessage={(message, type) => handleSendMessage(farm, message, type)}
                        onCloseConversation={() => handleCloseConversation(farm)}
                        loading={processing === farm.id}
                      />
                    )}

                    {/* Actions Finales - Spécifiques selon l'onglet */}
                    {activeTab === 'pending' && (
                      <div className="flex gap-2 justify-end mt-6">
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleUpdateStatus(farm.id, 'rejected')}
                          disabled={processing === farm.id}
                        >
                          🚫 Refuser
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}
                          onClick={() => handleUpdateStatus(farm.id, 'verified')}
                          disabled={processing === farm.id}
                        >
                          ✅ Valider Badge
                        </Button>
                      </div>
                    )}
                    
                    {/* Onglet REPORTED : Actions de modération */}
                    {activeTab === 'reported' && (
                      <div className="flex gap-2 justify-end mt-6">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            await ignoreReportsHook(farm.id, supabase, loadRequests);
                          }}
                          disabled={processing === farm.id}
                        >
                          ⏭️ Ignorer
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleUpdateStatus(farm.id, 'suspended')}
                          disabled={processing === farm.id}
                        >
                          ⏸️ Suspendre
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleUpdateStatus(farm.id, 'banned')}
                          disabled={processing === farm.id}
                        >
                          🛑 Bannir
                        </Button>
                      </div>
                    )}

                    {/* Actions Rapides - Toujours disponibles */}
                    <FarmStatusActions
                      farm={farm}
                      onStatusChange={handleUpdateStatus}
                      processing={processing === farm.id}
                    />

                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default AdminVerificationPage;