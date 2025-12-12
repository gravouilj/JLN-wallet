import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader, Badge, Tabs, Textarea } from '../components/UI';
import { useAdmin } from '../hooks/useAdmin';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { notificationAtom } from '../atoms';
import { useSetAtom } from 'jotai';
import { FarmService } from '../services/farmService';
import { syncTokenData } from '../utils/tokenSync';

const AdminVerificationPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [tokensInfo, setTokensInfo] = useState({});
  
  // Chat
  const [replyMessage, setReplyMessage] = useState('');
  const [activeChatFarmId, setActiveChatFarmId] = useState(null);

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin, activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les données
      const allFarms = await FarmService.getPendingFarms(); 
      const reported = await FarmService.getReportedFarms();

      let filtered = [];
      if (activeTab === 'pending') {
        filtered = allFarms.filter(f => ['pending', 'info_requested'].includes(f.verification_status));
      } else if (activeTab === 'unverified') {
        filtered = allFarms.filter(f => f.verification_status === 'unverified');
      } else if (activeTab === 'verified') {
        // Charger toutes les fermes vérifiées
        const verifiedFarms = await FarmService.getVerifiedFarms();
        filtered = verifiedFarms || [];
      } else if (activeTab === 'rejected') {
        filtered = allFarms.filter(f => f.verification_status === 'rejected');
      } else if (activeTab === 'banned') {
        // Charger les fermes bannies (status = 'banned' ou 'pending_deletion')
        const bannedFarms = await FarmService.getBannedFarms();
        filtered = bannedFarms || [];
      } else if (activeTab === 'reported') {
        filtered = reported || []; 
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
  };

  const handleUpdateStatus = async (farmId, newStatus, message = null) => {
    // Si c'est un refus, demander confirmation forte
    if (newStatus === 'rejected') {
        const reason = window.prompt("Motif du refus (sera envoyé au créateur) :", "Informations incomplètes ou incorrectes.");
        if (!reason) return;
        message = reason; // Le message devient le motif
    } else if (newStatus === 'banned') {
        const reason = window.prompt("⚠️ BANNIR CETTE FERME ?\n\nLa ferme sera masquée de l'annuaire et marquée comme bannie.\nLe créateur ne pourra plus modifier son profil.\n\nMotif (obligatoire) :", "Violation répétée des conditions d'utilisation");
        if (!reason || !reason.trim()) return;
        
        // Bannir implique un changement de status ET verification_status
        try {
          setProcessing(farmId);
          await FarmService.banFarm(farmId, reason);
          setNotification({ type: 'success', message: '🚫 Ferme bannie avec succès' });
          loadRequests();
          return;
        } catch (err) {
          console.error(err);
          setNotification({ type: 'error', message: 'Erreur lors du bannissement' });
          return;
        } finally {
          setProcessing(null);
        }
    } else if (!window.confirm(`Confirmer le statut : ${newStatus} ?`)) {
        return;
    }

    setProcessing(farmId);
    try {
      await FarmService.adminUpdateStatus(farmId, newStatus, message);
      
      // Si refusé, on ajoute aussi un message dans le chat pour l'historique
      if (newStatus === 'rejected' && message) {
         // Logique d'ajout message via updateFarm interne si besoin, 
         // mais adminUpdateStatus gère déjà admin_message
      }

      setNotification({ type: 'success', message: `Statut mis à jour : ${newStatus}` });
      loadRequests();
    } catch (err) {
      setNotification({ type: 'error', message: 'Erreur mise à jour' });
    } finally {
      setProcessing(null);
    }
  };

  const handleSendMessage = async (farm) => {
    if (!replyMessage.trim()) return;
    setProcessing(farm.id);
    try {
      const currentHistory = farm.communication_history || [];
      const newMessage = {
        author: 'admin',
        message: replyMessage.trim(),
        timestamp: new Date().toISOString()
      };
      
      await FarmService.updateFarm(farm.owner_address, {
        communication_history: [...currentHistory, newMessage],
        verification_status: 'info_requested' // Passe en demande d'info
      });

      setReplyMessage('');
      setNotification({ type: 'success', message: 'Message envoyé !' });
      loadRequests(); // Recharger pour voir la mise à jour
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (!isAdmin) return <MobileLayout><div className="p-8 text-center">Accès refusé</div></MobileLayout>;

  return (
    <MobileLayout title="Admin Panel">
      <PageLayout hasBottomNav>
        <Stack spacing="md">
          <PageHeader 
            icon="🛡️" 
            title="Administration" 
            subtitle="Validation et Modération"
          />

          <Tabs 
            tabs={[
              { id: 'pending', label: `⏳ En Attente (${activeTab === 'pending' ? requests.length : '?'})` },
              { id: 'unverified', label: '📋 Non Vérifié' },
              { id: 'verified', label: '✅ Vérifiés' },
              { id: 'rejected', label: '🚫 Refusés' },
              { id: 'reported', label: '🚨 Signalés' },
              { id: 'banned', label: '🛑 Bannis' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {loading ? (
            <div className="text-center p-8 text-gray-500">Chargement...</div>
          ) : requests.length === 0 ? (
            <Card><CardContent className="text-center p-8"><div className="text-4xl mb-2">✅</div><p>Aucune demande à traiter.</p></CardContent></Card>
          ) : (
            requests.map(item => {
              // Sécurisation des données (Reported vs Standard)
              const farm = activeTab === 'reported' ? item.farm : item;
              const reports = activeTab === 'reported' ? item.reports : [];
              
              if (!farm) return null; // Évite le crash si farm est undefined

              // Détection nouveau message du créateur
              const lastMsg = farm.communication_history?.slice(-1)[0];
              const hasNewReply = lastMsg && lastMsg.author !== 'admin';

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
                      <Badge variant={farm.verification_status === 'pending' ? 'warning' : 'neutral'}>
                        {farm.verification_status}
                      </Badge>
                    </div>

                    {/* Infos Ferme */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded space-y-1">
                        <p><strong>📍 Adresse:</strong> {farm.address}</p>
                        <p><strong>📧 Email:</strong> <a href={`mailto:${farm.email}`} className="text-blue-500">{farm.email}</a></p>
                        <p><strong>📞 Tel:</strong> {farm.phone || '-'}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded space-y-1">
                        <p><strong>🏢 SIRET:</strong> {farm.certifications?.siret || 'N/A'}</p>
                        {farm.certifications?.siret_link && (
                          <a href={farm.certifications.siret_link} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                            🔗 Vérifier la preuve
                          </a>
                        )}
                        <p><strong>👤 Représentant:</strong> {farm.certifications?.legal_representative || 'N/A'}</p>
                      </div>
                    </div>

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

                    {/* Chat Admin */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button 
                        onClick={() => setActiveChatFarmId(activeChatFarmId === farm.id ? null : farm.id)}
                        className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-2 w-full hover:underline"
                      >
                        {activeChatFarmId === farm.id ? '▼ Masquer' : '▶ Afficher'} l'historique ({farm.communication_history?.length || 0})
                      </button>

                      {activeChatFarmId === farm.id && (
                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg animate-fade-in">
                          <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                            {(farm.communication_history || []).map((msg, idx) => (
                              <div key={idx} className={`flex flex-col ${msg.author === 'admin' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${msg.author === 'admin' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                                  {msg.message}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1">
                                  {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Textarea 
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Message à envoyer..."
                              style={{ minHeight: '40px', marginBottom: 0 }}
                            />
                            <Button onClick={() => handleSendMessage(farm)} style={{ height: 'auto' }} disabled={processing === farm.id}>Envoyer</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Finales */}
                    <div className="flex gap-2 justify-end mt-6">
                      {activeTab === 'pending' && (
                        <>
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
                            ✅ Valider
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Barre Actions Rapides (Tous les onglets) */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">⚡ Actions Rapides</span>
                        <div className="flex gap-2">
                          {farm.verification_status !== 'verified' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateStatus(farm.id, 'verified')} 
                              disabled={processing === farm.id}
                              style={{ 
                                height: '32px', 
                                fontSize: '0.75rem', 
                                backgroundColor: '#10b981', 
                                borderColor: '#10b981',
                                padding: '0 12px'
                              }}
                            >
                              ✅ Valider
                            </Button>
                          )}
                          {farm.verification_status !== 'rejected' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateStatus(farm.id, 'rejected')} 
                              disabled={processing === farm.id}
                              style={{ 
                                height: '32px', 
                                fontSize: '0.75rem', 
                                backgroundColor: '#f59e0b', 
                                borderColor: '#f59e0b',
                                color: '#fff',
                                padding: '0 12px'
                              }}
                            >
                              🚫 Refuser
                            </Button>
                          )}
                          {farm.status !== 'banned' && farm.status !== 'pending_deletion' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateStatus(farm.id, 'banned')} 
                              disabled={processing === farm.id}
                              style={{ 
                                height: '32px', 
                                fontSize: '0.75rem', 
                                backgroundColor: '#ef4444', 
                                borderColor: '#ef4444',
                                color: '#fff',
                                padding: '0 12px'
                              }}
                            >
                              🛑 Bannir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

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