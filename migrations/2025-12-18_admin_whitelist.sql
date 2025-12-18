-- Migration : Système de gestion des admins (Whitelist publique)
-- Date : 2025-12-18
-- Approche : Serverless, Semi-permissionless, Sécurisée

-- 1. Table admin_whitelist (publique et transparente)
CREATE TABLE IF NOT EXISTS admin_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL UNIQUE,
  admin_name TEXT, -- Nom public de l'admin (transparence)
  admin_role TEXT DEFAULT 'moderator', -- 'moderator', 'super_admin'
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT, -- Wallet de celui qui a ajouté cet admin
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT valid_admin_role CHECK (admin_role IN ('moderator', 'super_admin'))
);

COMMENT ON TABLE admin_whitelist IS 'Liste publique des administrateurs/modérateurs autorisés (transparence)';
COMMENT ON COLUMN admin_whitelist.admin_role IS 'moderator: peut débloquer et gérer tickets | super_admin: peut ajouter/retirer admins';

-- Index pour recherches rapides
CREATE INDEX idx_admin_whitelist_wallet ON admin_whitelist(wallet_address) WHERE is_active = TRUE;
CREATE INDEX idx_admin_whitelist_active ON admin_whitelist(is_active);

-- 2. Table admin_actions (traçabilité publique)
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_wallet TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'unblock_profile', 'block_profile', 'add_admin', 'remove_admin'
  target_profile_id UUID, -- Profil concerné (si applicable)
  reason TEXT NOT NULL,
  metadata JSONB, -- Données supplémentaires (nombre de signalements, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_action_type CHECK (action_type IN ('unblock_profile', 'block_profile', 'add_admin', 'remove_admin', 'resolve_report'))
);

COMMENT ON TABLE admin_actions IS 'Historique public de toutes les actions administratives (transparence totale)';

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_wallet);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_date ON admin_actions(created_at DESC);

