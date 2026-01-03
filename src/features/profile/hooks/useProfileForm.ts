/**
 * useProfileForm - Manages profile form state, change tracking, and privacy settings
 * Extracted from ManageProfilePage to separate form logic from presentation
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { UserProfile } from '../../../types';

export interface ProfileFormData {
  profileName: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  // Location
  locationCountry: string;
  locationRegion: string;
  locationDepartment: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  addressComplement: string;
  // Social
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  telegram: string;
  otherWebsite: string;
  // Certifications
  companyid: string;
  governmentidverificationweblink: string;
  legalRepresentative: string;
  nationalcertification: string;
  nationalcertificationweblink: string;
  internationalcertification: string;
  internationalcertificationweblink: string;
  certification1: string;
  certification1weblink: string;
  certification2: string;
  certification2weblink: string;
}

export interface PrivacySettings {
  hideEmail: boolean;
  hidePhone: boolean;
  hideCompanyID: boolean;
  hideLegalRep: boolean;
}

export interface SensitiveFields {
  profileName: string;
  streetAddress: string;
  companyid: string;
}

const initialFormData: ProfileFormData = {
  profileName: '',
  description: '',
  email: '',
  phone: '',
  website: '',
  locationCountry: 'France',
  locationRegion: '',
  locationDepartment: '',
  city: '',
  postalCode: '',
  streetAddress: '',
  addressComplement: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  whatsapp: '',
  telegram: '',
  otherWebsite: '',
  companyid: '',
  governmentidverificationweblink: '',
  legalRepresentative: '',
  nationalcertification: '',
  nationalcertificationweblink: '',
  internationalcertification: '',
  internationalcertificationweblink: '',
  certification1: '',
  certification1weblink: '',
  certification2: '',
  certification2weblink: '',
};

const initialPrivacy: PrivacySettings = {
  hideEmail: false,
  hidePhone: false,
  hideCompanyID: false,
  hideLegalRep: false,
};

/**
 * Hook for managing profile form state
 */
