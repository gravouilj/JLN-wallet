/**
 * useTokenImage - Handles token image upload and management
 * Extracted from TokenPage for image upload logic
 */
import { useState, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../../atoms';
import { supabase } from '../../../services/supabaseClient';
import { profilService } from '../../../services/profilService';
import { useProfiles } from '../../../hooks/useProfiles';
import type { UserProfile } from '../../../types';

interface UseTokenImageOptions {
  tokenId: string | undefined;
  walletAddress: string | undefined;
  profileInfo: UserProfile | null;
  onProfileUpdate?: (profile: UserProfile) => void;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 200 * 1024; // 200 KB
const IDEAL_FILE_SIZE = 50 * 1024; // 50 KB
const REQUIRED_DIMENSIONS = { width: 256, height: 256 };

/**
 * Hook for managing token image upload
 */
export function useTokenImage(options: UseTokenImageOptions) {
  const { tokenId, walletAddress, profileInfo, onProfileUpdate, onSuccess } = options;
  const { refreshProfiles } = useProfiles();
  const setNotification = useSetAtom(notificationAtom);

  // Modal state
  const [showImageModal, setShowImageModal] = useState(false);

  // File state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Handle file selection
  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: '⚠️ Veuillez sélectionner une image valide' });
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setNotification({ type: 'error', message: '⚠️ Image trop volumineuse. Maximum 200 Ko.' });
      return;
    }
    if (file.size > IDEAL_FILE_SIZE) {
      setNotification({ type: 'warning', message: '⚠️ Image > 50 Ko. Idéalement < 50 Ko pour optimisation.' });
    }

    // Validate dimensions
    const img = new Image();
    img.onload = () => {
      if (img.width !== REQUIRED_DIMENSIONS.width || img.height !== REQUIRED_DIMENSIONS.height) {
        setNotification({ 
          type: 'error', 
          message: `⚠️ L'image doit faire exactement ${REQUIRED_DIMENSIONS.width}x${REQUIRED_DIMENSIONS.height} pixels.` 
        });
        URL.revokeObjectURL(img.src);
        return;
      }

      // All OK - store the image
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setNotification({ 
        type: 'success', 
        message: `✅ Image validée (${(file.size / 1024).toFixed(1)} Ko)` 
      });
    };

    img.onerror = () => {
      setNotification({ type: 'error', message: '⚠️ Impossible de charger l\'image' });
    };

    img.src = URL.createObjectURL(file);
  }, [setNotification]);

  // Remove selected image
  const handleRemoveImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
  }, [imagePreview]);

  // Save image to Supabase
  const handleSaveImage = useCallback(async () => {
    if (!imageFile || !profileInfo || !walletAddress || !tokenId) {
      setNotification({ type: 'error', message: 'Aucune image sélectionnée' });
      return;
    }

    setUploadingImage(true);
    try {
      // Generate unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `token_${tokenId}_${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('token-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('token-images')
        .getPublicUrl(fileName);

      const tokenImageUrl = urlData.publicUrl;

      // Update database
      await profilService.updateTokenImage(walletAddress, tokenId, tokenImageUrl);

      // Refresh data
      const updatedProfile = await profilService.getProfilByOwner(walletAddress);
      onProfileUpdate?.(updatedProfile);
      refreshProfiles();

      // Close modal and cleanup
      setShowImageModal(false);
      handleRemoveImage();

      setNotification({
        type: 'success',
        message: '✅ Image du jeton mise à jour avec succès',
      });

      onSuccess?.();
    } catch (err) {
      console.error('❌ Error uploading image:', err);
      setNotification({
        type: 'error',
        message: (err as Error).message || "Impossible de mettre à jour l'image",
      });
    } finally {
      setUploadingImage(false);
    }
  }, [imageFile, profileInfo, walletAddress, tokenId, onProfileUpdate, refreshProfiles, handleRemoveImage, onSuccess, setNotification]);

  // Open modal
  const openImageModal = useCallback(() => {
    setShowImageModal(true);
  }, []);

  // Close modal
  const closeImageModal = useCallback(() => {
    setShowImageModal(false);
    handleRemoveImage();
  }, [handleRemoveImage]);

  return {
    // Modal state
    showImageModal,
    setShowImageModal,
    openImageModal,
    closeImageModal,

    // File state
    imageFile,
    imagePreview,

    // Upload state
    uploadingImage,

    // Actions
    handleImageChange,
    handleRemoveImage,
    handleSaveImage,

    // Constants for UI
    maxFileSize: MAX_FILE_SIZE,
    idealFileSize: IDEAL_FILE_SIZE,
    requiredDimensions: REQUIRED_DIMENSIONS,
  };
}

export type UseTokenImageReturn = ReturnType<typeof useTokenImage>;
