-- ============================================================================
-- Migration : Correction de la table tickets
-- Date: 2025-12-18
-- Description: Remplace farm_id par profile_id et ajoute les colonnes manquantes
-- ============================================================================

-- ========================================
-- ÉTAPE 1 : Renommer farm_id en profile_id
-- ========================================

-- Vérifier si farm_id existe et la renommer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE tickets RENAME COLUMN farm_id TO profile_id;
    RAISE NOTICE '✅ Colonne farm_id renommée en profile_id';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne farm_id n''existe pas, vérification de profile_id';
  END IF;
END $$;

-- S'assurer que profile_id existe
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ========================================
-- ÉTAPE 2 : Ajouter les colonnes manquantes si nécessaires
-- ========================================

-- Colonnes de base
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'client';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'question';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description TEXT;

-- Participants
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_by_address TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_by_role TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Adresses spécifiques
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS creator_address TEXT;

-- Relations
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS token_id TEXT;

-- Conversation JSONB
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS conversation JSONB DEFAULT '[]'::jsonb;

-- Messages non lus
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS unread_by_admin INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS unread_by_creator INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS unread_by_client INTEGER DEFAULT 0;

-- Gestion des délais
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS auto_action TEXT;

-- Métadonnées
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Timestamps
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- ÉTAPE 3 : Supprimer les contraintes existantes
-- ========================================

-- Supprimer toutes les contraintes existantes avant de migrer les données
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_auto_action_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS valid_subject_length;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS valid_description_length;

-- ========================================
-- ÉTAPE 4 : Migrer les données existantes
-- ========================================

-- Migrer les anciennes valeurs de 'type' vers les nouvelles
DO $$
BEGIN
  -- Migrer 'client' → 'creator_client' (par défaut)
  UPDATE tickets SET type = 'creator_client' WHERE type = 'client';
  
  -- Autres migrations possibles selon les anciennes valeurs
  UPDATE tickets SET type = 'creator_admin' WHERE type = 'admin';
  UPDATE tickets SET type = 'report' WHERE type = 'signalement';
  
  RAISE NOTICE '✅ Migration des valeurs de type effectuée';
END $$;

-- Migrer les anciennes valeurs de 'status' vers les nouvelles
DO $$
BEGIN
  UPDATE tickets SET status = 'open' WHERE status NOT IN ('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed');
  RAISE NOTICE '✅ Migration des valeurs de status effectuée';
END $$;

-- Migrer les anciennes valeurs de 'priority' vers les nouvelles
DO $$
BEGIN
  UPDATE tickets SET priority = 'normal' WHERE priority NOT IN ('low', 'normal', 'high', 'urgent');
  RAISE NOTICE '✅ Migration des valeurs de priority effectuée';
END $$;

-- Nettoyer toutes les valeurs non conformes restantes (sécurité)
DO $$
BEGIN
  -- S'assurer que TOUTES les valeurs de type sont valides
  UPDATE tickets 
  SET type = 'creator_client' 
  WHERE type NOT IN ('creator_client', 'creator_admin', 'admin_client', 'admin_creator', 'report');
  
  -- S'assurer que TOUTES les valeurs de status sont valides
  UPDATE tickets 
  SET status = 'open' 
  WHERE status NOT IN ('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed');
  
  -- S'assurer que TOUTES les valeurs de priority sont valides
  UPDATE tickets 
  SET priority = 'normal' 
  WHERE priority NOT IN ('low', 'normal', 'high', 'urgent');
  
  RAISE NOTICE '✅ Nettoyage final des valeurs effectué';
END $$;

-- ========================================
-- ÉTAPE 5 : Ajouter les nouvelles contraintes
-- ========================================

-- Ajouter les nouvelles contraintes (après migration des données)
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check 
  CHECK (type IN ('creator_client', 'creator_admin', 'admin_client', 'admin_creator', 'report'));

ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed'));

ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check 
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE tickets ADD CONSTRAINT tickets_auto_action_check 
  CHECK (auto_action IS NULL OR auto_action IN ('none', 'hide', 'suspend'));

ALTER TABLE tickets ADD CONSTRAINT valid_subject_length 
  CHECK (subject IS NULL OR length(trim(subject)) >= 5);

ALTER TABLE tickets ADD CONSTRAINT valid_description_length 
  CHECK (description IS NULL OR length(trim(description)) >= 10);

-- ========================================
-- ÉTAPE 6 : Recréer les index
-- ========================================

-- Supprimer les anciens index sur farm_id
DROP INDEX IF EXISTS idx_tickets_farm_id;

