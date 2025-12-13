-- Migration: Ajouter les champs de localisation séparés
-- Date: 2025-12-13
-- Description: Séparer l'adresse unique en 4 champs pour filtrage granulaire

-- Ajouter les colonnes de localisation
ALTER TABLE farms 
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT;

-- Note: L'ancienne colonne 'address' peut être conservée temporairement pour migration des données
-- Si vous souhaitez migrer les données existantes, vous pouvez utiliser un script de parsing

-- Indexes optionnels pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_farms_city ON farms(city);
CREATE INDEX IF NOT EXISTS idx_farms_postal_code ON farms(postal_code);
CREATE INDEX IF NOT EXISTS idx_farms_location_region ON farms(location_region);
CREATE INDEX IF NOT EXISTS idx_farms_location_department ON farms(location_department);

-- Commentaires pour documentation
COMMENT ON COLUMN farms.city IS 'Ville ou commune de l''établissement';
COMMENT ON COLUMN farms.postal_code IS 'Code postal';
COMMENT ON COLUMN farms.street_address IS 'Numéro et nom de rue (requis)';
COMMENT ON COLUMN farms.address_complement IS 'Complément d''adresse (bâtiment, porte, lieu-dit...)';
