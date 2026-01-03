# 🔒 Audit de Sécurité - Vulnérabilités Critiques

**Date** : 2 janvier 2026  
**Status** : Phase de correction  
**Priorité** : CRITIQUE  

---

## 📋 Résumé des Vulnérabilités

| # | Titre | Sévérité | Status | Impact |
|---|-------|----------|--------|--------|
| 1 | XSS → Vol de clés via localStorage | 🔴 CRITIQUE | À FIXER | Exfiltration de portefeuille chiffré |
| 2 | Frais statiques vs dynamiques | 🔴 CRITIQUE | À FIXER | Rejection de transactions |
| 3 | Détection Creator erronée | 🔴 CRITIQUE | À FIXER | Usurpation d'identité |
| 4 | Manque gestion Reorgs Chronik | 🟠 HAUTE | À FIXER | Soldes fantômes |
| 5 | walletAtom expose clés en RAM | 🟠 HAUTE | À FIXER | Dump mémoire + extensions |

---

## 1. 🔴 CRITIQUE: Sécurité XSS & localStorage

### Problème Identifié
```
Flux ACTUEL:
localStorage.setItem('jln_wallet_vault', encryptedData)
  ↓ [XSS attaque]
  ↓ script malveillant → fetch(blob chiffré)
  ↓ brute-force hors-ligne (pas de limite)
  ↓ 🔓 PORTEFEUILLE COMPROMIS
```

**Audit du codebase:**
- ✅ **CORRECT**: Chiffrement AES-256-GCM + PBKDF2(100k iterations)
- ✅ **CORRECT**: mnemonicAtom = RAM-only (NO atomWithStorage)
- ⚠️ **RISQUE**: localStorage.setItem('jln_wallet_vault', encryptedData) dans storageService.ts
- ⚠️ **RISQUE**: La clé déchiffrée passe par `mnemonicAtom` (Jotai en mémoire)
- ⚠️ **RISQUE**: React DevTools + extensions peuvent capturer l'atome

### Recommandations

**PHASE 1 (URGENT):**
1. ✅ Garder localStorage pour le blob chiffré (OK)
2. ✅ Ajouter Content Security Policy (CSP) header
3. ❌ NE PAS passer à IndexedDB seul → Adopter une architecture progressive

**PHASE 2 (1 mois):**
1. Migrer vers **Web Workers** pour déchiffrage
   - Worker = contexte JavaScript isolé
   - Clé privée JAMAIS dans le thread principal
   - Seules les signatures passent au DOM

2. Implémenter **Service Worker** pour validations supplémentaires

**Code CSP à ajouter (vite.config.js):**
```javascript
// vite.config.js - Middleware
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'wasm-unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.chronik.cash wss://*.chronik.cash; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "frame-ancestors 'none';"
  );
  next();
});
```

---

## 2. 🔴 CRITIQUE: Frais de Transaction Dynamiques

### Problème Identifié
```
Fichier: src/hooks/useSendToken.ts
Audit: ❌ Frais statiques à 546 sats pour TOUS les sends
Risque: 
  - TX avec 20+ inputs → Size > 2KB
  - Frais réels: 20KB * 1 sat/byte = 20,000 sats
  - TX rejectée par mempool (under-fee)
```

### Analyse du Code
```typescript
// ❌ MAUVAIS (actuel)
const estimatedFee = 546; // Statique!

// ✅ BON (à implémenter)
const estimatedFee = calculateDynamicFee(inputs, outputs, message);
// = (inputsSize + outputsSize + messageSize) * satPerByte
```

### Recommandations

**Implémenter validateFeeSize.ts:**
```typescript
export function calculateTransactionSize(
  inputs: UTXO[],
  outputs: Output[],
  messageBytes?: number
): number {
  // Version simplifiée
  const inputSize = inputs.length * 180;      // ~180 bytes par input
  const outputSize = outputs.length * 34;     // ~34 bytes par output
  const messageSize = messageBytes || 0;       // OP_RETURN
  const overhead = 10;                         // Header + locktime
  
  return inputSize + outputSize + messageSize + overhead;
}

export function calculateDynamicFee(
  inputs: UTXO[],
  outputs: Output[],
  satPerByte: number = 1,
  messageBytes?: number
): number {
  const txSize = calculateTransactionSize(inputs, outputs, messageBytes);
  return BigInt(txSize) * BigInt(satPerByte);
}
```

**Intégration dans useSendToken.ts:**
```typescript
const txSize = calculateTransactionSize(selectedUTXOs, [output], messageBytes);
const recommendedFee = calculateDynamicFee(selectedUTXOs, [output], 1, messageBytes);
const safeFee = recommendedFee * 2n; // Buffer de sécurité
```

---

## 3. 🔴 CRITIQUE: Détection Creator Erronée

### Problème Identifié
```
Fichier: src/hooks/useIsCreator.ts
Condition ACTUELLE:
  isCreator = (balance > 0) && (hasJLNWalletRef)
  
❌ FAILLE: N'importe qui peut:
  1. Acheter 1 atome du token fixe
  2. Avoir le tag JLN-Wallet
  3. → Usurper la création du token
```

### Solution: Utiliser le tokenId (TxId de genèse)

**Audit recommandé:**
```typescript
// ❌ MAUVAIS (actuel)
const isCreator = balance > 0 && hasJLNWalletReference;

// ✅ BON (à implémenter)
const isCreator = (tokenGenesisOutpoint.txId === creatorTxId);
// Où creatorTxId = tokenInfo.genesisInfo.txid (Chronik)
```

