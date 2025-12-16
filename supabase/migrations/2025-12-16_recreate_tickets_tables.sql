-- ============================================================================
-- Migration complète : Recréation des tables tickets et ticket_messages
-- Date: 2025-12-16
-- Description: Suppression et recréation complète des tables avec RLS permissif
-- ============================================================================

-- ========================================
-- ÉTAPE 1 : SUPPRESSION DES TABLES EXISTANTES
-- ========================================

-- Supprimer les policies existantes d'abord
DROP POLICY IF EXISTS "Creators can create their own tickets" ON tickets;
DROP POLICY IF EXISTS "Creators can read their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins have full access to tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view their own tickets via created_by" ON tickets;
DROP POLICY IF EXISTS "Allow all operations on tickets" ON tickets;

DROP POLICY IF EXISTS "Users can read messages from their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Users can add messages to their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins have full access to ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Allow all operations on ticket_messages" ON ticket_messages;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS trigger_update_tickets_updated_at ON tickets;
DROP FUNCTION IF EXISTS update_tickets_updated_at();

-- Supprimer les index
DROP INDEX IF EXISTS idx_ticket_messages_ticket_id;
DROP INDEX IF EXISTS idx_ticket_messages_created_at;
DROP INDEX IF EXISTS idx_tickets_status;
DROP INDEX IF EXISTS idx_tickets_priority;
DROP INDEX IF EXISTS idx_tickets_type;
DROP INDEX IF EXISTS idx_tickets_created_by;
DROP INDEX IF EXISTS idx_tickets_assigned_to;
DROP INDEX IF EXISTS idx_tickets_farm_id;
DROP INDEX IF EXISTS idx_tickets_created_at;
DROP INDEX IF EXISTS idx_tickets_response_deadline;

-- Supprimer les tables (CASCADE pour supprimer les dépendances)
DROP TABLE IF EXISTS ticket_messages CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;

-- ========================================
-- ÉTAPE 2 : CRÉATION DE LA TABLE TICKETS
-- ========================================

