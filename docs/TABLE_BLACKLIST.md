# Table Blacklist - État et Migration

## 📋 État actuel

La table `blacklist` dans Supabase **n'est actuellement pas utilisée** par l'application.

### Structure originale
```sql
CREATE TABLE blacklist (
  id UUID PRIMARY KEY,
  owner_address TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  banned_by TEXT
);
```

## 🔄 Migration vers le nouveau système

Le système de bannissement a été **intégré directement dans la table `farms`** :

### Colonnes ajoutées à `farms`
- `status` → `'banned'` (au lieu d'une entrée séparée dans blacklist)
- `banned_at` → Date du bannissement
- `deletion_reason` → Motif du bannissement (partagé avec suppression)

### Avantages de la nouvelle approche
1. **Données centralisées** : Toutes les informations de la ferme en un seul endroit
2. **Historique préservé** : La ferme bannie garde son historique complet
3. **Réversible** : Action "Réhabiliter" peut remettre `status='active'`
4. **Filtrage simple** : `WHERE status = 'banned'` au lieu de jointure
5. **Audit trail** : `banned_at` + `deletion_reason` + `admin_message`

## 🗑️ Recommandation

### Option 1 : Supprimer la table (recommandé)
```sql
-- Après avoir vérifié qu'elle est vide ou que les données sont migrées
DROP TABLE IF EXISTS blacklist;
```

### Option 2 : Migration des données (si nécessaire)
Si la table `blacklist` contient des données historiques :

```sql
-- 1. Migrer les entrées blacklist vers farms.status='banned'
UPDATE farms
SET 
  status = 'banned',
  banned_at = b.created_at,
  deletion_reason = b.reason
FROM blacklist b
WHERE farms.owner_address = b.owner_address;

-- 2. Vérifier la migration
SELECT 
  f.name,
  f.owner_address,
  f.status,
  f.banned_at,
  f.deletion_reason
FROM farms f
WHERE f.status = 'banned';

-- 3. Supprimer la table obsolète
DROP TABLE blacklist;
```

## 📊 Nouvelle architecture

```
farms
├── status: 'draft' | 'active' | 'suspended' | 'banned' | 'deleted'
├── verification_status: 'none' | 'pending' | 'info_requested' | 'verified' | 'rejected'
├── banned_at: TIMESTAMPTZ (si status='banned')
├── suspended_at: TIMESTAMPTZ (si status='suspended')
├── deleted_at: TIMESTAMPTZ (si status='deleted')
├── deletion_reason: TEXT (motif du ban/suppression)
└── admin_message: TEXT (message admin général)
```

## 🎯 Actions admin disponibles

### Bannir une ferme
```javascript
await FarmService.banFarm(farmId, reason);
// Met status='banned', banned_at=NOW(), verification_status='rejected'
// Marque tous les reports comme 'resolved'
```

### Réhabiliter une ferme
```javascript
await FarmService.reactivateFarm(farmId);
// Remet status='active', efface banned_at, suspended_at, deleted_at
```

## ✅ Conclusion

**La table `blacklist` peut être supprimée en toute sécurité** après migration éventuelle des données historiques. Le nouveau système intégré est plus robuste et maintainable.
