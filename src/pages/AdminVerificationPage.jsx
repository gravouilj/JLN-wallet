import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader } from '../components/UI';
import { useAdmin } from '../hooks/useAdmin';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { notificationAtom } from '../atoms';
import { FarmService } from '../services/farmService';
import { syncTokenData } from '../utils/tokenSync';

const AdminVerificationPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isChecking } = useAdmin(); // Récupérer isChecking
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unverifiedFarms, setUnverifiedFarms] = useState([]);
  const [reportedFarms, setReportedFarms] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [tokensInfo, setTokensInfo] = useState({});
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'unverified', ou 'reported'

  useEffect(() => {
    // Attendre que le check admin soit terminé
    if (isChecking) {
      console.log('⏳ AdminVerificationPage: Attente vérification admin...');
      return;
    }
    
    if (!isAdmin) {
      console.log('❌ AdminVerificationPage: Accès refusé, redirection...');
      navigate('/');
      return;
    }

    console.log('✅ AdminVerificationPage: Accès autorisé');
    loadPendingRequests();
  }, [isAdmin, isChecking, navigate]);

  const loadPendingRequests = async () => {
    try {
      // Charger les demandes depuis Supabase (Cloud)
      const allFarms = await FarmService.getPendingFarms();
      
      // Séparer pending et unverified
      const pending = allFarms.filter(f => f.verification_status === 'pending' || f.verification_status === 'info_requested');
      const unverified = allFarms.filter(f => f.verification_status === 'unverified');
      
      console.log('📋 Demandes de vérification depuis Supabase:', {
        pending: pending.length,
        unverified: unverified.length,
        total: allFarms.length
      });
      
      setPendingRequests(pending);
      setUnverifiedFarms(unverified);
      
      // Charger les fermes signalées
      const reported = await FarmService.getReportedFarms();
      console.log('🚨 Fermes signalées:', reported.length);
      setReportedFarms(reported);
    
      // Charger les infos blockchain pour chaque token
      if (wallet && allFarms.length > 0) {
        const infos = {};
        for (const farm of allFarms) {
          // Structure Supabase: farm.tokens est un array JSONB
          if (Array.isArray(farm.tokens) && farm.tokens.length > 0) {
            for (const token of farm.tokens) {
              try {
                const tokenData = await syncTokenData(token.tokenId, wallet);
                infos[token.tokenId] = tokenData;
              } catch (err) {
                console.error(`Erreur chargement token ${token.tokenId}:`, err);
              }
            }
          }
        }
        setTokensInfo(infos);
      }
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
    }
  };

  const handleApprove = async (farm) => {
    setProcessing(farm.id);
    try {
      // Mettre à jour le statut dans Supabase
      await FarmService.adminUpdateStatus(farm.id, 'verified');
      
      console.log('✅ Ferme approuvée:', farm.name);

      setNotification({
        type: 'success',
        message: `✅ Ferme "${farm.name}" approuvée ! Elle est maintenant visible dans l'annuaire.`
      });

      // Recharger les demandes
      loadPendingRequests();
    } catch (err) {
      console.error('Erreur approbation:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la demande d\'informations'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleIgnoreReport = async (farm) => {
    if (!window.confirm(`Ignorer les signalements pour "${farm.name}" ? La ferme restera visible dans l'annuaire.`)) {
      return;
    }

    setProcessing(farm.id);
    try {
      // Marquer les signalements comme ignorés
      await FarmService.ignoreReports(farm.id, 'Signalements ignorés par admin');
      
      setNotification({
        type: 'success',
        message: `✅ Signalements ignorés pour "${farm.name}". La ferme reste visible.`
      });

      loadPendingRequests();
    } catch (err) {
      console.error('Erreur:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors du traitement'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteFarm = async (farm) => {
    const reason = window.prompt(
      `⚠️ MARQUER POUR SUPPRESSION "${farm.name}" ?\n\nLa ferme sera masquée et supprimée définitivement dans 1 AN.\nLe créateur verra "En cours de suppression".\nVous pourrez la réactiver avant 1 an si erreur.\n\nRaison (obligatoire):`,
      'Arnaque suspectée - Signalements multiples'
    );
    
    if (!reason || !reason.trim()) {
      return;
    }

    setProcessing(farm.id);
    try {
      await FarmService.markForDeletion(farm.id, reason);
      
      setNotification({
        type: 'success',
        message: `⏳ Ferme "${farm.name}" marquée pour suppression (1 an). Le créateur en sera informé.`
      });

      loadPendingRequests();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la suppression'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRequestInfo = async (farm, isFromReport = false) => {
    if (!infoMessage.trim()) {
      setNotification({
        type: 'error',
        message: 'Veuillez saisir un message'
      });
      return;
    }

    setProcessing(farm.id);
    try {
      // Ajouter un préfixe si c'est suite à un signalement
      const messageToSend = isFromReport 
        ? `🚨 SIGNALEMENT REÇU - ${infoMessage}` 
        : infoMessage;
      
      // Mettre à jour le statut dans Supabase
      await FarmService.adminUpdateStatus(farm.id, 'info_requested', messageToSend);

      // Si c'est depuis un signalement, marquer comme "investigating"
      if (isFromReport) {
        await FarmService.markReportsInvestigating(farm.id);
      }

      setNotification({
        type: 'success',
        message: `ℹ️ Demande d'informations envoyée à "${farm.name}".`
      });

      setShowInfoModal(null);
      setInfoMessage('');
      loadPendingRequests();
    } catch (err) {
      console.error('Erreur demande info:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de l\'envoi'
      });
    } finally {
      setProcessing(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <MobileLayout title="Vérification des Fermes">
      <PageLayout hasBottomNav>
        <Stack spacing="md">
          <PageHeader 
            icon="🛡️"
            title="Vérification des Fermes"
            subtitle={`${pendingRequests.length} demande(s) en attente | ${unverifiedFarms.length} ferme(s) non vérifiée(s) | ${reportedFarms.length} signalement(s)`}
          />

          {/* Onglets */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              ⏳ En attente de validation ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('unverified')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'unverified'
                  ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              ⚠️ Non vérifiées ({unverifiedFarms.length})
            </button>
            <button
              onClick={() => setActiveTab('reported')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'reported'
                  ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              🚨 Signalements ({reportedFarms.length})
            </button>
          </div>

          {/* Contenu selon l'onglet actif */}
          {activeTab === 'pending' && pendingRequests.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Aucune demande de vérification en attente
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'unverified' && unverifiedFarms.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Aucune ferme non vérifiée
                </p>
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'reported' && reportedFarms.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Aucun signalement en cours
                </p>
              </CardContent>
            </Card>
          )}

          {/* Liste des fermes selon l'onglet */}
          {activeTab === 'reported' && reportedFarms.map(item => (
            <React.Fragment key={item.farm.id}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {item.farm.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Propriétaire: {item.farm.owner_address.slice(0, 10)}...{item.farm.owner_address.slice(-10)}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      🚨 {item.count} signalement{item.count > 1 ? 's' : ''}
                    </span>
                  </div>

                  {item.farm.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {item.farm.description}
                    </p>
                  )}
                  
                  {/* Raisons des signalements */}
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-300 dark:border-red-800">
                    <h4 className="font-bold mb-3 text-red-900 dark:text-red-200 flex items-center gap-2">
                      🚨 {item.count} Signalement{item.count > 1 ? 's' : ''}
                    </h4>
                    <div className="space-y-3">
                      {item.reports.map((report, idx) => (
                        <div key={idx} className="p-4 bg-white dark:bg-gray-900 rounded-lg border-l-4 border-red-500 shadow-sm">
                          <div className="mb-3">
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
                              {report.reason}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                              📅 {new Date(report.created_at).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric'
                              })}
                              {' à '}
                              {new Date(report.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center gap-1.5 font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              👤 {report.reporter_address}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions admin */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleIgnoreReport(item.farm)}
                      disabled={processing === item.farm.id}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      {processing === item.farm.id ? '⏳ Traitement...' : '👁️ Ne pas tenir compte'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowInfoModal(item.farm.id);
                        setInfoMessage('');
                      }}
                      disabled={processing === item.farm.id}
                      variant="secondary"
                    >
                      ℹ️ Demander plus d'infos
                    </Button>
                    <Button
                      onClick={() => handleHideFarm(item.farm)}
                      disabled={processing === item.farm.id}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {processing === item.farm.id ? '⏳ Traitement...' : '🚫 Masquer du directory'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteFarm(item.farm)}
                      disabled={processing === item.farm.id}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {processing === item.farm.id ? '⏳ Traitement...' : '🗑️ Supprimer (1 an)'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Modal demande info */}
              {showInfoModal === item.farm.id && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                  onClick={() => setShowInfoModal(null)}
                >
                  <div 
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-bold mb-4">🚨 Message au créateur (suite à signalement)</h3>
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        ⚠️ Le créateur verra que ce message fait suite à un signalement.
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Le message apparaîtra sur la page ManageFarm avec un préfixe "🚨 SIGNALEMENT REÇU"
                    </p>
                    <textarea
                      value={infoMessage}
                      onChange={(e) => setInfoMessage(e.target.value)}
                      placeholder="Ex: Votre ferme a été signalée pour informations douteuses. Merci de fournir des preuves de vos certifications..."
                      rows={4}
                      className="w-full p-3 border rounded-lg mb-4 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRequestInfo(item.farm, true)}
                        disabled={!infoMessage.trim() || processing === item.farm.id}
                        className="flex-1"
                      >
                        📤 Envoyer
                      </Button>
                      <Button
                        onClick={() => setShowInfoModal(null)}
                        variant="secondary"
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          
          {activeTab !== 'reported' && (activeTab === 'pending' ? pendingRequests : unverifiedFarms).map(farm => (
            <React.Fragment key={farm.id}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {farm.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {farm.region}, {farm.country}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      farm.verification_status === 'pending' || farm.verification_status === 'info_requested'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    }`}>
                      {farm.verification_status === 'pending' ? '⏳ En attente' : 
                       farm.verification_status === 'info_requested' ? 'ℹ️ Info demandée' : 
                       '⚠️ Non vérifiée'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      {farm.description}
                    </p>
                    
                    {/* Informations de vérification */}
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3">🔍 Informations de vérification</h4>
                      
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-blue-800 dark:text-blue-300">📍 Localisation complète:</span>
                          <p className="text-gray-900 dark:text-gray-100">
                            {[farm.address, farm.location_department, farm.location_region, farm.location_country]
                              .filter(Boolean)
                              .join(', ') || '❌ Non renseignée'}
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-blue-800 dark:text-blue-300">🏢 SIRET / Company ID:</span>
                          <p className="text-gray-900 dark:text-gray-100">
                            {farm.certifications?.siret || '❌ Non renseigné'}
                          </p>
                          {farm.certifications?.siret_link && (
                            <a 
                              href={farm.certifications.siret_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 text-xs hover:underline flex items-center gap-1"
                            >
                              🔗 Vérifier sur le site officiel ↗
                            </a>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-blue-800 dark:text-blue-300">👤 Représentant légal:</span>
                          <p className="text-gray-900 dark:text-gray-100">
                            {farm.certifications?.legal_representative || '❌ Non renseigné'}
                          </p>
                        </div>
                        
                        {(farm.certifications?.national || farm.certifications?.international) && (
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-300">🏆 Certifications:</span>
                            <ul className="list-disc list-inside text-gray-900 dark:text-gray-100 ml-2">
                              {farm.certifications?.national && (
                                <li>
                                  {farm.certifications.national}
                                  {farm.certifications.national_link && (
                                    <a 
                                      href={farm.certifications.national_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 text-xs hover:underline ml-1"
                                    >
                                      (vérifier ↗)
                                    </a>
                                  )}
                                </li>
                              )}
                              {farm.certifications?.international && (
                                <li>
                                  {farm.certifications.international}
                                  {farm.certifications.international_link && (
                                    <a 
                                      href={farm.certifications.international_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 text-xs hover:underline ml-1"
                                    >
                                      (vérifier ↗)
                                    </a>
                                  )}
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Réseaux sociaux */}
                    {(farm.socials?.facebook || farm.socials?.instagram || farm.socials?.tiktok || 
                      farm.socials?.youtube || farm.socials?.whatsapp || farm.socials?.telegram || 
                      farm.socials?.other_website) && (
                      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <span className="font-medium text-gray-600 dark:text-gray-400">🌐 Réseaux sociaux:</span>
                        <div className="text-sm text-gray-900 dark:text-gray-100 mt-2 space-y-1">
                          {farm.socials?.facebook && (
                            <div>
                              📘 Facebook: <a href={farm.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{farm.socials.facebook} ↗</a>
                            </div>
                          )}
                          {farm.socials?.instagram && (
                            <div>📸 Instagram: {farm.socials.instagram}</div>
                          )}
                          {farm.socials?.tiktok && (
                            <div>🎵 TikTok: {farm.socials.tiktok}</div>
                          )}
                          {farm.socials?.youtube && (
                            <div>
                              📺 YouTube: <a href={farm.socials.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{farm.socials.youtube} ↗</a>
                            </div>
                          )}
                          {farm.socials?.whatsapp && (
                            <div>💬 WhatsApp: {farm.socials.whatsapp}</div>
                          )}
                          {farm.socials?.telegram && (
                            <div>✈️ Telegram: {farm.socials.telegram}</div>
                          )}
                          {farm.socials?.other_website && (
                            <div>
                              🔗 Autre site: <a href={farm.socials.other_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{farm.socials.other_website} ↗</a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Produits:</span>
                        <p className="text-gray-900 dark:text-gray-100">
                          {Array.isArray(farm.products) ? farm.products.join(', ') : 'Non renseigné'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Services:</span>
                        <p className="text-gray-900 dark:text-gray-100">
                          {Array.isArray(farm.services) ? farm.services.join(', ') : 'Non renseigné'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Contact:</span>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        📧 {farm.email || 'Non renseigné'}<br />
                        📞 {farm.phone || 'Non renseigné'}<br />
                        🌐 {farm.website ? (
                          <a 
                            href={farm.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {farm.website} ↗
                          </a>
                        ) : 'Non renseigné'}
                      </p>
                    </div>

                    {farm.tokens && farm.tokens.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Token(s):</span>
                        {farm.tokens.map((token, idx) => {
                          const tokenData = tokensInfo[token.tokenId];
                          return (
                            <div key={idx} className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                              <strong>{tokenData?.ticker || token.ticker || 'UNK'}</strong> - {token.purpose || 'Aucun objectif renseigné'}
                              {tokenData && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Supply: {tokenData.circulatingSupply} / {tokenData.genesisSupply} | Decimals: {tokenData.decimals}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {farm.verification_status === 'unverified' ? (
                      <>
                        <Button
                          onClick={() => handleApprove(farm)}
                          disabled={processing === farm.id}
                          variant="primary"
                          fullWidth
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          {processing === farm.id ? '⌛ Traitement...' : '✅ Valider quand même'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowInfoModal(farm.id);
                            setInfoMessage('');
                          }}
                          disabled={processing === farm.id}
                          variant="outline"
                          fullWidth
                          style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                        >
                          ℹ️ Demander plus d'informations
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!window.confirm(`Êtes-vous sûr de vouloir masquer "${farm.name}" ? Cette ferme sera supprimée définitivement.`)) {
                              return;
                            }
                            setProcessing(farm.id);
                            try {
                              // TODO: Implémenter suppression définitive ou masquage
                              await FarmService.deleteFarm(farm.id);
                              setNotification({
                                type: 'success',
                                message: `🗑️ Ferme "${farm.name}" masquée`
                              });
                              loadPendingRequests();
                            } catch (err) {
                              console.error('Erreur masquage:', err);
                              setNotification({
                                type: 'error',
                                message: 'Erreur lors du masquage'
                              });
                            } finally {
                              setProcessing(null);
                            }
                          }}
                          disabled={processing === farm.id}
                          variant="outline"
                          fullWidth
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        >
                          🗑️ Masquer (arnaque suspectée)
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleApprove(farm)}
                          disabled={processing === farm.id}
                          variant="primary"
                          fullWidth
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          {processing === farm.id ? '⌛ Traitement...' : '✅ Valider'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowInfoModal(farm.id);
                            setInfoMessage('');
                          }}
                          disabled={processing === farm.id}
                          variant="outline"
                          fullWidth
                          style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                        >
                          ℹ️ Demander plus d'informations
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Modal demande d'informations */}
              {showInfoModal === farm.id && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Demander des informations complémentaires</h3>
                    <textarea
                      value={infoMessage}
                      onChange={(e) => setInfoMessage(e.target.value)}
                      placeholder="Expliquez quelles informations sont nécessaires..."
                      rows={4}
                      className="w-full p-3 border rounded-lg mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRequestInfo(farm)}
                        disabled={!infoMessage.trim() || processing === farm.id}
                        variant="primary"
                        fullWidth
                      >
                        📤 Envoyer
                      </Button>
                      <Button
                        onClick={() => {
                          setShowInfoModal(null);
                          setInfoMessage('');
                        }}
                        variant="outline"
                        fullWidth
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          <Button
            onClick={() => navigate('/manage-token')}
            variant="outline"
            fullWidth
          >
            ← Retour
          </Button>
        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default AdminVerificationPage;
