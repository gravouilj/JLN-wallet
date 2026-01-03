# Corrections de l'affichage des jetons

## Date : 2024

## Problèmes identifiés et corrigés

### 1. Nombre de détenteurs incorrect dans ManageTokenPage ✅

**Problème** : Le nombre de détenteurs (holdersCount) n'était pas affiché correctement dans les TokenCard.

**Cause** : 
- TokenCard utilisait `token.holderCount` (singulier) au lieu de `token.holdersCount` (pluriel)
- ManageTokenPage ne calculait pas le holdersCount pour les tokens avec mint baton

**Correction** :
- ✅ Modifié TokenCard.jsx pour utiliser `token.holdersCount`
- ✅ Ajouté le calcul de `holdersCount` dans ManageTokenPage.jsx via `wallet.calculateAirdropHolders()`
- ✅ Passé `holdersCount` dans l'objet token retourné

**Fichiers modifiés** :
- `/src/components/TokenPage/TokenCard.jsx` (ligne ~28)
- `/src/pages/ManageTokenPage.jsx` (lignes ~249-256 et ~317)

---

### 2. Switches isLinked et isVisible n'apparaissent pas dans ManageTokenPage ⚠️

**Problème** : Les switches ne s'affichaient pas pour les tokens dans ManageTokenPage.

**Condition actuelle** :
```jsx
showLinkedToggle={!!myFarm && token.isFromFarmWallet === true}
showVisibleToggle={!!myFarm && token.isFromFarmWallet === true}
```

**Vérifications à faire** :
1. `myFarm` est-il bien chargé ? → Oui, chargé depuis Supabase
2. `token.isFromFarmWallet` est-il `true` ? → À vérifier dans la console

**Debug recommandé** :
```javascript
console.log('🔍 Debug TokenCard:', {
  hasFarm: !!myFarm,
  isFromFarmWallet: token.isFromFarmWallet,
  showToggles: !!myFarm && token.isFromFarmWallet === true
});
```

**Fichier** : `/src/pages/ManageTokenPage.jsx` (ligne ~972-973)

---

### 3. isLinked false doit désactiver isVisible ✅

**Problème** : Un jeton non lié au profil (`isLinked = false`) devrait avoir son toggle `isVisible` désactivé, car il n'a pas de sens de rendre visible un jeton non lié.

**Correction** :
- ✅ Ajouté `canToggleVisible` dans TokenCard : `token.isLinked !== false`
- ✅ Passé le prop `disabled` à TokenVisible
- ✅ Modifié TokenVisible.jsx pour accepter et gérer le paramètre `disabled`
- ✅ Ajouté un message explicatif : "Désactivé (jeton non lié au profil)"
- ✅ Réduit l'opacité à 0.6 quand disabled

**Fichiers modifiés** :
- `/src/components/TokenPage/TokenCard.jsx` (ligne ~37 et ~142)
- `/src/components/TokenPage/TokenVisible.jsx` (ligne ~10, ~52-54, ~69)

---

### 4. Colonne "Type" dans TokensListTab affiche incorrectement Variable/Fixe ⚠️

**Problème signalé** : "un jeton est variable et non fixe" mais la colonne Type affiche "Fixe".

**Détection actuelle** :
```javascript
// Dans ManageProfilePage.jsx, ligne ~218
const isVariable = tokenInfo?.genesisInfo?.mintBatonVout !== undefined 
                && tokenInfo?.genesisInfo?.mintBatonVout !== null;
```

**Affichage dans TokensListTab** :
```jsx
<Badge variant={token.isVariable ? 'success' : 'secondary'}>
  {token.isVariable ? '🔄 Variable' : '🔒 Fixe'}
</Badge>
```

**Points de vérification** :
1. ✅ Le code de détection est correct
2. ⚠️ Vérifier que `wallet.getTokenInfo()` retourne bien `genesisInfo.mintBatonVout`
3. ⚠️ Vérifier les logs console : `✅ Jeton XXX chargé: ..., variable: true/false`

**Debug recommandé** :
- Ouvrir la console navigateur dans ManageProfilePage
- Vérifier les logs lors du chargement des jetons
- Chercher : `✅ Jeton [TICKER] chargé: ..., variable: [true/false]`

**Fichier** : `/src/pages/ManageProfilePage.jsx` (ligne ~218)

---

### 5. Amélioration de l'apparence des switches ✅

**Amélioration** : Les switches TokenVisible et TokenLinked ont maintenant un style cohérent avec TokensListTab.

