-- HOTFIX: Ajouter la colonne banned_at manquante
-- Date: 2025-12-13
-- À exécuter immédiatement dans Supabase SQL Editor

-- Ajouter la colonne banned_at
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Ajouter le commentaire
COMMENT ON COLUMN farms.banned_at IS 
'Date de bannissement par l''admin (si status = banned)';

-- Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'farms' 
  AND column_name IN ('suspended_at', 'deleted_at', 'banned_at', 'suspension_reason')
ORDER BY column_name;
