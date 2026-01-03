# ⚡ QUICK START - Développeur Reprenant le Projet

Bienvenue ! Ce document vous permet de prendre en main le projet **rapidement**.

---

## 📋 TL;DR

**Ce qui a été fait** : Migration de Tailwind/Shadcn vers CSS custom pur  
**Ce qu'il reste** : Nettoyage final et nouvelles fonctionnalités  
**Prochaine étape** : Nettoyer les dépendances extraneous

---

## 🚀 Installation (5 minutes)

```bash
# 1. Cloner (si pas déjà fait)
cd /workspaces/farm-wallet-independant

# 2. Installer les dépendances
npm install

# 3. Créer le fichier .env
echo "VITE_TOKEN_ID=your_token_id_here" > .env

# 4. Lancer le dev server
npm run dev
```

Ouvrir : http://localhost:5173

---

## 📖 Documents Essentiels (Lire dans cet ordre)

### 1. **README.md** (5 min)
Vue d'ensemble du projet, stack technique, installation

### 2. **PROJECT_STATUS.md** (10 min)
État actuel complet : architecture, métriques, problèmes identifiés

### 3. **PRIORITIES.md** (5 min)
Liste des tâches urgentes, importantes, et moyen terme

### 4. **ROADMAP.md** (15 min)
Vision long terme, phases de développement

### 5. **docs/CONFORMITE_CAHIER_DES_CHARGES.md** (10 min)
Détails techniques : variables CSS, breakpoints, atomes Jotai

---

## 🎯 Première Tâche (30 minutes)

### Nettoyage des Dépendances

**Problème** : 30+ packages "extraneous" dans node_modules

**Solution** :

```bash
# 1. Supprimer le fichier postcss obsolète
rm postcss.config.cjs

# 2. Réinstallation propre
rm -rf node_modules package-lock.json
npm install

# 3. Vérifier qu'il n'y a plus d'extraneous
npm list --depth=0 | grep extraneous
# Devrait retourner : (rien)

# 4. Tester le build
npm run build

# 5. Tester le dev
npm run dev
```

**Résultat attendu** :
- ✅ Build sans erreur
- ✅ Dev server démarre
- ✅ Pas de packages extraneous
- ✅ Application fonctionne normalement

---

## 🧭 Architecture Rapide

### Dossiers Importants

```
src/
├── components/
│   ├── UI.jsx              ⭐ Composants atomiques (Card, Button, Stack...)
│   ├── Layout/             📐 TopBar, BottomNav, MobileLayout
│   ├── ECashWallet.jsx     💰 Composant wallet principal
│   └── SendXEC.jsx         💸 Formulaire envoi XEC
│
├── pages/
│   ├── WalletDashboard.jsx 🏠 Dashboard (à améliorer)
│   ├── DirectoryPage.jsx   📋 Annuaire fermes
│   └── SendPage.jsx        💸 Page envoi
│
├── services/
│   ├── ecashWallet.js      🔑 CORE - Logique wallet
│   └── chronikClient.js    🌐 Client blockchain
│
├── hooks/
│   ├── useEcashWallet.js   🪝 Hook principal wallet
│   ├── useBalance.js       💵 Hook balance
│   └── useToken.js         🪙 Hook token info
│
├── styles/
│   ├── themes.css          🎨 Variables CSS (light/dark)
│   ├── layout.css          📐 Structure layout
│   └── components.css      🧱 Styles composants
│
└── atoms.js                ⚛️ State management (Jotai)
```

### Fichiers Critiques

**Ne JAMAIS modifier sans comprendre** :
1. `src/services/ecashWallet.js` - Cœur logique wallet
2. `src/atoms.js` - State management global
3. `src/styles/themes.css` - Variables CSS design system

**Modifier fréquemment** :
1. Pages dans `src/pages/`
2. Composants UI dans `src/components/`
3. Styles dans `src/styles/`

---

## 🎨 Design System

### Variables CSS (themes.css)

```css
/* Couleurs principales */
--accent-primary: #0074e4;    /* Bleu eCash */
--accent-success: #10b981;    /* Vert succès */
--accent-danger: #ef4444;     /* Rouge erreur */

/* Backgrounds */
--bg-primary: #ffffff;        /* Fond principal */
--bg-secondary: #fafbfc;      /* Fond secondaire */

/* Text */
--text-primary: #1a202c;      /* Texte principal */
--text-secondary: #4a5568;    /* Texte secondaire */
```

### Composants UI (UI.jsx)

```jsx
import { Card, Button, Stack, PageHeader } from '@/components/UI';

// Card
<Card>
  <CardHeader>Titre</CardHeader>
  <CardContent>Contenu</CardContent>
</Card>

// Button
<Button variant="primary" onClick={handleClick}>
  Envoyer
</Button>

// Stack (flexbox helper)
<Stack direction="row" spacing="16px" align="center">
  <div>Item 1</div>
  <div>Item 2</div>
</Stack>
```

---

## 🔧 State Management (Jotai)

**Fichier** : `src/atoms.js`

### Atoms Principaux

```javascript
import { useAtom } from 'jotai';
import { walletAtom, balanceAtom, tokenAtom, themeAtom } from '@/atoms';

function MyComponent() {
  const [wallet] = useAtom(walletAtom);        // Instance EcashWallet
  const [balance] = useAtom(balanceAtom);      // Solde XEC
  const [token] = useAtom(tokenAtom);          // Info token
  const [theme, setTheme] = useAtom(themeAtom); // light/dark
}
```

### Liste Complète