**Modifications** :
- ✅ Ajouté `marginTop: '16px'` au conteneur des toggles dans TokenCard
- ✅ Icônes emoji pour chaque toggle : 👁️ (Visibilité) et 🔗 (Lié au profil)
- ✅ Labels descriptifs sous chaque switch
- ✅ Background `var(--bg-secondary)` et `borderRadius: '8px'`

**Fichier** : `/src/components/TokenPage/TokenCard.jsx` (ligne ~139-156)

---

## Structure des données Token

### Dans ManageProfilePage (TokensListTab)
```javascript
{
  tokenId: "...",
  tokenName: "...",
  ticker: "...",
  image: "...",
  purpose: "...",
  counterpart: "...",
  isVisible: true/false,
  isLinked: true/false,
  holdersCount: 123,
  isVariable: true/false,  // ← Basé sur mintBatonVout
  isComplete: true/false
}
```

### Dans ManageTokenPage (TokenCard)
```javascript
{
  tokenId: "...",
  name: "...",
  ticker: "...",
  image: "...",
  purpose: "...",
  counterpart: "...",
  balance: "...",
  holdersCount: 123,       // ← Calculé via calculateAirdropHolders
  isFromFarmWallet: true/false,
  isVisible: true/false,
  isLinked: true/false,
  hasMintBaton: true/false,
  isActive: true/false,
  isDeleted: true/false
}
```

---

## Tests recommandés

1. **Test holdersCount** :
   - [ ] Aller sur ManageTokenPage
   - [ ] Vérifier que les TokenCard affichent "👥 X détenteurs"
   - [ ] Les valeurs doivent être > 0 pour les jetons actifs

2. **Test switches** :
   - [ ] Aller sur ManageTokenPage
   - [ ] Vérifier que les switches 👁️ Visibilité et 🔗 Lié apparaissent
   - [ ] Tester le toggle de chaque switch
   - [ ] Vérifier que le changement se reflète dans ManageProfilePage > TokensListTab

3. **Test isLinked → isVisible** :
   - [ ] Dans ManageTokenPage, désactiver isLinked d'un jeton
   - [ ] Vérifier que le switch isVisible devient grisé avec opacité 0.6
   - [ ] Le message "Désactivé (jeton non lié au profil)" doit apparaître

4. **Test Type Variable/Fixe** :
   - [ ] Aller sur ManageProfilePage > Onglet Jetons
   - [ ] Ouvrir la console navigateur (F12)
   - [ ] Chercher les logs : `✅ Jeton [TICKER] chargé: ..., variable: [true/false]`
   - [ ] Vérifier que la colonne "Type" affiche correctement 🔄 Variable ou 🔒 Fixe
   - [ ] Comparer avec la présence d'un mint baton dans votre wallet

---

## Checklist finale

- [x] holdersCount utilise le bon nom de propriété
- [x] holdersCount est calculé dans ManageTokenPage
- [x] isLinked false désactive isVisible
- [x] TokenVisible accepte le paramètre disabled
- [x] Apparence des switches améliorée
- [ ] Vérifier que les switches apparaissent (à tester)
- [ ] Vérifier que le Type est correct (à tester avec logs)

---

## Notes techniques

### Flux de données pour isVisible/isLinked

1. **Source de vérité** : `farms.tokens[]` dans Supabase (JSONB)
2. **Service d'écriture** : `FarmService.updateTokenMetadata()`
3. **Composants de toggle** :
   - `TokenVisible.jsx` : Switch pour isVisible
   - `TokenLinked.jsx` : Switch pour isLinked
4. **Affichage** :
   - ManageTokenPage : TokenCard avec les deux switches
   - ManageProfilePage : TokensListTab avec VisibilityToggle pour chaque colonne

### Synchronisation

Quand un switch change dans ManageTokenPage :
1. TokenCard appelle `onUpdate(updatedToken)`
2. ManageTokenPage recharge myFarm depuis Supabase
3. Les tokens sont ré-enrichis avec les nouvelles valeurs
4. TokenCard reçoit les nouvelles props via useEffect

Quand un switch change dans ManageProfilePage :
1. handleToggleVisibility appelle FarmService.updateTokenMetadata
2. loadTokensWithStats() recharge les jetons enrichis
3. TokensListTab reçoit les nouvelles valeurs

---

## Prochaines étapes

Si les switches n'apparaissent toujours pas :
1. Vérifier les logs console pour `isFromFarmWallet`
2. Vérifier que `myFarm` n'est pas null
3. Ajouter des logs debug dans TokenCard pour voir les props reçues

Si le Type est incorrect :
1. Vérifier que `wallet.getTokenInfo()` retourne bien mintBatonVout
2. Vérifier les logs : `✅ Jeton [TICKER] chargé: ..., variable: [true/false]`
3. Comparer avec l'état réel du mint baton sur la blockchain
