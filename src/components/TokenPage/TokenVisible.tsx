import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { profilService } from '../../services/profilService';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { notificationAtom } from '../../atoms';
import antifraudService from '../../services/antifraudService';
import { ActiveReportsWarningModal, ActiveHoldersWarningModal } from '../../features/profile/components/AntifraudModals';
import { Switch } from '../UI';

/**
 * TokenVisible - Switch pour afficher/masquer un jeton lié (isLinked=true) sur le profil public (DirectoryPage)
 * Si visible (par défaut) : le jeton apparaît dans l'annuaire public (DirectoryPage) avec des données enrichies (objectif & contrepartie à minima) qui sont accessibles aux visiteurs et détenteurs.
 * Si masqué : le jeton n'apparaît pas dans l'annuaire public, mais reste gérable par le créateur depuis ManageTokenPage.
 * Si le jeton est masqué mais lié (isLinked=true), le créateur peut toujours gérer les infos enrichies du jeton dans ManageProfilePage et les détenteurs y accédernt également.
 * Si le jeton est masqué et non lié (isLinked=false), le créateur ne peut plus gérer les infos enrichies du jeton dans ManageProfilePage et les détenteurs les voir, mais ils peuvent toujours interagir avec le jeton via jlnwallet et la blockchain (seules les infos basiques sont disponibles : name, ticker, offer, tokenId, totalSupply, holdersCount, transactions...).
 * Utilisation : Permettre aux créateurs de contrôler la visibilité publique de leurs jetons, tout en conservant la gestion privée.
 */
const TokenVisible = ({ tokenId, profileId, isVisible: initialIsVisible = true, onUpdate, disabled = false }) => {
  const { address, wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  const [isVisible, setIsVisible] = useState(initialIsVisible);
  const [loading, setLoading] = useState(false);
  
  // États pour les modals anti-arnaque
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showHoldersModal, setShowHoldersModal] = useState(false);
  const [validationData, setValidationData] = useState(null);

  // Synchroniser avec les changements de props
  useEffect(() => {
    setIsVisible(initialIsVisible);
  }, [initialIsVisible]);

  const handleToggle = async () => {
    if (!address || !profileId) {
      console.error('Erreur : Aucune adresse wallet ou profil');
      return;
    }

    setLoading(true);
    
    try {
      // Valider si le toggle est autorisé
      const validation = await antifraudService.validateTokenToggle(profileId, wallet, tokenId);
      setValidationData(validation);

      // Cas 1: Signalements actifs + détenteurs → BLOQUER
      if (!validation.canToggle && validation.blockReason === 'signalements_actifs') {
        // Bloquer automatiquement le créateur
        await antifraudService.blockCreator(
          profileId, 
          `Tentative de modification isVisible avec ${validation.activeReports} signalement(s) actif(s)`
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

      // Cas 3: Aucun problème → Procéder directement
      await performToggle();
      
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la validation de la modification'
      });
      setLoading(false);
    }
  };

  const performToggle = async () => {
    setLoading(true);
    try {
      // Utiliser profilService.updateTokenMetadata pour la cohérence
      await profilService.updateTokenMetadata(address, tokenId, {
        isVisible: !isVisible
      });

      setIsVisible(!isVisible);
      if (onUpdate) onUpdate(!isVisible);

      setNotification({
        type: 'success',
        message: `✅ Jeton ${!isVisible ? 'visible' : 'masqué'} dans l'annuaire`
      });

      console.log(`✅ Jeton ${!isVisible ? 'visible' : 'masqué'} dans l'annuaire`);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour de la visibilité'
      });
      // Restaurer l'état précédent en cas d'erreur
      setIsVisible(isVisible);
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
        borderRadius: '8px',
        opacity: disabled ? 0.6 : 1
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
            <span>👁️</span>
            <span>Visibilité publique</span>
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)'
          }}>
            {disabled 
              ? 'Désactivé (jeton non lié au profil)'
              : isVisible ? 'Visible dans l\'annuaire' : 'Masqué de l\'annuaire'}
          </div>
        </div>
        <Switch 
          checked={isVisible}
          onChange={handleToggle}
          disabled={loading || disabled}
        />
      </div>

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
          actionType="visibility"
          newValue={!isVisible}
        />
      )}
    </>
  );
};

export default TokenVisible;