CREATE TABLE tickets (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type et catégorie
  type TEXT NOT NULL CHECK (type IN ('creator', 'client', 'report')),
  category TEXT NOT NULL, -- 'bug', 'feature', 'question', 'report_spam', 'report_scam', etc.
  
  -- Statut et priorité
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Contenu
  subject TEXT NOT NULL,
  description TEXT,
  
  -- Participants
  created_by TEXT NOT NULL, -- Address XEC du créateur du ticket (wallet address)
  assigned_to TEXT, -- Address XEC de l'admin assigné (optionnel)
  
  -- Relations
  farm_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Profil concerné (si applicable)
  token_id TEXT, -- Token ID concerné (si applicable)
  
  -- Gestion des délais
  response_deadline TIMESTAMP WITH TIME ZONE, -- Date limite de réponse
  auto_action TEXT CHECK (auto_action IN ('none', 'hide', 'suspend')), -- Action automatique si deadline dépassée
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Contraintes de validation
  CONSTRAINT valid_deadline CHECK (response_deadline IS NULL OR response_deadline > created_at),
  CONSTRAINT valid_subject_length CHECK (length(trim(subject)) >= 5),
  CONSTRAINT valid_description_length CHECK (description IS NULL OR length(trim(description)) >= 10)
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_type ON tickets(type);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_farm_id ON tickets(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX idx_tickets_token_id ON tickets(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_response_deadline ON tickets(response_deadline) WHERE status IN ('open', 'in_progress') AND response_deadline IS NOT NULL;

-- Commentaire sur la table
COMMENT ON TABLE tickets IS 'Tickets de support créés par les créateurs, clients et signalements';
COMMENT ON COLUMN tickets.type IS 'Type de ticket: creator (créateur), client (client), report (signalement)';
COMMENT ON COLUMN tickets.category IS 'Catégorie: bug, feature, question, report_spam, report_scam, etc.';
COMMENT ON COLUMN tickets.status IS 'Statut: open, in_progress, resolved, closed';
COMMENT ON COLUMN tickets.priority IS 'Priorité: low, normal, high, urgent';
COMMENT ON COLUMN tickets.created_by IS 'Adresse XEC du créateur du ticket';
COMMENT ON COLUMN tickets.farm_id IS 'ID du profil concerné (relation vers profiles/farms)';
COMMENT ON COLUMN tickets.token_id IS 'ID du token concerné';

-- ========================================
-- ÉTAPE 3 : CRÉATION DE LA TABLE TICKET_MESSAGES
-- ========================================

CREATE TABLE ticket_messages (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au ticket
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Auteur du message
  author TEXT NOT NULL CHECK (author IN ('admin', 'creator', 'client', 'system')),
  author_address TEXT NOT NULL, -- Address XEC de l'auteur (ou 'system' pour messages système)
  
  -- Contenu
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- URLs des pièces jointes
  
  -- Visibilité (qui peut voir ce message)
  visible_to TEXT[] DEFAULT ARRAY['admin', 'creator', 'client']::TEXT[],
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes de validation
  CONSTRAINT valid_content_length CHECK (length(trim(content)) > 0),
  CONSTRAINT valid_visible_to CHECK (array_length(visible_to, 1) > 0)
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_author ON ticket_messages(author);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

-- Commentaires sur la table
COMMENT ON TABLE ticket_messages IS 'Messages/conversations dans les tickets de support';
COMMENT ON COLUMN ticket_messages.author IS 'Auteur du message: admin, creator, client, system';
COMMENT ON COLUMN ticket_messages.author_address IS 'Adresse XEC de l''auteur (ou "system" pour messages automatiques)';
COMMENT ON COLUMN ticket_messages.visible_to IS 'Liste des rôles pouvant voir ce message';

-- ========================================
-- ÉTAPE 4 : TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- ========================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour tickets
CREATE TRIGGER trigger_update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

COMMENT ON FUNCTION update_tickets_updated_at() IS 'Met à jour automatiquement le champ updated_at lors d''une modification';

-- ========================================
-- ÉTAPE 5 : ROW LEVEL SECURITY (RLS)
-- ========================================

-- Activer RLS sur les deux tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES ULTRA-PERMISSIVES POUR LE DÉVELOPPEMENT
-- ========================================
-- ⚠️ ATTENTION : Ces policies permettent toutes les opérations
-- À remplacer par des policies plus restrictives en production !

-- Policy pour tickets : Tout le monde peut tout faire
CREATE POLICY "Allow all operations on tickets"
ON tickets
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy pour ticket_messages : Tout le monde peut tout faire
CREATE POLICY "Allow all operations on ticket_messages"
ON ticket_messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow all operations on tickets" ON tickets IS 
'⚠️ DÉVELOPPEMENT SEULEMENT - Permet toutes les opérations sur les tickets. À sécuriser en production !';

COMMENT ON POLICY "Allow all operations on ticket_messages" ON ticket_messages IS 
'⚠️ DÉVELOPPEMENT SEULEMENT - Permet toutes les opérations sur les messages. À sécuriser en production !';

-- ========================================
-- ÉTAPE 6 : DONNÉES DE TEST (OPTIONNEL)
-- ========================================
-- Décommentez pour insérer des données de test

/*
-- Ticket de test 1 : Question créateur
INSERT INTO tickets (
  type, 
  category, 
  status, 
  priority, 
  subject, 
  description, 
  created_by
) VALUES (
  'creator',
  'question',
  'open',
  'normal',
  'Question sur la vérification',
  'Combien de temps prend la vérification de mon établissement ?',
  'ecash:qztest123456789'
);

-- Ticket de test 2 : Bug client
INSERT INTO tickets (
  type, 
  category, 
  status, 
  priority, 
  subject, 
  description, 
  created_by,
  token_id
) VALUES (
  'client',
  'bug',
  'open',
  'high',
  'Impossible d''envoyer des tokens',
  'Erreur lors de l''envoi de tokens : "Transaction failed"',
  'ecash:qzclient987654321',
  '3adbf501e21c711308edf441'
);
*/

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

-- Afficher un résumé des tables créées
DO $$
BEGIN
  RAISE NOTICE '✅ Tables créées avec succès !';
  RAISE NOTICE '📋 Table tickets : % colonnes', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'tickets');
  RAISE NOTICE '💬 Table ticket_messages : % colonnes', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'ticket_messages');
  RAISE NOTICE '🔒 RLS activé avec policies ultra-permissives (développement)';
  RAISE NOTICE '⚠️  À FAIRE : Remplacer les policies par des règles restrictives en production';
END $$;
