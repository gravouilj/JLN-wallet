# 🗺️ JLN Wallet - Roadmap

**Date de mise à jour** : 2 janvier 2026  
**Version actuelle** : 2.0.0-secure  
**Statut** : ✅ Production-Ready (8.2/10)

---

## 📊 État Actuel

### ✅ Phases Complétées

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1-3** | Migration CSS, Type Safety | ✅ Terminé |
| **Phase 4** | Client Support, Dashboard Admin | ✅ Terminé |
| **Phase 5.1-5.3** | Custom Hooks, Refactoring | ✅ Terminé |
| **Phase 5.4** | Design System Standardization | ✅ Terminé |
| **Phase 5.5** | Performance Optimization | ✅ Terminé |
| **Senior Audit** | Security Review | ✅ Terminé (Jan 2, 2026) |

### ✅ Fonctionnalités Implémentées

**Core Wallet**
- ✅ Connexion/déconnexion wallet (mnémonique chiffré)
- ✅ Affichage solde XEC et tokens
- ✅ Envoi XEC et tokens
- ✅ Airdrop XEC aux détenteurs de tokens
- ✅ Mint/Burn tokens (supply variable)
- ✅ Import tokens (supply fixe)
- ✅ QR Code scan/génération
- ✅ Dark mode

**Infrastructure**
- ✅ Architecture CSS Custom (Zero UI frameworks)
- ✅ State management Jotai
- ✅ i18next (FR/EN)
- ✅ Chronik WebSocket (temps réel)
- ✅ Supabase Backend
- ✅ 20 Custom Hooks
- ✅ 235 tests E2E Playwright

---

## 🎯 Phase 6 : Security & Quality (Jan 6-17, 2026)

### Sprint 6.1: Security Hardening (5-6 heures)
**Priorité** : 🔴 Haute

| Tâche | Effort | Status |
|-------|--------|--------|
| Rate limiting sur déverrouillage wallet | 2h | ⬜ |
| Session auto-timeout après inactivité | 2h | ⬜ |
| Vérification RLS Supabase | 1h | ⬜ |
| Headers de sécurité (CSP) | 1h | ⬜ |

### Sprint 6.2: Unit Tests (15-20 heures)
**Priorité** : 🟡 Moyenne

| Tâche | Effort | Status |
|-------|--------|--------|
| Setup Vitest + React Testing Library | 2h | ⬜ |
| Tests EcashWallet service | 6-8h | ⬜ |
| Tests Custom Hooks | 3-4h | ⬜ |
| Tests Services (profilService, etc.) | 4-6h | ⬜ |

**Objectif** : 50%+ coverage unit tests

### Sprint 6.3: Type Safety (6-8 heures)
**Priorité** : 🟢 Basse

| Tâche | Effort | Status |
|-------|--------|--------|
| Réduire `@typescript-eslint/no-explicit-any` | 4h | ⬜ |
| Types explicites pour services | 2h | ⬜ |
| Audit Props composants | 2h | ⬜ |

**Objectif** : Réduire de 334 → <100 warnings ESLint

---

## 🔮 Phase 7+ : Fonctionnalités Futures

### 7.1 Améliorations UX (Priorité Haute)
- [ ] Historique transactions amélioré avec filtres
- [ ] Export CSV des transactions
- [ ] Notifications push navigateur
- [ ] Mode hors ligne partiel (cache IndexedDB)

### 7.2 Token Management Avancé
- [ ] Multi-wallet support
- [ ] Batch transactions
- [ ] Recurring payments
- [ ] Token analytics dashboard

### 7.3 Performance
- [ ] Optimisation bundle (<250KB gzip)
- [ ] Cache intelligent Chronik
- [ ] Prefetch routes critiques
- [ ] Image lazy loading

### 7.4 Sécurité Avancée
- [ ] Hardware wallet support (optionnel)
- [ ] 2FA TOTP (optionnel)
- [ ] Whitelist d'adresses
- [ ] Export seed avec multi-confirmation

---

## 📱 Vision Long Terme (6+ mois)

### Mobile App
- [ ] Progressive Web App (PWA) améliorée
- [ ] React Native ou Capacitor
- [ ] Push notifications
- [ ] Biometric auth

### Ecosystem
- [ ] API publique documentée
- [ ] Widgets embeddables
- [ ] SDK JavaScript
- [ ] Intégration e-commerce

### Infrastructure
- [ ] Analytics (Plausible)
- [ ] Error tracking (Sentry)
- [ ] A/B testing
- [ ] Feature flags

---

## 📋 Métriques Qualité

### Objectifs Phase 6
| Métrique | Actuel | Objectif |
|----------|--------|----------|
| Score Global | 8.2/10 | 9/10 |
| Unit Test Coverage | 0% | 50% |
| ESLint Warnings | 334 | <100 |
| Vulnérabilités | 0 | 0 |
| Build Time | 4.42s | <4s |

### Checklist Release
- [ ] npm audit → 0 vulnérabilités
- [ ] ESLint → 0 erreurs
- [ ] TypeScript → 0 erreurs
- [ ] Tests E2E → 100% passants
- [ ] Lighthouse → >90 tous les scores

---

## 📅 Timeline Estimée

| Semaine | Phase | Focus |
|---------|-------|-------|
| Jan 6-10 | 6.1 + 6.2 | Security + Tests setup |
| Jan 13-17 | 6.2 + 6.3 | Tests complets + Types |
| Jan 20+ | 7.x | Nouvelles fonctionnalités |

---

## 📚 Documentation Associée

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - État détaillé du projet
- [docs/WALLET_ARCHITECTURE.md](./docs/WALLET_ARCHITECTURE.md) - Architecture technique
- [docs/PHASE_6_REMEDIATION_ROADMAP.md](./docs/PHASE_6_REMEDIATION_ROADMAP.md) - Détails Phase 6

---

**Dernière mise à jour** : 2 janvier 2026
