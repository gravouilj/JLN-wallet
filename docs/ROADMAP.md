# 🗺️ Farm Wallet - Roadmap & Priorités

**Date de mise à jour** : 1er décembre 2025  
**Version actuelle** : 1.0.0  
**Statut** : Projet en cours de refonte (migration Tailwind → CSS Custom)

---

## 📊 État Actuel

### ✅ Réalisé

1. **Migration CSS Custom**
   - ✅ Suppression de Tailwind CSS du code source
   - ✅ Suppression de Shadcn/UI
   - ✅ Création du système de variables CSS (`themes.css`)
   - ✅ Composants UI custom (`UI.jsx`)
   - ✅ Architecture CSS modulaire (layout, components, themes)

2. **Architecture Technique**
   - ✅ React 19 + Vite 6
   - ✅ State management avec Jotai
   - ✅ i18next pour l'internationalisation (fr/en)
   - ✅ React Router pour la navigation
   - ✅ Integration Chronik WebSocket
   - ✅ EcashWallet service (ecash-lib + chronik-client)

3. **Fonctionnalités**
   - ✅ Connexion/déconnexion wallet (mnémonique)
   - ✅ Affichage solde XEC et tokens
   - ✅ Envoi XEC et tokens
   - ✅ QR Code scan/génération
   - ✅ Dark mode
   - ✅ Annuaire des fermes
   - ✅ Système de favoris
   - ✅ Status blockchain en temps réel

4. **Documentation**
   - ✅ Conformité cahier des charges
   - ✅ Architecture wallet détaillée
   - ✅ Dashboard redesign
   - ✅ README mis à jour

---

## 🚨 Problèmes Critiques (À Résoudre IMMÉDIATEMENT)

### 1. 🧹 Nettoyage des Dépendances

**Priorité** : 🔴 **CRITIQUE**

**Problème** : 30+ packages "extraneous" pollent `node_modules` :
```
tailwindcss@4.1.17 (extraneous)
autoprefixer@10.4.22 (extraneous)
@tailwindcss/postcss@4.1.17 (extraneous)
eslint-plugin-storybook@0.7.0 (extraneous)
+ 26 autres packages inutiles
```

**Impact** :
- Alourdit l'installation (npm install lent)
- Risque de confusion (packages non utilisés mais présents)
- Build potentiellement impacté

**Solution** :
```bash
# Réinstallation propre
rm -rf node_modules package-lock.json
npm install
```

**Fichiers à supprimer** :
- ❌ `postcss.config.cjs` (référence encore Tailwind)

**Vérification** :
```bash
npm list --depth=0 | grep extraneous
# Devrait retourner 0 résultats
```

---

### 2. 🔍 Commentaires Trompeurs

**Priorité** : 🟡 **MOYENNE**

**Problème** : Commentaires obsolètes dans le code

**Fichiers concernés** :
- `src/components/UI.jsx` ligne 1 : "replacing shadcn/ui dependencies"
- `src/styles/themes.css` ligne 323 : "migrated to Tailwind"
- `src/components/Notification.jsx` ligne 22 : "instead of Tailwind"

**Solution** : Nettoyer ces commentaires pour éviter confusion

---

### 3. 🐛 TODOs et FIXMEs

**Priorité** : 🟡 **MOYENNE**

**Fichiers avec TODOs** :
1. `src/pages/SendPage.jsx` ligne 49
   ```javascript
   // TODO: Add tokens with balance > 0 (requires wallet token scan)
   ```
   → Implémenter scan automatique des tokens

2. `src/pages/SettingsPage.jsx` ligne 37-41
   ```javascript
   // FIX BUG: utilise UNIQUEMENT wallet.getBalance()
   ```
   → Vérifier si le bug est résolu

3. `src/pages/WalletDashboard.jsx` ligne 52
   ```javascript
   // DEBUG: Log address
   ```
   → Supprimer les logs debug en production

