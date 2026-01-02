import { useAdmin } from './useAdmin';

/**
 * useIsCreator - Vérifier si l'utilisateur connecté est créateur/admin de tokens
 * Wrapper autour de useAdmin pour une meilleure sémantique
 * @returns {boolean} true si l'utilisateur est créateur/admin
 */
export function useIsCreator() {
  return useAdmin();
}
