-- Migration: Refonte du système de tickets pour conversation bidirectionnelle
-- Date: 2025-12-18
-- Objectif: Unifier les tickets avec type, contexte et conversation thread

-- ============================================
-- 1. TYPES ENUM
-- ============================================

-- Type de ticket
DO $$ BEGIN
  CREATE TYPE ticket_type AS ENUM (
    'admin_creator',  -- Créateur → Admin
    'admin_client',   -- Client → Admin  
    'creator_client', -- Client → Créateur (via token)
    'report'          -- Signalement
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Statut de ticket
DO $$ BEGIN
  CREATE TYPE ticket_status_enum AS ENUM (
    'open',           -- Nouveau ticket non traité
    'awaiting_reply', -- En attente de réponse (admin/créateur)
    'in_progress',    -- Pris en charge
    'resolved',       -- Résolu (mais conversation ouverte 7j pour feedback)
    'closed'          -- Fermé définitivement (archivé après 30j)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Priorité de ticket
DO $$ BEGIN
  CREATE TYPE ticket_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. AJOUT DE COLONNES À LA TABLE TICKETS
-- ============================================

-- Contexte et métadonnées
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'admin_client';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS creator_profile_id UUID REFERENCES profiles(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_address TEXT;

-- Timestamps de cycle de vie
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS auto_close_at TIMESTAMP WITH TIME ZONE;

-- Thread de conversation
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS conversation JSONB DEFAULT '[]'::jsonb;
-- Structure: [
--   {
--     id: uuid,
--     author: 'admin' | 'creator' | 'client',
--     author_address: 'ecash:qz...',
--     content: 'Message text',
--     timestamp: '2025-12-18T10:00:00Z',
--     attachments: [{ url, type, name }],
--     read: false
--   }
-- ]

-- Métadonnées additionnelles
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
-- Structure: {
--   tokenInfo: { ticker, name, decimals },
--   profileInfo: { name, email, verified },
--   escalated: false,
--   escalated_at: null,
--   escalated_by: null,
--   tags: ['urgent', 'vip', ...],
--   internal_notes: 'Notes admin privées'
-- }

-- ============================================
-- 3. INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_status_text ON tickets(status); -- Pour TEXT status
CREATE INDEX IF NOT EXISTS idx_tickets_token_id ON tickets(token_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_profile_id ON tickets(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_address ON tickets(client_address);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets(resolved_at);
CREATE INDEX IF NOT EXISTS idx_tickets_auto_close_at ON tickets(auto_close_at);

-- Index pour recherche dans conversation
CREATE INDEX IF NOT EXISTS idx_tickets_conversation ON tickets USING gin(conversation);

-- Index composite pour filtres fréquents
CREATE INDEX IF NOT EXISTS idx_tickets_type_status ON tickets(type, status);
CREATE INDEX IF NOT EXISTS idx_tickets_profile_status ON tickets(profile_id, status);

-- ============================================
-- 4. FONCTIONS UTILITAIRES
-- ============================================

/**
 * Fonction: auto_close_old_tickets()
 * Description: Ferme automatiquement les tickets résolus depuis plus de 30 jours
 * Exécution: Appelé par cron job quotidien
 */
CREATE OR REPLACE FUNCTION auto_close_old_tickets()
RETURNS void AS $$
BEGIN
  UPDATE tickets
  SET 
    status = 'closed',
    closed_at = NOW()
  WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '30 days'
    AND closed_at IS NULL;
    
  -- Log le nombre de tickets fermés
  RAISE NOTICE 'Tickets fermés automatiquement: %', found;
END;
$$ LANGUAGE plpgsql;

/**
 * Fonction: set_auto_close_date()
 * Description: Définit auto_close_at quand un ticket passe à 'resolved'
 * Trigger: BEFORE UPDATE ON tickets
 */
CREATE OR REPLACE FUNCTION set_auto_close_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le ticket passe à 'resolved' pour la première fois
  IF NEW.status = 'resolved' AND (OLD.status != 'resolved' OR OLD.resolved_at IS NULL) THEN
    NEW.resolved_at = NOW();
    NEW.auto_close_at = NOW() + INTERVAL '30 days';
  END IF;
  
  -- Si le ticket passe à 'closed'
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_auto_close_date ON tickets;
CREATE TRIGGER trigger_set_auto_close_date
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_auto_close_date();

/**
 * Fonction: add_message_to_ticket()
 * Description: Ajoute un message au thread de conversation d'un ticket
 * Paramètres:
 *   p_ticket_id: UUID du ticket
 *   p_author: 'admin' | 'creator' | 'client'
 *   p_author_address: Adresse eCash de l'auteur
 *   p_content: Contenu du message
 *   p_attachments: JSONB array de pièces jointes (optionnel)
 */
CREATE OR REPLACE FUNCTION add_message_to_ticket(
  p_ticket_id UUID,
  p_author TEXT,
  p_author_address TEXT,
  p_content TEXT,
  p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_message JSONB;
BEGIN
  -- Générer un ID pour le message
  v_message_id := gen_random_uuid();
  
  -- Construire l'objet message
  v_message := jsonb_build_object(
    'id', v_message_id::text,
    'author', p_author,
    'author_address', p_author_address,
    'content', p_content,
    'timestamp', NOW()::text,
    'attachments', p_attachments,
    'read', false
  );
  
  -- Ajouter le message au tableau conversation
  UPDATE tickets
  SET 
    conversation = conversation || v_message,
    updated_at = NOW(),
    -- Si ticket était 'resolved', repasser à 'in_progress' (nouvelle réponse)
    status = CASE 
      WHEN status = 'resolved' AND p_author != 'admin' THEN 'awaiting_reply'
      WHEN status = 'open' AND p_author IN ('admin', 'creator') THEN 'in_progress'
      ELSE status
    END
  WHERE id = p_ticket_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Fonction: mark_messages_as_read()
 * Description: Marque les messages d'un ticket comme lus par un rôle
 * Paramètres:
 *   p_ticket_id: UUID du ticket
 *   p_reader_role: 'admin' | 'creator' | 'client'
 */
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_ticket_id UUID,
  p_reader_role TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE tickets
  SET conversation = (
    SELECT jsonb_agg(
      CASE 
        -- Marquer comme lu si le message n'est pas de l'auteur qui lit
        WHEN msg->>'author' != p_reader_role THEN 
          jsonb_set(msg, '{read}', 'true'::jsonb)
        ELSE msg
      END
    )
    FROM jsonb_array_elements(conversation) msg
  )
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. VUES UTILITAIRES
-- ============================================

/**
 * Vue: tickets_with_context
 * Description: Tickets enrichis avec informations contextuelles
 */
CREATE OR REPLACE VIEW tickets_with_context AS
SELECT 
  t.*,
  -- Informations du profil créateur
  p.name as creator_name,
  p.email as creator_email,
  p.verification_status as creator_verification,
  p.owner_address as creator_address,
  
  -- Compter les messages non lus
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(t.conversation) msg
    WHERE (msg->>'read')::boolean = false
  ) as unread_count,
  
  -- Dernier message
  (
    SELECT msg
    FROM jsonb_array_elements(t.conversation) msg
    ORDER BY msg->>'timestamp' DESC
    LIMIT 1
  ) as last_message,
  
  -- Temps écoulé depuis création
  EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 as hours_since_creation,
  
  -- Temps restant avant auto-close
  CASE 
    WHEN t.auto_close_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (t.auto_close_at - NOW())) / 3600
    ELSE NULL
  END as hours_until_auto_close

FROM tickets t
LEFT JOIN profiles p ON t.creator_profile_id = p.id;

COMMENT ON VIEW tickets_with_context IS 'Vue enrichie des tickets avec contexte complet pour affichage UI';

-- ============================================
-- 6. RLS (Row Level Security) - OPTIONNEL
-- ============================================

-- Si RLS activé, définir les policies
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Admin peut tout voir
-- CREATE POLICY admin_full_access ON tickets
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM admin_whitelist 
--       WHERE wallet_address = current_setting('app.current_user_address')::text
--         AND is_active = true
--     )
--   );

-- Policy: Créateurs voient leurs tickets
-- CREATE POLICY creator_own_tickets ON tickets
--   FOR SELECT
--   TO authenticated
--   USING (
--     creator_profile_id IN (
--       SELECT id FROM profiles 
--       WHERE owner_address = current_setting('app.current_user_address')::text
--     )
--   );

-- Policy: Clients voient leurs tickets
-- CREATE POLICY client_own_tickets ON tickets
--   FOR SELECT
--   TO authenticated
--   USING (
--     client_address = current_setting('app.current_user_address')::text
--   );

-- ============================================
-- 7. MIGRATION DES DONNÉES EXISTANTES (SI NÉCESSAIRE)
-- ============================================

-- Migrer les anciens tickets vers la nouvelle structure
-- ATTENTION: Adapter selon la structure actuelle

-- Exemple de migration des messages vers conversation
-- UPDATE tickets
-- SET conversation = (
--   SELECT jsonb_agg(
--     jsonb_build_object(
--       'id', gen_random_uuid()::text,
--       'author', CASE 
--         WHEN m.author_type = 'admin' THEN 'admin'
--         WHEN m.author_type = 'user' THEN 'client'
--         ELSE 'creator'
--       END,
--       'author_address', m.author_address,
--       'content', m.content,
--       'timestamp', m.created_at::text,
--       'attachments', '[]'::jsonb,
--       'read', false
--     )
--   )
--   FROM ticket_messages m
--   WHERE m.ticket_id = tickets.id
--   ORDER BY m.created_at ASC
-- )
-- WHERE EXISTS (
--   SELECT 1 FROM ticket_messages
--   WHERE ticket_id = tickets.id
-- );

-- ============================================
-- 8. COMMENTAIRES DE DOCUMENTATION
-- ============================================

COMMENT ON COLUMN tickets.type IS 'Type de ticket: admin_creator, admin_client, creator_client, report';
COMMENT ON COLUMN tickets.token_id IS 'ID du jeton concerné (si applicable)';
COMMENT ON COLUMN tickets.creator_profile_id IS 'ID du profil créateur (si applicable)';
COMMENT ON COLUMN tickets.client_address IS 'Adresse eCash du client (si applicable)';
COMMENT ON COLUMN tickets.conversation IS 'Thread JSONB de messages avec structure: [{id, author, author_address, content, timestamp, attachments, read}]';
COMMENT ON COLUMN tickets.metadata IS 'Métadonnées additionnelles: tokenInfo, profileInfo, escalated, tags, internal_notes';
COMMENT ON COLUMN tickets.resolved_at IS 'Date de résolution du ticket';
COMMENT ON COLUMN tickets.closed_at IS 'Date de fermeture définitive du ticket';
COMMENT ON COLUMN tickets.auto_close_at IS 'Date de fermeture automatique (30j après resolved_at)';

-- ============================================
-- 9. VÉRIFICATION
-- ============================================

-- Vérifier que toutes les colonnes sont créées
DO $$ 
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'tickets'
    AND column_name IN ('type', 'token_id', 'creator_profile_id', 'client_address', 
                        'resolved_at', 'closed_at', 'auto_close_at', 'conversation', 'metadata');
  
  IF v_count = 9 THEN
    RAISE NOTICE '✅ Migration réussie: toutes les colonnes sont créées';
  ELSE
    RAISE EXCEPTION '❌ Migration incomplète: % colonnes créées sur 9', v_count;
  END IF;
END $$;

-- Fin de la migration
