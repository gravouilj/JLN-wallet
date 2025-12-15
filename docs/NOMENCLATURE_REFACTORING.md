# REFACTORING NOMENCLATURE - Plan de Renommage

Date: 15 décembre 2025
Statut: **Proposition** - En attente de validation

---

## 🔍 ANALYSE DE LA SITUATION ACTUELLE

### Confusion identifiée

**WalletDashboard.jsx** (1021 lignes)
- **Nom actuel** : WalletDashboard
- **Usage réel** : Dashboard CLIENT pour gérer son portefeuille personnel
- **Fonctionnalités** :
  - Scan automatique des tokens détenus
  - Réception/envoi de tokens
  - Consultation soldes
  - Favoris
  - Hub de navigation vers tokens
- **Utilisateurs** : CLIENTS (détenteurs de tokens)
- **Route** : `/wallet`

**TokenDetailsPage.jsx** (2585 lignes)
- **Nom actuel** : TokenDetailsPage
- **Usage réel** : Dashboard CRÉATEUR pour gérer son token
- **Fonctionnalités** :
  - Envoi de tokens
  - Airdrop (equal/prorata)
  - Mint/Burn (si créateur)
  - Édition objectifs/contreparties
  - Visibilité dans l'annuaire
  - Historique transactions
- **Utilisateurs** : CRÉATEURS (propriétaires de tokens)
- **Route** : `/token/:tokenId`

### Problème

La nomenclature actuelle ne reflète pas clairement la distinction CLIENT vs CRÉATEUR, ce qui rend la maintenance et l'évolution du code confuses.

---

## 🎯 PROPOSITION DE RENOMMAGE

### Option A : Renommage explicite Client/Creator

| Fichier actuel | Nouveau nom | Justification |
|---------------|-------------|---------------|
| `WalletDashboard.jsx` | `ClientDashboard.jsx` | Indique clairement l'usage CLIENT |
| `TokenDetailsPage.jsx` | `CreatorDashboard.jsx` | Indique clairement l'usage CRÉATEUR |

**Avantages** :
- ✅ Distinction CLIENT/CRÉATEUR immédiate
- ✅ Alignement avec AdminDashboard (cohérence)
- ✅ Facilite la communication dans l'équipe

**Inconvénients** :
- ⚠️ "Dashboard" pour les deux peut créer une confusion
- ⚠️ TokenDetailsPage était plus descriptif de la fonctionnalité

---

### Option B : Renommage fonctionnel

| Fichier actuel | Nouveau nom | Justification |
|---------------|-------------|---------------|
| `WalletDashboard.jsx` | `MyTokensPage.jsx` | Focus sur "mes tokens" |
| `TokenDetailsPage.jsx` | `TokenManagementPage.jsx` | Focus sur la gestion du token |

**Avantages** :
- ✅ Noms descriptifs de la fonction
- ✅ Évite le terme "Dashboard" en doublon
- ✅ Plus intuitif pour les développeurs

**Inconvénients** :
- ⚠️ Ne met pas explicitement en avant la distinction CLIENT/CRÉATEUR
- ⚠️ "MyTokens" peut être ambigu (mes tokens créés ou détenus ?)

---

### Option C : Hybride (RECOMMANDÉ ⭐)

| Fichier actuel | Nouveau nom | Justification |
|---------------|-------------|---------------|
| `WalletDashboard.jsx` | `ClientWalletPage.jsx` | Combine CLIENT + fonction (wallet) |
| `TokenDetailsPage.jsx` | `CreatorTokenPage.jsx` | Combine CRÉATEUR + entité (token) |

**Avantages** :
- ✅ Distinction CLIENT/CRÉATEUR claire
- ✅ Fonction/entité identifiable
- ✅ Cohérence avec les conventions existantes (AdminVerificationPage, ManageFarmPage)
- ✅ Évite le terme "Dashboard" en doublon

**Inconvénients** :
- ⚠️ Légèrement plus long (mais plus clair)

---

## 📋 PLAN D'IMPLÉMENTATION (Option C)

### Étape 1 : Renommer les fichiers

```bash
# WalletDashboard → ClientWalletPage
mv src/pages/WalletDashboard.jsx src/pages/ClientWalletPage.jsx

# TokenDetailsPage → CreatorTokenPage
mv src/pages/TokenDetailsPage.jsx src/pages/CreatorTokenPage.jsx
```

### Étape 2 : Mettre à jour les imports dans App.jsx

**Avant** :
```jsx
import WalletDashboard from './pages/WalletDashboard';
import TokenDetailsPage from './pages/TokenDetailsPage';
```

**Après** :
```jsx
import ClientWalletPage from './pages/ClientWalletPage';
import CreatorTokenPage from './pages/CreatorTokenPage';
```

### Étape 3 : Mettre à jour les composants dans App.jsx

**Avant** :
```jsx
<Route path="/wallet" element={<WalletDashboard />} />
<Route path="/token/:tokenId" element={<TokenDetailsPage />} />
```

**Après** :
```jsx
<Route path="/wallet" element={<ClientWalletPage />} />
<Route path="/token/:tokenId" element={<CreatorTokenPage />} />
```

