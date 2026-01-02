# Plan de Stabilisation eCash Wallet - React 19 / TypeScript Migration

**Date:** 2 Janvier 2026  
**Objectif:** Corriger les régressions critiques post-migration TypeScript/React 19  
**Propriétaire:** Senior Blockchain Engineer  

---

## 🔴 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1️⃣ **DUST LIMIT & UNIT CONFUSION (Erreur "Minimum 5.46 XEC")**

**Symptôme:** Validation échoue avec "Minimum 5.46 XEC" pour des montants valides (ex: "1" XEC)  
**Cause Racine:**
- `useSendToken.ts:44` calcule `sats = Math.round(amountNum * 100)`
- eCash a **2 décimales** (1 XEC = 100 sats), donc "1" XEC → 100 sats (correct)
- Mais la vérification `if (sats < 546)` compare SATS avec 546 SATS (5.46 XEC)
- Confusion: Dust limit de 546 sats ne s'applique qu'aux **sorties de token ALP**, pas aux montants XEC
- Montants XEC: minimum théorique = 1 satoshi; minimum pratique = fee + dust outputs

**Impact:** Utilisateurs ne peuvent pas envoyer <5.46 XEC (erreur applicative)

**Solution Structurelle:**
1. Dans `validation.ts`: Créer `validateTokenSendAmount()` séparé de `validateXecSendAmount()`
2. Dans `ecashWallet.ts`: 
   - `sendXec()` → minimum = 1 sat (après frais)
   - `sendToken()` → chaque output ALP reçoit strictement 546n sats
3. Dans les composants Send/Airdrop/etc: Utiliser la validation appropriée au contexte

---

### 2️⃣ **FLUX NOTIFICATIONS & REFRESH INCOMPLET**

**Symptôme:** Après Airdrop/Mint/Burn, balance ne se met à jour que manuellement  
**Cause Racine:**
- Composants appellent `onHistoryUpdate()` mais **ne déclenchent pas** `balanceRefreshTriggerAtom`
- `useEcashBalance()` dépend de `balanceRefreshTriggerAtom` pour re-scanner la blockchain
- WebSocket n'est pas toujours actif (dépend de profil sélectionné)

**Impact:** UX confuse (balance affichée "ancienne" post-transaction)

**Solution Structurelle:**
1. Créer hook `useActionSuccess()` qui:
   - Affiche notification avec TXID
   - Incrémente `balanceRefreshTriggerAtom` 
   - Appelle `onHistoryUpdate()` optionnel
2. Dans Airdrop/Mint/Burn/Send/Message: Remplacer logique de notification par `useActionSuccess()`
3. Dans `useEcashBalance()`: Ajouter dépendance explicite à `tokenRefreshTriggerAtom` aussi

---

### 3️⃣ **ADDRESSBOOK & TOKENID REACTIVITY**

**Symptôme:** `AddressBookMultiSelector.tsx` n'est pas réactif au changement de `tokenId`  
**Cause Racine:**
- Dépendance manquante dans `useEffect` (ligne 31)
- Contacts filtrés une seule fois au montage, pas au changement de profile/token
- `onContactsSelected()` n'est pas appelé correctement dans `SendToMany` flow

**Impact:** Utilisateurs voient contacts du **token précédent** au changement de profile

**Solution Structurelle:**
1. Dans `AddressBookMultiSelector.tsx`: Ajouter `tokenId` à dépendances `useEffect`
2. Vérifier que `Send.tsx` / `Message.jsx` passent `tokenId` correct au composant
3. Dans `Airdrop.tsx`: Ajouter `AddressBookMultiSelector` pour récupérer destinataires éligibles

---

### 4️⃣ **VALIDATION MONTANTS AVEC DÉCIMALES**

**Symptôme:** "1" n'est pas accepté comme montant valide pour token avec decimals=2  
**Cause Racine:**
- `isValidAmount()` accepte jusqu'à 8 décimales max
- Token ALP avec `decimals=2` devrait accepter max 2 décimales
- Validation ne tient pas compte des decimals du token

**Impact:** UX confuse ("pourquoi je ne peux pas envoyer 1 token?")

**Solution Structurelle:**
1. Dans `validation.ts`: Créer `validateTokenAmount(amount, decimals)` qui:
   - Parse montant
   - Vérifie <= decimals du token
   - Retourne true pour "1" si decimals >= 0
2. Dans composants: Utiliser `validateTokenAmount(amount, genesisInfo.decimals)`
3. Dans `amountToBigInt()`: Asserter `decimals <= 8`

---

### 5️⃣ **MESSAGE OP_RETURN ENCODING & SIZE**

**Symptôme:** Potentiel: Message >220 chars encoded mal, frais calculés incorrectement  
**Cause Racine:**
- `Message.jsx` limite à 220 chars (correct pour OP_RETURN)
- Mais encodage UTF-8 peut augmenter la taille (é = 2 bytes)
- Frais de données (145 sats/KB) pas clairement calculés

**Impact:** Transactions rejetées ou frais sous-estimés

**Solution Structurelle:**
1. Dans `validation.ts`: Créer `validateMessageSize(text, maxBytes = 220)` qui:
   - Encode en UTF-8
   - Vérifie taille byte (pas char)
2. Dans `Message.jsx`: Afficher "220 bytes" pas "220 chars"
3. Dans `ecashWallet.ts`: Dans `sendToken()` avec message, ajouter 145 sats fee pour data

---

## ✅ PLAN D'ACTION (Ordre de Priorité)

