/**
 * useProfileSubmit - Handles profile form submission with validation
 * Extracted from ManageProfilePage for form submission logic
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfilService from '../../../services/profilService';
import type { UserProfile } from '../../../types';
import type { ProfileFormData, PrivacySettings } from './useProfileForm';

interface SubmitOptions {
  formData: ProfileFormData;
  privacy: PrivacySettings;
  productTags: string[];
  serviceTags: string[];
  existingProfile: UserProfile | null;
  address: string;
  tokenId?: string | null;
  tokenInfo?: { genesisInfo?: { tokenTicker?: string } } | null;
  sensitiveFieldsChanged: boolean;
  onSuccess?: (profile: UserProfile) => void;
  onNotification?: (notification: { type: 'success' | 'error'; message: string }) => void;
}

interface PendingSaveAction {
  event: React.FormEvent | null;
  requestVerification: boolean;
  sensitiveChanges: string[];
}

/**
 * Hook for handling profile form submission
 */
export function useProfileSubmit() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<PendingSaveAction | null>(null);

  // Build profile data object for Supabase
  const buildUserProfile = useCallback((options: SubmitOptions) => {
    const { 
      formData, privacy, productTags, serviceTags, 
      existingProfile, tokenId, tokenInfo 
    } = options;

    return {
      name: formData.profileName,
      description: formData.description,
      location_country: formData.locationCountry || 'France',
      location_region: formData.locationRegion || '',
      location_department: formData.locationDepartment || '',
      city: formData.city || '',
      postal_code: formData.postalCode || '',
      street_address: formData.streetAddress || '',
      address_complement: formData.addressComplement || '',
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
      image_url: existingProfile?.image_url || null,

      // Socials (JSONB)
      socials: {
        facebook: formData.facebook || null,
        instagram: formData.instagram || null,
        tiktok: formData.tiktok || null,
        youtube: formData.youtube || null,
        whatsapp: formData.whatsapp || null,
        telegram: formData.telegram || null,
        other_website: formData.otherWebsite || null,
      },

      // Certifications (JSONB) with privacy settings
      certifications: {
        siret: formData.companyid || null,
        siret_link: formData.governmentidverificationweblink || null,
        legal_representative: formData.legalRepresentative || null,
        national: formData.nationalcertification || null,
        national_link: formData.nationalcertificationweblink || null,
        international: formData.internationalcertification || null,
        international_link: formData.internationalcertificationweblink || null,
        certification_1: formData.certification1 || null,
        certification_1_link: formData.certification1weblink || null,
        certification_2: formData.certification2 || null,
        certification_2_link: formData.certification2weblink || null,
        hide_email: privacy.hideEmail || false,
        hide_phone: privacy.hidePhone || false,
        hide_company_id: privacy.hideCompanyID || false,
        hide_legal_rep: privacy.hideLegalRep || false,
      },

      products: productTags,
      services: serviceTags,

      // Tokens handling
      tokens: (() => {
        const existingTokens = existingProfile?.tokens || [];
        if (!tokenId) return existingTokens;

        const currentToken = {
          tokenId,
          ticker: tokenInfo?.genesisInfo?.tokenTicker || 'UNK',
          isVisible: true,
          isLinked: true,
        };

        const tokenIndex = existingTokens.findIndex((t: { tokenId: string }) => t.tokenId === tokenId);
        if (tokenIndex >= 0) {
          const updated = [...existingTokens];
          updated[tokenIndex] = {
            ...currentToken,
            isVisible: existingTokens[tokenIndex].isVisible ?? true,
            isLinked: existingTokens[tokenIndex].isLinked ?? true,
          };
          return updated;
        }
        return [...existingTokens, currentToken];
      })(),
    };
  }, []);

  // Validate required fields
  const validateForm = useCallback((
    formData: ProfileFormData, 
    requestVerification: boolean,
    onNotification?: (notification: { type: 'error'; message: string }) => void
  ): boolean => {
    // Basic validation - name is always required
    if (!formData.profileName) {
      onNotification?.({ 
        type: 'error', 
        message: 'Le nom de la ferme est obligatoire pour enregistrer' 
      });
      return false;
    }

    // Additional validation for verification request
    if (requestVerification) {
      const missingFields: string[] = [];
      if (!formData.description) missingFields.push('Description');
      if (!formData.email) missingFields.push('Email');
      if (!formData.streetAddress) missingFields.push('Adresse de la rue');
      if (!formData.companyid) missingFields.push('SIRET/Company ID');
      if (!formData.governmentidverificationweblink) missingFields.push('Lien de vérification SIRET');
      if (!formData.phone) missingFields.push('Téléphone');

      if (missingFields.length > 0) {
        onNotification?.({
          type: 'error',
          message: `Pour demander la vérification, veuillez remplir : ${missingFields.join(', ')}`,
        });
        return false;
      }
    }

    return true;
  }, []);

  // Perform the actual save operation
  const performSave = useCallback(async (
    options: SubmitOptions,
    requestVerification: boolean = false
  ): Promise<boolean> => {
    const { 
      existingProfile, address, sensitiveFieldsChanged,
      onSuccess, onNotification 
    } = options;

    // Block if banned
    if (existingProfile?.status === 'banned') {
      onNotification?.({
        type: 'error',
        message: '🚫 Profile banni : aucune modification possible. Contactez l\'administrateur.',
      });
      return false;
    }

    // Validate
    if (!validateForm(options.formData, requestVerification, onNotification)) {
      return false;
    }

    setSubmitting(true);
    try {
      const profileData = buildUserProfile(options) as Record<string, unknown>;

      // Determine verification status
      let verificationStatus = existingProfile?.verification_status || 'none';
      let isVerified = existingProfile?.verified || false;

      if (requestVerification) {
        verificationStatus = 'pending';
        isVerified = false;

        // Add system message to communication history
        const currentHistory = existingProfile?.communication_history || [];
        const isResubmission = existingProfile?.verification_status === 'rejected' || 
                               existingProfile?.verification_status === 'info_requested';
        
        profileData.communication_history = [
          ...currentHistory,
          {
            author: 'system',
            message: isResubmission 
              ? '🔄 Nouvelle demande de vérification soumise après correction'
              : '📝 Demande de vérification soumise par le créateur',
            timestamp: new Date().toISOString(),
          },
        ];
      } else if (existingProfile?.verified && sensitiveFieldsChanged) {
        verificationStatus = 'pending';
        isVerified = false;

        const currentHistory = existingProfile?.communication_history || [];
        profileData.communication_history = [
          ...currentHistory,
          {
            author: 'system',
            message: '⚠️ Modification de champs sensibles sur un profil vérifié - Nouvelle validation requise',
            timestamp: new Date().toISOString(),
          },
        ];
      } else if (!existingProfile?.verified && sensitiveFieldsChanged) {
        verificationStatus = 'none';
        isVerified = false;
      }

      profileData.verification_status = verificationStatus;
      profileData.verified = isVerified;

      // Save to Supabase
      const savedProfile = await ProfilService.saveProfil(profileData, address);

      // Success message
      let successMessage = 'Profile enregistré avec succès !';
      if (requestVerification) {
        successMessage = 'Enregistré ! Demande de vérification envoyée à l\'administrateur.';
      } else if (existingProfile?.verified && sensitiveFieldsChanged) {
        successMessage = 'Enregistré ! Une nouvelle vérification par l\'administrateur sera nécessaire.';
      } else if (sensitiveFieldsChanged) {
        successMessage = 'Coordonnées enregistrées avec succès !';
      }

      onNotification?.({ type: 'success', message: successMessage });
      onSuccess?.(savedProfile);

      // Navigate after verification request
      if (requestVerification) {
        setTimeout(() => navigate('/manage-token'), 3000);
      }

      return true;
    } catch (err) {
      console.error('❌ Erreur sauvegarde profile:', err);
      onNotification?.({
        type: 'error',
        message: (err as Error).message || 'Erreur lors de l\'enregistrement',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [navigate, buildUserProfile, validateForm]);

  // Handle submit with sensitive field check
  const handleSubmit = useCallback(async (
    options: SubmitOptions,
    requestVerification: boolean = false,
    sensitiveChanges: string[] = []
  ): Promise<boolean> => {
    // If sensitive changes detected on verified profile, show warning
    if (sensitiveChanges.length > 0 && options.existingProfile?.verified) {
      setPendingSaveAction({
        event: null,
        requestVerification,
        sensitiveChanges,
      });
      setShowWarningModal(true);
      return false;
    }

    return performSave(options, requestVerification);
  }, [performSave]);

  // Confirm warning modal
  const handleConfirmWarning = useCallback(async (options: SubmitOptions) => {
    setShowWarningModal(false);
    if (pendingSaveAction) {
      await performSave(options, pendingSaveAction.requestVerification);
      setPendingSaveAction(null);
    }
  }, [pendingSaveAction, performSave]);

  // Cancel warning modal
  const handleCancelWarning = useCallback(() => {
    setShowWarningModal(false);
    setPendingSaveAction(null);
  }, []);

  return {
    // State
    submitting,
    showWarningModal,
    pendingSaveAction,

    // Actions
    handleSubmit,
    performSave,
    handleConfirmWarning,
    handleCancelWarning,
    validateForm,
  };
}

export type UseProfileSubmitReturn = ReturnType<typeof useProfileSubmit>;
