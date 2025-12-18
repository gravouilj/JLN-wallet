-- Migration : Renommage de colonnes pour cohérence nomenclature
-- Date : 2025-12-18
-- Description : Renommer farm_id → profile_id dans tickets et visible_to_farmer → visible_to_profile dans profile_reports

-- 1. Renommer farm_id en profile_id dans la table tickets
ALTER TABLE tickets RENAME COLUMN farm_id TO profile_id;

-- Mettre à jour le commentaire
COMMENT ON COLUMN tickets.profile_id IS 'ID du profil concerné (relation vers profiles)';

-- Recréer l'index avec le nouveau nom de colonne
DROP INDEX IF EXISTS idx_tickets_farm_id;
CREATE INDEX idx_tickets_profile_id ON tickets(profile_id) WHERE profile_id IS NOT NULL;

-- 2. Renommer visible_to_farmer en visible_to_profile dans profile_reports (si la colonne existe)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profile_reports' 
    AND column_name = 'visible_to_farmer'
  ) THEN
    ALTER TABLE profile_reports RENAME COLUMN visible_to_farmer TO visible_to_profile;
    COMMENT ON COLUMN profile_reports.visible_to_profile IS 'Signalement visible par le propriétaire du profil';
  END IF;
END $$;

-- Fin de la migration
