/**
 * Token Management Types
 */

export interface TokenActionResult {
  success: boolean;
  txid?: string;
  error?: string;
  amount?: string;
}

export interface MintParams {
  tokenId: string;
  amount: string;
  decimals: number;
}

export interface BurnParams {
  tokenId: string;
  amount: string;
  decimals: number;
}

export interface AirdropParams {
  tokenId: string;
  totalAmount: string;
  recipients: string[];
  mode: 'equal' | 'prorata';
}

export interface SendTokenParams {
  tokenId: string;
  toAddress: string;
  amount: string;
  decimals: number;
}
