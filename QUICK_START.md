# ⚡ QUICK START - JLN Wallet

Bienvenue ! Ce document vous permet de prendre en main le projet **rapidement**.

> **Dernière mise à jour** : 2 janvier 2026  
> **Statut** : ✅ Production-Ready (8.2/10)

---

## 📋 TL;DR

**Ce projet** : Wallet eCash (XEC) pour gestion de profils et tokens P2P  
**Stack** : React 19 + TypeScript + Vite + CSS Custom (zero frameworks UI)  
**État** : 235 tests E2E passants, 0 vulnérabilités, prêt pour production

---

## 🚀 Installation (5 minutes)

```bash
# 1. Cloner
git clone https://github.com/jlngrvl/JLN-wallet.git
cd JLN-wallet

# 2. Installer les dépendances
npm install

# 3. Lancer le dev server
npm run dev
```

✅ Application disponible sur : http://localhost:5173

---

## 📖 Documents Essentiels (Ordre de lecture)

| # | Document | Description | Temps |
|---|----------|-------------|-------|
| 1 | Ce fichier | Démarrage rapide | 5 min |
| 2 | [README.md](./README.md) | Vue d'ensemble | 5 min |
| 3 | [PROJECT_STATUS.md](./PROJECT_STATUS.md) | État complet du projet | 10 min |
| 4 | [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) | Navigation docs | 5 min |

---

## 🧭 Architecture du Code

### Structure `/src`

```
src/
├── App.tsx                   # Point d'entrée, routes
├── atoms.ts                  # State management (Jotai)
├── main.tsx                  # Bootstrap React
│
├── components/               # Composants React
│   ├── UI/                   # Composants atomiques (Button, Card, Input, etc.)
│   ├── Admin/                # Dashboard admin
│   ├── Client/               # Formulaires client
│   ├── eCash/                # Actions blockchain (Send, Mint, Burn, etc.)
│   ├── Layout/               # Navigation, TopBar, BottomNav
│   ├── TokenPage/            # Affichage tokens
│   ├── AddressBook/          # Carnet d'adresses
│   └── TicketSystem/         # Support tickets
│
├── hooks/                    # 20+ Custom Hooks
│   ├── useEcashWallet.ts     # Hook principal wallet
│   ├── useSendToken.ts       # Envoi tokens
│   ├── useMintToken.ts       # Mint tokens
│   ├── useBurnToken.ts       # Burn tokens
│   ├── useAirdropToken.ts    # Airdrop
│   ├── useChronikWebSocket.ts # Temps réel
│   └── index.ts              # Exports centralisés
│
├── services/                 # Services métier
│   ├── ecashWallet.ts        # 🔑 CORE - Logique wallet blockchain
│   ├── profilService.ts      # Gestion profils Supabase
│   ├── adminService.ts       # Actions admin
│   ├── ticketService.ts      # Tickets support
│   └── supabaseClient.ts     # Client Supabase
│
├── pages/                    # Pages de l'application
│   ├── DirectoryPage.tsx     # Annuaire (page d'accueil)
│   ├── ClientWalletPage.tsx  # Dashboard wallet
│   ├── TokenPage.tsx         # Détails token
│   ├── SettingsPage.tsx      # Paramètres
│   └── AdminDashboard.tsx    # Admin (lazy loaded)
│
├── styles/                   # CSS pur (zero frameworks)
│   ├── themes.css            # 🎨 Variables CSS (couleurs, spacing)
│   ├── layout.css            # Structure layout
│   ├── components.css        # Styles composants
│   └── utilities.css         # Classes utilitaires
│
├── types/                    # Types TypeScript
│   └── index.ts              # Définitions types
│
└── i18n/                     # Internationalisation
    ├── index.ts              # Config i18next
    └── locales/              # Traductions (fr, en, de, es, it, pt)
```

### Fichiers Critiques

| Fichier | Description | ⚠️ Attention |
|---------|-------------|--------------|
| `src/services/ecashWallet.ts` | Cœur logique blockchain | Ne pas modifier sans comprendre |
| `src/atoms.ts` | State global Jotai | Affects toute l'app |
| `src/styles/themes.css` | Design tokens CSS | Source de vérité styling |
| `src/config/constants.ts` | Configuration | URLs Chronik, Supabase keys |

---

## 🎨 Design System

### Variables CSS (themes.css)

```css
/* Couleurs principales */
--primary: #0074e4;           /* Bleu eCash */
--accent-success: #10b981;    /* Vert succès */
--accent-danger: #ef4444;     /* Rouge erreur */

/* Backgrounds */
--bg-primary: #ffffff;        /* Light mode */
--bg-secondary: #fafbfc;

/* Texte */
--text-primary: #1a202c;
--text-secondary: #4a5568;

/* Spacing */
--spacing-xs: 0.25rem;        /* 4px */
--spacing-sm: 0.5rem;         /* 8px */
--spacing-md: 1rem;           /* 16px */
--spacing-lg: 1.5rem;         /* 24px */
```

### Composants UI

```tsx
import { Card, Button, Input, Stack, Badge } from '../components/UI';

// Exemple
<Card>
  <Stack spacing="md">
    <Input label="Adresse" value={address} onChange={setAddress} />
    <Button variant="primary" onClick={handleSend}>
      Envoyer
    </Button>
  </Stack>
</Card>
```

