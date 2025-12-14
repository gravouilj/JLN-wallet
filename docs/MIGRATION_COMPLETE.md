# ✅ Migration Complète - Simplification des Statuts

**Date**: 13 décembre 2025  
**Version**: 2.0 - Système simplifié

---

## 📊 Résumé des Changements

### Ancienne Structure ❌
```
verification_status: unverified, pending, info_requested, verified, rejected
status: active, hidden, banned, pending_deletion
```

### Nouvelle Structure ✅
```
verification_status: none, pending, info_requested, verified, rejected
status: draft, active, suspended, banned, deleted
```

---

## 🔄 Mappings de Migration

| Ancien | Nouveau | Description |
|--------|---------|-------------|
| `verification_status: 'unverified'` | `verification_status: 'none'` | Aucun badge par défaut |
| `status: 'hidden'` | `status: 'suspended'` | Masqué par admin |
| `status: 'pending_deletion'` | `status: 'deleted'` | Supprimé par utilisateur |
| `status: 'active'` | `status: 'active'` | Inchangé |
| `hidden_at` | `suspended_at` | Renommage colonne |
| `deletion_requested_at` | `deleted_at` | Renommage colonne |

---

## 📝 Fichiers Modifiés

### Services (3 fichiers)
1. ✅ **farmService.js** (9 changements)
   - `saveFarm()` : Défaut `'none'` au lieu de `'unverified'`
   - `getPendingFarms()` : Filtre `['pending', 'info_requested']` uniquement
   - `getVerifiedFarms()` : Affiche `status === 'active'` (toutes fermes publiques)
   - `checkTokenAvailability()` : Exclut `'deleted'` et `'banned'`
   - `suspendFarm()` : Nouvelle méthode (remplace `hideFarm`)
   - `deleteFarm()` : Nouvelle méthode (remplace `markForDeletion`)
   - `reactivateFarm()` : Champs mis à jour

### Composants (3 fichiers)
2. ✅ **UI.jsx** (2 changements)
   - StatusBadge : Ajout `'none'`, suppression `'unverified'`
   - farmStatusStyles : Ajout `'draft'`, `'suspended'`, `'deleted'`

3. ✅ **ImportTokenModal.jsx** (1 changement)
   - Défaut `verification_status: 'none'`

4. ✅ **FarmStatusActions.jsx** (3 changements)
   - Cas 1 : `'deleted'` au lieu de `'pending_deletion'`
   - Cas 3 : Action `'none'` au lieu de `'unverified'`
   - Cas 5 : Condition `'none'`

### Pages (5 fichiers)
5. ✅ **ManageFarmPage.jsx** (5 changements)
   - Lignes 690, 721 : Défaut `'none'`
   - Ligne 955 : Condition `'none'` au lieu de `'unverified'`
   - Lignes 1017, 1177 : `'deleted'` au lieu de `'pending_deletion'`

6. ✅ **AdminVerificationPage.jsx** (7 changements)
   - State `unreadCounts` : `none` au lieu de `unverified`
   - Filtres : `'none'` au lieu de `'unverified'`
   - Tab "Sans Badge" au lieu de "Non Vérifié"
   - Action suspension : `'none'`

7. ✅ **DirectoryPage.jsx** (2 changements)
   - Commentaire mis à jour
   - Classe CSS `none` au lieu de `unverified`

8. ✅ **CompleteTokenImportPage.jsx** (1 changement)
   - `verification_status: 'none'`

9. ✅ **ManageTokenPage.jsx** (6 changements)
   - Toutes occurrences `'unverified'` → `'none'`
   - `'pending_deletion'` → `'deleted'`

### Hooks (1 fichier)
10. ✅ **useFarmStatus.js** (2 changements)
    - Condition `'deleted'` au lieu de `'pending_deletion'`
    - Case `'none'` au lieu de `'unverified'`

---

## 🗄️ Migration Base de Données

**Fichier**: [migrations/2025-12-13_simplification_statuts.sql](../migrations/2025-12-13_simplification_statuts.sql)

### Actions SQL
```sql
-- Vérification_status
UPDATE farms SET verification_status = 'none' WHERE verification_status = 'unverified';

-- Status
UPDATE farms SET status = 'deleted' WHERE status = 'pending_deletion';
UPDATE farms SET status = 'suspended' WHERE status = 'hidden';

-- Colonnes
ALTER TABLE farms ADD COLUMN suspended_at TIMESTAMPTZ;
ALTER TABLE farms ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE farms ADD COLUMN suspension_reason TEXT;

-- Contraintes
ALTER TABLE farms ADD CONSTRAINT farms_status_check 
CHECK (status IN ('draft', 'active', 'suspended', 'banned', 'deleted'));

ALTER TABLE farms ADD CONSTRAINT farms_verification_status_check 
CHECK (verification_status IN ('none', 'pending', 'info_requested', 'verified', 'rejected'));
```

---

## 🎯 Nouvelle Logique de Visibilité

### Annuaire Public (DirectoryPage)
```javascript
// Affiche TOUTES les fermes avec status = 'active'
// Peu importe leur verification_status (none, pending, verified, etc.)
const farms = await FarmService.getVerifiedFarms(); // Filtre status='active'
```

### Badge de Vérification
| `verification_status` | Badge affiché | Visible annuaire ? |
|-----------------------|---------------|-------------------|
| `none` | Aucun badge | ✅ Oui (si active) |
| `pending` | ⏳ (admin seulement) | ✅ Oui (si active) |
| `info_requested` | 💬 (admin seulement) | ✅ Oui (si active) |
| `verified` | ✅ Vérifié | ✅ Oui (si active) |
| `rejected` | ❌ (admin seulement) | ✅ Oui (si active) |

