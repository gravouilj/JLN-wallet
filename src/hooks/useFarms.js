import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { FarmService } from '../services/farmService';

/**
 * Hook to load and manage farms data from Supabase (Cloud)
 * @returns {Object} { farms, loading, error, refreshFarms }
 */
export const useFarms = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFarms = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger uniquement les fermes ACTIVES et VISIBLES dans l'annuaire
      // Une ferme est visible si: status='active' ET au moins 1 token avec isVisible=true
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('status', 'active') // Uniquement les fermes actives/publiques
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filtrer les fermes qui ont au moins 1 token visible
      const visibleFarms = (data || []).filter(farm => {
        if (!farm.tokens || !Array.isArray(farm.tokens)) return false;
        return farm.tokens.some(token => token.isVisible === true);
      });
      
      console.log(`✅ ${visibleFarms.length} fermes visibles chargées depuis Supabase (${data?.length || 0} actives au total)`);
      setFarms(visibleFarms);
    } catch (err) {
      console.error('Failed to load farms from Supabase:', err);
      setError(err.message || 'Failed to load farms data');
      setFarms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, []);

  return {
    farms,
    loading,
    error,
    refreshFarms: loadFarms
  };
};

/**
 * Hook to get a single farm by ID
 * @param {string} farmId - The farm ID to find
 * @returns {Object} { farm, loading, error }
 */
export const useFarm = (farmId) => {
  const { farms, loading, error } = useFarms();
  const [farm, setFarm] = useState(null);

  useEffect(() => {
    if (!loading && farms.length > 0 && farmId) {
      const foundFarm = farms.find(f => f.id === farmId);
      setFarm(foundFarm || null);
    }
  }, [farms, loading, farmId]);

  return {
    farm,
    loading,
    error
  };
};
