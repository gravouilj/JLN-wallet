-- Migration 003: Soft Delete et Statuts de suppression
-- Date: 2025-12-09
-- Description: Ajouter colonnes pour soft delete et gestion des signalements

-- 1. Ajouter colonnes à la table farms
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'pending_deletion', 'deleted')),
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- 2. Créer table de blacklist
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecash_address TEXT NOT NULL,
  token_ids TEXT[], -- Array de tokenIDs
  reason TEXT NOT NULL,
  farm_name TEXT,
  farm_description TEXT,
  blacklisted_at TIMESTAMP DEFAULT NOW(),
  blacklisted_by TEXT, -- Adresse admin
  UNIQUE(ecash_address)
);

-- 3. Créer index sur blacklist
CREATE INDEX IF NOT EXISTS idx_blacklist_address ON blacklist(ecash_address);
CREATE INDEX IF NOT EXISTS idx_blacklist_date ON blacklist(blacklisted_at DESC);

-- 4. Modifier la table farm_reports pour ajouter le statut de traitement
ALTER TABLE farm_reports
ADD COLUMN IF NOT EXISTS admin_status TEXT DEFAULT 'pending' CHECK (admin_status IN ('pending', 'investigating', 'ignored', 'resolved')),
ADD COLUMN IF NOT EXISTS admin_action_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 5. Créer index sur farm_reports.admin_status
CREATE INDEX IF NOT EXISTS idx_farm_reports_status ON farm_reports(admin_status);

-- 6. Commentaires pour documentation
COMMENT ON COLUMN farms.status IS 'active: visible | hidden: masqué admin | pending_deletion: suppression dans 1an | deleted: supprimé définitivement';
COMMENT ON COLUMN farms.deletion_requested_at IS 'Date de demande de suppression (1 an avant suppression définitive)';
COMMENT ON TABLE blacklist IS 'Arnaques confirmées - addresses bannies définitivement';
COMMENT ON COLUMN farm_reports.admin_status IS 'pending: non traité | investigating: demande info envoyée | ignored: signalement ignoré | resolved: ferme validée ou supprimée';
