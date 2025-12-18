-- Migration : Créer la table profile_reports si elle n'existe pas
-- Date : 2025-12-18
-- Description : Table pour les signalements de profils

-- Créer la table profile_reports
CREATE TABLE IF NOT EXISTS profile_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index pour les requêtes fréquentes
  CONSTRAINT unique_reporter_profile UNIQUE (profil_id, reporter_address)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profile_reports_profil_id ON profile_reports(profil_id);
CREATE INDEX IF NOT EXISTS idx_profile_reports_created_at ON profile_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_reports_reporter ON profile_reports(reporter_address);

-- Commentaires
COMMENT ON TABLE profile_reports IS 'Signalements de profils suspectés d''arnaque par les utilisateurs';
COMMENT ON COLUMN profile_reports.profil_id IS 'ID du profil signalé (FK vers profiles)';
COMMENT ON COLUMN profile_reports.reporter_address IS 'Adresse eCash de l''utilisateur qui signale';
COMMENT ON COLUMN profile_reports.reason IS 'Raison du signalement';

-- Fin de la migration
