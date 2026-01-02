import { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import { createTicket } from '../services/ticketService';

interface FormData {
  subject: string;
  category: string;
  priority: string;
  description: string;
}

interface AutoContext {
  tokenId?: string;
  creatorProfileId?: string;
  tokenInfo?: Record<string, any>;
}

interface UseClientTicketFormReturn {
  // État du formulaire
  ticketType: 'admin' | 'creator';
  setTicketType: (type: 'admin' | 'creator') => void;
  selectedTokenId: string | null;
  setSelectedTokenId: (id: string | null) => void;
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  formData: FormData;
  setFormData: (data: Partial<FormData>) => void;
  
  // État soumission
  submitting: boolean;
  error: string;
  
  // Méthodes
  updateField: (field: keyof FormData, value: string) => void;
  validateForm: () => boolean;
  submitForm: (walletAddress: string) => Promise<boolean>;
  resetForm: () => void;
}

/**
 * useClientTicketForm - Hook pour la gestion du formulaire de ticket client
 * 
 * Encapsule la logique:
 * - Gestion d'état du formulaire
 * - Validation avec messages d'erreur
 * - Détection contexte automatique
 * - Soumission asynchrone à Supabase
 * - Catégories contextuelles (admin vs créateur)
 * 
 * @param {AutoContext} autoContext - Contexte auto-détecté
 * @param {boolean} allowTypeSelection - Permet de choisir le type
 * @param {Function} onSubmitSuccess - Callback après soumission réussie
 * @returns {UseClientTicketFormReturn} État et méthodes
 */
export const useClientTicketForm = (
  autoContext?: AutoContext | null,
  allowTypeSelection?: boolean,
  onSubmitSuccess?: () => void
): UseClientTicketFormReturn => {
  // Détecter le type initial
  const initialType = autoContext?.creatorProfileId ? 'creator' : 'admin';
  
  const [ticketType, setTicketType] = useState<'admin' | 'creator'>(initialType as 'admin' | 'creator');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(autoContext?.tokenId || null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(autoContext?.creatorProfileId || null);
  
  const [formData, setFormDataState] = useState<FormData>({
    subject: '',
    category: 'question',
    priority: 'normal',
    description: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const setNotification = useSetAtom(notificationAtom);

  // Mettre à jour l'état du formulaire au montage si autoContext change
  useEffect(() => {
    if (autoContext) {
      if (autoContext.tokenId) setSelectedTokenId(autoContext.tokenId);
      if (autoContext.creatorProfileId) setSelectedProfileId(autoContext.creatorProfileId);
      if (autoContext.creatorProfileId && !allowTypeSelection) {
        setTicketType('creator');
      }
    }
  }, [autoContext, allowTypeSelection]);

  // Mise à jour partielle du formulaire
  const setFormData = (data: Partial<FormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
  };

  // Mettre à jour un champ et effacer l'erreur
  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ [field]: value });
    setError('');
  };

  // Valider le formulaire
  const validateForm = (): boolean => {
    if (!formData.subject.trim()) {
      setError('Le sujet est requis');
      return false;
    }
    if (formData.subject.trim().length < 5) {
      setError('Le sujet doit contenir au moins 5 caractères');
      return false;
    }
    if (!formData.description.trim()) {
      setError('La description est requise');
      return false;
    }
    if (formData.description.trim().length < 20) {
      setError('La description doit contenir au moins 20 caractères');
      return false;
    }
    if (ticketType === 'creator' && !selectedTokenId && !selectedProfileId) {
      setError('Vous devez sélectionner un token ou un créateur');
      return false;
    }
    return true;
  };

  // Soumettre le formulaire
  const submitForm = async (walletAddress: string): Promise<boolean> => {
    if (!validateForm()) return false;
    if (!walletAddress) {
      setError('Adresse wallet manquante');
      return false;
    }

    setSubmitting(true);
    setError('');

    try {
      // Déterminer le type de ticket
      const ticketTypeEnum = ticketType === 'admin' ? 'admin_client' : 'creator_client';

      // Métadonnées enrichies
      const metadata: Record<string, any> = {};
      if (autoContext?.tokenInfo) {
        metadata.tokenInfo = autoContext.tokenInfo;
      }

      // Données du ticket
      const ticketData = {
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        type: ticketTypeEnum,
        category: formData.category,
        priority: formData.priority,
        created_by_address: walletAddress,
        created_by_role: 'client',
        token_id: selectedTokenId,
        profile_id: selectedProfileId,
        client_address: walletAddress,
        metadata
      };

      // Créer le ticket
      const result = await createTicket(ticketData);
      
      if (result.success) {
        setNotification({
          type: 'success',
          message: '✅ Ticket envoyé ! Notre équipe vous répondra rapidement.'
        });
        resetForm();
        onSubmitSuccess?.();
        return true;
      } else {
        setError(result.error || 'Erreur lors de l\'envoi');
        setNotification({ type: 'error', message: '❌ Erreur envoi ticket' });
        return false;
      }
    } catch (err) {
      console.error('Erreur soumission formulaire:', err);
      setError('Erreur lors de l\'envoi du ticket');
      setNotification({ type: 'error', message: '❌ Erreur réseau' });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormDataState({
      subject: '',
      category: 'question',
      priority: 'normal',
      description: ''
    });
    setError('');
  };

  return {
    ticketType,
    setTicketType,
    selectedTokenId,
    setSelectedTokenId,
    selectedProfileId,
    setSelectedProfileId,
    formData,
    setFormData,
    submitting,
    error,
    updateField,
    validateForm,
    submitForm,
    resetForm
  };
};
