-- Migration : Système Anti-Arnaque pour JLN Wallet
-- Date : 2025-12-18
-- Description : Ajout des champs de blocage et historique des profils supprimés

-- 1. Ajouter les champs de blocage dans la table profiles (anciennement farms)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_blocked_from_creating BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN profiles.is_blocked_from_creating IS 'Blocage automatique si créateur a des signalements et change isLinked/isVisible';
COMMENT ON COLUMN profiles.blocked_reason IS 'Raison du blocage (ex: "Signalements actifs + modification isLinked")';
COMMENT ON COLUMN profiles.blocked_at IS 'Date/heure du blocage automatique';

-- 2. Créer la table profile_history pour tracer les profils supprimés
CREATE TABLE IF NOT EXISTS profile_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_profile_id UUID, -- Référence à l'ancien profil (peut être NULL si supprimé)
  wallet_address TEXT NOT NULL,
  
  -- Données InfoTab (pour détection de doublons)
  profile_name TEXT,
  description TEXT,
  category TEXT,
  
  -- Données LocationTab (pour détection de doublons)
  location_country TEXT,
  location_region TEXT,
  location_department TEXT,
  city TEXT,
  postal_code TEXT,
  street_address TEXT,
  
  -- Données VerificationTab (pour détection de doublons)
  contact_email TEXT,
  contact_phone TEXT,
  business_registration TEXT, -- SIRET, SIREN, etc.
  
  -- Métadonnées
  deletion_reason TEXT, -- 'user_deleted', 'banned', 'duplicate_detected', etc.
  had_active_reports BOOLEAN DEFAULT FALSE, -- Avait-il des signalements au moment de la suppression ?
  had_unresolved_tickets BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index pour recherches rapides
  CONSTRAINT profile_history_wallet_address_idx UNIQUE (wallet_address, deleted_at)
);

-- Index pour optimiser les recherches de doublons
CREATE INDEX IF NOT EXISTS idx_profile_history_email ON profile_history(contact_email);
CREATE INDEX IF NOT EXISTS idx_profile_history_phone ON profile_history(contact_phone);
CREATE INDEX IF NOT EXISTS idx_profile_history_business_reg ON profile_history(business_registration);
CREATE INDEX IF NOT EXISTS idx_profile_history_location ON profile_history(postal_code, street_address);
CREATE INDEX IF NOT EXISTS idx_profile_history_wallet ON profile_history(wallet_address);

COMMENT ON TABLE profile_history IS 'Historique des profils supprimés pour prévenir les réinscriptions frauduleuses';
COMMENT ON COLUMN profile_history.had_active_reports IS 'True si le profil avait des signalements non résolus lors de la suppression';

-- 3. Fonction pour archiver un profil lors de sa suppression
CREATE OR REPLACE FUNCTION archive_deleted_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le profil passe en status 'deleted' ou 'banned', archiver ses données
  IF (NEW.status IN ('deleted', 'banned') AND OLD.status NOT IN ('deleted', 'banned')) THEN
    INSERT INTO profile_history (
      original_profile_id,
      wallet_address,
      profile_name,
      description,
      category,
      location_country,
      location_region,
      location_department,
      city,
      postal_code,
      street_address,
      contact_email,
      contact_phone,
      business_registration,
      deletion_reason,
      had_active_reports,
      had_unresolved_tickets,
      deleted_at
    )
    SELECT 
      OLD.id,
      OLD.owner_address,
      OLD.name,
      OLD.description,
      OLD.category,
      OLD."locationCountry",
      OLD."locationRegion",
      OLD."locationDepartment",
      OLD.city,
      OLD."postalCode",
      OLD."streetAddress",
      OLD.email,
      OLD.phone,
      OLD.business_registration,
      NEW.status, -- 'deleted' ou 'banned'
      -- Vérifier s'il y a des signalements actifs
      EXISTS(
        SELECT 1 FROM profile_reports 
        WHERE profil_id = OLD.id
      ),
      -- Vérifier s'il y a des tickets non résolus
      EXISTS(
        SELECT 1 FROM tickets 
        WHERE profile_id = OLD.id 
        AND status NOT IN ('resolved', 'closed')
      ),
      NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur mise à jour du profil
DROP TRIGGER IF EXISTS trigger_archive_deleted_profile ON profiles;
CREATE TRIGGER trigger_archive_deleted_profile
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION archive_deleted_profile();

-- 4. Fonction pour détecter les profils dupliqués
CREATE OR REPLACE FUNCTION check_duplicate_profile_data(
  p_email TEXT,
  p_phone TEXT,
  p_business_reg TEXT,
  p_postal_code TEXT,
  p_street_address TEXT
) RETURNS TABLE (
  is_duplicate BOOLEAN,
  matched_fields TEXT[],
  last_deletion_date TIMESTAMP WITH TIME ZONE,
  had_fraud_history BOOLEAN
) AS $$
DECLARE
  v_matches TEXT[] := ARRAY[]::TEXT[];
  v_last_deletion TIMESTAMP;
  v_had_reports BOOLEAN := FALSE;