4. `src/pages/ManageTokenPage.jsx` ligne 152-171
   ```javascript
   // Créer une carte exemple pour les admins (mode debug)
   const renderAdminDebugCard = () => (...)
   ```
   → Garder pour debug admin ou supprimer ?

---

## 🎯 Priorités Court Terme (1-2 semaines)

### Phase 1 : Stabilisation (Priorité maximale)

#### 1.1 Nettoyage Complet
- [ ] Supprimer `postcss.config.cjs`
- [ ] Réinstaller proprement les dépendances (`rm -rf node_modules && npm install`)
- [ ] Vérifier qu'aucun package "extraneous" ne subsiste
- [ ] Tester `npm run build` sans erreur
- [ ] Tester `npm run dev` sans warning

#### 1.2 Tests de Non-Régression
- [ ] Tester toutes les pages principales
- [ ] Vérifier dark mode fonctionne partout
- [ ] Tester responsive (mobile 375px, tablet 768px)
- [ ] Vérifier internationalisation (fr/en)
- [ ] Tester envoi XEC (avec testnet)
- [ ] Tester envoi tokens
- [ ] Vérifier WebSocket Chronik

#### 1.3 Documentation
- [ ] Créer un CHANGELOG.md
- [ ] Documenter process de deployment
- [ ] Créer guide de contribution (CONTRIBUTING.md)
- [ ] Documenter les variables d'environnement

---

### Phase 2 : Amélioration UX (Priorité haute)

#### 2.1 WalletDashboard
- [ ] Implémenter sélecteur de ferme (dropdown avec favoris)
- [ ] Refonte affichage balance (split 70/30 Token/XEC)
- [ ] Onglets Recevoir/Envoyer
- [ ] Animation transitions

**Référence** : `docs/WALLET_DASHBOARD_REDESIGN.md`

#### 2.2 SendPage
- [ ] Scanner automatique des tokens avec balance > 0
- [ ] Dropdown intelligent pour sélection token
- [ ] Améliorer validation formulaire
- [ ] Messages d'erreur plus explicites

#### 2.3 DirectoryPage
- [ ] Pagination des fermes
- [ ] Filtres avancés (vérifié, par catégorie)
- [ ] Recherche en temps réel
- [ ] Tri (alphabétique, popularité)

---

### Phase 3 : Fonctionnalités Avancées (Priorité moyenne)

#### 3.1 Multi-Token Management
- [ ] Scan automatique de tous les tokens du wallet
- [ ] Liste complète avec balances
- [ ] Affichage historique transactions par token
- [ ] Export CSV des transactions

#### 3.2 Performance
- [ ] Lazy loading des pages
- [ ] Cache intelligent Chronik (indexedDB ?)
- [ ] Optimisation bundle size
- [ ] Service Worker pour offline mode

#### 3.3 Sécurité
- [ ] Option "exporter seed" avec confirmation multiple
- [ ] Lock automatique après inactivité
- [ ] 2FA optionnel (TOTP)
- [ ] Whitelist d'adresses de confiance

---

## 🔮 Vision Long Terme (3+ mois)

### Fonctionnalités Blockchain

1. **NFT Support**
   - [ ] Affichage NFTs eCash
   - [ ] Galerie visuelle
   - [ ] Transfert NFTs

2. **DeFi Integration**
   - [ ] DEX integration (si disponible sur eCash)
   - [ ] Liquidity pools display
   - [ ] Staking (si applicable)

3. **DAO Features**
   - [ ] Voting sur propositions fermes
   - [ ] Governance tokens
   - [ ] Proposals submission

### Infrastructure

1. **Mobile App**
   - [ ] React Native version
   - [ ] Capacitor pour iOS/Android
   - [ ] Push notifications

2. **Backend API**
   - [ ] API REST pour les fermes (au lieu de farms.json static)
   - [ ] Analytics dashboard
   - [ ] Admin panel

3. **Monitoring**
   - [ ] Sentry pour error tracking
   - [ ] Analytics (Plausible ou similar privacy-friendly)
   - [ ] Performance monitoring (Web Vitals)

---

