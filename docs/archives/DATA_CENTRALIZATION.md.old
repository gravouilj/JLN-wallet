# Système de Centralisation des Données Token

## Vue d'ensemble

Le système de centralisation permet de stocker et synchroniser automatiquement les données dynamiques des tokens depuis la blockchain vers `farms.json`, avec mise en cache locale pour des performances optimales.

## Architecture

```
┌─────────────────┐
│   Blockchain    │  (Source de vérité)
│   (Chronik)     │
└────────┬────────┘
         │ Sync toutes les 30s
         ↓
┌─────────────────┐
│  tokenSync.js   │  (Service de synchronisation)
│  - syncTokenData│
│  - cacheToken   │
└────────┬────────┘
         │
         ├──→ farms.json (_dynamicData)
         │
         └──→ localStorage (cache 5 min)
                    │
                    ↓
         ┌──────────────────┐
         │ TokenDetailsPage │
         │  - Auto-refresh  │
         └──────────────────┘
```

## Structure des Données

### farms.json

```json
{
  "id": "1",
  "name": "Ferme EVA",
  "tokenId": "fc2e2b3a...",
  "protocol": "ALP",
  "verified": true,
  // ... autres champs statiques
  
  "_dynamicData": {
    "_note": "Données automatiquement synchronisées depuis la blockchain",
    "circulatingSupply": "1000000",
    "genesisSupply": "1000000",
    "isActive": true,
    "isDeleted": false,
    "decimals": 2,
    "lastUpdated": "2025-12-08T12:00:00.000Z"
  }
}
```

### Cache localStorage

Clé: `token_cache_{tokenId}`
Validité: 5 minutes
Format: Identique à `_dynamicData`

## Fonctionnalités

### 1. Synchronisation Automatique (TokenDetailsPage)

```javascript
import { syncTokenData, getCachedTokenData, cacheTokenData } from '../utils/tokenSync';

// Dans useEffect
const dynamicData = await syncTokenData(tokenId, wallet);
cacheTokenData(tokenId, dynamicData);

// Refresh automatique toutes les 30s
setInterval(loadTokenData, 30000);
```

**Avantages:**
- ✅ Affichage instantané depuis cache
- ✅ Synchronisation blockchain en arrière-plan
- ✅ Mise à jour automatique sans rechargement
- ✅ Données toujours à jour après burn/mint/send

### 2. Synchronisation Manuelle (Script)

```bash
npm run sync-farms
```

**Utilisation:**
- Mise à jour initiale de farms.json
- Maintenance périodique (cron job)
- Vérification après modifications blockchain

### 3. Cache Local

```javascript
// Lecture cache
const cached = getCachedTokenData(tokenId);

// Écriture cache
cacheTokenData(tokenId, dynamicData);
```

**Comportement:**
- Validité: 5 minutes
- Affichage immédiat pendant chargement
- Évite requêtes inutiles

## API du Service

### `syncTokenData(tokenId, wallet)`

Synchronise un token depuis la blockchain.

**Paramètres:**
- `tokenId` (string): ID du token
- `wallet` (Object): Instance ecash-lib wallet

**Retour:**
```javascript
{
  circulatingSupply: "1000000",
  genesisSupply: "1000000",
  isActive: true,
  isDeleted: false,
  decimals: 2,
  lastUpdated: "2025-12-08T12:00:00.000Z"
}
```

### `syncAllFarmTokens(wallet)`

Synchronise tous les tokens de farms.json.

**Paramètres:**
- `wallet` (Object): Instance ecash-lib wallet

**Retour:**
```javascript
[
  {
    tokenId: "fc2e2b3a...",
    name: "Ferme EVA",
    circulatingSupply: "1000000",
    // ...
  }
]
```

### `getCachedTokenData(tokenId)`

Récupère les données depuis le cache local.

**Retour:** Object ou null si expiré/absent

### `cacheTokenData(tokenId, dynamicData)`

Stocke les données dans le cache local.

### `useTokenSync(tokenId, wallet, intervalMs)`

Hook React pour synchronisation automatique.

**Paramètres:**
- `tokenId` (string): ID du token
- `wallet` (Object): Instance wallet
- `intervalMs` (number): Intervalle en ms (défaut: 30000)

**Retour:** dynamicData (objet synchronisé)

## Flux de Données

### Chargement Initial

1. **Cache Check**: Vérifie localStorage pour affichage immédiat
2. **Blockchain Sync**: Récupère données fraîches depuis Chronik
3. **Cache Update**: Met à jour localStorage
4. **UI Update**: Affiche données synchronisées

### Refresh Automatique

1. **Timer (30s)**: Déclenche synchronisation
2. **Blockchain Sync**: Récupère nouvelles données
3. **Compare**: Détecte changements
4. **Update**: Met à jour UI + cache si changé

### Après Opération (Burn/Mint/Send)

1. **Operation Success**: Transaction confirmée
2. **Immediate Sync**: Force synchronisation
3. **UI Update**: Affiche nouvelles valeurs
4. **Cache Update**: Stocke état actuel

## Calculs des Statuts

### `isActive`
```javascript
BigInt(circulatingSupply) > 0n
```
Token a une supply circulante > 0.

### `isDeleted`
```javascript
isFixed && !isActive && BigInt(genesisSupply) > 0n
```
Token fixe (pas de mint baton) avec supply = 0 mais genesis > 0.

### `isFixed`
```javascript
!genesisInfo.authPubkey || genesisInfo.authPubkey === ''
```
Token sans mint baton (supply fixe).

## Performance

### Optimisations

1. **Cache 5 min**: Évite requêtes répétées
2. **Sync 30s**: Balance entre fraîcheur et charge
3. **Affichage immédiat**: Cache utilisé pendant chargement
4. **Sync conditionnelle**: Seulement si données changées

### Métriques Attendues

- **Chargement initial**: < 2s (avec cache: < 100ms)
- **Refresh automatique**: Transparent (background)
- **Après opération**: < 1s
- **Requêtes Chronik**: Max 2/min par token

## Maintenance

### Tâches Périodiques

1. **Quotidien**: `npm run sync-farms` (cron)
2. **Hebdomadaire**: Vérifier logs de synchronisation
3. **Mensuel**: Nettoyer localStorage ancien

### Monitoring

```javascript
// Console logs
console.log('🔄 Synchronisation automatique...');
console.log('✅ Token synchronisé:', dynamicData);
console.log('❌ Erreur sync:', error);
```

### Dépannage

**Problème**: Données non mises à jour

**Solutions**:
1. Vérifier console pour erreurs sync
2. Clear localStorage: `localStorage.clear()`
3. Forcer refresh: `npm run sync-farms`
4. Vérifier connexion Chronik

**Problème**: Cache obsolète

**Solutions**:
1. Réduire durée cache (< 5 min)
2. Forcer sync après opérations
3. Invalider cache manuellement

## Évolutions Futures

### Phase 1 (Actuel)
- ✅ Sync automatique 30s
- ✅ Cache localStorage 5 min
- ✅ Script manuel sync
- ✅ Structure _dynamicData

### Phase 2 (Prochain)
- ⏳ WebSocket Chronik (temps réel)
- ⏳ IndexedDB pour cache large
- ⏳ Service Worker background sync
- ⏳ Compression données

### Phase 3 (Futur)
- ⏳ API backend centralisée
- ⏳ GraphQL subscriptions
- ⏳ Offline-first avec sync différé
- ⏳ Analytics et métriques

## Références

- **tokenSync.js**: Service principal
- **TokenDetailsPage.jsx**: Implémentation UI
- **farms.json**: Stockage centralisé
- **sync-farms-data.js**: Script CLI
