# Migration Farm → Profil : Plan de Correction

## État actuel

L'utilisateur a renommé manuellement dans la DB et certains fichiers :
- `farms` → `profiles` (table Supabase)
- `farmer` → `creator` (terminologie)
- Fichiers renommés : `farmService.js` → `profilService.js`, `useFarms.js` → `useProfiles.js`

## Problèmes identifiés

1. **Incohérence dans les requêtes Supabase** :
   - Certains fichiers utilisent `.from('profils')` (français)
   - D'autres utilisent `.from('profiles')` (anglais)
   - La table DB s'appelle `profiles` (anglais)

2. **Exports et imports incompatibles** :
   - Le code importe `FarmService` mais le fichier exporte `ProfilService`
   - Le code importe `useFarms` mais le fichier exporte `useProfiles`

## Solutions appliquées

### 1. Aliases de compatibilité
✅ Ajouté dans `profilService.js` :
```javascript
export const FarmService = ProfilService;
export const farmService = ProfilService;
export const profilService = ProfilService;
export default ProfilService;
```

✅ Ajouté dans `useProfiles.js` :
```javascript
export const useFarms = () => {
  const { profiles, loading, error, refreshProfiles } = useProfiles();
  return {
    farms: profiles,
    loading,
    error,
    refreshFarms: refreshProfiles
  };
};
```

### 2. Corrections des requêtes Supabase

#### Fichiers à corriger dans `profilService.js` :
- [x] Ligne 11 : `.from('profils')` → `.from('profiles')`
- [x] Ligne 56 : `.from('profils')` → `.from('profiles')`
- [x] Ligne 85 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 289 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 356 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 382 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 411 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 424 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 436 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 461 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 478 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 506 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 526 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 555 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 845 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 870 : `.from('profils')` → `.from('profiles')`
- [ ] Ligne 892 : `.from('profils')` → `.from('profiles')`

#### Autres fichiers :
- [x] ManageTokenPage.jsx ligne 60 et 989
- [x] NotificationBell.jsx ligne 57

### 3. Tables liées à renommer

#### Tables qui doivent rester cohérentes :
- `profil_reports` (français) ou `profile_reports` (anglais) ?
  - Actuellement mélangé dans le code
  - Recommandation : **`profile_reports`** (standard anglais)

#### Occurrences à vérifier :
- `profil_reports` utilisé dans profilService.js (lignes 492, 590, 610, 668, 685, 707, 723, 912)
- `profile_reports` utilisé dans useProfileStatus.js (ligne 247)

## Prochaines étapes

1. ✅ Terminer le remplacement de `.from('profils')` → `.from('profiles')` dans profilService.js
2. ⏳ Décider : `profil_reports` ou `profile_reports` ?
3. ⏳ Vérifier que la table `profiles` existe bien dans Supabase
4. ⏳ Relancer l'application et tester
