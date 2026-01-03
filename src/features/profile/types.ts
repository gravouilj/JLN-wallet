/**
 * Profile Feature Types
 */

export interface ProfileFeatureState {
  profile: UserProfileData | null;
  isLoading: boolean;
  error: string | null;
  verificationStatus: VerificationStatus;
}

export interface UserProfileData {
  id: string;
  owner_address: string;
  name: string;
  description?: string;
  tokens: ProfileToken[];
  socials?: SocialLinks;
  location_country?: string;
  city?: string;
  website?: string;
  verified?: boolean;
}

export interface ProfileToken {
  tokenId: string;
  ticker?: string;
  name?: string;
  image?: string;
  purpose?: string;
  counterpart?: string;
  isVisible?: boolean;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
  telegram?: string;
}

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected' | 'info_requested';
