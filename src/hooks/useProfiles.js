import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ProfilService } from '../services/profilService';

/**
 * Hook to load and manage profiles data from Supabase (Cloud)
 * @returns {Object} { profiles, loading, error, refreshProfiles }
 */
export const useProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger uniquement les profils ACTIVES et VISIBLES dans l'annuaire
      // Un profil est visible si: status='active' ET au moins 1 token avec isVisible=true
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active') // Uniquement les profils actives/publiques
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filtrer les profils qui ont au moins 1 token visible
      const visibleProfiles = (data || []).filter(profile => {
        if (!profile.tokens || !Array.isArray(profile.tokens)) return false;
        return profile.tokens.some(token => token.isVisible === true);
      });
      
      console.log(`✅ ${visibleProfiles.length} profils visibles chargés depuis Supabase (${data?.length || 0} actives au total)`);
      setProfiles(visibleProfiles);
    } catch (err) {
      console.error('Failed to load profiles from Supabase:', err);
      setError(err.message || 'Failed to load profiles data');
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
 * @param {string} profileId - The profile ID to find
 * @returns {Object} { profile, loading, error }
 */
export const useProfile = (profileId) => {
  const { profiles, loading, error } = useProfiles();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!loading && profiles.length > 0 && profileId) {
      const foundProfile = profiles.find(p => p.id === profileId);
      setProfile(foundProfile || null);
    }
  }, [profiles, loading, profileId]);

  return {
    profile,
    loading,
    error
  };
};

// Aliases de compatibilité pour la migration farms → profils
export const useFarms = () => {
  const { profiles, loading, error, refreshProfiles } = useProfiles();
  return {
    farms: profiles,
    loading,
    error,
    refreshFarms: refreshProfiles
  };
};

export const useFarm = (farmId) => {
  const { profile, loading, error } = useProfile(farmId);
  return {
    farm: profile,
    loading,
    error
  };
};
