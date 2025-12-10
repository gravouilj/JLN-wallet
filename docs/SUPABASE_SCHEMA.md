# Schéma Supabase - Table `farms`

## Structure de la table

```sql
-- Table principale des fermes
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Localisation
  location_country TEXT,
  location_region TEXT,
  location_department TEXT,
  address TEXT NOT NULL, -- OBLIGATOIRE (affichage Directory)
  
  -- Contact
  phone TEXT,
  email TEXT NOT NULL, -- OBLIGATOIRE
  website TEXT,
  
  -- Image
  image_url TEXT,
  
  -- Réseaux sociaux (JSONB)
  socials JSONB DEFAULT '{}'::jsonb,
  -- Structure: { facebook, instagram, tiktok, youtube, whatsapp, telegram, other_website }
  
  -- Certifications (JSONB)
  certifications JSONB DEFAULT '{}'::jsonb,
  -- Structure: { 
  --   siret, 
  --   siret_link, 
  --   legal_representative,
  --   official_website,
  --   national, 
  --   national_link, 
  --   international, 
  --   international_link 
  -- }
  
  -- Produits et services (ARRAY)
  products TEXT[] DEFAULT ARRAY[]::TEXT[],
  services TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Tokens associés (JSONB Array)
  tokens JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ tokenId, ticker, purpose, isVisible }]
  
  -- Statuts de vérification
  verification_status TEXT DEFAULT 'unverified', 
  -- Valeurs: 'unverified', 'pending', 'info_requested', 'verified'
  verified BOOLEAN DEFAULT FALSE,
  admin_message TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_farms_owner_address ON farms(owner_address);
CREATE INDEX idx_farms_verification_status ON farms(verification_status);
CREATE INDEX idx_farms_verified ON farms(verified);
```

## Champs obligatoires

### Toujours obligatoires
- `name` : Nom de la ferme
- `description` : Description de la ferme
- `email` : Email de contact
- `address` : Adresse complète (affichée dans l'annuaire)

### Obligatoires pour la demande de vérification (`verification_status = 'pending'`)
- `certifications.siret` : Numéro SIRET ou Company ID
- `certifications.siret_link` : Lien de vérification SIRET (ex: annuaire-entreprises.data.gouv.fr)
- `certifications.legal_representative` : Nom du représentant légal
- `certifications.official_website` : Lien vers le registre officiel de l'entreprise (ex: infogreffe.fr, societe.com)
- `phone` : Numéro de téléphone

## Workflow de vérification

1. **Création de ferme** : `verification_status = 'unverified'`, `verified = false`
2. **Demande de vérification** : Validation des champs obligatoires → `verification_status = 'pending'`
3. **Admin valide** : `verification_status = 'verified'`, `verified = true`, `verified_at = NOW()`
4. **Admin demande info** : `verification_status = 'info_requested'`, `admin_message = "message admin"`
5. **Modification après vérification** : Retour à `verification_status = 'unverified'` (sécurité)

## Exemple de données

```json
{
  "id": "uuid-here",
  "owner_address": "ecash:qp...",
  "name": "Ferme Bio du Soleil",
  "description": "Producteur de légumes biologiques en circuit court",
  "location_country": "France",
  "location_region": "Occitanie",
  "location_department": "Haute-Garonne",
  "address": "123 Chemin des Champs, 31000 Toulouse",
  "phone": "+33612345678",
  "email": "contact@fermedusoleil.fr",
  "website": "https://fermedusoleil.fr",
  "socials": {
    "facebook": "https://facebook.com/fermedusoleil",
    "instagram": "@fermedusoleil",
    "tiktok": "@fermedusoleil",
    "youtube": null,
    "whatsapp": "+33612345678",
    "telegram": "@fermedusoleil",
    "other_website": "https://boutique.fermedusoleil.fr"
  },
  "certifications": {
    "siret": "12345678901234",
    "siret_link": "https://annuaire-entreprises.data.gouv.fr/entreprise/123456789",
    "legal_representative": "Jean Dupont",
    "official_website": "https://www.infogreffe.fr/entreprise/123456789",
    "national": "Agriculture Biologique (AB)",
    "national_link": "https://www.agencebio.org/",
    "international": "Demeter",
    "international_link": "https://demeter.net/"
  },
  "products": ["Légumes bio", "Œufs", "Miel"],
  "services": ["Vente directe", "Livraison", "Visite ferme"],
  "tokens": [
    {
      "tokenId": "abc123...",
      "ticker": "FARM",
      "purpose": "Points de fidélité pour achats directs",
      "isVisible": true
    }
  ],
  "verification_status": "verified",
  "verified": true,
  "verified_at": "2025-01-15T10:00:00Z",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

## Migration SQL (si table existe déjà)

```sql
-- Ajouter les nouveaux champs s'ils n'existent pas
ALTER TABLE farms 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Mettre à jour le JSONB certifications pour inclure les nouveaux champs
-- (Les colonnes JSONB n'ont pas besoin de migration, on peut ajouter des clés dynamiquement)

-- Mettre address obligatoire après avoir rempli les données existantes
-- ALTER TABLE farms ALTER COLUMN address SET NOT NULL;
```

## Requêtes utiles

### Récupérer les fermes en attente de vérification
```sql
SELECT * FROM farms 
WHERE verification_status IN ('pending', 'unverified')
ORDER BY updated_at DESC;
```

### Récupérer toutes les fermes vérifiées
```sql
SELECT * FROM farms 
WHERE verified = true
ORDER BY name ASC;
```

### Statistiques de vérification
```sql
SELECT 
  verification_status, 
  COUNT(*) as count 
FROM farms 
GROUP BY verification_status;
```
