# Migration des Statuts - Plan d'action

## Changements appliqués ✅

### 1. farmService.js
- ✅ `saveFarm()` : `'unverified'` → `'none'`
- ✅ `getPendingFarms()` : Retire `'unverified'` du filtre, garde seulement `['pending', 'info_requested']`
- ✅ `getVerifiedFarms()` : Affiche toutes les fermes `status === 'active'` (pas seulement verified)
- ✅ `suspendFarm()` : Nouveau (remplace `hideFarm`)
- ✅ `deleteFarm()` : Nouveau (remplace `markForDeletion`)
- ✅ `reactivateFarm()` : Mis à jour pour nouveaux champs
- ✅ `checkTokenAvailability()` : Exclut `'deleted'` et `'banned'` uniquement

### 2. UI.jsx
- ✅ StatusBadge : Ajout `'none'`, suppression `'unverified'`
- ✅ farmStatusStyles : Ajout `'draft'`, `'suspended'`, `'deleted'`, suppression `'pending_deletion'`

### 3. ImportTokenModal.jsx
- ✅ `verification_status: 'none'` au lieu de `'unverified'`

### 4. FarmStatusActions.jsx
- ✅ Cas 1 : `'pending_deletion'` → `'deleted'`
- ✅ Cas 3 : Action `'none'` au lieu de `'unverified'`
- ✅ Cas 5 : Condition `'none'` au lieu de `'unverified'`

## Changements à faire manuellement 🔧

### Pages à mettre à jour

#### ManageFarmPage.jsx (6 occurrences)
- Ligne 690 : `'unverified'` → `'none'`
- Ligne 721 : `'unverified'` → `'none'`
- Ligne 955 : `'unverified'` → `'none'`
- Ligne 1017 : `'pending_deletion'` → `'deleted'`
- Ligne 1177 : `'pending_deletion'` → `'deleted'`

#### AdminVerificationPage.jsx (7 occurrences)
- Ligne 45 : Renommer compteur `unverified` → `none`
- Ligne 76 : `'unverified'` → `'none'`
- Ligne 102-103 : Tab `'unverified'` → `'none'`
- Ligne 111 : Commentaire `'pending_deletion'` → `'deleted'`
- Ligne 228-229 : Tab "Non Vérifié" → "Sans badge"
- Ligne 486 : Action `'unverified'` → `'none'`

#### DirectoryPage.jsx (2 occurrences)
- Ligne 125 : Commentaire obsolète à mettre à jour
- Ligne 739 : Classe CSS `unverified` → `none` (ou supprimer si obsolète)

#### CompleteTokenImportPage.jsx (1 occurrence)
- Ligne 162 : `'unverified'` → `'none'`

#### ManageTokenPage.jsx (5 occurrences)
- Ligne 160 : `'unverified'` → `'none'`
- Ligne 264 : `'unverified'` → `'none'`
- Ligne 342 : `'unverified'` → `'none'`
- Ligne 518 : `'unverified'` → `'none'`
- Ligne 545 : `'pending_deletion'` → `'deleted'`
- Ligne 629 : `'unverified'` → `'none'`

### Hooks à mettre à jour

#### useFarmStatus.js (2 occurrences)
- Ligne 275 : `'pending_deletion'` → `'deleted'`
- Ligne 291 : Case `'unverified'` → `'none'`

## Migration SQL nécessaire 🗄️

```sql
-- Migration des verification_status
UPDATE farms 
SET verification_status = 'none' 
WHERE verification_status = 'unverified';

-- Migration des status
UPDATE farms 
SET status = 'deleted' 
WHERE status = 'pending_deletion';

UPDATE farms 
SET status = 'suspended' 
WHERE status = 'hidden';

-- Renommer les colonnes de timestamps
ALTER TABLE farms 
RENAME COLUMN hidden_at TO suspended_at;

ALTER TABLE farms 
RENAME COLUMN deletion_requested_at TO deleted_at;

ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Ajouter contraintes
ALTER TABLE farms 
DROP CONSTRAINT IF EXISTS farms_status_check;

ALTER TABLE farms 
ADD CONSTRAINT farms_status_check 
CHECK (status IN ('draft', 'active', 'suspended', 'banned', 'deleted'));

ALTER TABLE farms 
DROP CONSTRAINT IF EXISTS farms_verification_status_check;

ALTER TABLE farms 
ADD CONSTRAINT farms_verification_status_check 
CHECK (verification_status IN ('none', 'pending', 'info_requested', 'verified', 'rejected'));
```

## Tests à effectuer ✅

- [ ] Créer une nouvelle ferme → `status = 'active'`, `verification_status = 'none'`
- [ ] Demander vérification → `verification_status = 'pending'`
- [ ] Admin valide → `verification_status = 'verified'`
- [ ] Admin retire badge → `verification_status = 'none'`
- [ ] Admin suspend ferme → `status = 'suspended'`
- [ ] Annuaire affiche fermes `status = 'active'` (vérifiées ou non)
- [ ] Badge ✅ apparaît seulement si `verification_status = 'verified'`
- [ ] Fermes `verification_status = 'none'` n'ont PAS de badge

## Logique de visibilité simplifiée

| `status` | Visible annuaire | Description |
|----------|------------------|-------------|
| `draft` | ❌ | Brouillon de l'utilisateur |
| `active` | ✅ | Public (badge selon verification_status) |
| `suspended` | ❌ | Masqué par admin |
| `banned` | ❌ | Bloqué définitif |
| `deleted` | ❌ | Supprimé par utilisateur |

| `verification_status` | Badge affiché | Description |
|----------------------|---------------|-------------|
| `none` | Aucun | Par défaut, pas de badge |
| `pending` | ⏳ | Demande en cours (interne admin) |
| `info_requested` | 💬 | Admin demande info (interne admin) |
| `verified` | ✅ | Badge vérifié visible |
| `rejected` | ❌ | Refusé (interne admin) |

**Point clé** : Une ferme `active` + `none` est VISIBLE dans l'annuaire mais SANS badge ✅