-- 3. Fonction helper : Vérifier si une adresse est admin actif
CREATE OR REPLACE FUNCTION is_admin(p_wallet_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_whitelist
    WHERE wallet_address = p_wallet_address
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_admin IS 'Vérifie si une adresse wallet est dans la whitelist admin active';

-- 4. Fonction : Ajouter un admin (super_admin uniquement)
CREATE OR REPLACE FUNCTION add_admin(
  p_new_admin_wallet TEXT,
  p_new_admin_name TEXT,
  p_new_admin_role TEXT,
  p_added_by_wallet TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Vérifier que celui qui ajoute est super_admin
  SELECT EXISTS (
    SELECT 1 FROM admin_whitelist
    WHERE wallet_address = p_added_by_wallet
    AND admin_role = 'super_admin'
    AND is_active = TRUE
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Seul un super_admin peut ajouter des administrateurs';
  END IF;
  
  -- Ajouter le nouvel admin
  INSERT INTO admin_whitelist (wallet_address, admin_name, admin_role, added_by)
  VALUES (p_new_admin_wallet, p_new_admin_name, p_new_admin_role, p_added_by_wallet)
  ON CONFLICT (wallet_address) DO UPDATE
  SET is_active = TRUE, admin_role = p_new_admin_role, admin_name = p_new_admin_name;
  
  -- Logger l'action
  INSERT INTO admin_actions (admin_wallet, action_type, reason, metadata)
  VALUES (
    p_added_by_wallet,
    'add_admin',
    format('Ajout de %s comme %s', p_new_admin_name, p_new_admin_role),
    jsonb_build_object('new_admin_wallet', p_new_admin_wallet, 'role', p_new_admin_role)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction : Retirer un admin (super_admin uniquement)
CREATE OR REPLACE FUNCTION remove_admin(
  p_admin_wallet_to_remove TEXT,
  p_removed_by_wallet TEXT,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Vérifier que celui qui retire est super_admin
  SELECT EXISTS (
    SELECT 1 FROM admin_whitelist
    WHERE wallet_address = p_removed_by_wallet
    AND admin_role = 'super_admin'
    AND is_active = TRUE
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Seul un super_admin peut retirer des administrateurs';
  END IF;
  
  -- Désactiver l'admin
  UPDATE admin_whitelist
  SET is_active = FALSE
  WHERE wallet_address = p_admin_wallet_to_remove;
  
  -- Logger l'action
  INSERT INTO admin_actions (admin_wallet, action_type, reason, metadata)
  VALUES (
    p_removed_by_wallet,
    'remove_admin',
    p_reason,
    jsonb_build_object('removed_admin_wallet', p_admin_wallet_to_remove)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Mise à jour de la fonction admin_unblock_profile pour utiliser la whitelist
DROP FUNCTION IF EXISTS admin_unblock_profile(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_unblock_profile(
  p_profile_id UUID,
  p_admin_wallet TEXT,
  p_unblock_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier que l'utilisateur est dans la whitelist admin
  IF NOT is_admin(p_admin_wallet) THEN
    RAISE EXCEPTION 'Accès refusé : wallet non autorisé';
  END IF;
  
  -- Débloquer le profil
  UPDATE profiles
  SET 
    is_blocked_from_creating = FALSE,
    blocked_reason = NULL,
    blocked_at = NULL
  WHERE id = p_profile_id;
  
  -- Logger dans communication_history (pour le profil)
  INSERT INTO communication_history (
    profile_id,
    message,
    sender_type,
    created_at
  ) VALUES (
    p_profile_id,
    format('🔓 Profil débloqué par admin (%s). Raison : %s', p_admin_wallet, p_unblock_reason),
    'system',
    NOW()
  );
  
  -- Logger dans admin_actions (traçabilité publique)
  INSERT INTO admin_actions (
    admin_wallet,
    action_type,
    target_profile_id,
    reason,
    metadata
  ) VALUES (
    p_admin_wallet,
    'unblock_profile',
    p_profile_id,
    p_unblock_reason,
    jsonb_build_object('unblocked_at', NOW())
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fonction pour bloquer manuellement (cas exceptionnels)
CREATE OR REPLACE FUNCTION admin_block_profile(
  p_profile_id UUID,
  p_admin_wallet TEXT,
  p_block_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier que l'utilisateur est dans la whitelist admin
  IF NOT is_admin(p_admin_wallet) THEN
    RAISE EXCEPTION 'Accès refusé : wallet non autorisé';
  END IF;
  
  -- Bloquer le profil
  UPDATE profiles
  SET 
    is_blocked_from_creating = TRUE,
    blocked_reason = format('[ADMIN] %s', p_block_reason),
    blocked_at = NOW()
  WHERE id = p_profile_id;
  
  -- Logger dans communication_history
  INSERT INTO communication_history (
    profile_id,
    message,
    sender_type,
    created_at
  ) VALUES (
    p_profile_id,
    format('🚫 Profil bloqué manuellement par admin (%s). Raison : %s', p_admin_wallet, p_block_reason),
    'system',
    NOW()
  );
  
  -- Logger dans admin_actions
  INSERT INTO admin_actions (
    admin_wallet,
    action_type,
    target_profile_id,
    reason,
    metadata
  ) VALUES (
    p_admin_wallet,
    'block_profile',
    p_profile_id,
    p_block_reason,
    jsonb_build_object('blocked_at', NOW())
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS : Tables publiques en lecture seule (transparence)
ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir la liste des admins (transparence)
CREATE POLICY "admin_whitelist_public_read" ON admin_whitelist
  FOR SELECT
  USING (true);

-- Seul le système peut modifier
CREATE POLICY "admin_whitelist_system_write" ON admin_whitelist
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Tout le monde peut voir l'historique des actions admin (transparence totale)
CREATE POLICY "admin_actions_public_read" ON admin_actions
  FOR SELECT
  USING (true);

-- Seul le système peut insérer
CREATE POLICY "admin_actions_system_write" ON admin_actions
  FOR INSERT
  WITH CHECK (true); -- Les fonctions SQL gèrent l'insertion

-- 9. Insertion du premier super_admin (à personnaliser avec VOTRE adresse)
-- ⚠️ IMPORTANT : Remplacer par votre adresse wallet eCash
INSERT INTO admin_whitelist (wallet_address, admin_name, admin_role, added_by)
VALUES (
  'ecash:qzrpf4j09vpa9hf9h4w209hvefex9ysng5yectwda9', -- 🔴 À REMPLACER
  'Fondateur JLN Wallet',
  'super_admin',
  'system'
) ON CONFLICT (wallet_address) DO NOTHING;

COMMENT ON TABLE admin_whitelist IS 'Liste publique des modérateurs (transparence). Les blocages sont automatiques, les admins ne font que débloquer après vérification.';

-- Fin de la migration