### Visibilité selon Status
| `status` | Visible annuaire | Modifiable | Description |
|----------|------------------|------------|-------------|
| `draft` | ❌ | ✅ | Brouillon utilisateur |
| `active` | ✅ | ✅ | Public |
| `suspended` | ❌ | ❌ | Masqué par admin |
| `banned` | ❌ | ❌ | Bloqué définitif |
| `deleted` | ❌ | ❌ | Supprimé |

---

## ✅ Tests de Validation

### Scénarios à tester

#### 1. Création de ferme
- [ ] Nouvelle ferme a `status = 'active'` et `verification_status = 'none'`
- [ ] Ferme visible dans annuaire SANS badge ✅
- [ ] Créateur voit son profil et peut modifier

#### 2. Demande de vérification
- [ ] Bouton "Demander vérification" accessible
- [ ] Change `verification_status` à `'pending'`
- [ ] Admin voit dans onglet "En Attente"
- [ ] Ferme reste visible dans annuaire

#### 3. Admin valide
- [ ] Change `verification_status` à `'verified'`
- [ ] Badge ✅ apparaît dans annuaire
- [ ] Badge visible dans profil créateur

#### 4. Admin retire badge
- [ ] Change `verification_status` à `'none'`
- [ ] Badge ✅ disparaît
- [ ] Ferme reste visible (status toujours `'active'`)

#### 5. Admin suspend
- [ ] Change `status` à `'suspended'`
- [ ] Ferme disparaît de l'annuaire
- [ ] Admin peut réactiver (status → `'active'`)

#### 6. Utilisateur supprime
- [ ] Change `status` à `'deleted'`
- [ ] `deleted_at` timestamp enregistré
- [ ] Ferme disparaît de l'annuaire
- [ ] Compteur 7 jours avant suppression définitive

#### 7. Annuaire public
- [ ] Affiche fermes avec `status = 'active'` uniquement
- [ ] Badge ✅ seulement si `verification_status = 'verified'`
- [ ] Fermes `none` visibles SANS badge
- [ ] Filtre de recherche fonctionne

---

## 🔍 Points de Vigilance

### ⚠️ Changements comportementaux

**AVANT** : Seules les fermes `verified = true` étaient visibles dans l'annuaire  
**APRÈS** : Toutes les fermes `status = 'active'` sont visibles (avec ou sans badge)

### ✅ Avantages
- ✅ Fermes non vérifiées peuvent être découvertes
- ✅ Processus de vérification plus transparent
- ✅ Pas de "période invisible" après création
- ✅ Badge ✅ devient un signe de confiance, pas un prérequis

### ⚠️ Risques
- ⚠️ Fermes sans badge visibles (peut créer confusion)
- ⚠️ Nécessite modération plus active
- ⚠️ Utilisateurs doivent comprendre la différence badge/pas badge

### 💡 Solutions
- 💡 Message d'info dans annuaire : "Les fermes sans badge ✅ ne sont pas vérifiées"
- 💡 Filtres : "Vérifiées uniquement" / "Toutes"
- 💡 Tri par défaut : Fermes vérifiées en premier

---

## 📚 Documentation Mise à Jour

### Fichiers de documentation
- ✅ [BADGES_ET_STATUTS.md](BADGES_ET_STATUTS.md) - Documentation complète des badges
- ✅ [MIGRATION_STATUTS.md](MIGRATION_STATUTS.md) - Plan de migration détaillé
- ✅ Cette synthèse

### À mettre à jour
- [ ] README.md principal
- [ ] Guide utilisateur (si existe)
- [ ] Documentation admin

---

## 🚀 Déploiement

### Ordre des opérations
1. ✅ **Code** : Tous les fichiers JS/JSX mis à jour
2. 🔄 **Base de données** : Exécuter `2025-12-13_simplification_statuts.sql`
3. 🔄 **Tests** : Valider les 7 scénarios ci-dessus
4. 🔄 **Communication** : Informer les utilisateurs du changement

### Checklist déploiement
- [ ] Backup de la base de données
- [ ] Exécuter migration SQL
- [ ] Vérifier logs de migration (compteurs)
- [ ] Tester création nouvelle ferme
- [ ] Tester annuaire (fermes visibles)
- [ ] Tester admin (onglets fonctionnels)
- [ ] Valider badges affichés correctement

---

## 🛟 Rollback

En cas de problème, exécuter :

```sql
-- Rollback verification_status
UPDATE farms SET verification_status = 'unverified' WHERE verification_status = 'none';

-- Rollback status
UPDATE farms SET status = 'pending_deletion' WHERE status = 'deleted';
UPDATE farms SET status = 'hidden' WHERE status = 'suspended';

-- Restaurer contraintes anciennes
ALTER TABLE farms DROP CONSTRAINT farms_status_check;
ALTER TABLE farms ADD CONSTRAINT farms_status_check 
CHECK (status IN ('active', 'hidden', 'banned', 'pending_deletion'));

ALTER TABLE farms DROP CONSTRAINT farms_verification_status_check;
ALTER TABLE farms ADD CONSTRAINT farms_verification_status_check 
CHECK (verification_status IN ('unverified', 'pending', 'info_requested', 'verified', 'rejected'));
```

Puis redéployer le code de la version précédente.

---

## 📞 Support

En cas de questions ou problèmes :
- Consulter [BADGES_ET_STATUTS.md](BADGES_ET_STATUTS.md)
- Vérifier logs SQL de migration
- Tester en local avant production

---

**Statut** : ✅ Code mis à jour, prêt pour migration SQL  
**Dernière mise à jour** : 13 décembre 2025
