# 🎯 NEXT ACTIONS - À Faire Maintenant

**Date** : 1er décembre 2025  
**Statut Projet** : 🟢 Priorité #1 & #2 TERMINÉES ✅

---

## ✅ TERMINÉ

### ✅ Priorité #1: Nettoyage Dépendances
- ✅ Packages extraneous supprimés (0 vs ~30)
- ✅ Build OK | Dev OK
- ✅ Repository créé: https://github.com/jlngrvl/farm-wallet-independant

### ✅ Priorité #2: Logs Debug Supprimés
- ✅ WalletDashboard.jsx nettoyé
- ✅ SettingsPage.jsx nettoyé

---

## ⚡ PRIORITÉ #3 - MAINTENANT (4-6h)

### 🎨 Dashboard v2 Implementation

**Référence** : `docs/WALLET_DASHBOARD_REDESIGN.md`

**Fonctionnalités à implémenter** :

1. **Sélecteur de Ferme (Dropdown)** - 1-2h
   - Liste favoris uniquement
   - Bouton "Choisir une ferme" si vide
   - Checkmark ✓ pour fermes vérifiées
   - Auto-sélection si 1 seul favori

2. **Balance Split 70/30** - 1-2h
   ```
   ┌──────────────────────────┬──────────┐
   │  Token Balance (70%)     │ XEC (30%)│
   │  Grande police grasse    │ Petite   │
   └──────────────────────────┴──────────┘
   ```
   - Token à gauche (2.5rem bold, couleur primaire)
   - XEC à droite (1.5rem, label "Frais réseau")
   - Séparateur vertical

3. **Onglets Recevoir/Envoyer** - 2h
   - Tabs UI (Recevoir actif par défaut)
   - Recevoir : QR code + adresse copiable
   - Envoyer : Formulaire envoi (réutiliser SendXEC)

**Fichiers à modifier** :
- `src/pages/WalletDashboard.jsx` (structure)
- `src/styles/home.css` (layout 70/30, tabs)

**Commandes** :
```bash
# Créer une branche pour Dashboard v2
git checkout -b feature/dashboard-v2

# Après implémentation
npm run dev  # Tester
npm run build  # Vérifier compilation
git add .
git commit -m "feat: implement Dashboard v2 (Priority #3)"
```

---

## 📚 Documents à Consulter

- [ROADMAP.md](./ROADMAP.md) - Vision long terme
- [PRIORITIES.md](./PRIORITIES.md) - Toutes priorités
- [docs/WALLET_DASHBOARD_REDESIGN.md](./docs/WALLET_DASHBOARD_REDESIGN.md) - Specs Dashboard v2
- [QUICK_START.md](./QUICK_START.md) - Guide développement

---

**Dernière mise à jour** : 1er décembre 2025


```bash
# Dans le terminal, exécuter :
cd /workspaces/farm-wallet-independant

# 1. Supprimer postcss.config.cjs
rm postcss.config.cjs

# 2. Réinstallation propre
rm -rf node_modules package-lock.json
npm install

# 3. Vérification
npm list --depth=0 | grep extraneous
# Résultat attendu : (rien)

# 4. Test build
npm run build

# 5. Test dev
npm run dev
```

**✅ Fait ?** Cocher quand terminé :
- [ ] postcss.config.cjs supprimé
- [ ] node_modules réinstallé
- [ ] Aucun package extraneous
- [ ] Build OK
- [ ] Dev server OK

---

## 📋 AUJOURD'HUI - Tests Manuels (1h)

### Checklist Pages

**Pages Publiques** :
- [ ] `/` - DirectoryPage charge
- [ ] `/farmer-info` - Affiche info
- [ ] `/faq` - FAQ accessible

**Pages Privées** (connecter wallet avant) :
- [ ] Créer/importer wallet fonctionne
- [ ] `/wallet` - Dashboard affiche balance
- [ ] `/send` - Formulaire envoi OK
- [ ] `/settings` - Paramètres affichés
- [ ] `/favorites` - Liste favoris OK

