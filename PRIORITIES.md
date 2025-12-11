# 🎯 PRIORITÉS IMMÉDIATES - Farm Wallet

**Date** : 1er décembre 2025  
**Statut** : Migration CSS Custom terminée, stabilisation requise

---

## 🔴 URGENT - Cette Semaine

### 1. Nettoyage Technique (2-3 heures)

**Problème** : Dépendances obsolètes encore présentes dans node_modules

```bash
# Étape 1 : Supprimer le fichier postcss.config.cjs
rm postcss.config.cjs

# Étape 2 : Réinstallation propre
rm -rf node_modules package-lock.json
npm install

# Étape 3 : Vérification
npm list --depth=0 | grep extraneous
# Devrait retourner: (rien)

# Étape 4 : Test de build
npm run build
npm run dev
```

**Packages à éliminer** :
- ❌ `tailwindcss@4.1.17`
- ❌ `autoprefixer@10.4.22`
- ❌ `@tailwindcss/postcss@4.1.17`
- ❌ `eslint-plugin-storybook@0.7.0`
- ❌ Tous les packages "@tailwindcss/*"

---

### 2. Tests de Non-Régression (1-2 heures)

**Checklist manuelle** :

#### Pages Publiques
- [ ] `/` - DirectoryPage charge correctement
- [ ] `/farmer-info` - Affiche les infos
- [ ] `/faq` - FAQ accessible

#### Pages Privées (connecter wallet d'abord)
- [ ] `/wallet` - Dashboard affiche solde XEC et token
- [ ] `/send` - Formulaire d'envoi fonctionne
- [ ] `/settings` - Paramètres affichés
- [ ] `/favorites` - Liste des favoris

#### Fonctionnalités
- [ ] **Dark Mode** - Toggle fonctionne sur toutes les pages
- [ ] **i18n** - Switch FR ↔ EN fonctionne
- [ ] **Responsive** - Tester à 375px, 768px, 1024px
- [ ] **Blockchain Status** - Indicateur "connected" s'affiche
- [ ] **QR Code** - Scanner et génération fonctionnent

---

### 3. Supprimer Logs Debug (30 min)

**Fichiers à nettoyer** :

```javascript
// src/pages/WalletDashboard.jsx ligne 52
- // DEBUG: Log address
- console.log('📍 ADRESSE DASHBOARD:', address);

// src/pages/SettingsPage.jsx
- console.log('🏠 Hook address extracted:', address);
- console.log('📍 ADRESSE SETTINGS:', address);

// Garder uniquement les logs d'erreur
```

**Règle** : En production, uniquement `console.error()` et `console.warn()`

---

## 🟠 IMPORTANT - 2 Semaines

### 4. Implémenter WalletDashboard v2 (4-6 heures)

**Référence** : `docs/WALLET_DASHBOARD_REDESIGN.md`

**Fonctionnalités** :
1. **Sélecteur de Ferme** (dropdown)
   - Liste uniquement les favoris
   - Si vide : bouton "➕ Choisir une ferme"
   - Checkmark ✓ pour fermes vérifiées

2. **Affichage Balance** (split 70/30)
   ```
   ┌─────────────────────────────────┐
   │  Token Balance │ XEC Balance   │
   │  (grande font) │ (petite font) │
   │  70%           │ 30%           │
   └─────────────────────────────────┘
   ```

3. **Onglets Recevoir / Envoyer**
   - Recevoir : QR Code + adresse copiable
   - Envoyer : Formulaire envoi

**Fichiers à modifier** :
- `src/pages/WalletDashboard.jsx`
- `src/styles/home.css`

---

### 5. Scanner Automatique des Tokens (3-4 heures)

**Fichier** : `src/pages/SendPage.jsx` ligne 49

**Objectif** : Au lieu de `availableTokens = []`, scanner le wallet

**Implémentation** :
```javascript
// Nouvelle fonction dans ecashWallet.js
async getWalletTokens() {
  const utxos = await this.getUtxos();
  const tokenUtxos = utxos.filter(utxo => utxo.token);
  
  // Grouper par tokenId
  const tokensMap = new Map();
  tokenUtxos.forEach(utxo => {
    const { tokenId, amount } = utxo.token;
    const current = tokensMap.get(tokenId) || 0;
    tokensMap.set(tokenId, current + BigInt(amount));
  });
  
  // Fetch info pour chaque token
  const tokens = [];
  for (const [tokenId, balance] of tokensMap) {
    const tokenInfo = await this.getTokenInfo(tokenId);
    tokens.push({ ...tokenInfo, balance });
  }
  
  return tokens;
}
```