> ⚠️ **IMPORTANT** : Pas de Tailwind, pas de Shadcn, pas de Bootstrap !  
> Utiliser uniquement les composants UI existants et les variables CSS.

---

## 🔧 State Management (Jotai)

```typescript
import { useAtom, useAtomValue } from 'jotai';
import { walletAtom, balanceAtom, selectedProfileAtom } from '../atoms';

function MyComponent() {
  const wallet = useAtomValue(walletAtom);        // Instance EcashWallet
  const balance = useAtomValue(balanceAtom);      // Solde XEC
  const [profile, setProfile] = useAtom(selectedProfileAtom);
}
```

### Atoms Principaux

| Atom | Type | Description |
|------|------|-------------|
| `walletAtom` | `EcashWallet \| null` | Instance wallet |
| `mnemonicAtom` | `string \| null` | Mnémonique (in-memory) |
| `balanceAtom` | `number` | Solde spendable (XEC) |
| `selectedProfileAtom` | `ProfileData \| null` | Profil sélectionné |
| `themeAtom` | `'light' \| 'dark'` | Thème actuel |
| `localeAtom` | `string` | Langue (fr/en) |

---

## 🌐 Services Blockchain

### EcashWallet (Core)

```typescript
import { EcashWallet } from '../services/ecashWallet';

// Créer wallet
const wallet = new EcashWallet(mnemonic);

// Obtenir adresse
const address = wallet.address;

// Obtenir balance
const { balance, totalBalance, balanceBreakdown } = await wallet.getBalance();

// Envoyer XEC
const txid = await wallet.sendXec(toAddress, amountXec);

// Envoyer token
const txid = await wallet.sendToken(tokenId, toAddress, amount, decimals);

// Mint token
const txid = await wallet.mintToken(tokenId, amount, decimals);

// Burn token
const txid = await wallet.burnToken(tokenId, amount, decimals);
```

### Hooks Recommandés

Préférer les hooks aux appels directs :

```typescript
import { useEcashWallet, useEcashBalance, useSendToken } from '../hooks';

function SendComponent() {
  const { wallet, address } = useEcashWallet();
  const { balance, refreshBalance } = useEcashBalance();
  const { sendToken, loading, error } = useSendToken();
  
  const handleSend = async () => {
    const txid = await sendToken(tokenId, toAddress, amount);
    // Notification + refresh automatiques
  };
}
```

---

## 🧪 Tests

### Lancer les Tests E2E

```bash
# Installer navigateurs (première fois)
npx playwright install

# Lancer tous les tests
npm test

# Mode interactif (UI)
npm run test:ui

# Test spécifique
npx playwright test tests/wallet.spec.ts
```

### Tests Manuels (Checklist)

- [ ] `/` - Directory charge correctement
- [ ] `/wallet` - Dashboard affiche balance
- [ ] Toggle dark mode fonctionne
- [ ] Switch langue FR/EN fonctionne
- [ ] Responsive mobile (375px)

---

## 📝 Conventions Code

### Nommage

```typescript
// Components: PascalCase
const MyComponent = () => {}

// Hooks: camelCase avec prefix use
const useMyHook = () => {}

// Services: camelCase
const myService = {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://...'

// CSS classes: kebab-case
.my-component { }
```

### Structure Composant

```tsx
// 1. Imports React
import { useState, useEffect } from 'react';

// 2. Imports externes
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

// 3. Imports locaux
import { Card, Button } from '../components/UI';
import { useEcashWallet } from '../hooks';

// 4. Types
interface MyComponentProps {
  tokenId: string;
}

// 5. Component
export const MyComponent: React.FC<MyComponentProps> = ({ tokenId }) => {
  // Hooks
  const { t } = useTranslation();
  const { wallet } = useEcashWallet();
  const [state, setState] = useState();
  
  // Handlers
  const handleClick = () => {};
  
  // Effects
  useEffect(() => {}, []);
  
  // Render
  return (
    <Card>...</Card>
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
style: formatage code
test: ajout tests
chore: tâches maintenance
```

---

## 🔍 Debug

### Console Navigateur (F12)

```javascript
// Vérifier wallet
console.log('Wallet:', localStorage.getItem('jln_wallet_vault'));
console.log('Theme:', localStorage.getItem('jlnwallet-theme'));
console.log('Language:', localStorage.getItem('jlnwallet-language'));
```

### Logs Applicatifs

L'application utilise des emojis pour les logs :
- `🏗️` Construction/Init
- `✅` Succès
- `❌` Erreur
- `🔄` Refresh
- `💰` Transaction
- `🔒` Sécurité

---

## ❓ FAQ

### "Comment ajouter un nouveau composant UI ?"
→ Ajouter dans `src/components/UI/` et exporter depuis `index.ts`

### "Comment ajouter une nouvelle page ?"
→ Créer dans `src/pages/` et ajouter la route dans `App.tsx`

### "Comment ajouter une traduction ?"
→ Modifier les fichiers JSON dans `src/i18n/locales/`

### "Comment tester les transactions ?"
→ Utiliser un wallet avec du XEC sur mainnet (pas de testnet actif)

---

## 📚 Documentation Complète

Voir [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) pour la navigation complète.

---

**Bon développement !** 🚀
