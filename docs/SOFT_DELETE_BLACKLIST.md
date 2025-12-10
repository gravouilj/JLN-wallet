# Système de Modération et Soft Delete - Documentation Complète

## Vue d'ensemble

Système complet de gestion des signalements avec soft delete (suppression progressive sur 1 an), blacklist des arnaques confirmées, et préservation des jetons pour éviter les erreurs de modération.

---

## Architecture Base de Données

### Table `farms` - Nouvelles colonnes

```sql
ALTER TABLE farms 
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'pending_deletion', 'deleted')),
ADD COLUMN hidden_at TIMESTAMP,
ADD COLUMN deletion_requested_at TIMESTAMP,
ADD COLUMN deletion_reason TEXT;
```

**Statuts possibles:**
- `active` : Ferme visible et active
- `hidden` : Masquée du directory (réversible)
- `pending_deletion` : Suppression dans 1 an (réversible avant expiration)
- `deleted` : Supprimée définitivement (non utilisé, entrée physiquement supprimée)

### Table `blacklist` - Arnaques confirmées

```sql
CREATE TABLE blacklist (
  id UUID PRIMARY KEY,
  ecash_address TEXT NOT NULL UNIQUE,
  token_ids TEXT[], -- Array de tokenIDs
  reason TEXT NOT NULL,
  farm_name TEXT,
  farm_description TEXT,
  blacklisted_at TIMESTAMP DEFAULT NOW(),
  blacklisted_by TEXT
);
```

**But:** Empêcher la ré-inscription des arnaques confirmées après suppression définitive.

### Table `farm_reports` - Nouvelles colonnes

```sql
ALTER TABLE farm_reports
ADD COLUMN admin_status TEXT DEFAULT 'pending' CHECK (admin_status IN ('pending', 'investigating', 'ignored', 'resolved')),
ADD COLUMN admin_action_at TIMESTAMP,
ADD COLUMN admin_note TEXT;
```

**Statuts des signalements:**
- `pending` : Nouveau signalement non traité
- `investigating` : Admin a demandé des infos au créateur
- `ignored` : Admin a ignoré les signalements (ferme légitime)
- `resolved` : Ferme supprimée ou validée

---

## Flux de Modération

### 1. Signalement par Utilisateur

```
Utilisateur connecté → Clique 🚨 sur une ferme
  ↓
Modal avec textarea (raison obligatoire)
  ↓
FarmService.reportFarm(farmId, address, reason)
  ↓
INSERT farm_reports (admin_status = 'pending')
  ↓
Compteur signalements +1 dans AdminVerificationPage
```

**Gestion des doublons:**
- Contrainte `UNIQUE(farm_id, reporter_address)`
- Si doublon → Erreur 23505 → Message "Vous avez déjà signalé cette ferme"

### 2. Traitement Admin - 4 Actions Possibles

#### Action 1: 👁️ Ne pas tenir compte

```javascript
await FarmService.ignoreReports(farmId, 'Signalements ignorés par admin')
```

**Effet:**
- `admin_status` des reports → `'ignored'`
- Ferme disparaît de l'onglet Signalements
- Ferme reste visible dans le directory
- Compteur signalements -X

#### Action 2: ℹ️ Demander plus d'infos (signalement)

```javascript
await FarmService.adminUpdateStatus(farmId, 'info_requested', '🚨 SIGNALEMENT REÇU - [message]')
await FarmService.markReportsInvestigating(farmId)
```

**Effet:**
- Message envoyé au créateur avec préfixe "🚨 SIGNALEMENT REÇU"
- `admin_status` des reports → `'investigating'`
- Ferme reste dans l'onglet Signalements
- Badge 🔔 apparaît sur ManageTokenPage du créateur
- Message visible sur ManageFarmPage

**Affichage créateur:**
```
ManageFarmPage:
┌─────────────────────────────────────────────┐
│ 💬 Message de l'administrateur              │
│                                             │
│ 🚨 SIGNALEMENT REÇU - Votre ferme a été    │
│ signalée pour informations douteuses sur    │
│ les certifications. Merci de fournir des   │
│ preuves...                                  │
└─────────────────────────────────────────────┘
```