**Usage dans SendPage** :
```javascript
const [availableTokens, setAvailableTokens] = useState([]);

useEffect(() => {
  if (wallet) {
    wallet.getWalletTokens().then(setAvailableTokens);
  }
}, [wallet]);
```

---

### 6. Améliorer Messages d'Erreur (2 heures)

**Fichiers** : `SendXEC.jsx`, `TokenSend.jsx`

**Actuellement** :
```javascript
throw new Error('Insufficient balance');
```

**Amélioration** :
```javascript
throw new Error(
  t('errors.insufficient_balance', {
    required: amountXec,
    available: balance
  })
);
```

**Ajouter dans i18n** :
```json
{
  "errors": {
    "insufficient_balance": "Solde insuffisant. Requis: {{required}} XEC, Disponible: {{available}} XEC",
    "invalid_address": "Adresse eCash invalide. Format attendu: ecash:q...",
    "amount_too_small": "Montant trop petit. Minimum: 5.46 XEC (dust limit)",
    "network_error": "Erreur réseau. Vérifiez votre connexion."
  }
}
```

---

## 🟡 MOYEN TERME - 1 Mois

### 7. Tests Automatisés (6-8 heures)

**Objectif** : Coverage > 50%

**Framework** : Vitest + React Testing Library

**Installation** :
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Tests prioritaires** :
1. `src/services/ecashWallet.test.js`
   - `getBalance()` calcule correctement
   - `sendXec()` construit transaction valide
   - `getTokenBalance()` retourne bon montant

2. `src/utils/format.test.js` (si fichier existe)
   - Formatage montants XEC
   - Formatage adresses

3. `src/hooks/useBalance.test.js`
   - Hook retourne balance correcte
   - Mise à jour en temps réel

**Config** : `vite.config.js`
```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js'
  }
});
```

---

### 8. Documentation Utilisateur (4 heures)

**Créer** : `docs/USER_GUIDE.md`

**Sections** :
1. **Premiers Pas**
   - Créer un wallet
   - Importer un wallet existant
   - Sauvegarder son seed

2. **Envoyer/Recevoir**
   - Recevoir XEC (QR code)
   - Envoyer XEC
   - Envoyer tokens

3. **Gérer les Fermes**
   - Ajouter aux favoris
   - Sélectionner une ferme
   - Voir les détails

4. **Paramètres**
   - Changer la langue
   - Activer dark mode
   - Exporter wallet

5. **Sécurité**
   - Bonnes pratiques
   - Que faire en cas de perte ?

---

### 9. CI/CD GitHub Actions (2 heures)

**Créer** : `.github/workflows/ci.yml`

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test # Quand tests unitaires seront créés

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

**Créer** : `.github/workflows/deploy.yml` (Vercel/Netlify)

---

## 📊 Indicateurs de Progression

### Semaine 1 (Urgent)
- [x] Analyse complète du projet
- [x] README mis à jour
- [x] ROADMAP créé
- [ ] Dépendances nettoyées
- [ ] Tests de non-régression OK
- [ ] Logs debug supprimés

### Semaine 2-3 (Important)
- [ ] WalletDashboard v2 implémenté
- [ ] Scanner tokens automatique
- [ ] Messages d'erreur améliorés

### Mois 1 (Moyen terme)
- [ ] Tests unitaires > 50% coverage
- [ ] Documentation utilisateur
- [ ] CI/CD configuré

---

## 🎯 Objectif Principal

**Livrer une v1.1 stable dans 3 semaines** :
- ✅ Zéro dépendance inutile
- ✅ Tests automatiques passants
- ✅ Documentation complète
- ✅ UX améliorée (WalletDashboard v2)
- ✅ Production-ready

---

## 📞 Prochaines Actions

### Aujourd'hui
1. ✅ Revoir cette roadmap
2. ⏳ Nettoyer dépendances (30 min)
3. ⏳ Tests manuels (1h)

### Demain
4. ⏳ Supprimer logs debug (30 min)
5. ⏳ Commencer WalletDashboard v2 (2h)

### Cette Semaine
6. ⏳ Finir Dashboard v2
7. ⏳ Implémenter scanner tokens
8. ⏳ Améliorer messages erreur

---

**Prêt à commencer ? Quelle tâche attaquer en premier ?** 🚀