export function useProfileForm(existingProfile: UserProfile | null) {
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [privacy, setPrivacy] = useState<PrivacySettings>(initialPrivacy);
  const [initialSensitiveFields, setInitialSensitiveFields] = useState<SensitiveFields | null>(null);
  const [sensitiveFieldsChanged, setSensitiveFieldsChanged] = useState(false);

  // Initialize form from existing profile
  useEffect(() => {
    if (!existingProfile) return;

    const certifications = existingProfile.certifications || {};
    
    const newFormData: ProfileFormData = {
      profileName: existingProfile.name || '',
      description: existingProfile.description || '',
      email: existingProfile.email || '',
      phone: existingProfile.phone || '',
      website: existingProfile.website || '',
      // Location
      locationCountry: existingProfile.location_country || 'France',
      locationRegion: existingProfile.location_region || '',
      locationDepartment: existingProfile.location_department || '',
      city: existingProfile.city || '',
      postalCode: existingProfile.postal_code || '',
      streetAddress: existingProfile.street_address || '',
      addressComplement: existingProfile.address_complement || '',
      // Socials
      facebook: existingProfile.socials?.facebook || '',
      instagram: existingProfile.socials?.instagram || '',
      tiktok: existingProfile.socials?.tiktok || '',
      youtube: existingProfile.socials?.youtube || '',
      whatsapp: existingProfile.socials?.whatsapp || '',
      telegram: existingProfile.socials?.telegram || '',
      otherWebsite: existingProfile.socials?.other_website || '',
      // Certifications
      companyid: certifications.siret || '',
      governmentidverificationweblink: certifications.siret_link || '',
      legalRepresentative: certifications.legal_representative || '',
      nationalcertification: certifications.national || '',
      nationalcertificationweblink: certifications.national_link || '',
      internationalcertification: certifications.international || '',
      internationalcertificationweblink: certifications.international_link || '',
      certification1: certifications.certification_1 || '',
      certification1weblink: certifications.certification_1_link || '',
      certification2: certifications.certification_2 || '',
      certification2weblink: certifications.certification_2_link || '',
    };

    setFormData(newFormData);

    // Privacy settings
    setPrivacy({
      hideEmail: certifications.hide_email || false,
      hidePhone: certifications.hide_phone || false,
      hideCompanyID: certifications.hide_company_id || false,
      hideLegalRep: certifications.hide_legal_rep || false,
    });

    // Track initial sensitive fields for change detection
    setInitialSensitiveFields({
      profileName: newFormData.profileName,
      streetAddress: newFormData.streetAddress,
      companyid: newFormData.companyid,
    });

    setSensitiveFieldsChanged(false);
  }, [existingProfile]);

  // Handle form field changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Track sensitive field changes for verified profiles
    if (existingProfile?.verified && initialSensitiveFields) {
      const sensitiveFields: (keyof SensitiveFields)[] = ['profileName', 'streetAddress', 'companyid'];
      
      if (sensitiveFields.includes(name as keyof SensitiveFields)) {
        const hasChanged = value !== initialSensitiveFields[name as keyof SensitiveFields];
        
        if (hasChanged) {
          setSensitiveFieldsChanged(true);
        } else {
          // Check if other sensitive fields have changed
          const otherFieldsChanged = sensitiveFields.some(
            field => field !== name && formData[field] !== initialSensitiveFields[field]
          );
          setSensitiveFieldsChanged(otherFieldsChanged);
        }
      }
    }
  }, [existingProfile?.verified, initialSensitiveFields, formData]);

  // Handle privacy toggle
  const handlePrivacyChange = useCallback((field: keyof PrivacySettings, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [field]: value }));
  }, []);

  // Check if form has unsaved changes
  const hasFormChanges = useMemo(() => {
    if (!existingProfile) {
      return formData.profileName.trim() !== '';
    }

    const certifications = existingProfile.certifications || {};
    const socials = existingProfile.socials || {};

    return (
      formData.profileName !== (existingProfile.name || '') ||
      formData.description !== (existingProfile.description || '') ||
      formData.email !== (existingProfile.email || '') ||
      formData.phone !== (existingProfile.phone || '') ||
      formData.website !== (existingProfile.website || '') ||
      formData.locationCountry !== (existingProfile.location_country || 'France') ||
      formData.locationRegion !== (existingProfile.location_region || '') ||
      formData.locationDepartment !== (existingProfile.location_department || '') ||
      formData.city !== (existingProfile.city || '') ||
      formData.postalCode !== (existingProfile.postal_code || '') ||
      formData.streetAddress !== (existingProfile.street_address || '') ||
      formData.addressComplement !== (existingProfile.address_complement || '') ||
      formData.facebook !== (socials.facebook || '') ||
      formData.instagram !== (socials.instagram || '') ||
      formData.tiktok !== (socials.tiktok || '') ||
      formData.youtube !== (socials.youtube || '') ||
      formData.whatsapp !== (socials.whatsapp || '') ||
      formData.telegram !== (socials.telegram || '') ||
      formData.otherWebsite !== (socials.other_website || '') ||
      formData.companyid !== (certifications.siret || '') ||
      formData.governmentidverificationweblink !== (certifications.siret_link || '') ||
      formData.legalRepresentative !== (certifications.legal_representative || '') ||
      formData.nationalcertification !== (certifications.national || '') ||
      formData.nationalcertificationweblink !== (certifications.national_link || '') ||
      formData.internationalcertification !== (certifications.international || '') ||
      formData.internationalcertificationweblink !== (certifications.international_link || '') ||
      formData.certification1 !== (certifications.certification_1 || '') ||
      formData.certification1weblink !== (certifications.certification_1_link || '')
    );
  }, [formData, existingProfile]);

  // Check sensitive fields changes (for verification status)
  const checkSensitiveFieldsChanged = useCallback((): string[] => {
    if (!existingProfile || (!existingProfile.verified && existingProfile.verification_status !== 'pending')) {
      return [];
    }

    const changes: string[] = [];
    const certifications = existingProfile.certifications || {};

    // SIRET
    const currentSiret = formData.companyid || '';
    const initialSiret = certifications.siret || '';
    if (currentSiret !== initialSiret) {
      changes.push(currentSiret ? 'SIRET modifié' : 'SIRET supprimé');
    }

    // Email
    const currentEmail = formData.email || '';
    const initialEmail = existingProfile.email || '';
    if (currentEmail !== initialEmail) {
      changes.push(currentEmail ? 'Email modifié' : 'Email supprimé');
    }

    // Phone
    const currentPhone = formData.phone || '';
    const initialPhone = existingProfile.phone || '';
    if (currentPhone !== initialPhone) {
      changes.push(currentPhone ? 'Téléphone modifié' : 'Téléphone supprimé');
    }

    return changes;
  }, [formData, existingProfile]);

  // Format URL on blur
  const handleUrlBlur = useCallback((fieldName: keyof ProfileFormData) => {
    const value = formData[fieldName];
    if (value && typeof value === 'string' && !value.startsWith('http://') && !value.startsWith('https://')) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: `https://${value}`,
      }));
    }
  }, [formData]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setPrivacy(initialPrivacy);
    setInitialSensitiveFields(null);
    setSensitiveFieldsChanged(false);
  }, []);

  // Reset sensitive fields tracking after successful save
  const resetSensitiveTracking = useCallback((profile: UserProfile) => {
    setInitialSensitiveFields({
      profileName: profile.name || '',
      streetAddress: profile.street_address || '',
      companyid: profile.certifications?.siret || '',
    });
    setSensitiveFieldsChanged(false);
  }, []);

  return {
    // State
    formData,
    privacy,
    sensitiveFieldsChanged,
    hasFormChanges,
    
    // Actions
    handleChange,
    handlePrivacyChange,
    handleUrlBlur,
    checkSensitiveFieldsChanged,
    resetForm,
    resetSensitiveTracking,
    setFormData,
    setPrivacy,
  };
}

export type UseProfileFormReturn = ReturnType<typeof useProfileForm>;
