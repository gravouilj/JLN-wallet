-- Migration: Amélioration du système de signalements (profile_reports)
-- Date: 2025-12-18
-- Objectif: Ajouter statuts clairs et cycle de vie pour investigations

-- ============================================
-- 1. TYPES ENUM
-- ============================================

-- Statut de signalement
DO $$ BEGIN
  CREATE TYPE report_status_enum AS ENUM (
    'pending',        -- Nouveau signalement non traité
    'investigating',  -- En cours d'investigation par admin
    'resolved',       -- Résolu (action prise)
    'dismissed'       -- Rejeté (pas de suite donnée)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. AJOUT DE COLONNES À profile_reports
-- ============================================

-- Statut et cycle de vie
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS investigated_by TEXT; -- Adresse admin
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS investigated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Notes et actions
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS admin_notes TEXT; -- Notes internes admin
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS action_taken TEXT; -- Action prise (blocage, avertissement, etc.)

-- Métadonnées
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
-- Structure: {
--   severity: 'low' | 'medium' | 'high' | 'critical',
--   category: 'fraud', 'spam', 'inappropriate', 'other',
--   ticket_id: 'uuid', // Ticket créé pour communication avec créateur
--   evidence: [{ type, url, description }],
--   related_reports: ['report_id1', 'report_id2'] // Signalements similaires
-- }

-- ============================================
-- 3. INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profile_reports_status ON profile_reports(status);
CREATE INDEX IF NOT EXISTS idx_profile_reports_profil_id_status ON profile_reports(profil_id, status);
CREATE INDEX IF NOT EXISTS idx_profile_reports_investigated_by ON profile_reports(investigated_by);
CREATE INDEX IF NOT EXISTS idx_profile_reports_created_at ON profile_reports(created_at);

-- Index pour recherche dans metadata
CREATE INDEX IF NOT EXISTS idx_profile_reports_metadata ON profile_reports USING gin(metadata);

-- ============================================
-- 4. FONCTIONS UTILITAIRES
-- ============================================

/**
 * Fonction: start_investigation()
 * Description: Démarre l'investigation d'un signalement
 * Paramètres:
 *   p_report_id: UUID du signalement
 *   p_admin_address: Adresse de l'admin qui prend en charge
 */
CREATE OR REPLACE FUNCTION start_investigation(
  p_report_id UUID,
  p_admin_address TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE profile_reports
  SET 
    status = 'investigating',
    investigated_by = p_admin_address,
    investigated_at = NOW()
  WHERE id = p_report_id
    AND status = 'pending';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement non trouvé ou déjà en cours d''investigation';
  END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Fonction: resolve_report()
 * Description: Résout un signalement avec action prise
 * Paramètres:
 *   p_report_id: UUID du signalement
 *   p_admin_address: Adresse de l'admin qui résout
 *   p_action_taken: Description de l'action prise
 *   p_admin_notes: Notes internes admin (optionnel)
 */
CREATE OR REPLACE FUNCTION resolve_report(
  p_report_id UUID,
  p_admin_address TEXT,
  p_action_taken TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE profile_reports
  SET 
    status = 'resolved',
    action_taken = p_action_taken,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    resolved_at = NOW(),
    -- Si pas encore investigué, définir investigated_by
    investigated_by = COALESCE(investigated_by, p_admin_address),
    investigated_at = COALESCE(investigated_at, NOW())
  WHERE id = p_report_id
    AND status IN ('pending', 'investigating');
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement non trouvé ou déjà résolu/rejeté';
  END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Fonction: dismiss_report()
 * Description: Rejette un signalement (pas de suite)
 * Paramètres:
 *   p_report_id: UUID du signalement
 *   p_admin_address: Adresse de l'admin qui rejette
 *   p_reason: Raison du rejet
 */
CREATE OR REPLACE FUNCTION dismiss_report(
  p_report_id UUID,
  p_admin_address TEXT,
  p_reason TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE profile_reports
  SET 
    status = 'dismissed',
    admin_notes = p_reason,
    resolved_at = NOW(),
    investigated_by = COALESCE(investigated_by, p_admin_address),
    investigated_at = COALESCE(investigated_at, NOW())
  WHERE id = p_report_id
    AND status IN ('pending', 'investigating');
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement non trouvé ou déjà résolu/rejeté';
  END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Fonction: get_related_reports()
 * Description: Trouve les signalements liés à un profil
 * Paramètres:
 *   p_profil_id: UUID du profil
 *   p_statuses: Array de statuts à filtrer (optionnel)
 */
CREATE OR REPLACE FUNCTION get_related_reports(
  p_profil_id UUID,
  p_statuses TEXT[] DEFAULT ARRAY['pending', 'investigating']::TEXT[]
)
RETURNS TABLE (
  report_id UUID,
  reporter_address TEXT,
  reason TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  investigated_by TEXT,
  action_taken TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.reporter_address,
    pr.reason,
    pr.status,
    pr.created_at,
    pr.investigated_by,
    pr.action_taken
  FROM profile_reports pr
  WHERE pr.profil_id = p_profil_id
    AND pr.status = ANY(p_statuses)
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Fonction: auto_dismiss_old_pending_reports()
 * Description: Rejette automatiquement les signalements pending > 90 jours
 * Exécution: Appelé par cron job mensuel
 */
CREATE OR REPLACE FUNCTION auto_dismiss_old_pending_reports()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE profile_reports
  SET 
    status = 'dismissed',
    admin_notes = 'Rejeté automatiquement après 90 jours sans traitement',
    resolved_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE 'Signalements rejetés automatiquement: %', v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGERS
-- ============================================

/**
 * Trigger: notify_admin_on_new_report
 * Description: Notifie les admins lors d'un nouveau signalement
 */
CREATE OR REPLACE FUNCTION notify_admin_on_new_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer une notification pour les admins
  -- Note: Adapter selon votre système de notifications
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    metadata,
    created_at
  ) VALUES (
    'new_report',
    'Nouveau signalement',
    'Profil signalé: ' || (SELECT name FROM profiles WHERE id = NEW.profil_id),
    jsonb_build_object(
      'report_id', NEW.id,
      'profil_id', NEW.profil_id,
      'reporter_address', NEW.reporter_address,
      'reason', NEW.reason
    ),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN undefined_table THEN
    -- Si la table admin_notifications n'existe pas, ignorer silencieusement
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_admin_on_new_report ON profile_reports;
CREATE TRIGGER trigger_notify_admin_on_new_report
  AFTER INSERT ON profile_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_new_report();

/**
 * Trigger: update_profile_on_report_resolved
 * Description: Met à jour le profil quand un signalement est résolu
 */
CREATE OR REPLACE FUNCTION update_profile_on_report_resolved()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le signalement est résolu avec action "block"
  IF NEW.status = 'resolved' AND NEW.action_taken ILIKE '%block%' THEN
    UPDATE profiles
    SET 
      is_blocked_from_creating = true,
      blocked_reason = 'Signalement résolu: ' || NEW.action_taken,
      blocked_at = NOW()
    WHERE id = NEW.profil_id
      AND is_blocked_from_creating = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_on_report_resolved ON profile_reports;
CREATE TRIGGER trigger_update_profile_on_report_resolved
  AFTER UPDATE ON profile_reports
  FOR EACH ROW
  WHEN (NEW.status = 'resolved' AND OLD.status != 'resolved')
  EXECUTE FUNCTION update_profile_on_report_resolved();

-- ============================================
-- 6. VUES UTILITAIRES
-- ============================================

/**
 * Vue: reports_summary
 * Description: Résumé des signalements par profil
 */
CREATE OR REPLACE VIEW reports_summary AS
SELECT 
  p.id as profil_id,
  p.name as profil_name,
  p.owner_address,
  p.verification_status,
  
  -- Compteurs de signalements
  COUNT(pr.id) FILTER (WHERE pr.status = 'pending') as pending_count,
  COUNT(pr.id) FILTER (WHERE pr.status = 'investigating') as investigating_count,
  COUNT(pr.id) FILTER (WHERE pr.status = 'resolved') as resolved_count,
  COUNT(pr.id) FILTER (WHERE pr.status = 'dismissed') as dismissed_count,
  COUNT(pr.id) as total_count,
  
  -- Dates importantes
  MIN(pr.created_at) as first_report_at,
  MAX(pr.created_at) as last_report_at,
  MAX(pr.resolved_at) as last_resolved_at,
  
  -- Statut du profil
  p.is_blocked_from_creating,
  p.blocked_reason,
  p.blocked_at

FROM profiles p
LEFT JOIN profile_reports pr ON pr.profil_id = p.id
GROUP BY p.id, p.name, p.owner_address, p.verification_status, 
         p.is_blocked_from_creating, p.blocked_reason, p.blocked_at;

COMMENT ON VIEW reports_summary IS 'Vue résumée des signalements par profil pour dashboard admin';

/**
 * Vue: active_reports_with_context
 * Description: Signalements actifs avec contexte complet
 */
CREATE OR REPLACE VIEW active_reports_with_context AS
SELECT 
  pr.*,
  p.name as profil_name,
  p.email as profil_email,
  p.owner_address as profil_address,
  p.verification_status,
  p.is_blocked_from_creating,
  
  -- Temps écoulé
  EXTRACT(EPOCH FROM (NOW() - pr.created_at)) / 3600 as hours_since_report,
  
  -- Admin en charge
  (SELECT admin_name FROM admin_whitelist WHERE wallet_address = pr.investigated_by) as admin_name

FROM profile_reports pr
JOIN profiles p ON pr.profil_id = p.id
WHERE pr.status IN ('pending', 'investigating')
ORDER BY pr.created_at ASC;

COMMENT ON VIEW active_reports_with_context IS 'Signalements actifs enrichis avec contexte pour investigation';

-- ============================================
-- 7. MIGRATION DES DONNÉES EXISTANTES
-- ============================================

-- Migrer les signalements sans statut vers 'pending'
UPDATE profile_reports
SET status = 'pending'
WHERE status IS NULL;

-- Marquer comme 'dismissed' les signalements de profils vérifiés et sans problème
UPDATE profile_reports pr
SET 
  status = 'dismissed',
  admin_notes = 'Auto-dismissed: profil vérifié sans incident',
  resolved_at = NOW()
WHERE pr.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = pr.profil_id
      AND p.verification_status = 'verified'
      AND p.is_blocked_from_creating = false
  )
  AND pr.created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 8. COMMENTAIRES DE DOCUMENTATION
-- ============================================

COMMENT ON COLUMN profile_reports.status IS 'Statut: pending, investigating, resolved, dismissed';
COMMENT ON COLUMN profile_reports.investigated_by IS 'Adresse eCash de l''admin qui investigate';
COMMENT ON COLUMN profile_reports.investigated_at IS 'Date de début d''investigation';
COMMENT ON COLUMN profile_reports.resolved_at IS 'Date de résolution ou rejet';
COMMENT ON COLUMN profile_reports.admin_notes IS 'Notes internes admin (non visibles par le créateur)';
COMMENT ON COLUMN profile_reports.action_taken IS 'Description de l''action prise (visible par le créateur si disclosed)';
COMMENT ON COLUMN profile_reports.metadata IS 'Métadonnées: severity, category, ticket_id, evidence, related_reports';

-- ============================================
-- 9. PERMISSIONS (si RLS activé)
-- ============================================

-- Admin peut tout voir
-- CREATE POLICY admin_full_access_reports ON profile_reports
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM admin_whitelist 
--       WHERE wallet_address = current_setting('app.current_user_address')::text
--         AND is_active = true
--     )
--   );

-- Créateurs ne voient que leurs signalements si visible_to_creator
-- CREATE POLICY creator_see_own_reports ON profile_reports
--   FOR SELECT
--   TO authenticated
--   USING (
--     profil_id IN (
--       SELECT id FROM profiles 
--       WHERE owner_address = current_setting('app.current_user_address')::text
--     )
--     AND visible_to_creator = true
--   );

-- ============================================
-- 10. VÉRIFICATION
-- ============================================

DO $$ 
DECLARE
  v_count INTEGER;
BEGIN
  -- Vérifier colonnes
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'profile_reports'
    AND column_name IN ('status', 'investigated_by', 'investigated_at', 'resolved_at', 
                        'admin_notes', 'action_taken', 'metadata');
  
  IF v_count = 7 THEN
    RAISE NOTICE '✅ Migration réussie: toutes les colonnes sont créées';
  ELSE
    RAISE EXCEPTION '❌ Migration incomplète: % colonnes créées sur 7', v_count;
  END IF;
  
  -- Vérifier que tous les signalements ont un statut
  SELECT COUNT(*) INTO v_count
  FROM profile_reports
  WHERE status IS NULL;
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Tous les signalements ont un statut';
  ELSE
    RAISE WARNING '⚠️ % signalements sans statut détectés', v_count;
  END IF;
END $$;

-- Fin de la migration
