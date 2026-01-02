export interface UseProfilesReturn {
  profiles: any[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProfiles(): UseProfilesReturn;
export function useFarms(): UseProfilesReturn;
export function useProfile(profileId: string | null | undefined): {
  profile: any;
  loading: boolean;
};
export function useFarm(farmId: string | null | undefined): {
  farm: any;
  loading: boolean;
};