### Phase 1: Fondations (2-3h)
- [ ] **Créer `validateTokenAmount(amount, decimals)`** dans validation.ts
- [ ] **Créer `validateXecSendAmount(amount)`** dans validation.ts
- [ ] **Créer `useActionSuccess()` hook** pour normaliser notifications+refresh
- [ ] **Corriger `sendToken()` dust output** dans ecashWallet.ts (546n sats minimum par output)

### Phase 2: Composants (2-3h)
- [ ] Refactoriser **Airdrop.tsx** avec `useAirdropToken` hook
- [ ] Refactoriser **Mint.tsx** avec `useMintToken` hook
- [ ] Refactoriser **Burn.tsx** avec `useBurnToken` hook
- [ ] Refactoriser **Send.tsx** avec `useSendToken` hook amélioré
- [ ] Corriger **Message.jsx** validation de taille

### Phase 3: AddressBook & Context (1h)
- [ ] Corriger **AddressBookMultiSelector.tsx** dépendances `useEffect`
- [ ] Vérifier **Send.tsx** pass du `tokenId` correct
- [ ] Ajouter sélecteur contacts dans **Airdrop.tsx**

### Phase 4: Testing & Cleanup (1-2h)
- [ ] Tests manuels: Send 1 XEC → passe
- [ ] Tests manuels: Airdrop, Mint, Burn → balance refresh
- [ ] Tests manuels: AddressBook + changement token
- [ ] ESLint fix + type checking

---

## 📋 INTERFACES & TYPES À AJOUTER

### validation.ts
```typescript
interface ValidationAmountParams {
  amount: string;
  decimals?: number;
  maxBalance?: number;
  type: 'xec' | 'etoken';
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  atoms?: bigint; // Pour les calculs downstream
}
```

### atoms.ts (DÉJÀ PRÉSENT)
```typescript
export const balanceRefreshTriggerAtom = atom<number>(0);
export const tokenRefreshTriggerAtom = atom<number>(0);
```

### New Hook: useActionSuccess.ts
```typescript
export interface ActionSuccessParams {
  txid: string;
  amount: string;
  ticker: string;
  actionType: 'send' | 'airdrop' | 'mint' | 'burn' | 'message';
  recipientCount?: number;
}

export const useActionSuccess = () => {
  const setNotification = useSetAtom(notificationAtom);
  const setBalanceRefresh = useSetAtom(balanceRefreshTriggerAtom);
  const setTokenRefresh = useSetAtom(tokenRefreshTriggerAtom);

  return (params: ActionSuccessParams) => {
    // 1. Notification
    // 2. Increment refresh triggers
    // 3. Log to history
  };
};
```

---

## 🔧 FICHIERS À MODIFIER (PRIORITÉ)

| Fichier | Priorité | Raison |
|---------|----------|--------|
| `src/utils/validation.ts` | 🔴 CRITICAL | Bloque toutes les validations |
| `src/services/ecashWallet.ts` | 🔴 CRITICAL | Dust limit 546n sats |
| `src/hooks/useActionSuccess.ts` | 🟠 HIGH | À créer - bloque refresh |
| `src/components/eCash/TokenActions/Send.tsx` | 🟠 HIGH | Utilise validation |
| `src/components/eCash/TokenActions/Airdrop.tsx` | 🟠 HIGH | Idem |
| `src/components/eCash/TokenActions/Mint.tsx` | 🟠 HIGH | Idem |
| `src/components/eCash/TokenActions/Burn.tsx` | 🟠 HIGH | Idem |
| `src/components/AddressBook/AddressBookMultiSelector.tsx` | 🟡 MEDIUM | Dépendances useEffect |
| `src/components/eCash/TokenActions/Message.jsx` | 🟡 MEDIUM | Validation taille message |

---

## 🎯 CRITÈRES DE SUCCÈS

✅ Send 1 XEC → Accepté (pas "Minimum 5.46")  
✅ Envoyer token avec decimals=2 → "1" accepté comme montant  
✅ Post-Airdrop/Mint/Burn → Balance refresh automatique via atom  
✅ Change token → AddressBook contacts mise à jour  
✅ Message >220 chars UTF-8 → Rejeté avec msg clair  
✅ Build: 0 errors, 0 warnings (ESLint)  
✅ TypeScript strict: 0 "any" type dansles corrections  

---

## 📚 RÉFÉRENCES EXISTANTES

- **Atoms:** `src/atoms.ts` (balanceRefreshTriggerAtom, tokenRefreshTriggerAtom)
- **Types:** `src/types/index.ts` (Utxo, TokenBalance, GenesisInfo, etc.)
- **Validation existante:** `src/utils/validation.ts` (isValidXECAddress, isValidAmount)
- **Service blockchain:** `src/services/ecashWallet.ts` (sendXec, sendToken)
- **Hook pattern:** `src/hooks/useSendToken.ts` (example de hook bien structuré)

---

## ⚠️ RÈGLES D'OR À RESPECTER

1. **Blockchain Integrity:** Toujours `BigInt` pour sats/atoms, jamais `number`
2. **State Management:** Actions blockchain → trigger atoms pour refresh global
3. **No Validation Bypass:** Si validation.ts échoue, corriger la règle, pas le type
4. **UI Consistency:** Utiliser `src/components/UI` components (Card, Button, Input, Stack)
5. **Zero Any:** Si type inconnu, définir interface dans types/index.ts

---

**Status:** À implémenter  
**ETA:** ~8-10 heures de travail  
**Risque:** Faible (changements localisés, bien testables)
