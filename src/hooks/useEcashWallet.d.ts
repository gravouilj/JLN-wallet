import type { EcashWallet } from '../../services/ecashWallet';

export interface UseEcashWalletReturn {
  wallet: EcashWallet | null;
  address: string;
  balance: string;
  loading: boolean;
  error: string | null;
  walletConnected: boolean;
}

export function useEcashWallet(): UseEcashWalletReturn;
export function useEcashBalance(): {
  balance: string;
  balanceBreakdown: any;
  loading: boolean;
};
export function useEcashToken(tokenId: string | null | undefined): {
  tokenInfo: any;
  tokenBalance: string;
  loading: boolean;
};
export function useEcashXec(): {
  balance: string;
  loading: boolean;
};