-- Créer les nouveaux index
CREATE INDEX IF NOT EXISTS idx_tickets_profile_id ON tickets(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by_address) WHERE created_by_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_token_id ON tickets(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_client_address ON tickets(client_address) WHERE client_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_creator_address ON tickets(creator_address) WHERE creator_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_response_deadline ON tickets(response_deadline) 
  WHERE status IN ('open', 'in_progress') AND response_deadline IS NOT NULL;

-- ========================================
-- ÉTAPE 7 : Trigger pour updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tickets_updated_at ON tickets;
CREATE TRIGGER trigger_update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

-- ========================================
-- ÉTAPE 8 : Fonctions utilitaires
-- ========================================

-- Fonction pour ajouter un message à la conversation
CREATE OR REPLACE FUNCTION add_message_to_ticket(
  p_ticket_id UUID,
  p_author_role TEXT,
  p_author_address TEXT,
  p_content TEXT,
  p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_message JSONB;
  v_current_conversation JSONB;
BEGIN
  -- Créer le message
  v_message := jsonb_build_object(
    'id', gen_random_uuid(),
    'author', p_author_role,
    'author_address', p_author_address,
    'content', p_content,
    'attachments', p_attachments,
    'read', false,
    'timestamp', NOW()
  );
  
  -- Récupérer la conversation actuelle
  SELECT conversation INTO v_current_conversation
  FROM tickets
  WHERE id = p_ticket_id;
  
  -- Ajouter le message
  UPDATE tickets
  SET 
    conversation = COALESCE(v_current_conversation, '[]'::jsonb) || v_message,
    updated_at = NOW(),
    -- Incrémenter les compteurs de non-lus selon l'auteur
    unread_by_admin = CASE WHEN p_author_role != 'admin' THEN unread_by_admin + 1 ELSE unread_by_admin END,
    unread_by_creator = CASE WHEN p_author_role != 'creator' THEN unread_by_creator + 1 ELSE unread_by_creator END,
    unread_by_client = CASE WHEN p_author_role != 'client' THEN unread_by_client + 1 ELSE unread_by_client END
  WHERE id = p_ticket_id;
  
  RETURN v_message;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour marquer les messages comme lus
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_ticket_id UUID,
  p_reader_role TEXT
)
RETURNS void AS $$
DECLARE
  v_conversation JSONB;
  v_message JSONB;
  v_new_conversation JSONB := '[]'::jsonb;
BEGIN
  -- Récupérer la conversation
  SELECT conversation INTO v_conversation
  FROM tickets
  WHERE id = p_ticket_id;
  
  -- Marquer tous les messages comme lus
  FOR v_message IN SELECT * FROM jsonb_array_elements(v_conversation)
  LOOP
    v_new_conversation := v_new_conversation || jsonb_set(v_message, '{read}', 'true'::jsonb);
  END LOOP;
  
  -- Mettre à jour le ticket
  UPDATE tickets
  SET 
    conversation = v_new_conversation,
    unread_by_admin = CASE WHEN p_reader_role = 'admin' THEN 0 ELSE unread_by_admin END,
    unread_by_creator = CASE WHEN p_reader_role = 'creator' THEN 0 ELSE unread_by_creator END,
    unread_by_client = CASE WHEN p_reader_role = 'client' THEN 0 ELSE unread_by_client END
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ÉTAPE 9 : Commentaires
-- ========================================

COMMENT ON TABLE tickets IS 'Tickets de support entre clients, créateurs et admins';
COMMENT ON COLUMN tickets.type IS 'Type: creator_client, creator_admin, admin_client, admin_creator, report';
COMMENT ON COLUMN tickets.profile_id IS 'ID du profil créateur concerné (si applicable)';
COMMENT ON COLUMN tickets.conversation IS 'Historique JSONB des messages du ticket';
COMMENT ON COLUMN tickets.unread_by_admin IS 'Nombre de messages non lus par l''admin';
COMMENT ON COLUMN tickets.unread_by_creator IS 'Nombre de messages non lus par le créateur';
COMMENT ON COLUMN tickets.unread_by_client IS 'Nombre de messages non lus par le client';

-- ========================================
-- Fin de la migration
-- ========================================

-- Vérifier que la colonne profile_id existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'profile_id'
  ) THEN
    RAISE NOTICE '✅ Colonne profile_id existe dans la table tickets';
  ELSE
    RAISE WARNING '⚠️ Colonne profile_id n''existe pas dans la table tickets';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'farm_id'
  ) THEN
    RAISE NOTICE '✅ Colonne farm_id supprimée avec succès';
  END IF;
END $$;
