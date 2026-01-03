/**
 * Standard Hook Result Interface
 * 
 * Tous les hooks de transaction (useSendToken, useMintToken, etc.)
 * doivent retourner ce format standardisé.
 */

export interface StandardActionResult<TResult = void> {
  /** Fonction pour exécuter l'action */
  execute: (...args: any[]) => Promise<TResult>;
  /** Indique si l'action est en cours */
  loading: boolean;
  /** Message d'erreur si l'action a échoué */
  error: string | null;
  /** Indique si l'action a réussi */
  success: boolean;
  /** Réinitialise l'état du hook */
  reset: () => void;
}

/**
 * Transaction Result
 * Résultat d'une transaction blockchain
 */
export interface TransactionResult {
  success: boolean;
  txid?: string;
  error?: string;
  amount?: string;
}

/**
 * Validation Result
 * Résultat de validation d'un formulaire
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * API Response Standard
 * Format standard pour les réponses API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
