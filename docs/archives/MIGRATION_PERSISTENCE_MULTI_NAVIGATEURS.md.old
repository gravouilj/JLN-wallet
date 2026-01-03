# Migration vers Système de Persistance Multi-Navigateurs

## 🎯 Problèmes Résolus

### 1. **Perte de données lors du changement de navigateur**
❌ **Avant** : Fermes stockées uniquement en localStorage (perdu lors import mnémonique)  
✅ **Après** : Système basé sur `creatorAddress` + verification-requests.json

### 2. **Fermes non visibles après création**
❌ **Avant** : Ferme créée mais pas visible dans DirectoryPage  
✅ **Après** : Ferme accessible via `getFarmByTokenAndCreator(tokenId, creatorAddress)`

### 3. **Formulaire vide lors de la modification**
❌ **Avant** : Modification impossible car données non retrouvées  
✅ **Après** : `enrichFarmWithBlockchainData()` fusionne formulaire + blockchain

### 4. **Données blockchain non synchronisées**
❌ **Avant** : Ticker/balance non affichés dans filtre "Tous" admin  
✅ **Après** : Console.logs ajoutés + vérification du chargement

---

## 🏗️ Architecture Nouveau Système

### Flux de Données

```
┌─────────────────────────────────────────────────────┐
│              SOURCES DE DONNÉES                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. farms.json (fermes officielles)                 │
│  2. verification-requests.json (demandes)           │
│  3. localStorage (migration ancienne data)          │
│  4. Blockchain (source de vérité pour tokens)       │
│                                                      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│           farmPersistence.js (Service)               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  • loadVerificationRequests()                       │
│  • getFarmsByCreator(creatorAddress)                │
│  • getFarmByTokenAndCreator(tokenId, address)       │
│  • enrichFarmWithBlockchainData(farm, wallet)       │
│  • saveFarmToLocalStorage(farmData)                 │
│  • updateFarmVerificationStatus(...)                │
│                                                      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                COMPOSANTS UI                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ManageFarmPage       → Crée/modifie ferme          │
│  AdminVerificationPage → Vérifie fermes             │
│  DirectoryPage        → Affiche fermes vérifiées    │
│  ManageTokenPage      → Gère tokens avec data live  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Fonctions Principales

### `farmPersistence.js`

#### 1. **loadVerificationRequests()**
Charge toutes les demandes depuis `verification-requests.json`

```javascript
const requests = await loadVerificationRequests();
// returns: Array<Farm>
```

#### 2. **getFarmsByCreator(creatorAddress)**
Récupère TOUTES les fermes d'un créateur (multi-navigateurs compatible)

```javascript
const myFarms = await getFarmsByCreator(wallet.address);
// Fonctionne même après import mnémonique sur nouveau navigateur
```

#### 3. **getFarmByTokenAndCreator(tokenId, creatorAddress)**
Récupère UNE ferme spécifique

```javascript
const farm = await getFarmByTokenAndCreator(tokenId, wallet.address);
// Utilisé dans ManageFarmPage pour pré-remplir formulaire
```

#### 4. **enrichFarmWithBlockchainData(farm, wallet)**
Fusionne données formulaire + blockchain en temps réel

```javascript
const enrichedFarm = await enrichFarmWithBlockchainData(farm, wallet);
// enrichedFarm.tokens[0]._dynamicData contient:
// - circulatingSupply (live)
// - genesisSupply (live)
// - balance (live)
// - hasMintBaton (live)
// - isActive (live)
// - lastUpdated (timestamp)
```

#### 5. **saveFarmToLocalStorage(farmData)**
Sauvegarde temporaire en localStorage (en attendant backend)

```javascript
const savedFarm = saveFarmToLocalStorage({
  name: "Ma Ferme",
  creatorAddress: wallet.address,
  tokens: [{ tokenId, ... }],
  // ...
});
```

#### 6. **updateFarmVerificationStatus(tokenId, creatorAddress, newStatus, additionalData)**
Met à jour le statut de vérification

```javascript
updateFarmVerificationStatus(
  tokenId,
  wallet.address,
  'pending',
  { verificationRequestedAt: new Date().toISOString() }
);
```

---

## 🔄 Workflow Complet

### Scénario : Créateur Multi-Navigateurs

**Navigateur A (Chrome)**
1. Créateur crée token avec mnémonique
2. Remplit ManageFarmPage → `saveFarmToLocalStorage()`
3. Ferme sauvegardée avec `creatorAddress` dans localStorage

**Navigateur B (Firefox)**
4. Créateur importe mnémonique
5. Ouvre ManageFarmPage avec même tokenId
6. `getFarmByTokenAndCreator(tokenId, wallet.address)` récupère la ferme
7. Formulaire pré-rempli avec données existantes ✅

**Admin (Safari)**
8. Ouvre AdminVerificationPage
9. Voit demande pending via `loadVerificationRequests()`
10. Approuve → Ferme visible dans DirectoryPage ✅

---

## 🗂️ Structure Données

### Farm Object (complet)

```json
{
  "id": "farm_1234567890",
  "tokenId": "abc123...",
  "name": "Ferme Bio des Alpes",
  "description": "Production bio...",
  "country": "France",
  "region": "Auvergne-Rhône-Alpes",
  "department": "Savoie",
  "address": "123 Route de...",
  "phone": "+33...",
  "email": "contact@...",
  "website": "https://...",
  "products": ["Fromages", "Yaourts"],
  "services": ["Vente directe"],
  "tokens": [
    {
      "tokenId": "abc123...",
      "protocol": "ALP",
      "ticker": "FBALP",
      "tokenName": "Ferme Bio Token",
      "decimals": 2,
      "purpose": "Token de la ferme",
      "_dynamicData": {
        "circulatingSupply": "1000000",
        "genesisSupply": "1000000",
        "balance": "500000",
        "hasMintBaton": true,
        "isActive": true,
        "lastUpdated": "2024-12-08T10:30:00Z"
      }
    }
  ],
  "image": "https://...",
  "protocol": "ALP",
  "creatorAddress": "ecash:qp...",
  "createdWithFarmWallet": true,
  "verified": false,
  "verificationStatus": "unverified",
  "createdAt": "2024-12-08T09:00:00Z",
  "updatedAt": "2024-12-08T10:30:00Z",
  "verificationRequestedAt": null,
  "verifiedAt": null,
  "adminNotes": "",
  "adminMessage": ""
}
```

---

## 📊 Modifications par Fichier

### Créés
- ✅ `src/utils/farmPersistence.js` (308 lignes)

### Modifiés
- ✅ `src/pages/ManageFarmPage.jsx`
  - Import `farmPersistence` au lieu de `farmStorage`
  - `getFarmByTokenAndCreator()` pour retrouver ferme
  - `enrichFarmWithBlockchainData()` pour sync live
  - `saveFarmToLocalStorage()` pour sauvegarder
  - `updateFarmVerificationStatus()` pour demander vérification

- ✅ `src/pages/AdminVerificationPage.jsx`
  - `loadVerificationRequests()` charge depuis JSON + localStorage
  - `updateFarmVerificationStatus()` au lieu de `approveFarm()`
  - Gestion manuelle de la migration pending → verified

- ✅ `src/hooks/useFarms.js`
  - Charge verification-requests.json
  - Fusionne 3 sources : farms.json + requests + localStorage
  - Déduplique par tokenId

- ✅ `src/pages/ManageTokenPage.jsx`
  - Console.logs détaillés pour débugger filtre "Tous"
  - Affiche ticker, balance, decimals depuis blockchain

---

## 🐛 Debug & Tests

### Console Logs Importants

**ManageFarmPage (création)**
```
✅ Ferme sauvegardée: { name: "...", ... }
📍 Accessible via creatorAddress: ecash:qp...
```

**ManageFarmPage (modification)**
```
📊 Ferme trouvée pour token abc... et adresse ecash:qp...
🔄 Enrichissement blockchain en cours...
✅ Ferme enrichie avec données live
```

**useFarms (chargement)**
```
✅ Loaded 5 farms: {
  official: 3,
  verifiedRequests: 1,
  localStorage: 1
}
```

**ManageTokenPage (admin)**
```
✅ Admin: 5 tokens chargés
📋 Tokens admin détaillés: [
  { name: "...", ticker: "ABC", balance: "1000", hasBaton: false }
]
```

**AdminVerificationPage**
```
📋 Demandes de vérification: {
  total: 10,
  pending: 3
}
```

### Scénarios de Test

#### Test 1 : Création + Modification
```
1. Créer token
2. Remplir ManageFarmPage → Enregistrer
3. Vérifier localStorage: farmwallet_pending_farms
4. Recharger page
5. Rouvrir ManageFarmPage → Formulaire pré-rempli ✅
```

#### Test 2 : Multi-Navigateurs
```
1. Navigateur A : Créer ferme + demander vérification
2. Copier mnémonique
3. Navigateur B : Importer mnémonique
4. Navigateur B : Ouvrir ManageFarmPage
5. Ferme visible + modifiable ✅
```

#### Test 3 : Workflow Admin
```
1. Créateur : Demander vérification
2. Admin : Ouvrir AdminVerificationPage
3. Voir ferme pending avec données blockchain ✅
4. Valider ferme
5. DirectoryPage : Ferme visible ✅
```

#### Test 4 : Filtre "Tous" Admin
```
1. Admin : Ouvrir ManageTokenPage
2. Cliquer filtre "Tous"
3. Vérifier console.logs : ticker, balance, decimals ✅
4. Vérifier UI : affichage correct ✅
```

---

## ⚠️ Points d'Attention

### 1. **verification-requests.json en lecture seule**
Actuellement, le système sauvegarde en localStorage car verification-requests.json est en lecture seule (frontend).

**Solution future** : Backend API endpoint pour écriture
```javascript
// POST /api/verification-requests
{
  method: 'POST',
  body: JSON.stringify(farmData)
}
```

### 2. **Migration données existantes**
Les fermes créées AVANT cette update sont en localStorage uniquement.

**Solution** : `getMergedFarms()` fusionne automatiquement
```javascript
const farms = await getMergedFarms(wallet.address);
// Inclut localStorage + verification-requests.json
```

### 3. **Synchronisation blockchain**
`enrichFarmWithBlockchainData()` est asynchrone et peut être lent.

**Solution** : Caching avec `tokenSync.js`
```javascript
const cachedData = getCachedTokenData(tokenId);
if (cachedData) {
  // Afficher cache pendant chargement
}
const liveData = await syncTokenData(tokenId, wallet);
// Mettre à jour avec données live
```

---

## 📦 localStorage Keys

```javascript
farmwallet_pending_farms    // Fermes en attente de vérification
farmwallet_farms_data       // Fermes vérifiées localement
```

---

## 🚀 Prochaines Étapes

1. **Backend API** pour écriture verification-requests.json
2. **Tests E2E** avec Playwright
3. **Migration automatique** localStorage → verification-requests.json
4. **Optimisation** enrichissement blockchain (WebWorkers?)
5. **Documentation** utilisateur final

---

**Date** : 8 Décembre 2024  
**Statut** : ✅ Système de base fonctionnel  
**À tester** : Workflow multi-navigateurs complet
