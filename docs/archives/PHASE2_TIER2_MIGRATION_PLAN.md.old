# 📐 Phase 2 Tier 2 - Plan de Migration TypeScript

## 🎯 Objectif
Migrer tous les fichiers `src/services/*.js` vers TypeScript (`.ts`) pour améliorer la sécurité des types et réduire les bugs.

## 📊 Analyse de Complexité

| Service | Lignes | Fonctions | Priorité | Dépendances |
|---------|--------|-----------|----------|-------------|
| **supabaseClient.js** | 7 | 1 | 🔴 **CRÍTICA** | Aucune (DB client) |
| **chronikClient.js** | 183 | 7 | 🔴 **CRÍTICA** | ecash-lib, axios |
| **adminService.js** | 226 | 9 | 🟠 **HAUTE** | supabaseClient, crypto |
| **ticketService.js** | 357 | 11 | 🟠 **HAUTE** | supabaseClient, timestamps |
| **addressBookService.js** | 216 | 3 | 🟡 **MOYENNE** | supabaseClient |
| **tokenLinkedService.js** | 248 | 3 | 🟡 **MOYENNE** | supabaseClient, ecashWallet |
| **historyService.js** | 193 | 6 | 🟡 **MOYENNE** | supabaseClient |
| **antifraudService.js** | 300 | 12 | 🟡 **MOYENNE** | supabaseClient, chronik |

**Total**: 1,730 lignes | **Effort**: ~6-8 heures | **Impact**: 🟢 Production Ready

---

## 🚀 Stratégie de Migration

### Phase 1: Fondations (Day 1)
**Fichiers**: `supabaseClient.js`, `chronikClient.js`
**Raison**: Tous les autres dépendent de ceux-ci

1. **supabaseClient.ts** (7 lignes - 10 min)
   - Simple : just init & export Supabase client
   - Pas de logique complexe
   
2. **chronikClient.ts** (183 lignes - 45 min)
   - Ajouter types pour ChronikClient, Bitcoin endpoints
   - Types pour utxos, tokenInfo, etc.

### Phase 2: Admin & Tickets (Day 1-2)
**Fichiers**: `adminService.js`, `ticketService.js`
**Raison**: Haute priorité pour audit

3. **adminService.ts** (226 lignes - 1h)
   - Typer les réponses Supabase
   - Typer les paramètres (wallet address, roles)
   
4. **ticketService.ts** (357 lignes - 1.5h)
   - Typer Ticket interface
   - Typer Message, Status enums

### Phase 3: Services Secondaires (Day 2)
**Fichiers**: addressBook, tokenLinked, history, antifraud

5. **addressBookService.ts** (216 lignes - 1h)
6. **tokenLinkedService.ts** (248 lignes - 1h)
7. **historyService.ts** (193 lignes - 45 min)
8. **antifraudService.ts** (300 lignes - 1.5h)

---

## 🔍 Vérification des Dépendances

### supabaseClient.js
```javascript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(url, key);
```
**Impact**: Utilisé par 7+ services
**Dépendance Externe**: ✅ @supabase/supabase-js (déjà typée)

### chronikClient.js
```javascript
import axios from 'axios';
export const chronik = new ChronikClient(CHRONIK_URL);
```
**Impact**: Blockchain queries - CRITIQUE
**Dépendance Externe**: ✅ chronik-client (vérifier types)

### adminService.js
```javascript
import { supabase } from './supabaseClient';
import crypto from 'crypto';
```
**Impact**: Admin management
**Dépendance Interne**: supabaseClient.ts (sera migré)

### ticketService.js
```javascript
import { supabase } from './supabaseClient';
import { formatDistanceToNow } from 'date-fns';
```
**Impact**: Support tickets
**Dépendance Interne**: supabaseClient.ts (sera migré)

---

## 📝 Checklist de Migration

### Pour chaque service:
- [ ] Créer fichier `.ts` correspondant
- [ ] Copier code depuis `.js`
- [ ] Identifier types nécessaires
- [ ] Ajouter interfaces TypeScript
- [ ] Remplacer `any` par types spécifiques
- [ ] Ajouter JSDoc pour export publics
- [ ] Tester (imports, fonctionnalité)
- [ ] Mettre à jour imports dans autres fichiers
- [ ] Valider lint (`npm run lint`)
- [ ] Valider tests (`npm run test`)
- [ ] Supprimer `.js` original

### Types à Créer

#### src/types/services.ts (nouveau fichier)
```typescript
// Supabase
export interface Profile {
  id: string;
  wallet: string;
  name: string;
  status: 'active' | 'banned' | 'suspended';
  created_at: string;
}

// Blockchain
export interface ChronikUtxo {
  outpoint: { txid: string; vout: number };
  value: number;
  sats: bigint;
  isMintBaton?: boolean;
  token?: { tokenId: string; atoms: bigint };
}

// Admin
export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: 'ban' | 'unban' | 'suspend' | 'warn';
  profile_id: string;
  reason?: string;
  created_at: string;
}

// Tickets
export interface Ticket {
  id: string;
  client_id: string;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  message: string;
  created_at: string;
}
```

---

## 🔧 Commandes de Référence

```bash
# Renommer et migrer
mv src/services/supabaseClient.js src/services/supabaseClient.ts
# Éditer le fichier pour ajouter types

# Valider la migration
npm run lint
npm run build

# Tester les imports
grep -r "supabaseClient" src/ --include="*.ts" --include="*.tsx" --include="*.jsx"

# Valider après migration
npm test
```

---

## ⚠️ Risques et Mitigations

| Risque | Mitigation |
|--------|-----------|
| **Casser les imports** | Chercher tous les imports, mettre à jour avant suppression `.js` |
| **Dépendances circulaires** | Vérifier avec `npm run build` (webpack détectera) |
| **Types incomplets** | Utiliser `unknown` temporairement, refactor après |
| **Tests échouent** | Exécuter `npm test` après chaque fichier |

---

## 📅 Timeline Estimée

| Phase | Fichiers | Durée | Checkpoint |
|-------|----------|-------|-----------|
| **1** | supabaseClient, chronikClient | 1h | ✅ Core working |
| **2** | adminService, ticketService | 2.5h | ✅ No test regressions |
| **3** | addressBook, tokenLinked, history, antifraud | 4h | ✅ All 235 tests pass |
| **Total** | 8 fichiers | **7.5h** | 🟢 Production Ready |

---

## 📌 Notes Importantes

1. **Maintenir la compatibilité**: Ne pas changer les signatures d'export publics
2. **Tests en continu**: Exécuter `npm test` après chaque migration
3. **Documentation**: Ajouter JSDoc aux fonctions exportées
4. **Type Safety**: Remplacer tous les `any` par types spécifiques sauf si nécessaire
5. **Security First**: Vérifier CONTEXT.md règles dans chaque service

---

## 🎯 Success Criteria

- ✅ 0 `any` types (sauf exceptions documentées)
- ✅ 235/235 tests passants
- ✅ 0 ESLint errors (réduire warnings < 100)
- ✅ Build `npm run build` réussit
- ✅ Tous les imports mises à jour
- ✅ Zéro fichiers `.js` dans `src/services/`
