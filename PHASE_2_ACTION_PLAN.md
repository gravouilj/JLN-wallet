# 🚀 Plan d'Action - Phase 2: Optimisation & Sécurité

**Date:** 31 Décembre 2025  
**Context:** Basé sur [CONTEXT.md](CONTEXT.md) + Audit TypeScript/ESLint complet

---

## 📊 État Actuel
✅ Audit TypeScript complété (0 erreurs critiques)  
✅ ESLint intégré (14 erreurs restantes, 67% réduit)  
✅ Tests Playwright (170+ tests, tous passent)  

---

## 🎯 Priorités Phase 2

### 🔴 **Tier 1: Sécurité & Conformité CONTEXT.md** (Cette semaine)

#### 1.1 Hook React Conditionnel ⚠️
- **Fichier:** `src/pages/ManageProfilePage.jsx:45`
- **Problème:** `useEffect` appelé après early return
- **Règle CONTEXT.md:** Code doit respecter les règles React
- **Effort:** 15 min

#### 1.2 Blocs Vides dans EcashWallet ❌
- **Fichier:** `src/services/ecashWallet.ts:279,297,303,401`
- **Problème:** 4 empty catch/finally blocks
- **Règle CONTEXT.md:** Calculs blockchain doivent être robustes
- **Solution:** Ajouter logging d'erreur ou lever exception
- **Effort:** 20 min

#### 1.3 Types `any` Critiques 🔒
- **Fichier:** Supabase client, Storage service
- **Problème:** 150+ warnings `no-explicit-any`
- **Priorité CONTEXT.md:** "Architecture RAM-Only" nécessite typage strict
- **Action:** Convertir `supabaseClient.js` + `ticketService.js` en `.ts`
- **Effort:** 2-3 heures

---

### 🟡 **Tier 2: Migration TypeScript** (Semaine prochaine)
- ✅ `src/services/*` → tous en `.ts`
- ✅ `src/atoms.ts` → améliorer le typage
- ✅ `src/pages/*` → migrer progressivement `.jsx` → `.tsx`

---

### 🟢 **Tier 3: Dettes Techniques** (Long terme)
- Remplacer `any` par types spécifiques
- Améliorer le coverage de tests unitaires
- CI/CD avec ESLint stricte

---

## 🛡️ Respect du CONTEXT.md

### Règles de Sécurité (CRITIQUE)
| Règle | Status | Action |
|-------|--------|--------|
| ✅ Zéro Stockage en Clair | ✓ | Vérifier `storageService.ts` |
| ✅ Architecture RAM-Only | ✓ | Vérifier `atoms.ts` |
| ✅ Chiffrement (AES-GCM) | ✓ | Audit stockage persistant |
| ✅ Calculs BigInt | ⚠️ | Vérifier `getSats()` dans `ecashWallet.ts` |

### Règles eCash (XEC)
| Règle | Status | Action |
|-------|--------|--------|
| 1 XEC = 100 Sats | ✓ | Vérifier conversions |
| Dust Limit (546 sats) | ✓ | Tester validation |
| Mint Baton (non-brûlable) | ✓ | Vérifier logique token |

---

## ✨ Prochains Commits

```bash
1️⃣ "fix: resolve critical react-hooks/rules-of-hooks error in ManageProfile"
2️⃣ "fix: add error handling to empty catch blocks in ecashWallet"
3️⃣ "refactor: convert supabaseClient.js to .ts for type safety"
4️⃣ "refactor: convert ticketService.js to .ts for consistency"
```

---

## 🎯 Metrics de Succès

| Métrique | Cible | Action |
|----------|-------|--------|
| ESLint Errors | < 5 | Fixer Tier 1 |
| TypeScript Coverage | 95%+ | Supprimer `any` |
| Tests Passage Rate | 100% | Maintenir |
| Security Score | Excellent | Auditer storageService |

