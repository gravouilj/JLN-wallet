-- Table pour les signalements de fermes par les utilisateurs
-- Date: 2025-12-09

-- Créer la table farm_reports
CREATE TABLE IF NOT EXISTS farm_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  reporter_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index pour les requêtes fréquentes
  CONSTRAINT unique_reporter_farm UNIQUE (farm_id, reporter_address)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_farm_reports_farm_id ON farm_reports(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_reports_created_at ON farm_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farm_reports_reporter ON farm_reports(reporter_address);

-- Commentaires
COMMENT ON TABLE farm_reports IS 'Signalements de fermes suspectées d''arnaque par les utilisateurs';
COMMENT ON COLUMN farm_reports.farm_id IS 'ID de la ferme signalée (FK vers farms)';
COMMENT ON COLUMN farm_reports.reporter_address IS 'Adresse eCash de l''utilisateur qui signale';
COMMENT ON COLUMN farm_reports.reason IS 'Raison du signalement';

-- Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'farm_reports'
ORDER BY ordinal_position;
