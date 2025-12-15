# Refactoring - Architecture des jetons côté créateur

## ✅ Corrections appliquées

### Architecture unifiée des données

**Source unique de vérité** : `farms.tokens[]` dans Supabase avec structure :
```json
{
  "tokenId": "...",
  "ticker": "...",
  "purpose": "...",
  "counterpart": "...",
  "image": "...",
  "isVisible": true,      // Visibilité dans l'annuaire public
  "isLinked": true        // Lié au profil (false = exclu de la vérification)
}
```

### Pages et leur rôle (clarifiés)

#### 1. ManageTokenPage (`/manage-token`)
**Rôle** : Page d'accueil créateur - Vue d'ensemble de tous mes jetons
**Données affichées** :
- ✅ Liste complète des jetons (avec et sans mint baton)
- ✅ TokenCard pour chaque jeton avec :
  - Image, nom, ticker
  - Nombre de détenteurs (depuis blockchain)
  - Solde actuel
  - Switches **isVisible** et **isLinked** (si token Farm-Wallet)
  - Bouton "Gérer" → redirige vers CreatorTokenPage

**Données chargées** :
- Blockchain : `name`, `ticker`, `balance`, `decimals`, `isVariable`, `holdersCount`
- Supabase (myFarm.tokens) : `isVisible`, `isLinked`, `purpose`, `counterpart`, `image`

**Modifications apportées** :
- ✅ Ajout de `isVisible` et `isLinked` depuis `tokenDetails` (myFarm.tokens)
- ✅ Callback `onUpdate` recharge ma ferme et met à jour l'affichage local
- ✅ Synchronisation parfaite avec TokenLinked et TokenVisible

#### 2. ManageProfilePage > TokensListTab (`/manage-farm` onglet Jetons)
**Rôle** : Gestion des jetons liés au profil de ferme
**Données affichées** :
- ✅ Tableau filtré : affiche uniquement `isLinked !== false`
- ✅ Colonnes : Jeton, Ticker, Détenteurs, Type (Variable/Fixe), Visible, Lié au profil
- ✅ Toggle inline pour `isVisible` et `isLinked`

**Données chargées** :
- Blockchain : `name`, `ticker`, `holdersCount`, `isVariable`
- Supabase : `isVisible`, `isLinked`

**Modifications apportées** :
- ✅ Chargement de `isVariable` depuis `mintBatonVout`
- ✅ Filtrage par `isLinked !== false`
- ✅ Utilisation de `FarmService.updateTokenMetadata` via `handleToggleVisibility`

#### 3. CreatorTokenPage (`/token/:tokenId`)
**Rôle** : Page détaillée d'un jeton spécifique
**Données affichées** :
- ✅ Toutes les informations du jeton
- ✅ Onglets : Send, Airdrop, Mint, Burn
- ✅ Historique des transactions
- ✅ Édition image, purpose, counterpart
- ⚠️ **PAS de switches isVisible/isLinked** (gestion via les 2 autres pages)

### Service centralisé (uniformisé)

**FarmService.updateTokenMetadata(ownerAddress, tokenId, metadata)** :
- ✅ Gère `isVisible`, `isLinked`, `purpose`, `counterpart`, `image`
- ✅ Met à jour Supabase de manière atomique
- ✅ Préserve les autres champs du token

**Composants utilisant le service** :
- ✅ `TokenLinked.jsx` - Switch pour isLinked
- ✅ `TokenVisible.jsx` - Switch pour isVisible  
- ✅ `ManageProfilePage` - Via `handleToggleVisibility`
- ✅ `CreatorTokenPage` - Via `handleToggleVisibility` (isVisible uniquement)

### Synchronisation des données

**Flux de mise à jour** :
1. Utilisateur clique sur switch (isVisible ou isLinked)
2. `FarmService.updateTokenMetadata()` met à jour Supabase
3. Callback `onUpdate` déclenché
4. Rechargement de `myFarm` depuis Supabase
5. Mise à jour de l'état local (`setTokens` avec les nouvelles valeurs)
6. React re-render avec les données à jour

**Props synchronisées** :
- ✅ `TokenLinked` et `TokenVisible` utilisent `useEffect` pour réagir aux changements de props
- ✅ `TokenCard` passe les bonnes valeurs à ses composants enfants
- ✅ Pas de notification affichée lors des toggles (seulement logs console)

### Résumé des corrections

| Problème identifié | Solution appliquée |
|---------------------|-------------------|
| isLinked/isVisible non chargés dans ManageTokenPage | ✅ Ajout depuis tokenDetails (myFarm.tokens) |
| Callback onUpdate ne fait rien | ✅ Recharge myFarm et met à jour state local |
| Type de jeton incorrect | ✅ Détection via mintBatonVout |
| Pas de synchronisation entre pages | ✅ FarmService + useEffect dans composants |
| Notifications intempestives | ✅ Supprimées (sauf erreurs) |
| TokenDetails non récupéré | ✅ Recherche dans myFarm.tokens[] |

## Architecture finale

```
ManageTokenPage
  └── TokenCard (pour chaque jeton)
      ├── TokenVisible (si isFromFarmWallet)
      └── TokenLinked (si isFromFarmWallet)
          └── FarmService.updateTokenMetadata()
              └── Supabase farms.tokens[]

ManageProfilePage
  └── TokensListTab
      └── VisibilityToggle (inline dans tableau)
          └── handleToggleVisibility()
              └── FarmService.updateTokenMetadata()
                  └── Supabase farms.tokens[]

CreatorTokenPage
  └── Onglets de gestion (Send, Airdrop, Mint, Burn)
      └── PAS de switches isVisible/isLinked
```

## Cohérence assurée

✅ **Données** : Source unique (Supabase) + enrichissement blockchain  
✅ **Affichage** : Chaque page a un rôle clair et des données appropriées  
✅ **Modifications** : Toutes passent par FarmService.updateTokenMetadata  
✅ **Synchronisation** : useEffect + callbacks pour propagation immédiate  
✅ **UX** : Pas de notifications intempestives, feedback visuel direct
