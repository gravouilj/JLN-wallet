# Migration Supabase : Ajout de la colonne communication_history

## ⚠️ Action requise

La fonctionnalité d'historique des échanges nécessite l'ajout d'une colonne dans la table `farms`.

## SQL à exécuter dans Supabase

```sql
-- Ajouter la colonne communication_history à la table farms
ALTER TABLE farms 
ADD COLUMN communication_history JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN farms.communication_history IS 'Historique des échanges entre le créateur et l''admin concernant la vérification. Format: [{ author: "system"|"admin"|"creator", message: "...", timestamp: "ISO8601" }]';

-- Créer un index pour améliorer les performances
CREATE INDEX idx_farms_communication_history ON farms USING gin(communication_history);
```

## Structure attendue

```json
[
  {
    "author": "system",
    "message": "Demande de vérification soumise par le créateur",
    "timestamp": "2025-12-12T10:30:00.000Z"
  },
  {
    "author": "admin",
    "message": "Merci pour votre demande. Pouvez-vous préciser...",
    "timestamp": "2025-12-12T14:20:00.000Z"
  },
  {
    "author": "creator",
    "message": "Voici les informations complémentaires...",
    "timestamp": "2025-12-12T15:45:00.000Z"
  }
]
```

## Types d'auteurs

- **`system`** : Messages automatiques générés par l'application
- **`admin`** : Messages envoyés par l'administrateur
- **`creator`** : Messages envoyés par le créateur de la ferme

## Après la migration

Une fois la colonne créée, le code fonctionnera automatiquement sans modification supplémentaire.
Le bloc `try-catch` temporaire dans `ManageFarmPage.jsx` (ligne ~620) peut être simplifié.
