-- Migration des statuts - Simplification du système
-- Date: 2025-12-13
-- Description: Mise à jour de la structure des statuts pour une logique simplifiée

-- ÉTAPE 1: Migration des verification_status
-- Remplacer 'unverified' par 'none'
UPDATE farms 
SET verification_status = 'none' 
WHERE verification_status = 'unverified';

-- ÉTAPE 2: Migration des status de ferme
-- 'pending_deletion' → 'deleted'
UPDATE farms 
SET status = 'deleted' 
WHERE status = 'pending_deletion';

-- 'hidden' → 'suspended' (fermes masquées par admin)
UPDATE farms 
SET status = 'suspended' 
WHERE status = 'hidden';

-- ÉTAPE 3: Migration des colonnes de timestamps
-- Renommer les colonnes pour correspondre aux nouveaux statuts

-- Ajouter nouvelles colonnes si elles n'existent pas
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Copier les données des anciennes colonnes vers les nouvelles
UPDATE farms 
SET suspended_at = hidden_at 
WHERE hidden_at IS NOT NULL AND suspended_at IS NULL;

UPDATE farms 
SET deleted_at = deletion_requested_at 
WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL;

-- ÉTAPE 4: Supprimer les anciennes colonnes (ATTENTION: sauvegarder avant!)
-- Décommenter après vérification que les données sont bien migrées
-- ALTER TABLE farms DROP COLUMN IF EXISTS hidden_at;
-- ALTER TABLE farms DROP COLUMN IF EXISTS deletion_requested_at;

-- ÉTAPE 5: Mettre à jour les contraintes CHECK
-- Supprimer les anciennes contraintes
ALTER TABLE farms 
DROP CONSTRAINT IF EXISTS farms_status_check;

ALTER TABLE farms 
DROP CONSTRAINT IF EXISTS farms_verification_status_check;

-- Ajouter les nouvelles contraintes avec les valeurs mises à jour
ALTER TABLE farms 
ADD CONSTRAINT farms_status_check 
CHECK (status IN ('draft', 'active', 'suspended', 'banned', 'deleted'));

ALTER TABLE farms 
ADD CONSTRAINT farms_verification_status_check 
CHECK (verification_status IN ('none', 'pending', 'info_requested', 'verified', 'rejected'));

-- ÉTAPE 6: Mettre à jour les valeurs par défaut
ALTER TABLE farms 
ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE farms 
ALTER COLUMN verification_status SET DEFAULT 'none';

-- ÉTAPE 7: Vérification post-migration
-- Compter les fermes par statut pour vérifier la migration
DO $$
BEGIN
  RAISE NOTICE '=== VÉRIFICATION POST-MIGRATION ===';
  
  RAISE NOTICE 'Status des fermes:';
  RAISE NOTICE '  - Draft: %', (SELECT COUNT(*) FROM farms WHERE status = 'draft');
  RAISE NOTICE '  - Active: %', (SELECT COUNT(*) FROM farms WHERE status = 'active');
  RAISE NOTICE '  - Suspended: %', (SELECT COUNT(*) FROM farms WHERE status = 'suspended');
  RAISE NOTICE '  - Banned: %', (SELECT COUNT(*) FROM farms WHERE status = 'banned');
  RAISE NOTICE '  - Deleted: %', (SELECT COUNT(*) FROM farms WHERE status = 'deleted');
  
  RAISE NOTICE 'Verification status:';
  RAISE NOTICE '  - None: %', (SELECT COUNT(*) FROM farms WHERE verification_status = 'none');
  RAISE NOTICE '  - Pending: %', (SELECT COUNT(*) FROM farms WHERE verification_status = 'pending');
  RAISE NOTICE '  - Info requested: %', (SELECT COUNT(*) FROM farms WHERE verification_status = 'info_requested');
  RAISE NOTICE '  - Verified: %', (SELECT COUNT(*) FROM farms WHERE verification_status = 'verified');
  RAISE NOTICE '  - Rejected: %', (SELECT COUNT(*) FROM farms WHERE verification_status = 'rejected');
  
  -- Vérifier qu'il n'y a plus d'anciennes valeurs
  IF EXISTS (SELECT 1 FROM farms WHERE verification_status = 'unverified') THEN
    RAISE WARNING 'ATTENTION: Il reste des fermes avec verification_status = unverified';
  END IF;
  
  IF EXISTS (SELECT 1 FROM farms WHERE status IN ('hidden', 'pending_deletion')) THEN
    RAISE WARNING 'ATTENTION: Il reste des fermes avec les anciens status (hidden/pending_deletion)';
  END IF;
  
  RAISE NOTICE '=================================';
END $$;

-- ÉTAPE 8: Créer des index pour optimiser les requêtes
-- Index sur status pour les recherches dans l'annuaire
CREATE INDEX IF NOT EXISTS idx_farms_status_active 
ON farms(status) 
WHERE status = 'active';

-- Index sur verification_status pour les pages admin
CREATE INDEX IF NOT EXISTS idx_farms_verification_status 
ON farms(verification_status);

-- Index composite pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_farms_status_verification 
ON farms(status, verification_status);

-- ÉTAPE 9: Mettre à jour les vues si elles existent
-- Si vous avez des vues qui dépendent des anciens statuts, les recréer ici

-- ÉTAPE 10: Commentaires sur les colonnes pour documentation
COMMENT ON COLUMN farms.status IS 
'Statut de visibilité de la ferme: draft (brouillon), active (public), suspended (masqué par admin), banned (bloqué), deleted (supprimé)';

COMMENT ON COLUMN farms.verification_status IS 
'Statut de vérification: none (pas de badge), pending (en attente), info_requested (info demandée), verified (badge ✅), rejected (refusé)';

COMMENT ON COLUMN farms.suspended_at IS 
'Date de suspension par l''admin (si status = suspended)';

COMMENT ON COLUMN farms.deleted_at IS 
'Date de suppression par l''utilisateur (si status = deleted)';

COMMENT ON COLUMN farms.banned_at IS 
'Date de bannissement par l''admin (si status = banned)';

COMMENT ON COLUMN farms.suspension_reason IS 
'Raison de la suspension (visible uniquement par l''admin)';

-- ROLLBACK en cas de problème (à exécuter AVANT la migration pour préparer le retour arrière)
/*
-- Script de rollback à garder en backup
UPDATE farms SET verification_status = 'unverified' WHERE verification_status = 'none';
UPDATE farms SET status = 'pending_deletion' WHERE status = 'deleted';
UPDATE farms SET status = 'hidden' WHERE status = 'suspended';
*/

-- FIN DE LA MIGRATION
