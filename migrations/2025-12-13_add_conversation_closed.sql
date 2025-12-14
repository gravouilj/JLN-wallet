-- Migration: Ajout du champ conversation_closed pour gérer la clôture des conversations de vérification
-- Date: 2025-12-13
-- Description: Permet de marquer les conversations de vérification comme clôturées par l'admin

-- Ajouter la colonne conversation_closed (booléen, par défaut FALSE)
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS conversation_closed BOOLEAN DEFAULT FALSE;

-- Index pour accélérer les requêtes filtrant sur ce champ
CREATE INDEX IF NOT EXISTS idx_farms_conversation_closed 
ON farms(conversation_closed);

-- Commentaire pour documentation
COMMENT ON COLUMN farms.conversation_closed IS 
'Indique si la conversation de vérification a été clôturée par l''administrateur. TRUE = clôturée, FALSE = ouverte.';

-- Mettre à jour les fermes vérifiées existantes (optionnel : clôturer automatiquement les conversations des fermes déjà vérifiées)
-- Décommenter si vous voulez marquer les conversations existantes comme clôturées
-- UPDATE farms 
-- SET conversation_closed = TRUE 
-- WHERE verification_status = 'verified';