BEGIN
  -- Rechercher correspondances dans l'historique
  SELECT 
    MAX(deleted_at),
    BOOL_OR(had_active_reports)
  INTO v_last_deletion, v_had_reports
  FROM profile_history
  WHERE 
    (p_email IS NOT NULL AND contact_email = p_email) OR
    (p_phone IS NOT NULL AND contact_phone = p_phone) OR
    (p_business_reg IS NOT NULL AND business_registration = p_business_reg) OR
    (p_postal_code IS NOT NULL AND p_street_address IS NOT NULL 
     AND postal_code = p_postal_code AND street_address = p_street_address);
  
  -- Si aucune correspondance, retourner FALSE
  IF v_last_deletion IS NULL THEN
    RETURN QUERY SELECT FALSE, ARRAY[]::TEXT[], NULL::TIMESTAMP, FALSE;
    RETURN;
  END IF;
  
  -- Identifier les champs correspondants
  IF EXISTS(SELECT 1 FROM profile_history WHERE contact_email = p_email) THEN
    v_matches := array_append(v_matches, 'email');
  END IF;
  IF EXISTS(SELECT 1 FROM profile_history WHERE contact_phone = p_phone) THEN
    v_matches := array_append(v_matches, 'phone');
  END IF;
  IF EXISTS(SELECT 1 FROM profile_history WHERE business_registration = p_business_reg) THEN
    v_matches := array_append(v_matches, 'business_registration');
  END IF;
  IF EXISTS(SELECT 1 FROM profile_history WHERE postal_code = p_postal_code AND street_address = p_street_address) THEN
    v_matches := array_append(v_matches, 'address');
  END IF;
  
  -- Retourner les résultats
  RETURN QUERY SELECT TRUE, v_matches, v_last_deletion, v_had_reports;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_duplicate_profile_data IS 'Vérifie si les données fournies correspondent à un profil supprimé (détection anti-fraude)';

-- 5. Politique RLS (Row Level Security) pour profile_history
ALTER TABLE profile_history ENABLE ROW LEVEL SECURITY;

-- Seul le système (service_role) peut voir et insérer dans profile_history
-- Les utilisateurs normaux n'y ont pas accès
CREATE POLICY "profile_history_system_only" ON profile_history
  FOR ALL
  USING (false) -- Bloque l'accès utilisateur
  WITH CHECK (false);

COMMENT ON POLICY "profile_history_system_only" ON profile_history IS 'Seul le système peut accéder à l''historique des profils supprimés';

-- 6. Vue pour les admins : profils bloqués
CREATE OR REPLACE VIEW blocked_profiles_view AS
SELECT 
  p.id,
  p.owner_address,
  p.name,
  p.is_blocked_from_creating,
  p.blocked_reason,
  p.blocked_at,
  -- Compter les signalements actifs
  (SELECT COUNT(*) FROM profile_reports WHERE profil_id = p.id) as active_reports_count,
  -- Compter les tickets non résolus
  (SELECT COUNT(*) FROM tickets WHERE profile_id = p.id AND status NOT IN ('resolved', 'closed')) as unresolved_tickets_count,
  p.status,
  p.verification_status
FROM profiles p
WHERE p.is_blocked_from_creating = TRUE
ORDER BY p.blocked_at DESC;

COMMENT ON VIEW blocked_profiles_view IS 'Vue admin : profils bloqués pour création/importation de jetons';

-- 7. Fonction pour débloquer un profil
-- Note: La vérification des permissions admin doit être faite côté application avant d'appeler cette fonction
CREATE OR REPLACE FUNCTION admin_unblock_profile(
  p_profile_id UUID,
  p_admin_wallet TEXT,
  p_unblock_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Débloquer le profil
  UPDATE profiles
  SET 
    is_blocked_from_creating = FALSE,
    blocked_reason = NULL,
    blocked_at = NULL
  WHERE id = p_profile_id;
  
  -- Logger l'action dans communication_history
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
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_unblock_profile IS 'Permet de débloquer manuellement un profil (vérification admin côté application)';

-- 8. Index pour optimiser les requêtes de blocage
CREATE INDEX IF NOT EXISTS idx_profiles_blocked ON profiles(is_blocked_from_creating, blocked_at DESC) WHERE is_blocked_from_creating = TRUE;
CREATE INDEX IF NOT EXISTS idx_profile_reports_profil ON profile_reports(profil_id);

-- Fin de la migration