### Étape 4 : Mettre à jour les exports dans les fichiers

**ClientWalletPage.jsx** (ligne ~1020) :
```jsx
// Avant
export default WalletDashboard;

// Après
export default ClientWalletPage;
```

**CreatorTokenPage.jsx** (ligne ~2584) :
```jsx
// Avant
export default TokenDetailsPage;

// Après
export default CreatorTokenPage;
```

### Étape 5 : Mettre à jour les déclarations de composants

**ClientWalletPage.jsx** (ligne ~22) :
```jsx
// Avant
const WalletDashboard = () => {

// Après
const ClientWalletPage = () => {
```

**CreatorTokenPage.jsx** (ligne ~17) :
```jsx
// Avant
const TokenDetailsPage = () => {

// Après
const CreatorTokenPage = () => {
```

### Étape 6 : Rechercher d'autres références

Rechercher dans tout le codebase :
- `WalletDashboard` (composant, import, navigation)
- `TokenDetailsPage` (composant, import, navigation)

Commandes :
```bash
grep -r "WalletDashboard" src/
grep -r "TokenDetailsPage" src/
```

---

## 🔄 IMPACT SUR LA DOCUMENTATION

### Documents à mettre à jour

1. **docs/UX_REFACTORING_PLAN.md**
   - Section Phase 2 : Remplacer "WalletDashboard" par "ClientWalletPage"
   - Clarifier que les améliorations Phase 2 concernent les CRÉATEURS (CreatorTokenPage)

2. **docs/PHASE_1_ADMIN_DASHBOARD_COMPLETE.md**
   - Section Phase 2 : Corriger le nom du composant cible

3. **README.md** (si mention des pages)
   - Mettre à jour la documentation des routes

4. **DOCUMENTATION_INDEX.md** (si existant)
   - Mettre à jour la liste des composants

---

## 🎨 IMPACT SUR LA PHASE 2

### Clarification des objectifs Phase 2

**AVANT** (confusion) :
- "Améliorer WalletDashboard" → On pensait au dashboard CLIENT

**APRÈS** (clair) :
- **ClientWalletPage** : Dashboard pour les CLIENTS
  - Améliorations : NotificationBell, indicateur statut profil (si ils sont créateurs)
  
- **CreatorTokenPage** : Dashboard pour les CRÉATEURS
  - Améliorations : CreateTokenModal, CreateProfileModal, ImportTokenModal, NetworkFeesAvail
  - C'est ICI que doivent se concentrer les améliorations Phase 2

### Nouveaux objectifs Phase 2 clarifiés

**A. Améliorations CreatorTokenPage** (priorité haute) :
1. **CreateTokenModal.jsx** - Wizard création token (5 étapes)
2. **CreateProfileModal.jsx** - Wizard création profil (5 étapes)
3. **ImportTokenModal.jsx** - Refactoring import token
4. **NetworkFeesAvail.jsx** - Card frais réseau disponibles
5. **CreatorTokenPage.jsx** - Ajout header avec :
   - Indicateur statut profil (vérifié/pending/etc.)
   - Bouton accès ManageFarmPage
   - Solde XEC pour frais
   - Lien vers FAQ créateurs

**B. Améliorations ClientWalletPage** (priorité basse - future) :
1. **NotificationBell.jsx** - Indicateur notifications
2. Amélioration scan performance
3. Filtres avancés tokens
4. Export historique transactions

---

## ✅ CHECKLIST REFACTORING

- [ ] Valider l'Option C avec l'équipe
- [ ] Créer une branche `refactor/nomenclature`
- [ ] Renommer WalletDashboard.jsx → ClientWalletPage.jsx
- [ ] Renommer TokenDetailsPage.jsx → CreatorTokenPage.jsx
- [ ] Mettre à jour App.jsx (imports + routes)
- [ ] Mettre à jour exports dans les fichiers
- [ ] Mettre à jour déclarations composants
- [ ] Rechercher autres références dans le codebase
- [ ] Tester routes `/wallet` et `/token/:tokenId`
- [ ] Mettre à jour documentation (UX_REFACTORING_PLAN.md, PHASE_1_COMPLETE.md)
- [ ] Commit avec message descriptif
- [ ] Merger dans main
- [ ] Continuer avec Phase 2 (améliorations CreatorTokenPage)

---

## 🎯 VOTE / DÉCISION

**Quelle option préférez-vous ?**

- [ ] **Option A** : ClientDashboard + CreatorDashboard
- [ ] **Option B** : MyTokensPage + TokenManagementPage
- [x] **Option C** : ClientWalletPage + CreatorTokenPage (RECOMMANDÉ)
- [ ] **Option D** : Autre proposition (préciser)

---

## 📝 NOTES

- Le renommage ne change pas les routes (`/wallet`, `/token/:tokenId`)
- Le renommage ne change pas la logique métier
- C'est uniquement une amélioration de la lisibilité du code
- Impact : ~10 lignes de code à modifier (imports + exports)
- Temps estimé : 15-20 minutes
- Risque : Très faible (changements localisés)

---

**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Date** : 15 décembre 2025  
**Version** : 1.0  
**Status** : ⏳ En attente de validation
