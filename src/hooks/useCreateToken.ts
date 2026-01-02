import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import { useEcashWallet } from './useEcashWallet';

interface CreateTokenFormData {
  ticker: string;
  name: string;
  decimals: number;
  initialSupply: string;
  isVariable: boolean;
  imageUrl: string;
  purpose: string;
  counterpart: string;
  agreeToTerms: boolean;
}

interface UseCreateTokenReturn {
  currentStep: number;
  totalSteps: number;
  formData: CreateTokenFormData;
  processing: boolean;
  updateField: (field: keyof CreateTokenFormData, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: () => boolean;
  createToken: () => Promise<{ tokenId: string; txid: string } | null>;
  resetForm: () => void;
}

/**
 * useCreateToken - Hook pour la création de token avec wizard
 * 
 * Encapsule la logique:
 * - Navigation entre 5 étapes du wizard
 * - Validation contextuelle par étape
 * - Gestion des données du formulaire
 * - Création via EcashWallet.createToken()
 * - Notifications utilisateur
 * 
 * @returns {UseCreateTokenReturn} État et méthodes
 */
export const useCreateToken = (): UseCreateTokenReturn => {
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  const totalSteps = 5;
  
  const [formData, setFormData] = useState<CreateTokenFormData>({
    ticker: '',
    name: '',
    decimals: 0,
    initialSupply: '',
    isVariable: false,
    imageUrl: '',
    purpose: '',
    counterpart: '',
    agreeToTerms: false
  });

  const updateField = (field: keyof CreateTokenFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validation contextuelle par étape
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.ticker.length >= 1 && 
               formData.ticker.length <= 12 && 
               formData.name.length >= 3;
      case 2:
        return formData.initialSupply && parseFloat(formData.initialSupply) > 0;
      case 3:
        return true; // Image optionnelle
      case 4:
        return true; // Description optionnelle
      case 5:
        return formData.agreeToTerms;
      default:
        return false;
    }
  };

  // Créer le token
  const createToken = async (): Promise<{ tokenId: string; txid: string } | null> => {
    setProcessing(true);
    try {
      // Validation finale
      if (!formData.ticker || !formData.name) {
        throw new Error('Ticker et nom requis');
      }
      
      if (!formData.initialSupply || parseFloat(formData.initialSupply) <= 0) {
        throw new Error('Offre initiale invalide');
      }

      if (!wallet) {
        throw new Error('Wallet non connecté');
      }
      
      console.log('🏭 Création du token...', formData);

      // Créer via le wallet
      const result = await wallet.createToken({
        ticker: formData.ticker.toUpperCase(),
        name: formData.name,
        decimals: parseInt(formData.decimals.toString()) || 0,
        initialSupply: formData.initialSupply,
        mintable: formData.isVariable,
        url: formData.imageUrl || undefined
      });
      
      setNotification({
        type: 'success',
        message: `✅ Token ${formData.ticker} créé avec succès ! TXID: ${result.txid.substring(0, 8)}...`
      });
      
      console.log('✅ Token créé:', result);
      return { tokenId: result.tokenId, txid: result.txid };
      
    } catch (err) {
      console.error('❌ Erreur création token:', err);
      const message = err instanceof Error ? err.message : 'Impossible de créer le token';
      setNotification({ type: 'error', message });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      ticker: '',
      name: '',
      decimals: 0,
      initialSupply: '',
      isVariable: false,
      imageUrl: '',
      purpose: '',
      counterpart: '',
      agreeToTerms: false
    });
  };

  return {
    currentStep,
    totalSteps,
    formData,
    processing,
    updateField,
    nextStep,
    prevStep,
    canProceed,
    createToken,
    resetForm
  };
};
