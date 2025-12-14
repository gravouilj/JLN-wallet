import { useState, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import { FarmService } from '../services/farmService';

/**
 * Hook personnalisé pour la gestion des statuts de fermes
 * Centralise la logique commune entre AdminVerificationPage et ManageFarmPage
 * 
 * @returns {Object} Méthodes et état pour gérer les statuts des fermes
 */
export const useFarmStatus = () => {
  const setNotification = useSetAtom(notificationAtom);
  const [processing, setProcessing] = useState(null);

  /**
   * Mettre à jour le statut d'une ferme (admin)
   */
  const updateStatus = useCallback(async (farmId, newStatus, message = '', onSuccess) => {
    // Cas spéciaux avec confirmation
    if (newStatus === 'rejected') {
      const reason = window.prompt(
        "🚫 REFUSER CETTE DEMANDE ?\n\nLa ferme restera en mode brouillon (non visible publiquement).\nLe créateur pourra corriger et soumettre à nouveau.\n\nMotif du refus (obligatoire) :",
        ""
      );
      if (!reason || !reason.trim()) return;
      message = reason;
    } else if (newStatus === 'banned') {
      const reason = window.prompt(
        "⚠️ BANNIR CETTE FERME ?\n\nLa ferme sera masquée de l'annuaire et marquée comme bannie.\nLe créateur ne pourra plus modifier son profil.\n\nMotif (obligatoire) :",
        "Violation répétée des conditions d'utilisation"
      );
      if (!reason || !reason.trim()) return;
      
      try {
        setProcessing(farmId);
        await FarmService.banFarm(farmId, reason);
        setNotification({ type: 'success', message: '🚫 Ferme bannie avec succès' });
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
        "⏸️ SUSPENDRE CETTE FERME ?\n\nLa ferme sera temporairement masquée de l'annuaire.\nMotif de la suspension :",
        "Signalement en cours de vérification"
      );
      if (!reason || !reason.trim()) return;
      
      try {
        setProcessing(farmId);
        await FarmService.suspendFarm(farmId, reason);
        setNotification({ type: 'success', message: '⏸️ Ferme suspendue avec succès' });
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
      // Réhabilitation : remettre la ferme en mode actif
      if (!window.confirm('Réhabiliter cette ferme et la remettre en ligne ?')) return;
      
      try {
        setProcessing(farmId);
        await FarmService.reactivateFarm(farmId);
        setNotification({ type: 'success', message: '✅ Ferme réhabilitée avec succès' });
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

    setProcessing(farmId);
    try {
      // Pour les verification_status (verified, rejected, etc.)
      await FarmService.adminUpdateStatus(farmId, newStatus, message);
      
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
  const sendMessage = useCallback(async (farm, messageText, messageType = 'verification', onSuccess) => {
    if (!messageText || !messageText.trim()) {
      setNotification({
        type: 'error',
        message: 'Le message ne peut pas être vide'
      });
      return;
    }

    setProcessing(farm.id);
    try {
      const currentHistory = farm.communication_history || [];
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
      
      await FarmService.updateFarm(farm.owner_address, updateData);

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
  const closeConversation = useCallback(async (farm, onSuccess) => {
    if (!window.confirm('Clôturer cet échange ? Un message système sera ajouté.')) {
      return;
    }

    setProcessing(farm.id);
    try {
      const currentHistory = farm.communication_history || [];
      const systemMessage = {
        author: 'system',
        message: '🛑 Conversation clôturée par l\'administrateur.',
        type: 'verification',
        timestamp: new Date().toISOString()
      };
      
      await FarmService.updateFarm(farm.owner_address, {
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
   * Envoyer un message en tant que créateur de ferme (avec type de message)
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
      await FarmService.addMessage(ownerAddress, 'creator', messageText.trim(), messageType);
      
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
   * Ignorer les signalements d'une ferme (admin)
   */
  const ignoreReports = useCallback(async (farmId, supabase, onSuccess) => {
    if (!window.confirm(
      'Marquer les signalements comme traités sans action ?\n\n⚠️ Les signalements visibles seront automatiquement masqués au créateur.'
    )) {
      return;
    }

    setProcessing(farmId);
    try {
      await supabase
        .from('farm_reports')
        .update({
          admin_status: 'resolved',
          admin_action_at: new Date().toISOString(),
          visible_to_farmer: false
        })
        .eq('farm_id', farmId)
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
      await FarmService.toggleReportVisibility(reportId, newValue);
      
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
  const getAvailableActions = useCallback((farm) => {
    const status = farm.verification_status;
    const farmStatus = farm.status;

    // Ferme bannie : seule réhabilitation possible
    if (farmStatus === 'banned') {
      return ['rehabilitate'];
    }

    // Ferme en attente suppression : seule réhabilitation possible
    if (farmStatus === 'deleted') {
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
