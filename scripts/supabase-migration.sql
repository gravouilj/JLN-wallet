-- Migration Supabase : Ajout des champs de vérification
-- Date: 2025-12-09
-- Description: Ajout des champs requis pour le processus de vérification des fermes

-- 1. Ajouter la colonne address si elle n'existe pas (devient obligatoire)
ALTER TABLE farms 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Vérifier que les champs JSONB existent
-- (certifications et socials devraient déjà exister, mais on s'assure qu'ils ont les bonnes valeurs par défaut)

-- 3. Mettre à jour les fermes existantes sans adresse (si besoin)
-- ATTENTION: À adapter selon vos données existantes
-- UPDATE farms 
-- SET address = 'Adresse à compléter'
-- WHERE address IS NULL;

-- 4. Rendre le champ address obligatoire
-- ATTENTION: Décommenter UNIQUEMENT après avoir rempli toutes les adresses existantes
-- ALTER TABLE farms ALTER COLUMN address SET NOT NULL;

-- 5. Ajouter un commentaire sur la table pour documentation
COMMENT ON TABLE farms IS 'Table des fermes avec informations de vérification et certifications';

-- 6. Ajouter des commentaires sur les colonnes importantes
COMMENT ON COLUMN farms.address IS 'Adresse complète (OBLIGATOIRE - affichée dans l''annuaire public)';
COMMENT ON COLUMN farms.certifications IS 'JSONB contenant: siret, siret_link, legal_representative, official_website, national, national_link, international, international_link';
COMMENT ON COLUMN farms.verification_status IS 'Statut: unverified, pending, info_requested, verified';
COMMENT ON COLUMN farms.verified IS 'true si ferme validée par admin';
COMMENT ON COLUMN farms.admin_message IS 'Message de l''admin en cas de demande d''info';

-- 7. Vérifier que tous les index sont en place
CREATE INDEX IF NOT EXISTS idx_farms_owner_address ON farms(owner_address);
CREATE INDEX IF NOT EXISTS idx_farms_verification_status ON farms(verification_status);
CREATE INDEX IF NOT EXISTS idx_farms_verified ON farms(verified);

-- 8. Fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Créer le trigger si il n'existe pas
DROP TRIGGER IF EXISTS update_farms_updated_at ON farms;
CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Vérifier la structure finale
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'farms'
ORDER BY ordinal_position;