#### Action 3: 🚫 Masquer du directory

```javascript
await FarmService.hideFarm(farmId, reason)
await FarmService.ignoreReports(farmId, 'Ferme masquée')
```

**Effet:**
- `status` → `'hidden'`
- `hidden_at` → NOW()
- `deletion_reason` → raison saisie
- Ferme invisible dans DirectoryPage
- Ferme visible pour admin dans AdminVerificationPage
- Jetons restent utilisables
- Créateur voit :

```
ManageFarmPage:
┌─────────────────────────────────────────────┐
│ 🚫 Ferme temporairement masquée du          │
│    directory                                │
│                                             │
│ Contenu inapproprié - Modération en cours   │
└─────────────────────────────────────────────┘
```

**Réversible:** Admin peut réactiver avec `FarmService.reactivateFarm(farmId)`

#### Action 4: 🗑️ Supprimer (1 an)

```javascript
await FarmService.markForDeletion(farmId, reason)
```

**Effet:**
- `status` → `'pending_deletion'`
- `deletion_requested_at` → NOW()
- `deletion_reason` → raison saisie
- Ferme masquée du DirectoryPage
- Jetons **restent utilisables** (important!)
- `admin_status` des reports → `'resolved'`
- Créateur voit :

```
ManageFarmPage:
┌─────────────────────────────────────────────┐
│ ⚠️ 🗑️ Ferme en cours de suppression         │
│                                             │
│ Votre ferme sera définitivement supprimée   │
│ le 09/12/2026.                              │
│                                             │
│ Raison: Arnaque suspectée - Signalements   │
│ multiples de fausses certifications         │
│                                             │
│ ⏱️ Votre jeton reste utilisable pendant     │
│ cette période.                              │
└─────────────────────────────────────────────┘
```

**Réversible pendant 1 an:** `FarmService.reactivateFarm(farmId)`

### 3. Suppression Définitive (après 1 an)

**Déclenchement:** Script CRON ou fonction manuelle

```sql
SELECT cleanup_expired_farms();
```

**Process:**
1. Récupère farms avec `status = 'pending_deletion'` ET `deletion_requested_at < NOW() - 1 year`
2. Pour chaque ferme:
   - Créer entrée blacklist avec `ecash_address`, `token_ids`, `reason`
   - DELETE FROM farms WHERE id = farmId (suppression physique)
   - CASCADE supprime les farm_reports associés

**Blacklist créée:**
```json
{
  "ecash_address": "ecash:qp...",
  "token_ids": ["abc123...", "def456..."],
  "reason": "Arnaque confirmée - Signalements multiples",
  "farm_name": "Fausse Ferme Bio",
  "farm_description": "...",
  "blacklisted_at": "2026-12-09",
  "blacklisted_by": "system"
}
```

**Protection contre ré-inscription:**
- Lors de `saveFarm()`, vérifier avec `FarmService.isBlacklisted(ownerAddress)`
- Si blacklisté → Refuser l'enregistrement

---

## Fonctions FarmService

### Nouvelles fonctions

#### 7. `hideFarm(farmId, reason)`
Masque une ferme du directory (réversible).

```javascript
await FarmService.hideFarm('uuid', 'Contenu inapproprié');
// Statut: active → hidden
// Visible: Non dans directory, Oui pour admin
```

#### 8. `markForDeletion(farmId, reason)`
Marque pour suppression dans 1 an (soft delete).

```javascript
await FarmService.markForDeletion('uuid', 'Arnaque suspectée');
// Statut: active → pending_deletion
// Suppression définitive: Dans 1 an
// Jetons: Restent utilisables
```

#### 9. `reactivateFarm(farmId)`
Réactive une ferme masquée ou en cours de suppression.

```javascript
await FarmService.reactivateFarm('uuid');
// Statut: hidden|pending_deletion → active
// Réinitialise: hidden_at, deletion_requested_at, deletion_reason
```

#### 10. `deleteFarmPermanently(farmId, adminAddress)`
Suppression immédiate avec création de blacklist (usage exceptionnel).

```javascript
await FarmService.deleteFarmPermanently('uuid', 'ecash:admin...');
// 1. Récupère infos ferme
// 2. Crée entrée blacklist
// 3. Supprime ferme physiquement
```

