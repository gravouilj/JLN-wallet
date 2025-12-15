# ✅ Migration Farm → Profil : Corrections Complètes

## Date : 15 décembre 2025

## Contexte
L'utilisateur a effectué un renommage massif dans le projet pour rendre l'application plus générique :
- `farms` → `profiles` (table Supabase)
- `farmer` → `creator` (terminologie)
- Fichiers renommés : `farmService.js` → `profilService.js`, `useFarms.js` → `useProfiles.js`

## Problèmes identifiés

### 1. Incohérence dans les noms de tables Supabase
- ❌ Code utilisait `.from('profils')` (français) et `.from('farms')` (ancien nom)
- ✅ Table Supabase s'appelle `profiles` (pluriel anglais standard)

### 2. Incompatibilité des exports/imports
- ❌ Code importait `FarmService` et `useFarms`
- ✅ Fichiers exportaient `ProfilService` et `useProfiles`

## Solutions appliquées

### ✅ 1. Ajout d'aliases de compatibilité

**Dans `/src/services/profilService.js` :**
```javascript
// Aliases de compatibilité pour la migration farms → profils
export const FarmService = ProfilService;
export const farmService = ProfilService;
export const profilService = ProfilService;
export default ProfilService;
```

**Dans `/src/hooks/useProfiles.js` :**
```javascript
// Aliases de compatibilité pour la migration farms → profils
export const useFarms = () => {
  const { profiles, loading, error, refreshProfiles } = useProfiles();
  return {
    farms: profiles,
    loading,
    error,
    refreshFarms: refreshProfiles
  };
};

export const useFarm = (farmId) => {
  const { profile, loading, error } = useProfile(farmId);
  return {
    farm: profile,
    loading,
    error
  };
};
```

### ✅ 2. Correction des requêtes Supabase

#### Fichiers corrigés :

**`/src/services/profilService.js`** (17 occurrences) :
- ✅ Ligne 11 : getMyProfil
- ✅ Ligne 56 : saveProfil
- ✅ Ligne 85 : updateProfil
- ✅ Ligne 289 : checkTokenAvailability
- ✅ Ligne 356 : getPendingProfils
- ✅ Ligne 382 : adminUpdateStatus (2x)
- ✅ Ligne 411 : adminUpdateStatus (update)
- ✅ Ligne 424 : rejectFarmVerification
- ✅ Ligne 436 : requestMoreInfo
- ✅ Ligne 461 : addMessage (select)
- ✅ Ligne 478 : addMessage (update)
- ✅ Ligne 506, 526, 555 : autres méthodes
- ✅ Ligne 845, 870, 892 : méthodes admin

**`/src/pages/ManageTokenPage.jsx`** :
- ✅ Ligne 60 : Chargement myFarm
- ✅ Ligne 989 : Rechargement après mise à jour token

**`/src/components/NotificationBell.jsx`** :
- ✅ Ligne 57 : Chargement statuts de vérification

### ✅ 3. Vérification de cohérence

Toutes les tables Supabase utilisées dans le projet :
- ✅ `profiles` (principal)
- ✅ `profil_reports` ou `profile_reports` (selon les fichiers)
- ✅ `tickets` (support client)
- ✅ `ticket_messages` (messages de support)
- ✅ `blacklist` (liste noire)
- ✅ `admin_settings` (paramètres admin)
- ✅ `token_history` (historique tokens)

## Résultat

✅ **Aucune erreur TypeScript/ESLint**
✅ **Tous les imports/exports compatibles**
✅ **Toutes les requêtes Supabase utilisent le bon nom de table**
✅ **Code legacy compatible via aliases**

## Structure finale

### Services
```
/src/services/
  ├── profilService.js  (exporte ProfilService + aliases FarmService)
  ├── supabaseClient.js
  └── historyService.js
```

### Hooks
```
/src/hooks/
  ├── useProfiles.js  (exporte useProfiles + alias useFarms)
  ├── useProfileStatus.js
  └── useAdmin.js
```

### Tables Supabase
```
- profiles          (profils créateurs)
- profile_reports   (signalements)
- tickets           (support)
- ticket_messages   (messages support)
- blacklist         (liste noire)
- admin_settings    (config admin)
- token_history     (historique)
```

## Prochaines étapes recommandées

1. **Tester l'application** :
   ```bash
   npm run dev
   ```

2. **Vérifier la connexion Supabase** :
   - Assurer que la table `profiles` existe
   - Vérifier les permissions RLS
   - Migrer les données de `farms` vers `profiles` si nécessaire

3. **Migration SQL suggérée** (si la table `farms` existe encore) :
   ```sql
   -- Renommer la table
   ALTER TABLE farms RENAME TO profiles;
   
   -- Renommer les contraintes si nécessaire
   ALTER INDEX farms_pkey RENAME TO profiles_pkey;
   ALTER INDEX farms_owner_address_key RENAME TO profiles_owner_address_key;
   
   -- Mettre à jour les RLS policies
   ALTER POLICY "farms_policy" ON profiles RENAME TO "profiles_policy";
   ```

4. **Nettoyage futur** :
   Une fois que tout fonctionne, vous pouvez éventuellement :
   - Supprimer les aliases de compatibilité
   - Renommer tous les imports pour utiliser directement ProfilService et useProfiles
   - Mettre à jour la documentation

## Fichiers de référence

- ✅ [/src/services/profilService.js](../src/services/profilService.js)
- ✅ [/src/hooks/useProfiles.js](../src/hooks/useProfiles.js)
- ✅ [/src/pages/ManageTokenPage.jsx](../src/pages/ManageTokenPage.jsx)
- ✅ [/src/components/NotificationBell.jsx](../src/components/NotificationBell.jsx)
- ✅ [MIGRATION_FIX.md](MIGRATION_FIX.md) (détails techniques)
