-- Migration Supabase : Système de tickets admin
-- Date: 2025-01-XX
-- Description: Création des tables pour le système de support admin (tickets, messages, settings)

-- ========================================
-- TABLE: tickets
-- ========================================
-- Gestion des tickets de support (créateurs, clients, signalements)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
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
  created_by TEXT NOT NULL, -- Address XEC du créateur du ticket
  assigned_to TEXT, -- Address XEC de l'admin assigné
  
  -- Relations
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL, -- Profil concerné (si applicable)
  token_id TEXT, -- Token concerné (si applicable)
  
  -- Gestion des délais
  response_deadline TIMESTAMP, -- Date limite de réponse
  auto_action TEXT CHECK (auto_action IN ('none', 'hide', 'suspend')), -- Action automatique si deadline dépassée
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  -- Index pour les recherches
  CONSTRAINT valid_deadline CHECK (response_deadline IS NULL OR response_deadline > created_at)
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_type ON tickets(type);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_farm_id ON tickets(farm_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_response_deadline ON tickets(response_deadline) WHERE status IN ('open', 'in_progress');

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

-- ========================================
-- TABLE: ticket_messages
-- ========================================
-- Messages/conversation dans les tickets
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Référence au ticket
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Auteur
  author TEXT NOT NULL, -- 'admin', 'creator', 'client', 'system'
  author_address TEXT NOT NULL, -- Address XEC de l'auteur
  
  -- Contenu
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- URLs des pièces jointes
  
  -- Visibilité
  visible_to TEXT[] DEFAULT ARRAY['admin', 'creator', 'client'], -- Qui peut voir ce message
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Validations
  CONSTRAINT valid_author CHECK (author IN ('admin', 'creator', 'client', 'system')),
  CONSTRAINT valid_content CHECK (length(content) > 0)
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at DESC);
CREATE INDEX idx_ticket_messages_author ON ticket_messages(author);

-- ========================================
-- TABLE: admin_settings
-- ========================================
-- Configuration admin (CTA, délais, notifications)
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Clé unique pour chaque paramètre
  setting_key TEXT UNIQUE NOT NULL,
  
  -- Valeur en JSONB pour flexibilité
  setting_value JSONB NOT NULL,
  
  -- Métadonnées
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT, -- Address XEC de l'admin qui a modifié
  
  CONSTRAINT valid_setting_key CHECK (length(setting_key) > 0)
);

-- Index
CREATE INDEX idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX idx_admin_settings_updated_at ON admin_settings(updated_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();

-- ========================================
-- POLITIQUES RLS (Row Level Security)
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Politique pour tickets : Admins peuvent tout faire
CREATE POLICY tickets_admin_all ON tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE address = auth.uid()
      AND verification_status = 'verified'
      AND role = 'admin'
    )
  );

-- Politique pour tickets : Créateurs peuvent voir leurs propres tickets
CREATE POLICY tickets_creator_read ON tickets
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = tickets.farm_id
      AND farms.address = auth.uid()
    )
  );

-- Politique pour tickets : Créateurs peuvent créer des tickets
CREATE POLICY tickets_creator_insert ON tickets
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Politique pour ticket_messages : Admins peuvent tout faire
CREATE POLICY ticket_messages_admin_all ON ticket_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE address = auth.uid()
      AND verification_status = 'verified'
      AND role = 'admin'
    )
  );

-- Politique pour ticket_messages : Utilisateurs peuvent voir les messages visibles pour eux
CREATE POLICY ticket_messages_user_read ON ticket_messages
  FOR SELECT
  USING (
    'admin' = ANY(visible_to)
    OR (
      'creator' = ANY(visible_to)
      AND EXISTS (
        SELECT 1 FROM tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.created_by = auth.uid()
      )
    )
    OR (
      'client' = ANY(visible_to)
      AND EXISTS (
        SELECT 1 FROM tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.created_by = auth.uid()
      )
    )
  );

