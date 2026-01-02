import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ProfilService } from '../services/profilService';

// Type definitions
export interface Profile {
  id: string;
  name: string;
  tokenId: string;
  ticker?: string;
  verified?: boolean;
  creatorProfileId?: string;
  status?: string;
  tokens?: Token[];
  [key: string]: any;
}

interface Token {
  isVisible: boolean;
  [key: string]: any;
}

interface UseProfilesReturn {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  refreshProfiles: () => Promise<void>;
}

interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface UseFarmsReturn {
  farms: Profile[];
  loading: boolean;
  error: string | null;
  refreshFarms: () => Promise<void>;
}

interface UseFarmReturn {
  farm: Profile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to load and manage profiles data from Supabase (Cloud)
 */
export const useProfiles = (): UseProfilesReturn => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Charger uniquement les profils ACTIVES et VISIBLES dans l'annuaire
      const { data, error: supabaseError } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (supabaseError) throw supabaseError;
      
      // Filtrer les profils qui ont au moins 1 token visible
      const visibleProfiles = (data || []).filter((profile: Profile) => {
        if (!profile.tokens || !Array.isArray(profile.tokens)) return false;
        return profile.tokens.some((token: Token) => token.isVisible === true);
      });
      
      console.log(`✅ ${visibleProfiles.length} profils visibles chargés depuis Supabase (${data?.length || 0} actives au total)`);
      setProfiles(visibleProfiles);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load profiles data';
      console.error('Failed to load profiles from Supabase:', err);
      setError(errorMsg);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return {
    profiles,
    loading,
    error,
    refreshProfiles: loadProfiles
  };
};

/**
 * Hook to get a single profile by ID
 */
export const useProfile = (profileId: string | null | undefined): UseProfileReturn => {
  const { profiles, loading, error } = useProfiles();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && profiles.length > 0 && profileId) {
      const foundProfile = profiles.find((p: Profile) => p.id === profileId);
      setProfile(foundProfile || null);
    }
  }, [profiles, loading, profileId]);

  return {
    profile,
    loading,
    error
  };
};

/**
 * Compatibility aliases for farms → profiles migration
 */
export const useFarms = (): UseFarmsReturn => {
  const { profiles, loading, error, refreshProfiles } = useProfiles();
  return {
    farms: profiles,
    loading,
    error,
    refreshFarms: refreshProfiles
  };
};

export const useFarm = (farmId: string | null | undefined): UseFarmReturn => {
  const { profile, loading, error } = useProfile(farmId);
  return {
    farm: profile,
    loading,
    error
  };
};