⚠️ **À utiliser UNIQUEMENT pour arnaques flagrantes nécessitant suppression immédiate.**

#### 11. `isBlacklisted(ecashAddress)`
Vérifie si une adresse est blacklistée.

```javascript
const isBlacklisted = await FarmService.isBlacklisted('ecash:qp...');
if (isBlacklisted) {
  // Refuser enregistrement
}
```

#### 12. `getBlacklist()`
Récupère toute la blacklist (pour interface admin).

```javascript
const blacklist = await FarmService.getBlacklist();
// Retourne: Array<{ ecash_address, token_ids, reason, ... }>
```

#### 13. `reportFarm(farmId, reporterAddress, reason)` *(modifié)*
Ajout du champ `admin_status: 'pending'`.

#### 14. `getReportedFarms()` *(modifié)*
Ne retourne QUE les signalements avec `admin_status = 'pending'`.

```javascript
const reported = await FarmService.getReportedFarms();
// Exclut automatiquement: ignored, investigating (partiellement), resolved
```

#### 15. `ignoreReports(farmId, adminNote)`
Marque tous les signalements d'une ferme comme ignorés.

```javascript
await FarmService.ignoreReports('uuid', 'Signalements ignorés');
// admin_status: pending → ignored
```

#### 16. `markReportsInvestigating(farmId)`
Marque les signalements en investigation (demande info envoyée).

```javascript
await FarmService.markReportsInvestigating('uuid');
// admin_status: pending → investigating
```

---

## Affichage dans AdminVerificationPage

### Onglet 🚨 Signalements

**Apparence améliorée:**

```jsx
┌──────────────────────────────────────────────────────────┐
│ Ferme du Mensonge                                   🚨 3 │
│ Propriétaire: ecash:qp...xyz                             │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 🚨 3 Signalements                                  │  │
│ │                                                    │  │
│ │ ┌────────────────────────────────────────────┐    │  │
│ │ │ Fausses certifications bio affichées       │    │  │
│ │ │                                            │    │  │
│ │ │ 📅 09 déc. 2025 à 14:30 •                  │    │  │
│ │ │ 👤 ecash:qpabcdef123456789...              │    │  │
│ │ └────────────────────────────────────────────┘    │  │
│ │                                                    │  │
│ │ ┌────────────────────────────────────────────┐    │  │
│ │ │ Prix trompeurs, pas de SIRET valide        │    │  │
│ │ │                                            │    │  │
│ │ │ 📅 09 déc. 2025 à 16:45 •                  │    │  │
│ │ │ 👤 ecash:qpxyz987654321...                 │    │  │
│ │ └────────────────────────────────────────────┘    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [ 👁️ Ne pas tenir compte ]                              │
│ [ ℹ️ Demander plus d'infos ]                             │
│ [ 🚫 Masquer du directory ]                              │
│ [ 🗑️ Supprimer (1 an) ]                                 │
└──────────────────────────────────────────────────────────┘
```

**Changements:**
- ✅ Fond blanc pour motifs (lisibilité maximale)
- ✅ Adresse eCash complète en `font-mono`
- ✅ Date + heure formatées en français
- ✅ Compteur dynamique (disparaît après traitement)
- ✅ 4 actions claires

---

## Gestion du Compteur Dynamique

### Compteur dans l'onglet

```jsx
<button>
  🚨 Signalements ({reportedFarms.length})
</button>
```

**Mise à jour automatique:**
- `getReportedFarms()` filtre par `admin_status = 'pending'`
- Après chaque action → `loadPendingRequests()` → Recharge données
- Signalements traités (ignored/investigating/resolved) exclus du comptage

### Exemple de transitions

```
État initial: 5 signalements pending
  ↓
Admin clique "Ne pas tenir compte" sur 2 fermes
  ↓
admin_status → ignored pour ces 2 fermes
  ↓
Compteur: 3 signalements pending
```

---

## Préservation des Jetons

### Pourquoi ?

**Problème:** Si suppression immédiate, les utilisateurs qui ont acheté des jetons perdent leur investissement en cas d'erreur de modération.

**Solution:** Soft delete avec période de grâce de 1 an.