-- Politique pour ticket_messages : Utilisateurs peuvent créer des messages dans leurs tickets
CREATE POLICY ticket_messages_user_insert ON ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_messages.ticket_id
      AND tickets.created_by = auth.uid()
    )
  );

-- Politique pour admin_settings : Admins peuvent tout faire
CREATE POLICY admin_settings_admin_all ON admin_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE address = auth.uid()
      AND verification_status = 'verified'
      AND role = 'admin'
    )
  );

-- ========================================
-- DONNÉES PAR DÉFAUT
-- ========================================

-- Configuration CTA par défaut
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('cta_config', '{
  "enabled": false,
  "position": 1,
  "message": "🎯 Besoin d''aide pour créer votre profil ou token ?",
  "buttonText": "Contacter l''équipe",
  "targetUrl": "/support",
  "frequency": "once_per_session"
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Configuration délais de réponse par défaut
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('response_delays', '{
  "creator_default_hours": 48,
  "report_urgent_hours": 24,
  "report_normal_hours": 72,
  "auto_action": "none",
  "send_reminder": true,
  "reminder_hours_before": 12
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Configuration notifications par défaut
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('notifications', '{
  "email_new_ticket": true,
  "email_urgent_report": true,
  "email_deadline_approaching": true,
  "slack_webhook": "",
  "discord_webhook": ""
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- ========================================
-- VUES UTILES
-- ========================================

-- Vue : Tickets avec compte de messages
CREATE OR REPLACE VIEW tickets_with_stats AS
SELECT 
  t.*,
  COUNT(tm.id) as message_count,
  MAX(tm.created_at) as last_message_at,
  CASE 
    WHEN t.response_deadline IS NULL THEN NULL
    WHEN t.response_deadline < NOW() THEN 'expired'
    WHEN t.response_deadline < NOW() + INTERVAL '12 hours' THEN 'urgent'
    ELSE 'ok'
  END as deadline_status
FROM tickets t
LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id
GROUP BY t.id;

-- Vue : Statistiques tickets par type
CREATE OR REPLACE VIEW ticket_stats_by_type AS
SELECT 
  type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - created_at)) / 3600) as avg_resolution_hours
FROM tickets
GROUP BY type, status;

-- ========================================
-- FONCTIONS UTILES
-- ========================================

-- Fonction : Auto-fermeture des tickets expirés
CREATE OR REPLACE FUNCTION close_expired_tickets()
RETURNS TABLE(closed_count INTEGER) AS $$
DECLARE
  count_closed INTEGER := 0;
BEGIN
  -- Fermer les tickets expirés avec auto_action
  WITH updated AS (
    UPDATE tickets
    SET 
      status = 'closed',
      closed_at = NOW()
    WHERE 
      status IN ('open', 'in_progress')
      AND response_deadline < NOW()
      AND auto_action IS NOT NULL
      AND auto_action != 'none'
    RETURNING id
  )
  SELECT COUNT(*) INTO count_closed FROM updated;
  
  RETURN QUERY SELECT count_closed;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMMENTAIRES
-- ========================================

COMMENT ON TABLE tickets IS 'Tickets de support admin (créateurs, clients, signalements)';
COMMENT ON TABLE ticket_messages IS 'Messages/conversation dans les tickets';
COMMENT ON TABLE admin_settings IS 'Configuration admin (CTA, délais, notifications)';
COMMENT ON COLUMN tickets.type IS 'Type de ticket : creator (support créateur), client (support client), report (signalement)';
COMMENT ON COLUMN tickets.status IS 'Statut : open, in_progress, resolved, closed';
COMMENT ON COLUMN tickets.priority IS 'Priorité : low, normal, high, urgent';
COMMENT ON COLUMN tickets.response_deadline IS 'Date limite de réponse (auto-action si dépassée)';
COMMENT ON COLUMN ticket_messages.visible_to IS 'Tableau des rôles pouvant voir ce message : admin, creator, client';
COMMENT ON COLUMN admin_settings.setting_value IS 'Valeur JSONB pour flexibilité (objets, tableaux, etc.)';
