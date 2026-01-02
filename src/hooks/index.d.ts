export interface UseTranslationReturn {
  t: (key: string, defaultValue?: string) => string;
  i18n: any;
}

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
