// Type declarations for hooks index

// Wallet hooks
export interface UseEcashWalletReturn {
  wallet: any;
  address: string;
  balance: number;
  walletConnected: boolean;
}

export interface UseEcashBalanceReturn {
  balance: number;
  balanceBreakdown: any;
  loading: boolean;
}

export interface UseEcashTokenReturn {
  tokenInfo: any;
  tokenLoading: boolean;
  error: string | null;
}

// Profile hooks
export interface Profile {
  id: string;
  name: string;
  tokenId: string;
  verified?: boolean;
  ticker?: string;
  creatorProfileId?: string;
  [key: string]: any;
}

export interface UseProfilesReturn {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  refreshProfiles?: () => Promise<void>;
}

// Price hook
export interface PriceObject {
  [currency: string]: number;
}

export interface UseXecPriceReturn {
  price: PriceObject | null;
  loading: boolean;
  error: string | null;
}

// Translation hook
export interface UseTranslationReturn {
  t: (key: string, defaultValue?: string) => string;
  locale: string;
  changeLanguage: (lang: string) => void;
  languages: string[];
  languageNames: Record<string, string>;
}

// Export functions
export function useEcashWallet(): UseEcashWalletReturn;
export function useEcashBalance(): UseEcashBalanceReturn;
export function useEcashToken(tokenId?: string | null): UseEcashTokenReturn;
export function useProfiles(): UseProfilesReturn;
export function useFarms(): { farms: Profile[]; loading: boolean; error: string | null; refreshFarms?: () => Promise<void> };
export function useProfile(profileId: string | null | undefined): { profile: Profile | null; loading: boolean; };
export function useFarm(farmId: string | null | undefined): { farm: Profile | null; loading: boolean; };
export function useXecPrice(): UseXecPriceReturn;
export function useTranslation(): UseTranslationReturn;
export function useAdmin(): any;
export function useIsCreator(): any;
export function useChronikWebSocket(): any;
export function useAddressBook(tokenId?: string | null, onSelect?: (address: string, name: string) => void): any;
export function useClientTicketForm(props?: any): any;
export function useNetworkFees(estimatedFee?: number): any;
export function useCreateToken(): any;
export function useImageUpload(): any;
export function useSendToken(tokenId?: string, decimals?: number): any;
export function useAirdropToken(tokenId?: string, decimals?: number): any;
export function useMintToken(tokenId?: string, decimals?: number): any;
export function useBurnToken(tokenId?: string, decimals?: number): any;
export function useWalletScan(): any;