### Période de suppression

**Pendant 1 an:**
- ✅ Jetons restent utilisables (envoi/réception)
- ✅ Créateur peut utiliser son wallet normalement
- ✅ Admin peut réactiver si erreur détectée
- ❌ Ferme invisible dans DirectoryPage
- ❌ Ferme ne reçoit plus de nouveaux paiements via l'app

**Après 1 an:**
- ❌ Ferme supprimée définitivement
- ✅ Blacklist créée (adresse + tokenIDs)
- ✅ Jetons restent sur la blockchain (pas de destruction)
- ✅ Utilisateurs gardent leurs jetons (utilisables hors app)

---

## Blacklist et Protection

### Création automatique

```javascript
// Après 1 an de pending_deletion
const blacklistEntry = {
  ecash_address: 'ecash:qp...',
  token_ids: ['abc123', 'def456'],
  reason: 'Arnaque confirmée - Fausses certifications',
  farm_name: 'Fausse Ferme',
  farm_description: '...',
  blacklisted_at: NOW(),
  blacklisted_by: 'system'
};
```

### Vérification lors de l'enregistrement

```javascript
// Dans saveFarm() - À implémenter
const isBlacklisted = await FarmService.isBlacklisted(ownerAddress);
if (isBlacklisted) {
  throw new Error('Cette adresse a été blacklistée pour arnaque confirmée. Enregistrement refusé.');
}
```

### Tentative de ré-import de jeton

**Scénario:** Un escroc tente de ré-importer son tokenID après suppression.

**Protection:**
1. Vérifier `isBlacklisted(ownerAddress)` → Refus si blacklisté
2. Vérifier si `tokenId` dans `blacklist.token_ids` → Refus si présent

**Message:**
```
❌ Ce jeton est associé à une ferme blacklistée pour arnaque.
Enregistrement impossible.

Raison: Fausses certifications bio - Signalements multiples

Si vous pensez qu'il s'agit d'une erreur, contactez support@farmwallet.app
```

---

## Scripts de Migration

### 003_update_farms_soft_delete.sql

**Exécution:**
```bash
psql -h vmlozrwjjatqcjvdqkxu.supabase.co -U postgres -d postgres < scripts/003_update_farms_soft_delete.sql
```

**Contenu:**
- ALTER TABLE farms (colonnes status, hidden_at, deletion_requested_at, deletion_reason)
- CREATE TABLE blacklist
- ALTER TABLE farm_reports (colonnes admin_status, admin_action_at, admin_note)
- CREATE INDEX (optimisations)

### 004_cleanup_expired_farms.sql

**Fonction de nettoyage automatique:**
```sql
SELECT cleanup_expired_farms();
```

**Setup CRON (recommandé):**
```sql
-- Exécuter chaque jour à 3h du matin
SELECT cron.schedule('cleanup-farms', '0 3 * * *', $$
  SELECT cleanup_expired_farms();
$$);
```

---

## Tests de Non-Régression

### Test 1: Signalement multiple (même ferme)

```
1. User A signale Ferme X : "Fausses certifications"
2. User B signale Ferme X : "Prix trompeurs"
3. User C signale Ferme X : "Pas de SIRET"
4. Admin ouvre Signalements
5. Voit : Ferme X avec 3 signalements
6. Lit les 3 motifs distincts
7. Voit les 3 adresses eCash des signaleurs
```

**Résultat attendu:** ✅ 3 signalements groupés, bien lisibles, avec toutes les infos.

### Test 2: Doublon (même utilisateur)

```
1. User A signale Ferme X
2. User A tente de signaler Ferme X à nouveau
3. Backend rejette avec code 23505
4. Message : "Vous avez déjà signalé cette ferme"
```

**Résultat attendu:** ✅ Erreur gérée proprement, pas de doublon.

### Test 3: Ne pas tenir compte

```
1. Admin clique "Ne pas tenir compte" sur Ferme X (3 signalements)
2. Confirme
3. farm_reports: admin_status → ignored
4. Compteur : 5 → 2 (si 5 signalements au total)
5. Ferme X disparaît de l'onglet Signalements
6. DirectoryPage : Ferme X toujours visible
```

