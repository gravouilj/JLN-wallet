import { useState, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import { ProfilService } from '../services/profilService';

/**
 * Hook personnalisé pour la gestion des statuts de profils
 * Centralise la logique commune entre AdminVerificationPage et ManageProfilePage
 * 
 * @returns {Object} Méthodes et état pour gérer les statuts des profils
 */
export const useProfileStatus = () => {
  const setNotification = useSetAtom(notificationAtom);
  const [processing, setProcessing] = useState(null);

  /**
   * Mettre à jour le statut d'un profil (admin)
   */
  const updateStatus = useCallback(async (profileId, newStatus, message = '', onSuccess) => {
    // Cas spéciaux avec confirmation
    if (newStatus === 'rejected') {
      const reason = window.prompt(
        "🚫 REFUSER CETTE DEMANDE ?\n\nLe profil restera en mode brouillon (non visible publiquement).\nLe créateur pourra corriger et soumettre à nouveau.\n\nMotif du refus (obligatoire) :",
        ""
      );
      if (!reason || !reason.trim()) return;
      message = reason;
    } else if (newStatus === 'banned') {
      const reason = window.prompt(
        "⚠️ BANNIR CE PROFIL ?\n\nLe profil sera masqué de l'annuaire et marqué comme banni.\nLe créateur ne pourra plus modifier son profil.\n\nMotif (obligatoire) :",
        "Violation répétée des conditions d'utilisation"
      );
      if (!reason || !reason.trim()) return;
      
      try {
        setProcessing(profileId);
        await ProfilService.banProfile(profileId, reason);
        setNotification({ type: 'success', message: '🚫 Profil banni avec succès' });
        if (onSuccess) await onSuccess();
        return;
      } catch (err) {
        console.error(err);
        setNotification({ type: 'error', message: 'Erreur lors du bannissement' });
        return;
      } finally {
        setProcessing(null);
      }
    } else if (newStatus === 'suspended') {
      const reason = window.prompt(
        "⏸️ SUSPENDRE CE PROFIL ?\n\nLe profil sera temporairement masqué de l'annuaire.\nMotif de la suspension :",
        "Signalement en cours de vérification"
      );
      if (!reason || !reason.trim()) return;
      
      try {
        setProcessing(profileId);
        await ProfilService.suspendProfile(profileId, reason);
        setNotification({ type: 'success', message: '⏸️ Profil suspendu avec succès' });
        if (onSuccess) await onSuccess();
        return;
      } catch (err) {
        console.error(err);
        setNotification({ type: 'error', message: 'Erreur lors de la suspension' });
        return;
      } finally {
        setProcessing(null);
      }
    } else if (newStatus === 'active' || newStatus === 'rehabilitate' || newStatus === 'reactivate') {
      // Réhabilitation : remettre le profil en mode actif
      if (!window.confirm('Réhabiliter ce profil et le remettre en ligne ?')) return;
      
      try {
        setProcessing(profileId);
        await ProfilService.reactivateProfile(profileId);
        setNotification({ type: 'success', message: '✅ Profil réhabilité avec succès' });
        if (onSuccess) await onSuccess();
        return;
      } catch (err) {
        console.error(err);
        setNotification({ type: 'error', message: 'Erreur lors de la réhabilitation' });
        return;
      } finally {
        setProcessing(null);
      }
    } else if (!window.confirm(`Confirmer le statut : ${newStatus} ?`)) {
      return;
    }

    setProcessing(profileId);
    try {
      // Pour les verification_status (verified, rejected, etc.)
      await ProfilService.adminUpdateStatus(profileId, newStatus, message);
      
      setNotification({ 
        type: 'success', 
        message: `Statut mis à jour : ${newStatus}` 
      });
      
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      setNotification({ 
        type: 'error', 
        message: 'Erreur lors de la mise à jour' 
      });
    } finally {
      setProcessing(null);
    }
  }, [setNotification]);

  /**
   * Envoyer un message dans l'historique de communication (admin)
   */
  const sendMessage = useCallback(async (profile, messageText, messageType = 'verification', onSuccess) => {
    if (!messageText || !messageText.trim()) {
      setNotification({
        type: 'error',
        message: 'Le message ne peut pas être vide'
      });
      return;
    }

    setProcessing(profile.id);
    try {
      const currentHistory = profile.communication_history || [];
      const newMessage = {
        author: 'admin',
        message: messageText,
        type: messageType, // 'verification', 'general', ou 'report'
        timestamp: new Date().toISOString()
      };
      
      const updateData = {
        communication_history: [...currentHistory, newMessage]
      };
      
      // Changer le statut uniquement pour les messages de vérification
      if (messageType === 'verification') {
        updateData.verification_status = 'info_requested';
      }
      
      await ProfilService.updateProfile(profile.owner_address, updateData);

      setNotification({ 
        type: 'success', 
        message: 'Message envoyé !' 
      });
      
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Erreur envoi message:', err);
      setNotification({ 
        type: 'error', 
        message: 'Erreur lors de l\'envoi du message' 
      });
    } finally {
      setProcessing(null);
    }
  }, [setNotification]);

  /**
   * Clôturer une conversation (admin)
   */
  const closeConversation = useCallback(async (profile, onSuccess) => {
    if (!window.confirm('Clôturer cet échange ? Un message système sera ajouté.')) {
      return;
    }

    setProcessing(profile.id);
    try {
      const currentHistory = profile.communication_history || [];
      const systemMessage = {
        author: 'system',
        message: '🛑 Conversation clôturée par l\'administrateur.',
        type: 'verification',
        timestamp: new Date().toISOString()
      };
      
      await ProfilService.updateProfile(profile.owner_address, {
        communication_history: [...currentHistory, systemMessage],
        conversation_closed: true // Marquer la conversation comme clôturée
      });

      setNotification({ 
        type: 'success', 
        message: 'Conversation clôturée' 
      });
      
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Erreur clôture conversation:', err);
      setNotification({ 
        type: 'error', 
        message: 'Erreur lors de la clôture' 
      });
    } finally {
      setProcessing(null);
    }
  }, [setNotification]);

  /**
   * Envoyer un message en tant que créateur de profil (avec type de message)
   */
  const sendCreatorMessage = useCallback(async (ownerAddress, messageText, messageType = 'verification', onSuccess) => {
    if (!messageText || !messageText.trim()) {
      setNotification({
        type: 'error',
        message: 'Le message ne peut pas être vide'
      });
      return;
    }

    setProcessing(ownerAddress);
    try {
      await ProfilService.addMessage(ownerAddress, 'creator', messageText.trim(), messageType);
      
      setNotification({
        type: 'success',
        message: 'Message envoyé avec succès'
      });
      
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Erreur envoi message:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de l\'envoi du message'
      });
    } finally {
      setProcessing(null);
    }
  }, [setNotification]);

  /**
   * Ignorer les signalements d'un profil (admin)
   */
  const ignoreReports = useCallback(async (profileId, supabase, onSuccess) => {
    if (!window.confirm(
      'Marquer les signalements comme traités sans action ?\n\n⚠️ Les signalements visibles seront automatiquement masqués au créateur.'
    )) {
      return;
    }

    setProcessing(profileId);
    try {
      await supabase
        .from('profile_reports')
        .update({
          admin_status: 'resolved',
          admin_action_at: new Date().toISOString(),
          visible_to_profile: false
        })
        .eq('profile_id', profileId)
        .eq('admin_status', 'pending');
      
      setNotification({ 
        type: 'success', 
        message: 'Signalements ignorés et masqués au créateur' 
      });
      
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Erreur ignorer signalements:', err);
      setNotification({ 
        type: 'error', 
        message: 'Erreur lors du traitement des signalements' 
      });
    } finally {
      setProcessing(null);
    }
  }, [setNotification]);

  /**
   * Basculer la visibilité d'un signalement
   */
  const toggleReportVisibility = useCallback(async (reportId, newValue, onSuccess) => {
    setProcessing(reportId);
    try {
      await ProfilService.toggleReportVisibility(reportId, newValue);
      
      setNotification({ 
        type: 'success', 
        message: newValue 
          ? '👁️ Signalement partagé avec le créateur' 
          : '🙈 Signalement masqué au créateur'
      });
      
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Erreur toggle visibilité:', err);
      setNotification({ 
        type: 'error', 
        message: 'Erreur lors de la mise à jour' 
      });
    } finally {
      setProcessing(null);
    }
  }, [setNotification]);

  /**
   * Obtenir les actions disponibles selon le statut actuel
   */
  const getAvailableActions = useCallback((profile) => {
    const status = profile.verification_status;
    const profileStatus = profile.status;

    // Profil banni : seule réhabilitation possible
    if (profileStatus === 'banned') {
      return ['rehabilitate'];
    }

    // Profil en attente suppression : seule réhabilitation possible
    if (profileStatus === 'deleted') {
      return ['rehabilitate'];
    }

    // Actions selon verification_status
    switch (status) {
      case 'pending':
      case 'info_requested':
        return ['validate', 'request_info', 'refuse', 'suspend', 'ban'];
      
      case 'verified':
        return ['suspend', 'ban'];
      
      case 'rejected':
        return ['reexamine', 'validate'];
      
      case 'none':
        return ['validate', 'suspend'];
      
      default:
        return [];
    }
  }, []);

  return {
    processing,
    updateStatus,
    sendMessage,
    closeConversation,
    sendCreatorMessage,
    ignoreReports,
    toggleReportVisibility,
    getAvailableActions
  };
};
