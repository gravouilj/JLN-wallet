export interface Profile {
  id: string;
  name: string;
  ticker?: string;
  verified?: boolean;
  tokenId: string;
  creatorProfileId?: string;
  [key: string]: any;
}

export interface UseProfilesReturn {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  refreshProfiles?: () => Promise<void>;
}

export interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useProfiles(): UseProfilesReturn;
export function useFarms(): { farms: Profile[]; loading: boolean; error: string | null; refreshFarms?: () => Promise<void> };
export function useProfile(profileId: string | null | undefined): UseProfileReturn;
export function useFarm(farmId: string | null | undefined): { farm: Profile | null; loading: boolean; };
