-- Script de nettoyage automatique (à exécuter via CRON ou trigger)
-- Supprime définitivement les fermes après 1 an en pending_deletion

-- Fonction pour nettoyer les fermes expirées et créer blacklist
CREATE OR REPLACE FUNCTION cleanup_expired_farms()
RETURNS void AS $$
DECLARE
  expired_farm RECORD;
BEGIN
  -- Parcourir les fermes en attente de suppression depuis plus d'1 an
  FOR expired_farm IN 
    SELECT * FROM farms 
    WHERE status = 'pending_deletion' 
    AND deletion_requested_at < NOW() - INTERVAL '1 year'
  LOOP
    -- Créer entrée blacklist
    INSERT INTO blacklist (ecash_address, token_ids, reason, farm_name, farm_description, blacklisted_by)
    VALUES (
      expired_farm.owner_address,
      ARRAY(SELECT jsonb_array_elements_text(expired_farm.tokens::jsonb -> 'tokenId')),
      COALESCE(expired_farm.deletion_reason, 'Arnaque confirmée - Suppression automatique après 1 an'),
      expired_farm.name,
      expired_farm.description,
      'system'
    )
    ON CONFLICT (ecash_address) DO UPDATE
    SET token_ids = blacklist.token_ids || EXCLUDED.token_ids;
    
    -- Supprimer définitivement la ferme
    DELETE FROM farms WHERE id = expired_farm.id;
    
    RAISE NOTICE 'Ferme supprimée définitivement: % (owner: %)', expired_farm.name, expired_farm.owner_address;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour marquer les reports comme resolved quand une ferme est supprimée
CREATE OR REPLACE FUNCTION mark_reports_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'deleted' OR NEW.status = 'pending_deletion' THEN
    UPDATE farm_reports 
    SET admin_status = 'resolved', admin_action_at = NOW()
    WHERE farm_id = NEW.id AND admin_status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_farm_status_change
AFTER UPDATE OF status ON farms
FOR EACH ROW
EXECUTE FUNCTION mark_reports_resolved();

-- Pour exécuter manuellement le nettoyage:
-- SELECT cleanup_expired_farms();
