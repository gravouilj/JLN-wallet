/**
 * Command Hook Types - Interface standardisée pour les hooks de commande
 * 
 * Tous les hooks de commande (send, mint, burn, airdrop) doivent suivre ce pattern:
 * - loading: boolean  (pas isLoading)
 * - error: string | null
 * - success: boolean
 * - txId: string | null
 * - execute: (...args) => Promise<string | null>
 * - reset: () => void
 */

export interface CommandHookState {
  loading: boolean;
  error: string | null;
  success: boolean;
  txId: string | null;
}

export const initialCommandState: CommandHookState = {
  loading: false,
  error: null,
  success: false,
  txId: null,
};

export interface CommandHookResult<TParams extends unknown[]> extends CommandHookState {
  execute: (...params: TParams) => Promise<string | null>;
  reset: () => void;
}

/**
 * Helper pour créer un état de chargement
 */
export const loadingState = (): CommandHookState => ({
  loading: true,
  error: null,
  success: false,
  txId: null,
});

/**
 * Helper pour créer un état d'erreur
 */
export const errorState = (error: string): CommandHookState => ({
  loading: false,
  error,
  success: false,
  txId: null,
});

/**
 * Helper pour créer un état de succès
 */
export const successState = (txId: string): CommandHookState => ({
  loading: false,
  error: null,
  success: true,
  txId,
});
