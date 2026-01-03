/**
 * Wallet Feature Types
 */

export interface WalletFeatureState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  tokens: TokenBalance[];
  isLoading: boolean;
  error: string | null;
}

export interface TokenBalance {
  tokenId: string;
  amount: string;
  decimals: number;
  ticker?: string;
  name?: string;
}

export interface SendResult {
  success: boolean;
  txid?: string;
  error?: string;
}

export interface StandardHookResult<T = void> {
  execute: (...args: any[]) => Promise<T>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}
