-- ============================================================================
-- Migration : Création de la table activity_history
-- Date: 2025-12-18
-- Description: Crée activity_history pour l'historique des actions tokens
-- Note: profile_reports existe déjà et ne nécessite pas de modification
-- ============================================================================

-- ========================================
-- TABLE 1 : activity_history
-- ========================================
-- Stocke l'historique des actions sur les tokens
CREATE TABLE IF NOT EXISTS activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiants
  owner_address TEXT NOT NULL, -- Adresse wallet du propriétaire
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Profil associé (optionnel)
  token_id TEXT NOT NULL, -- ID du token concerné
  token_ticker TEXT, -- Ticker du token (dénormalisé pour performance)
  
  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('SEND', 'AIRDROP', 'MINT', 'BURN', 'CREATE', 'IMPORT')),
  amount NUMERIC, -- Montant de l'action (NULL si non applicable)
  tx_id TEXT, -- Transaction ID blockchain
  
  -- Métadonnées
  details JSONB DEFAULT '{}'::jsonb, -- Détails supplémentaires (recipients, mode, etc.)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT valid_amount CHECK (amount IS NULL OR amount >= 0)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_activity_history_owner ON activity_history(owner_address);
CREATE INDEX IF NOT EXISTS idx_activity_history_profile ON activity_history(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_history_token ON activity_history(token_id);
CREATE INDEX IF NOT EXISTS idx_activity_history_action ON activity_history(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_history_created ON activity_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_history_tx ON activity_history(tx_id) WHERE tx_id IS NOT NULL;

-- Commentaires
COMMENT ON TABLE activity_history IS 'Historique des actions sur les tokens (send, mint, burn, airdrop, etc.)';
COMMENT ON COLUMN activity_history.owner_address IS 'Adresse wallet du propriétaire qui a effectué l''action';
COMMENT ON COLUMN activity_history.action_type IS 'Type d''action: SEND, AIRDROP, MINT, BURN, CREATE, IMPORT';
COMMENT ON COLUMN activity_history.details IS 'Détails JSON: recipients_count, mode, ignore_creator, etc.';

-- ========================================
-- RLS (Row Level Security)
-- ========================================

-- Activer RLS sur activity_history
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;

-- Policies pour activity_history
DROP POLICY IF EXISTS "Users can view their own activity history" ON activity_history;
CREATE POLICY "Users can view their own activity history" ON activity_history
  FOR SELECT
  USING (
    owner_address = current_setting('request.jwt.claim.wallet_address', true)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = activity_history.profile_id 
      AND profiles.owner_address = current_setting('request.jwt.claim.wallet_address', true)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own activity" ON activity_history;
CREATE POLICY "Users can insert their own activity" ON activity_history
  FOR INSERT
  WITH CHECK (
    owner_address = current_setting('request.jwt.claim.wallet_address', true)
  );

DROP POLICY IF EXISTS "Admins have full access to activity_history" ON activity_history;
CREATE POLICY "Admins have full access to activity_history" ON activity_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist 
      WHERE admin_whitelist.wallet_address = current_setting('request.jwt.claim.wallet_address', true)
      AND admin_whitelist.is_active = true
    )
  );

-- ========================================
-- GRANTS
-- ========================================

-- Donner les permissions appropriées
GRANT SELECT, INSERT ON activity_history TO authenticated;
GRANT ALL ON activity_history TO service_role;

-- ========================================
-- Vue pour statistiques (optionnel)
-- ========================================

CREATE OR REPLACE VIEW activity_stats AS
SELECT 
  owner_address,
  token_id,
  action_type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  MAX(created_at) as last_action
FROM activity_history
GROUP BY owner_address, token_id, action_type;

COMMENT ON VIEW activity_stats IS 'Vue agrégée des statistiques d''activité par token et action';

-- ========================================
-- Fin de la migration
-- ========================================

-- Vérifier que la table a été créée
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_history') THEN
    RAISE NOTICE '✅ Table activity_history créée avec succès';
  END IF;
END $$;