**Approche:**
1. Lire `tokenInfo.genesisInfo` depuis Chronik
2. Extraire le `txid` de création
3. Comparer avec le `txid` du output utilisateur qui contrôle le token
4. ✅ Seul le créateur original peut avoir ce output

---

## 4. 🟠 HAUTE: Manque Gestion des Reorgs (Chronik WebSocket)

### Problème Identifié
```
Fichier: src/hooks/useChronikWebSocket.ts
Code ACTUEL:
  - ✅ Écoute AddedToMempool
  - ✅ Écoute Confirmed
  - ❌ N'ÉCOUTE PAS BlockDisconnected
  
Risque: 
  Si une TX est annulée par reorg:
    1. Balance affiche le montant reçu (fantôme)
    2. balanceAtom n'est PAS invalidé
    3. Utilisateur croit avoir l'argent
```

### Recommandations

**Ajouter listener BlockDisconnected:**
```typescript
const handleMessage = useCallback((msg) => {
  if (msg.type === 'Tx' || msg.type === 'AddedToMempool' || msg.type === 'Confirmed') {
    // ✅ Déjà fait
    setBalanceRefreshTrigger(Date.now());
    
  } else if (msg.type === 'BlockConnected') {
    // ✅ Déjà fait
    setBalanceRefreshTrigger(Date.now());
    
  } else if (msg.type === 'BlockDisconnected') {
    // ❌ MANQUANT - À AJOUTER
    log('⚠️ Reorg détecté! Rafraîchissement forcé du solde');
    setNotification({
      type: 'warning',
      message: '⚠️ Réorganisation blockchain - solde mis à jour'
    });
    // Attendre que la blockchain se stabilise
    setTimeout(() => {
      setBalanceRefreshTrigger(Date.now());
    }, 2000);
  }
}, [setBalanceRefreshTrigger, setNotification]);
```

---

## 5. 🟠 HAUTE: walletAtom Expose Clés en RAM

### Problème Identifié
```
Fichier: src/atoms.ts
Audit:
  - ✅ mnemonicAtom = RAM-only ✅
  - ✅ Pas d'atomWithStorage ✅
  - ❌ MAIS: React DevTools peut capturer l'état Jotai
  - ❌ Extensions malveillantes peuvent accéder aux atoms
  - ❌ dump mémoire = clés exposées
```

### Recommandations

**PHASE 1 (Immédiat):**
1. Ajouter nettoyage sur logout:
```typescript
export const clearWalletAtom = atom(null, (_get, set) => {
  set(mnemonicAtom, null);        // Clear mnemonic
  set(walletAtom, null);          // Clear wallet instance
  set(walletConnectedAtom, false);
});
```

2. Détruire l'instance EcashWallet:
```typescript
// Dans useEcashWallet hook
const handleLogout = useCallback(async () => {
  // Wipe sensitive data
  if (wallet) {
    wallet.destroy?.();  // Si cette méthode existe
  }
  setMnemonic(null);
  setWallet(null);
  // Forcer garbage collection
  if (global.gc) global.gc();
}, [wallet]);
```

**PHASE 2 (Web Workers):**
- Déplacer logique EcashWallet dans Worker
- Worker = contexte isolé, non accessible via DevTools
- Seules les signatures retournent au thread principal

---

## Plan d'Action Priorisé

### 🔴 IMMÉDIAT (Semaine 1-2)

- [ ] Ajouter CSP headers dans vite.config.js
- [ ] Implémenter calculateDynamicFee() dans validation.ts
- [ ] Intégrer frais dynamiques dans Send/Airdrop/Burn
- [ ] Ajouter BlockDisconnected listener à useChronikWebSocket
- [ ] Implémenter clearWalletAtom et nettoyage logout

### 🟠 COURT TERME (Semaine 3-4)

- [ ] Refonte useIsCreator pour vérifier tokenId uniquement
- [ ] Audit + test des frais dynamiques (e2e)
- [ ] Documentation security best practices

### 🟡 MOYEN TERME (Mois 2-3)

- [ ] Migrer déchiffrage vers Web Worker
- [ ] Implémenter Service Worker pour validations supplémentaires
- [ ] Considérer transition progressive vers IndexedDB

---

## Fichiers à Modifier

| Fichier | Action | Priorité |
|---------|--------|----------|
| vite.config.js | Ajouter CSP | 🔴 |
| src/utils/validation.ts | calculateDynamicFee() | 🔴 |
| src/hooks/useChronikWebSocket.ts | BlockDisconnected | 🔴 |
| src/atoms.ts | clearWalletAtom | 🔴 |
| src/hooks/useIsCreator.ts | Vérifier tokenId | 🟠 |
| src/hooks/useSendToken.ts | Utiliser frais dynamiques | 🔴 |
| src/components/eCash/TokenActions/* | Appliquer frais dynamiques | 🔴 |

---

## Points Positifs 🟢

- ✅ **Chiffrement robuste**: AES-256-GCM + PBKDF2(100k)
- ✅ **Architecture RAM-only**: mnemonicAtom sans atomWithStorage
- ✅ **BigInt pour satoshis**: Pas d'erreurs floating-point
- ✅ **Mint Baton protection**: Jamais brûlé accidentellement
- ✅ **Chronik fallback**: 3 URLs + timeout 10s

---

## Ressources

- [OWASP WebSecurity Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API Docs](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [eCash Transaction Size Reference](https://reference.cash/)