- `walletAtom` - Wallet instance
- `balanceAtom` - Solde spendable
- `totalBalanceAtom` - Solde total (+ dust)
- `tokenAtom` - Token info
- `priceAtom` - Prix XEC/USD
- `themeAtom` - Theme (light/dark)
- `localeAtom` - Langue (fr/en)
- `blockchainStatusAtom` - Statut Chronik

---

## 🌐 Services Blockchain

### ecashWallet.js

```javascript
import { EcashWallet } from '@/services/ecashWallet';

// Créer wallet
const wallet = new EcashWallet(mnemonic, hdPath);

// Obtenir balance
const { balance, totalBalance } = await wallet.getBalance();

// Envoyer XEC
const txid = await wallet.sendXec(toAddress, amountXec);

// Obtenir balance token
const tokenBalance = await wallet.getTokenBalance(tokenId);
```

### chronikClient.js

```javascript
import { chronik } from '@/services/chronikClient';

// Obtenir UTXOs
const utxos = await chronik.utxos(address);

// Obtenir info token
const tokenInfo = await chronik.token(tokenId);

// Broadcaster transaction
const txid = await chronik.broadcastTx(rawTx);
```

---

## 🐛 Debugging

### Console Navigateur (F12)

**Vérifier wallet** :
```javascript
console.log('=== WALLET DEBUG ===');
console.log('Mnemonic exists:', !!localStorage.getItem('farm-wallet-mnemonic'));
console.log('Selected farm:', localStorage.getItem('farm-wallet-selected-farm'));
```

**Logs à surveiller** :
- `🏗️ EcashWallet constructor called`
- `✅ Wallet initialized - Address: ecash:q...`
- `🔍 useEcashWallet - Auto-init check:`

**Reset complet** (⚠️ ATTENTION) :
```javascript
localStorage.removeItem('farm-wallet-mnemonic');
localStorage.removeItem('farm-wallet-favorite-farms');
window.location.reload();
```

### Logs VSCode

Ajouter des logs temporaires :
```javascript
console.log('[DEBUG]', variableName, value);
console.error('[ERROR]', error);
console.warn('[WARN]', warning);
```

**IMPORTANT** : Supprimer avant commit !

---

## 🧪 Tests

### Lancer Tests E2E (Playwright)

```bash
# Installer navigateurs (première fois)
npx playwright install

# Lancer tous les tests
npm run test

# Mode interactif
npx playwright test --ui

# Test spécifique
npx playwright test tests/sendXEC.spec.js
```

### Tests Manuels

Checklist rapide :
- [ ] `/` - Directory charge
- [ ] `/wallet` - Dashboard affiche balance
- [ ] Toggle dark mode fonctionne
- [ ] Switch langue FR/EN fonctionne
- [ ] Responsive mobile (375px)

---

## 📝 Conventions Code

### Nommage

```javascript
// Components: PascalCase
const MyComponent = () => {}

// Functions: camelCase
const handleClick = () => {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://...'

// CSS classes: kebab-case
.my-component { }
```

### Imports

```javascript
// React en premier
import { useState, useEffect } from 'react';

// Puis libraries
import { useAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';

// Puis local
import { MyComponent } from '@/components/MyComponent';
import '@/styles/my-styles.css';
```

### Structure Composant

```jsx
// 1. Imports
import { useState } from 'react';
import { useAtom } from 'jotai';

// 2. Component
export const MyComponent = () => {
  // 3. Hooks
  const [state, setState] = useState();
  const [atom] = useAtom(myAtom);
  
  // 4. Handlers
  const handleClick = () => {};
  
  // 5. Effects
  useEffect(() => {}, []);
  
  // 6. Render
  return (
    <div>...</div>
  );
};
```

---

## 🚀 Workflow Git

```bash
# 1. Créer branche
git checkout -b feature/nom-feature

# 2. Coder + commit
git add .
git commit -m "feat: description courte"

# 3. Push
git push origin feature/nom-feature

# 4. Créer PR sur GitHub
```

### Convention Commits

```
feat: nouvelle fonctionnalité
fix: correction bug
refactor: refactoring sans changement fonctionnel
docs: mise à jour documentation
style: formatage code (pas CSS)
test: ajout tests
chore: tâches maintenance
```

---

## 📚 Ressources

### Documentation Projet
- `README.md` - Vue d'ensemble
- `ROADMAP.md` - Plan développement
- `docs/` - Documentation technique

### External Docs
- [React 19](https://react.dev/)
- [Jotai](https://jotai.org/)
- [Vite](https://vitejs.dev/)
- [eCash](https://e.cash/)
- [Chronik](https://chronik.be.cash/)

---

## 🆘 Aide

### Problème Fréquent

**Build échoue** :
```bash
rm -rf node_modules package-lock.json
npm install
```

**Wallet ne se connecte pas** :
- Vérifier localStorage (F12 > Application > Local Storage)
- Vérifier logs console
- Réinitialiser wallet (voir Debug Console)

**Dark mode ne fonctionne pas** :
- Vérifier `data-theme` sur `<html>`
- Vérifier variables CSS dans themes.css

**i18n affiche clés** :
- Vérifier fichiers dans `src/i18n/locales/`
- Vérifier init i18next dans `src/i18n/index.js`

---

## ✅ Checklist Premier Jour

- [ ] Lire README.md
- [ ] Lire PROJECT_STATUS.md
- [ ] Installer dépendances (`npm install`)
- [ ] Lancer dev server (`npm run dev`)
- [ ] Explorer l'app (créer wallet, naviguer)
- [ ] Nettoyer dépendances extraneous
- [ ] Tester build (`npm run build`)
- [ ] Lire PRIORITIES.md
- [ ] Choisir première tâche

---

**Prêt à développer ?** 🚀

**Prochaine action recommandée** : Nettoyer les dépendances (voir ci-dessus)
