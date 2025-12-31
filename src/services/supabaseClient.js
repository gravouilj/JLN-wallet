import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config/constants'; // ✅ Import de la config

// Création du client avec les constantes centralisées
export const supabase = createClient(
  APP_CONFIG.SUPABASE.URL,
  APP_CONFIG.SUPABASE.ANON_KEY
);