## 📋 Checklist Qualité

### Avant Chaque Release

- [ ] Tests E2E passent (Playwright)
- [ ] Pas d'erreurs ESLint
- [ ] Build production OK
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Tests manuels sur Chrome, Firefox, Safari
- [ ] Tests mobile iOS et Android
- [ ] Documentation à jour
- [ ] CHANGELOG.md mis à jour
- [ ] Git tag de version créé

---

## 🎨 Design System - Futures Améliorations

### Composants à Créer

1. **`<Modal>`** - Popup réutilisable
2. **`<Dropdown>`** - Menu déroulant custom
3. **`<Toast>`** - Notifications temporaires (améliorer `<Notification>`)
4. **`<Skeleton>`** - Loading placeholders
5. **`<Tabs>`** - Onglets réutilisables (pour Dashboard)
6. **`<Accordion>`** - Sections pliables
7. **`<Tooltip>`** - Info-bulles
8. **`<Badge>`** - Labels de statut

### Animations

- [ ] Page transitions (React Router)
- [ ] Micro-interactions (hover, click feedback)
- [ ] Loading states animés
- [ ] Skeleton screens

---

## 🚀 Deployment Strategy

### Environnements

1. **Development** (`npm run dev`)
   - Hot reload
   - Debug logs activés
   - Mock data disponible

2. **Staging** (à créer)
   - Build production
   - Testnet eCash
   - URL : staging.farm-wallet.app

3. **Production**
   - Build optimisé
   - Mainnet eCash
   - URL : farm-wallet.app
   - CDN (Cloudflare)

### CI/CD

- [ ] GitHub Actions pour tests automatiques
- [ ] Déploiement auto sur Vercel (ou Netlify)
- [ ] Preview deployments pour chaque PR
- [ ] Lighthouse CI intégré

---

## 🧪 Tests

### Coverage Actuel
- ✅ E2E : `tests/sendXEC.spec.js` (Playwright)
- ❌ Unit tests : 0%
- ❌ Integration tests : 0%

### Objectifs

1. **Unit Tests** (Vitest)
   - [ ] `src/services/ecashWallet.js` (90%+ coverage)
   - [ ] `src/utils/` (80%+ coverage)
   - [ ] `src/hooks/` (70%+ coverage)

2. **Integration Tests**
   - [ ] Wallet initialization flow
   - [ ] Send transaction flow
   - [ ] Token balance calculation

3. **E2E Tests** (Playwright)
   - [x] Send XEC
   - [ ] Send Token
   - [ ] Wallet creation
   - [ ] Import wallet (mnemonic)
   - [ ] Dark mode toggle
   - [ ] Language switch
   - [ ] Favorites management

---

## 📊 Métriques de Succès

### Performance
- **Lighthouse Score** : > 90 sur tous critères
- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3s
- **Bundle size** : < 300kb (gzip)

### Qualité Code
- **ESLint** : 0 erreur
- **Test Coverage** : > 70%
- **TypeScript** : Migration progressive (optionnel)

### UX
- **Mobile responsive** : 100% des pages
- **Accessibility** : WCAG 2.1 AA
- **i18n** : 100% des textes traduits

---

## 🤝 Contribution

### Pour Contribuer

1. Choisir une tâche dans cette roadmap
2. Créer une issue GitHub
3. Fork + branch (`feature/nom-feature`)
4. Coder + tests
5. Pull Request avec description détaillée

### Priorités Communautaires

Si vous souhaitez contribuer, priorisez :
1. 🔴 Phase 1 (Stabilisation) - Critique
2. 🟠 Phase 2 (UX) - Important
3. 🟡 Tests - Important
4. 🟢 Phase 3 (Features) - Nice to have

---

## 📞 Contact & Support

- **GitHub Issues** : Pour bugs et feature requests
- **Discussions** : Pour questions générales
- **Discord** : (à créer ?) Pour communauté

---

**Dernière mise à jour** : 1er décembre 2025  
**Prochain review** : 15 décembre 2025
