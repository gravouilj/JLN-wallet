/**
 * useTokenImport - Handles token import logic for CompleteTokenImportPage
 * Validates and submits token import to profile
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../../atoms';
import { ProfilService } from '../../../services/profilService';

interface TokenData {
  tokenId: string;
  ticker: string;
  name: string;
  decimals?: number;
  image?: string;
  url?: string;
  timeFirstSeen?: number;
  genesisSupply?: string;
  supply?: string;
}

interface CreatorInfo {
  profileName: string;
  description: string;
  country: string;
  region: string;
  department: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  otherWebsite: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  telegram: string;
  products: string;
  services: string;
  legalRepresentative: string;
  companyid: string;
  governmentidverificationweblink: string;
  nationalcertification: string;
  nationalcertificationweblink: string;
  internationalcertification: string;
  internationalcertificationweblink: string;
}

interface UseTokenImportOptions {
  tokenData: TokenData | null;
  walletAddress: string | undefined;
}

export const initialCreatorInfo: CreatorInfo = {
  profileName: '',
  description: '',
  country: 'France',
  region: '',
  department: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  otherWebsite: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  whatsapp: '',
  telegram: '',
  products: '',
  services: '',
  legalRepresentative: '',
  companyid: '',
  governmentidverificationweblink: '',
  nationalcertification: '',
  nationalcertificationweblink: '',
  internationalcertification: '',
  internationalcertificationweblink: '',
};

/**
 * Hook for handling token import logic
 */
export function useTokenImport(options: UseTokenImportOptions) {
  const { tokenData, walletAddress } = options;
  const navigate = useNavigate();
  const setNotification = useSetAtom(notificationAtom);

  const [purpose, setPurpose] = useState('');
  const [counterpart, setCounterpart] = useState('');
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo>(initialCreatorInfo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update a single creator info field
  const updateCreatorInfo = useCallback((field: keyof CreatorInfo, value: string) => {
    setCreatorInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  // Validate required fields
  const validate = useCallback((): boolean => {
    if (!purpose.trim()) {
      setNotification({
        type: 'error',
        message: "⚠️ L'objectif du token est obligatoire",
      });
      return false;
    }

    if (!counterpart.trim()) {
      setNotification({
        type: 'error',
        message: '⚠️ La contrepartie du token est obligatoire',
      });
      return false;
    }

    if (!walletAddress) {
      setNotification({
        type: 'error',
        message: '⚠️ Veuillez connecter votre wallet',
      });
      return false;
    }

    return true;
  }, [purpose, counterpart, walletAddress, setNotification]);

  // Submit the import
  const handleSubmit = useCallback(async () => {
    if (!tokenData || !walletAddress) return;

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Check token availability
      const availability = await ProfilService.checkTokenAvailability(tokenData.tokenId, walletAddress);

      if (!availability.isAvailable) {
        setNotification({
          type: 'error',
          message: `⛔ Ce jeton est déjà géré par la profile "${availability.existingProfileName}". Vous ne pouvez pas l'importer.`,
        });
        return;
      }

      // Check for existing profile
      const existingProfile = await ProfilService.getMyProfil(walletAddress);

      const newTokenData = {
        tokenId: tokenData.tokenId,
        ticker: tokenData.ticker,
        name: tokenData.name,
        decimals: tokenData.decimals || 0,
        image: tokenData.image || '',
        purpose: purpose.trim(),
        counterpart: counterpart.trim(),
        purposeUpdatedAt: new Date().toISOString(),
        counterpartUpdatedAt: new Date().toISOString(),
      };

      if (existingProfile) {
        // Add token to existing profile
        const existingTokens = Array.isArray(existingProfile.tokens) ? existingProfile.tokens : [];

        // Check if token already exists
        const tokenExists = existingTokens.some((t: { tokenId: string }) => t.tokenId === tokenData.tokenId);
        if (tokenExists) {
          setNotification({
            type: 'warning',
            message: '⚠️ Ce token est déjà importé dans votre profile',
          });
          navigate('/manage-token');
          return;
        }

        // Update profile with new token
        const updatedProfile = {
          ...existingProfile,
          tokens: [...existingTokens, newTokenData],
        };

        await ProfilService.saveProfil(updatedProfile, walletAddress);

        setNotification({
          type: 'success',
          message: `✅ Token "${tokenData.name}" ajouté à votre profile !`,
        });
      } else {
        // Create new minimal profile
        const profileData: Partial<import('../../../types').UserProfile> = {
          name: creatorInfo.profileName || tokenData.name || 'Ma Profile',
          description: creatorInfo.description || '',
          tokens: [newTokenData],
          verification_status: 'none' as const,
          verified: false,
          products: creatorInfo.products ? creatorInfo.products.split(',').map(p => p.trim()).filter(Boolean) : [],
          services: creatorInfo.services ? creatorInfo.services.split(',').map(s => s.trim()).filter(Boolean) : [],
          location_country: creatorInfo.country || '',
          location_region: creatorInfo.region || '',
          location_department: creatorInfo.department || '',
          street_address: creatorInfo.address || '',
          phone: creatorInfo.phone || '',
          email: creatorInfo.email || '',
          website: creatorInfo.website || '',
          socials: {
            facebook: creatorInfo.facebook || undefined,
            instagram: creatorInfo.instagram || undefined,
            tiktok: creatorInfo.tiktok || undefined,
            youtube: creatorInfo.youtube || undefined,
            whatsapp: creatorInfo.whatsapp || undefined,
            telegram: creatorInfo.telegram || undefined,
            other_website: creatorInfo.otherWebsite || undefined,
          },
          // Use 'as any' since the certifications structure in DB differs from TypeScript type
          certifications: {
            siret: creatorInfo.companyid || undefined,
            siret_link: creatorInfo.governmentidverificationweblink || undefined,
            legal_representative: creatorInfo.legalRepresentative || undefined,
            national: creatorInfo.nationalcertification || undefined,
            national_link: creatorInfo.nationalcertificationweblink || undefined,
            international: creatorInfo.internationalcertification || undefined,
            international_link: creatorInfo.internationalcertificationweblink || undefined,
          } as any,
        };

        await ProfilService.saveProfil(profileData, walletAddress);

        setNotification({
          type: 'success',
          message: `✅ Profile créée avec le token "${tokenData.name}" !`,
        });
      }

      // Redirect to ManageTokenPage
      navigate('/manage-token');

      // Reload to show new token
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error('❌ Erreur import token:', err);
      setNotification({
        type: 'error',
        message: `❌ Erreur lors de l'import: ${(err as Error).message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [tokenData, walletAddress, purpose, counterpart, creatorInfo, validate, navigate, setNotification]);

  return {
    // State
    purpose,
    counterpart,
    creatorInfo,
    isSubmitting,

    // Actions
    setPurpose,
    setCounterpart,
    setCreatorInfo,
    updateCreatorInfo,
    handleSubmit,
    validate,
  };
}

export type UseTokenImportReturn = ReturnType<typeof useTokenImport>;
