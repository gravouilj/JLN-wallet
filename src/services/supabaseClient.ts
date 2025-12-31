import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config/constants'; // ✅ Import de la config

/**
 * Client Supabase global
 * Utilisé pour :
 * - Authentification anonyme
 * - Accès à la base de données (profiles, activity_history, etc.)
 * 
 * @see docs/SUPABASE_SCHEMA.md pour le schéma complet
 */
export const supabase = createClient(
  APP_CONFIG.SUPABASE.URL,
  APP_CONFIG.SUPABASE.ANON_KEY
);