**Fonctionnalités** :
- [ ] Dark mode toggle fonctionne
- [ ] Switch FR ↔ EN fonctionne
- [ ] Responsive mobile (375px)
- [ ] Blockchain status "connected"
- [ ] QR code scanner fonctionne

**✅ Tout fonctionne ?** → Passer à l'étape suivante

---

## 🧼 DEMAIN - Nettoyer Code (1h)

### Supprimer Logs Debug

**Fichiers à modifier** :

1. **src/pages/WalletDashboard.jsx** (ligne 52)
   ```javascript
   // ❌ SUPPRIMER :
   // DEBUG: Log address
   console.log('📍 ADRESSE DASHBOARD:', address);
   ```

2. **src/pages/SettingsPage.jsx** (lignes 37-41)
   ```javascript
   // ❌ SUPPRIMER les console.log debug
   console.log('🏠 Hook address extracted:', address);
   console.log('📍 ADRESSE SETTINGS:', address);
   ```

3. **Vérifier autres fichiers**
   ```bash
   grep -r "console.log" src/ | grep -v "error\|warn"
   # Analyser et nettoyer
   ```

**Règle** : Garder uniquement `console.error()` et `console.warn()`

---

## 🎨 CETTE SEMAINE - Dashboard v2 (4-6h)

### Refonte WalletDashboard

**Référence** : `docs/WALLET_DASHBOARD_REDESIGN.md`

**Fonctionnalités à implémenter** :

1. **Sélecteur Ferme** (dropdown)
   - [ ] Liste favoris uniquement
   - [ ] Bouton "Choisir une ferme" si vide
   - [ ] Checkmark ✓ pour fermes vérifiées

2. **Balance Split 70/30**
   ```
   ┌──────────────────────────┬──────────┐
   │  Token Balance (70%)     │ XEC (30%)│
   │  Grande police           │ Petite   │
   └──────────────────────────┴──────────┘
   ```
   - [ ] Split layout CSS
   - [ ] Token à gauche (grande police)
   - [ ] XEC à droite (petite police)

3. **Onglets Recevoir/Envoyer**
   - [ ] Tabs UI (Recevoir actif par défaut)
   - [ ] Recevoir : QR code + adresse
   - [ ] Envoyer : Formulaire envoi

---

## 📝 CE MOIS - Suite des Priorités

### Semaine 2-3
- [ ] Scanner automatique tokens (SendPage)
- [ ] Messages d'erreur i18n améliorés
- [ ] Tests unitaires de base (Vitest)

### Semaine 4
- [ ] Tests E2E complets (Playwright)
- [ ] CI/CD GitHub Actions
- [ ] Documentation utilisateur

---

## 📚 Documents Importants

**À lire** :
1. 📖 [QUICK_START.md](./QUICK_START.md) - Démarrage rapide
2. 🎯 [PRIORITIES.md](./PRIORITIES.md) - Toutes les priorités détaillées
3. 🗺️ [ROADMAP.md](./ROADMAP.md) - Vision long terme
4. 📊 [PROJECT_STATUS.md](./PROJECT_STATUS.md) - État complet
5. 📚 [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - Navigation

---

## ✅ Progression

### ✅ Fait (1er décembre)
- [x] Audit complet du projet
- [x] README.md mis à jour
- [x] Documentation complète créée
- [x] Priorités établies

### ⏳ En Cours
- [ ] Nettoyage dépendances
- [ ] Tests de non-régression

### 📅 À Venir
- [ ] Dashboard v2
- [ ] Scanner tokens
- [ ] Tests automatisés

---

## 🚀 Commencer

**Prêt ?** Ouvrir un terminal et exécuter :

```bash
cd /workspaces/farm-wallet-independant
rm postcss.config.cjs
rm -rf node_modules package-lock.json
npm install
```

**Ensuite** : Cocher les tâches ci-dessus au fur et à mesure ! ✅

---

**Bon développement !** 🎉
