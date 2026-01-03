import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectedProfileAtom, WalletToken } from '../../../atoms';
import { useProfiles } from '../../../hooks/useProfiles';
import { useEcashWallet } from '../../../hooks/useEcashWallet';
import { deriveTicker } from '../utils/formatTokenBalance';

interface Profile {
  id: string;
  name: string;
  tokenId: string;
  ticker?: string;
  protocol?: string;
  verified?: boolean;
  owner_address?: string;
  description?: string;
  socials?: Record<string, string>;
  location_country?: string;
  location_region?: string;
  city?: string;
  website?: string;
  email?: string;
  phone?: string;
  tokens?: Array<{
    tokenId: string;
    image?: string;
    purpose?: string;
    counterpart?: string;
  }>;
  [key: string]: unknown;
}

interface UseResolvedProfileResult {
  selectedProfile: Profile | null;
  resolvedProfile: Profile | null;
  profileDisplayName: string;
  profileDisplayTicker: string;
  selectedProfileProtocol: string;
  isCreator: boolean;
  selectedTokenData: {
    tokenId: string;
    image?: string;
    purpose?: string;
    counterpart?: string;
  } | null;
}

/**
 * Hook to resolve and provide complete profile data
 * Extracted from ClientWalletPage to reduce complexity
 * Accepts WalletToken[] from useWalletScan
 */
export const useResolvedProfile = (myTokens: WalletToken[] = []): UseResolvedProfileResult => {
  const selectedProfile = useAtomValue(selectedProfileAtom);
  const { profiles } = useProfiles() as { profiles: Profile[] };
  const { address } = useEcashWallet();

  // Resolve profile from all sources
  const resolvedProfile = useMemo<Profile | null>(() => {
    if (!selectedProfile) return null;
    // First check in profiles, then in wallet tokens
    const fromProfiles = Array.isArray(profiles) 
      ? profiles.find(p => p.tokenId === selectedProfile.tokenId) 
      : null;
    if (fromProfiles) return fromProfiles;
    
    // Check if token exists in wallet tokens
    const walletToken = myTokens.find(t => t.tokenId === selectedProfile.tokenId);
    if (walletToken) {
      // Convert WalletToken to Profile-like object
      return {
        id: walletToken.profileId || walletToken.tokenId,
        name: walletToken.name,
        tokenId: walletToken.tokenId,
        ticker: walletToken.ticker,
        verified: walletToken.verified,
      };
    }
    return null;
  }, [selectedProfile, profiles, myTokens]);

  // Derive display values
  const resolvedNameSource = selectedProfile?.name || resolvedProfile?.name || '';
  const profileDisplayName = resolvedNameSource || 'Jeton sélectionné';
  const profileDisplayTicker = selectedProfile?.ticker || resolvedProfile?.ticker || deriveTicker(undefined, resolvedNameSource);
  const selectedProfileProtocol = selectedProfile?.protocol || resolvedProfile?.protocol || 'ALP';

  // Check if current user is the creator
  const isCreator = useMemo(() => {
    return Boolean(address && resolvedProfile?.owner_address === address);
  }, [address, resolvedProfile]);

  // Get token-specific data (image, purpose, counterpart)
  const selectedTokenData = useMemo(() => {
    if (!resolvedProfile || !selectedProfile) return null;
    return resolvedProfile.tokens?.find(t => t.tokenId === selectedProfile.tokenId) || null;
  }, [resolvedProfile, selectedProfile]);

  return {
    selectedProfile: selectedProfile as Profile | null,
    resolvedProfile,
    profileDisplayName,
    profileDisplayTicker,
    selectedProfileProtocol,
    isCreator,
    selectedTokenData,
  };
};

export default useResolvedProfile;
