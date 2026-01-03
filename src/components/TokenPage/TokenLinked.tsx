import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { profilService } from '../../services/profilService';
import { updateTokenLinkedStatus, checkActiveTicketsForToken } from '../../services/tokenLinkedService';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { notificationAtom } from '../../atoms';
import antifraudService from '../../services/antifraudService';
import { ActiveReportsWarningModal, ActiveHoldersWarningModal } from '../../features/profile/components/AntifraudModals';
import { Switch, Modal, Button } from '../UI';

/**
 * TokenLinked - Switch pour lier/dissocier un jeton du profil public et de la base de donnée supabase. Il permet une utilisation flexible des jetons créés/importés sur jlnwallet (permisionless).
 * 
 * Si lié (par défaut): le jeton DOIT avoir à minima un objectif et une contrepartie publique (stockée dans supabase). Il apparaît dans ManageTokenPage, ManageProfilePage et peut donc être affiché/masqué dans le profil public (DirectoryPage).
 * Les informations enrichies du jeton sont synchronisées avec la base de donnée supabase, sont accessibles par les visiteurs de DirectoryPage et les détenteurs. Les détenteurs peuvent aussi interagir avec le createur via les infos du jeton (lien, image...) et le contacter directement sur jlnwallet.
 * Si dissocié : 
 * Le jeton est visible dans ManageTokenPage pour le Créateur mais il n'apparaît pas dans ManageProfilePage et ne peut pas être affiché sur le profil public (DirectoryPage)
 * Ses infos ne sont pas stockées dans la base de donnée supabase. TokenPage ne montre que les informations basiques issues de la blockchain (name, ticker, offer, tokenId, totalSupply, holdersCount, transactions...).  
 * Le créateur ne peut pas gérer les infos enrichies du jeton dans TokenPage (objectif, contrepartie, image, lien...). Les détenteurs peuvent interagir avec le jeton via jlnwallet et la blockchain, mais sans possibilité de contacter le créateur via jlnwallet.
 * Utilisation : Permettre aux créateurs de choisir si leurs jetons sont liés à un profil public (visibilité, gestion des infos) ou non (anonymat, gestion décentralisée et permissionless via la blockchain uniquement).
 * 
 * @param {string} tokenId - ID du jeton
 * @param {string} profileId - ID du profil du créateur
 * @param {boolean} initialIsLinked - État initial de liaison (par défaut true)
 * @param {function} onUpdate - Callback lors de la mise à jour de l'état de liaison

*/
const TokenLinked = ({ tokenId, profileId, isLinked: initialIsLinked = true, onUpdate }) => {
  const { address, wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  const [isLinked, setIsLinked] = useState(initialIsLinked);
  const [loading, setLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeTicketsInfo, setActiveTicketsInfo] = useState(null);
  
  // États pour les modals anti-arnaque
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showHoldersModal, setShowHoldersModal] = useState(false);
  const [validationData, setValidationData] = useState(null);

  // Synchroniser avec les changements de props
  useEffect(() => {
    setIsLinked(initialIsLinked);
  }, [initialIsLinked]);

  const handleToggle = async () => {
    if (!address || !profileId) {
      setNotification({
        type: 'error',
        message: 'Erreur : Aucune adresse wallet ou profil'
      });
      return;
    }

    setLoading(true);

    // Si on essaie de délier (true → false), vérifier les tickets actifs
    if (isLinked === true) {
      try {
        const ticketCheck = await checkActiveTicketsForToken(tokenId, profileId);
        
        if (ticketCheck.hasActiveTickets) {
          setActiveTicketsInfo(ticketCheck);
          setShowWarningModal(true);
          setLoading(false);
          return;
        }

        // Valider avec le système anti-arnaque
        const validation = await antifraudService.validateTokenToggle(profileId, wallet, tokenId);
        setValidationData(validation);

        // Cas 1: Signalements actifs + détenteurs → BLOQUER
        if (!validation.canToggle && validation.blockReason === 'signalements_actifs') {
          // Bloquer automatiquement le créateur
          await antifraudService.blockCreator(
            profileId, 
            `Tentative de modification isLinked avec ${validation.activeReports} signalement(s) actif(s)`
          );
          
          setShowReportsModal(true);
          setLoading(false);
          return;
        }

        // Cas 2: Détenteurs actifs mais pas de signalements → AVERTIR
        if (validation.showWarning && validation.activeHolders > 0) {
          setShowHoldersModal(true);
          setLoading(false);
          return;
        }

      } catch (err) {
        console.error('Erreur vérification tickets:', err);
        setNotification({
          type: 'error',
          message: 'Erreur lors de la vérification des tickets'
        });
        setLoading(false);
        return;
      }
    }

    // Procéder au changement
    await performToggle();
  };

  const performToggle = async () => {
    setLoading(true);
    try {
      const result = await updateTokenLinkedStatus(tokenId, profileId, !isLinked);
      
      if (!result.success) {
        setNotification({
          type: 'error',
          message: result.message
        });
        return;
      }

      setIsLinked(!isLinked);
      if (onUpdate) onUpdate(!isLinked);

      setNotification({
        type: 'success',
        message: result.message
      });

      console.log(`✅ Jeton ${!isLinked ? 'lié' : 'dissocié'} du profil Public`);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour'
      });
      // Restaurer l'état précédent en cas d'erreur
      setIsLinked(isLinked);
    } finally {
      setLoading(false);
      setShowHoldersModal(false);
    }
  };

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🔗</span>
            <span>Lié au profil Public</span>
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)'
          }}>
            {isLinked ? 'Affiché dans votre profil Public' : 'Non affiché dans votre profil Public'}
          </div>
        </div>
        <Switch 
          checked={isLinked}
          onChange={handleToggle}
          disabled={loading}
        />
      </div>

      {/* Modal d'avertissement tickets actifs */}
      <Modal 
        isOpen={showWarningModal} 
        onClose={() => setShowWarningModal(false)}
      >
        <Modal.Header>
          ⚠️ Tickets non traités
        </Modal.Header>
        <Modal.Body>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
              Impossible de délier ce jeton du profil : <strong>{activeTicketsInfo?.ticketCount} ticket(s) ou signalement(s)</strong> sont encore en attente de traitement.
            </p>
            
            {activeTicketsInfo?.details?.byType && (
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px' }}>
                  Répartition :
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                  {activeTicketsInfo.details.byType.client > 0 && (
                    <li>👤 {activeTicketsInfo.details.byType.client} ticket(s) client</li>
                  )}
                  {activeTicketsInfo.details.byType.report > 0 && (
                    <li>🚨 {activeTicketsInfo.details.byType.report} signalement(s)</li>
                  )}
                  {activeTicketsInfo.details.byType.creator > 0 && (
                    <li>🌾 {activeTicketsInfo.details.byType.creator} ticket(s) créateur</li>
                  )}
                </ul>
              </div>
            )}
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Pour des raisons de sécurité et de traçabilité, vous devez d'abord traiter tous les tickets et signalements avant de pouvoir délier ce jeton de votre profil.
            </p>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
              💡 <strong>Astuce :</strong> Rendez-vous dans l'onglet <strong>Support</strong> de votre profil pour traiter ces tickets.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => setShowWarningModal(false)}
          >
            Compris
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal signalements actifs */}
      {showReportsModal && validationData && (
        <ActiveReportsWarningModal
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
          activeReportsCount={validationData.activeReports}
        />
      )}

      {/* Modal détenteurs actifs */}
      {showHoldersModal && validationData && (
        <ActiveHoldersWarningModal
          isOpen={showHoldersModal}
          onClose={() => {
            setShowHoldersModal(false);
            setLoading(false);
          }}
          onConfirm={performToggle}
          activeHoldersCount={validationData.activeHolders}
          actionType="linked"
          newValue={!isLinked}
        />
      )}
    </>
  );
};

export default TokenLinked;