**Résultat attendu:** ✅ Signalements ignorés, ferme reste publique.

### Test 4: Demander info (avec préfixe signalement)

```
1. Admin clique "Demander plus d'infos" sur Ferme X
2. Saisit : "Merci de fournir preuves certifications"
3. Envoie
4. farm_reports: admin_status → investigating
5. farms: admin_message → "🚨 SIGNALEMENT REÇU - Merci de..."
6. ManageTokenPage (créateur) : Badge 🔔
7. ManageFarmPage (créateur) : Message visible avec emoji signalement
```

**Résultat attendu:** ✅ Créateur informé clairement que c'est un signalement.

### Test 5: Masquer du directory

```
1. Admin clique "Masquer du directory"
2. Saisit raison : "Contenu inapproprié"
3. Confirme
4. farms: status → hidden
5. DirectoryPage : Ferme X invisible
6. AdminVerificationPage : Ferme X visible (avec badge "hidden")
7. ManageFarmPage (créateur) : Alerte orange "Masquée temporairement"
8. Jetons : Fonctionnent normalement
```

**Résultat attendu:** ✅ Ferme masquée publiquement, jetons préservés.

### Test 6: Supprimer (1 an)

```
1. Admin clique "Supprimer (1 an)"
2. Saisit raison : "Arnaque suspectée"
3. Confirme
4. farms: status → pending_deletion, deletion_requested_at → NOW()
5. DirectoryPage : Ferme X invisible
6. ManageFarmPage (créateur) : Alerte rouge avec date de suppression
7. Jetons : Fonctionnent normalement
8. Signalements : admin_status → resolved (compteur -3)
```

**Résultat attendu:** ✅ Ferme en attente de suppression, créateur informé.

### Test 7: Réactivation

```
1. Ferme X en pending_deletion
2. Admin clique "Réactiver" (à implémenter dans AdminVerificationPage)
3. farms: status → active, deletion_requested_at → NULL
4. DirectoryPage : Ferme X réapparaît
5. ManageFarmPage : Plus d'alerte
```

**Résultat attendu:** ✅ Ferme réactivée, comme si rien ne s'était passé.

### Test 8: Suppression automatique après 1 an

```
1. Ferme X en pending_deletion depuis 366 jours
2. CRON exécute cleanup_expired_farms()
3. Blacklist créée avec address + token_ids
4. Ferme X supprimée physiquement de farms
5. farm_reports associés supprimés (CASCADE)
6. Tentative de ré-enregistrement → Refusée (blacklist)
```

**Résultat attendu:** ✅ Suppression définitive avec protection blacklist.

---

## Améliorations Futures

### 1. Interface Admin pour Blacklist

Créer `BlacklistPage.jsx` avec :
- Liste des adresses blacklistées
- Détails : raison, date, farm_name, token_ids
- Action : Débloquer (rare, mais possible si erreur judiciaire)

### 2. Notifications Email

- Envoyer email au créateur quand:
  - Ferme marquée pour suppression
  - J-30 avant suppression définitive
  - Ferme réactivée

### 3. Dashboard Stats

- Nombre de signalements traités par admin
- Nombre de fermes supprimées vs réactivées
- Top 10 des raisons de signalement

### 4. Export Blacklist

- Permettre export CSV pour analyse
- Partage avec autres plateformes (avec accord utilisateur)

---

## Fichiers Modifiés

### Backend

- ✅ `scripts/003_update_farms_soft_delete.sql` - Migration tables
- ✅ `scripts/004_cleanup_expired_farms.sql` - Fonction nettoyage
- ✅ `src/services/farmService.js` - Nouvelles fonctions (7-16)

### Frontend

- ✅ `src/pages/AdminVerificationPage.jsx` - Actions admin + affichage
- ✅ `src/pages/ManageFarmPage.jsx` - Alertes créateur (suppression, masquage)
- ✅ `src/pages/DirectoryPage.jsx` - Filtrage par statut (déjà fait via getVerifiedFarms)

---

## Support

Pour questions ou bugs:
- Documentation: `VERIFICATION_SYSTEM_V2.md`
- Architecture: `WALLET_ARCHITECTURE.md`
- Signalements: `REPORTING_SYSTEM.md`
