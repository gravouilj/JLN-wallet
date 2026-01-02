import { useState, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';

interface UseImageUploadReturn {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  uploading: boolean;
  error: string;
  handleFileSelect: (file: File) => Promise<void>;
  clearImage: () => void;
}

/**
 * useImageUpload - Hook pour l'upload d'images
 * 
 * Encapsule la logique:
 * - Validation des fichiers (type, taille)
 * - Conversion en data URI (base64)
 * - Gestion des erreurs
 * - Notifications utilisateur
 * 
 * Supporte: JPEG, PNG, WebP, GIF
 * Taille max: 2 MB
 * 
 * @param {number} maxSize - Taille max en MB (défaut: 2)
 * @returns {UseImageUploadReturn} État et méthodes
 */
export const useImageUpload = (maxSize: number = 2): UseImageUploadReturn => {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const setNotification = useSetAtom(notificationAtom);

  // Types MIME autorisés
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  // Valider le fichier
  const validateFile = useCallback((file: File): boolean => {
    // Vérifier le type
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté (JPEG, PNG, WebP, GIF)');
      setNotification({ 
        type: 'error', 
        message: '❌ Format d\'image non supporté' 
      });
      return false;
    }

    // Vérifier la taille
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSize) {
      setError(`Fichier trop volumineux (max ${maxSize}MB)`);
      setNotification({ 
        type: 'error', 
        message: `❌ Fichier trop volumineux (max ${maxSize}MB)` 
      });
      return false;
    }

    return true;
  }, [maxSize, setNotification]);

  // Traiter la sélection de fichier
  const handleFileSelect = useCallback(async (file: File): Promise<void> => {
    setError('');

    if (!validateFile(file)) {
      return;
    }

    setUploading(true);

    try {
      // Lire le fichier en data URI
      const reader = new FileReader();
      
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          const dataUri = reader.result as string;
          setImageUrl(dataUri);
          setNotification({ 
            type: 'success', 
            message: '✅ Image chargée' 
          });
          resolve();
        };
        
        reader.onerror = () => {
          reject(new Error('Erreur lecture fichier'));
        };
        
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error('Erreur upload image:', err);
      const message = err instanceof Error ? err.message : 'Erreur upload';
      setError(message);
      setNotification({ type: 'error', message: `❌ ${message}` });
    } finally {
      setUploading(false);
    }
  }, [validateFile, setNotification]);

  // Effacer l'image
  const clearImage = useCallback(() => {
    setImageUrl('');
    setError('');
  }, []);

  return {
    imageUrl,
    setImageUrl,
    uploading,
    error,
    handleFileSelect,
    clearImage
  };
};
