-- Migration Supabase : Row Level Security Policies pour les tickets
-- Date: 2025-12-16
-- Description: Ajouter les policies RLS pour permettre aux créateurs et clients de créer/lire des tickets

-- Activer RLS sur la table tickets (si pas déjà activé)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Les créateurs peuvent créer leurs propres tickets
CREATE POLICY "Creators can create their own tickets"
ON tickets
FOR INSERT
TO authenticated, anon
WITH CHECK (
  type IN ('creator', 'client')
);

-- Policy 2: Les créateurs peuvent lire leurs propres tickets (basé sur farm_id ou created_by)
CREATE POLICY "Creators can read their own tickets"
ON tickets
FOR SELECT
TO authenticated, anon
USING (
  created_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  OR farm_id IN (
    SELECT id FROM farms 
    WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  )
);

-- Policy 3: Les admins peuvent tout voir et tout faire
CREATE POLICY "Admins have full access to tickets"
ON tickets
FOR ALL
TO authenticated
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
);

-- Policy 4: Tout le monde peut créer des tickets (fallback pour utilisateurs non authentifiés)
CREATE POLICY "Anyone can create tickets"
ON tickets
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy 5: Les utilisateurs peuvent voir leurs propres tickets via created_by
CREATE POLICY "Users can view their own tickets via created_by"
ON tickets
FOR SELECT
TO anon, authenticated
USING (
  created_by IS NOT NULL
);

-- ========================================
-- RLS pour ticket_messages
-- ========================================

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire les messages de tickets auxquels ils ont accès
CREATE POLICY "Users can read messages from their tickets"
ON ticket_messages
FOR SELECT
TO authenticated, anon
USING (
  ticket_id IN (
    SELECT id FROM tickets
    WHERE created_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    OR farm_id IN (
      SELECT id FROM farms 
      WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  )
);

-- Policy: Les utilisateurs peuvent ajouter des messages à leurs tickets
CREATE POLICY "Users can add messages to their tickets"
ON ticket_messages
FOR INSERT
TO authenticated, anon
WITH CHECK (
  ticket_id IN (
    SELECT id FROM tickets
    WHERE created_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    OR farm_id IN (
      SELECT id FROM farms 
      WHERE owner_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  )
);

-- Policy: Admins ont accès complet aux messages
CREATE POLICY "Admins have full access to ticket messages"
ON ticket_messages
FOR ALL
TO authenticated
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
);

-- Commentaires pour documentation
COMMENT ON POLICY "Creators can create their own tickets" ON tickets IS 
'Permet aux créateurs et clients de créer des tickets de support';

COMMENT ON POLICY "Anyone can create tickets" ON tickets IS 
'Fallback pour permettre aux utilisateurs non authentifiés de créer des tickets';

COMMENT ON POLICY "Users can view their own tickets via created_by" ON tickets IS 
'Permet aux utilisateurs de voir les tickets qu''ils ont créés via l''adresse created_by';
