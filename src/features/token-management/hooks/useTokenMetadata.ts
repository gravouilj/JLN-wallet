/**
 * useTokenMetadata - Manages token purpose, counterpart, and visibility
 * Extracted from TokenPage for token metadata editing logic
 */
import { useState, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../../atoms';
import { profilService } from '../../../services/profilService';
import { useProfiles } from '../../../hooks/useProfiles';
import type { UserProfile } from '../../../types';

interface UseTokenMetadataOptions {
  tokenId: string | undefined;
  walletAddress: string | undefined;
  profileInfo: UserProfile | null;
  isCreator: boolean;
  onProfileUpdate?: (profile: UserProfile) => void;
}

/**
 * Hook for managing token metadata (purpose, counterpart, visibility)
 */
export function useTokenMetadata(options: UseTokenMetadataOptions) {
  const { tokenId, walletAddress, profileInfo, isCreator, onProfileUpdate } = options;
  const { refreshProfiles } = useProfiles();
  const setNotification = useSetAtom(notificationAtom);

  // Purpose editing state
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [editPurpose, setEditPurpose] = useState('');
  const [savingPurpose, setSavingPurpose] = useState(false);

  // Counterpart editing state
  const [editingCounterpart, setEditingCounterpart] = useState(false);
  const [editCounterpart, setEditCounterpart] = useState('');
  const [savingCounterpart, setSavingCounterpart] = useState(false);

  // Visibility state
  const [isTokenVisible, setIsTokenVisible] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Save purpose
  const handleSavePurpose = useCallback(async () => {
    if (!profileInfo || !isCreator || !walletAddress || !tokenId) {
      setNotification({
        type: 'error',
        message: 'Vous devez être le créateur du jeton pour modifier ces informations',
      });
      return;
    }

    setSavingPurpose(true);
    try {
      await profilService.updateTokenMetadata(walletAddress, tokenId, {
        purpose: editPurpose.trim(),
      });

      const updatedProfile = await profilService.getProfilByOwner(walletAddress);
      onProfileUpdate?.(updatedProfile);
      refreshProfiles();

      setEditingPurpose(false);
      setNotification({
        type: 'success',
        message: '✅ Objectif mis à jour avec succès',
      });
    } catch (err) {
      console.error('❌ Error saving purpose:', err);
      setNotification({
        type: 'error',
        message: (err as Error).message || "Impossible de sauvegarder l'objectif",
      });
    } finally {
      setSavingPurpose(false);
    }
  }, [profileInfo, isCreator, walletAddress, tokenId, editPurpose, onProfileUpdate, refreshProfiles, setNotification]);

  // Save counterpart
  const handleSaveCounterpart = useCallback(async () => {
    if (!profileInfo || !isCreator || !walletAddress || !tokenId) {
      setNotification({
        type: 'error',
        message: 'Vous devez être le créateur du jeton pour modifier ces informations',
      });
      return;
    }

    setSavingCounterpart(true);
    try {
      await profilService.updateTokenMetadata(walletAddress, tokenId, {
        counterpart: editCounterpart.trim(),
      });

      const updatedProfile = await profilService.getProfilByOwner(walletAddress);
      onProfileUpdate?.(updatedProfile);
      refreshProfiles();

      setEditingCounterpart(false);
      setNotification({
        type: 'success',
        message: '✅ Contrepartie mise à jour avec succès',
      });
    } catch (err) {
      console.error('❌ Error saving counterpart:', err);
      setNotification({
        type: 'error',
        message: (err as Error).message || 'Impossible de sauvegarder la contrepartie',
      });
    } finally {
      setSavingCounterpart(false);
    }
  }, [profileInfo, isCreator, walletAddress, tokenId, editCounterpart, onProfileUpdate, refreshProfiles, setNotification]);

  // Toggle visibility
  const handleToggleVisibility = useCallback(async () => {
    if (!profileInfo || !isCreator || !walletAddress || !tokenId) {
      setNotification({
        type: 'error',
        message: 'Vous devez être le créateur du jeton pour modifier sa visibilité',
      });
      return;
    }

    setTogglingVisibility(true);
    try {
      await profilService.updateTokenMetadata(walletAddress, tokenId, {
        isVisible: !isTokenVisible,
      });

      const updatedProfile = await profilService.getProfilByOwner(walletAddress);
      onProfileUpdate?.(updatedProfile);
      refreshProfiles();

      setIsTokenVisible(!isTokenVisible);
      console.log(`✅ Visibility updated: ${!isTokenVisible ? 'Visible' : 'Hidden'}`);
    } catch (err) {
      console.error('❌ Error toggling visibility:', err);
      setNotification({
        type: 'error',
        message: (err as Error).message || 'Impossible de modifier la visibilité du jeton',
      });
    } finally {
      setTogglingVisibility(false);
    }
  }, [profileInfo, isCreator, walletAddress, tokenId, isTokenVisible, onProfileUpdate, refreshProfiles, setNotification]);

  // Start editing purpose
  const startEditingPurpose = useCallback((currentValue: string) => {
    setEditPurpose(currentValue || '');
    setEditingPurpose(true);
  }, []);

  // Start editing counterpart
  const startEditingCounterpart = useCallback((currentValue: string) => {
    setEditCounterpart(currentValue || '');
    setEditingCounterpart(true);
  }, []);

  // Cancel editing
  const cancelEditingPurpose = useCallback(() => {
    setEditingPurpose(false);
    setEditPurpose('');
  }, []);

  const cancelEditingCounterpart = useCallback(() => {
    setEditingCounterpart(false);
    setEditCounterpart('');
  }, []);

  // Initialize visibility from profile
  const initializeVisibility = useCallback((visible: boolean) => {
    setIsTokenVisible(visible);
  }, []);

  return {
    // Purpose state
    editingPurpose,
    editPurpose,
    savingPurpose,
    setEditPurpose,

    // Counterpart state
    editingCounterpart,
    editCounterpart,
    savingCounterpart,
    setEditCounterpart,

    // Visibility state
    isTokenVisible,
    togglingVisibility,

    // Actions
    handleSavePurpose,
    handleSaveCounterpart,
    handleToggleVisibility,
    startEditingPurpose,
    startEditingCounterpart,
    cancelEditingPurpose,
    cancelEditingCounterpart,
    initializeVisibility,
    setEditingPurpose,
    setEditingCounterpart,
  };
}

export type UseTokenMetadataReturn = ReturnType<typeof useTokenMetadata>;
