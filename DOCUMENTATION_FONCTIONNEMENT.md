# 📖 Documentation Complète – Farm Wallet (JLN Wallet)

## 1. Présentation Générale

Farm Wallet (JLN Wallet) est une application web de gestion de portefeuilles eCash (XEC) multi-profils et multi-tokens, conçue pour la simplicité, la sécurité et la performance. Elle permet à l’utilisateur de gérer ses fonds, ses tokens, ses profils, et d’interagir en temps réel avec la blockchain eCash, le tout dans une interface moderne, responsive et sans dépendance à un framework UI externe.

---

## 2. Architecture Technique

- **Frontend** : React 19, Vite
- **State Management** : Jotai (atoms persistés via localStorage)
- **Blockchain** : eCash (XEC), via chronik-client (WebSocket) et ecash-lib
- **Backend** : Supabase (profils, historique)
- **Internationalisation** : i18next (français/anglais)
- **Tests** : Playwright (E2E)
- **CSS** : Architecture custom, variables CSS, mobile-first

### Schéma des couches

```
┌──────────────────────────────┐
│  React Components/Pages      │
├──────────────────────────────┤
│  Jotai Atoms (State)         │
├──────────────────────────────┤
│  Custom React Hooks          │
├──────────────────────────────┤
│  Services (ecashWallet, ... )│
├──────────────────────────────┤
│  Blockchain libs (chronik,   │
│  ecash-lib, bip39, bip32)    │
└──────────────────────────────┘
```

---

## 3. Fonctionnalités Principales

- **Gestion de portefeuilles eCash** (création, import, déconnexion, persistance mnemonic)
- **Affichage et gestion du solde XEC et tokens** (balance, envoi, réception, mint, burn, airdrop)
- **Système de profils** (multi-profils, filtrage par token, stockage Supabase)
- **Mise à jour temps réel** (WebSocket Chronik)
- **Historique d’activité** (Supabase)
- **Interface responsive** (mobile-first, breakpoints 400/600/640/768px)
- **Thèmes light/dark** (variables CSS)
- **Internationalisation** (fr/en)
- **Sécurité** (aucune clé privée sur serveur, cryptographie locale, auditabilité)

---

## 4. Structure du Code

### 4.1 Dossiers clés

- `src/components/UI.jsx` : Composants atomiques (Card, Button, Stack, Input...)
- `src/components/TokenPage/TokenActions/` : Actions token modulaires (Send, Mint, Burn, etc.)
- `src/services/ecashWallet.js` : Service principal wallet (logique blockchain)
- `src/services/chronikClient.js` : Client blockchain (requêtes, WebSocket)
- `src/services/profilService.js` : Gestion profils (Supabase)
- `src/atoms.js` : Atoms Jotai (état global, persistance)
- `src/hooks/` : Hooks custom (wallet, balance, tokens, profils, admin, WebSocket, i18n)
- `src/styles/themes.css` : Variables CSS (thème, couleurs, breakpoints)
- `tests/` : Tests E2E Playwright

### 4.2 Flux de données

1. **Initialisation** : Chargement du mnemonic (localStorage) → création d’une instance `EcashWallet` → synchronisation avec la blockchain via Chronik.
2. **Gestion d’état** : Atoms Jotai pour wallet, solde, tokens, profils, thème, langue, etc.
3. **Hooks** : Abstraction de la logique métier (ex : `useEcashWallet`, `useEcashBalance`, `useEcashToken`, `useProfiles`...)
4. **Services** : Communication blockchain (Chronik, ecash-lib) et backend (Supabase).
5. **UI** : Composants atomiques, stylés via CSS custom, responsive.

---

## 5. Détail des Composants et Services

### 5.1 Composants UI
- **Card, Button, Stack, Input, Badge, Tabs** : Briques de base, réutilisables, stylées via CSS variables.
- **TokenActions** : Chaque action (envoi, mint, burn, message, airdrop) est un composant indépendant, reçoit ses props du parent, utilise les hooks/services pour la logique.

### 5.2 Services
- **ecashWallet.js** : Classe `EcashWallet` (génération clé, balance, envoi XEC/token, mint, burn, etc.), utilise `chronik-client` et `ecash-lib`.
- **chronikClient.js** : Singleton pour requêtes blockchain (UTXOs, tokens, broadcast, WebSocket).
- **profilService.js** : CRUD profils sur Supabase, synchronisation avec la blockchain pour les infos live.

### 5.3 Hooks
- **useEcashWallet** : Gestion du wallet (connexion, import, reset, etc.)
- **useEcashBalance** : Solde XEC, auto-refresh, breakdown UTXOs
- **useEcashToken** : Infos et balance d’un token, envoi, refresh
- **useProfiles** : Chargement et gestion des profils utilisateur
- **useChronikWebSocket** : Abonnement temps réel aux adresses du wallet
- **useTranslation** : i18n (fr/en)

---

## 6. Gestion d’État (Jotai)

- **walletAtom** : Instance du wallet
- **balanceAtom** : Solde XEC
- **tokenAtom** : Infos token actif
- **themeAtom** : Thème UI
- **localeAtom** : Langue
- **blockchainStatusAtom** : Statut Chronik (connecté, blockHeight, etc.)
- **selectedProfileAtom** : Profil sélectionné
- **currentTokenIdAtom** : TokenId actif

---

## 7. Intégration Blockchain

- **chronik-client** : Indexation blockchain, WebSocket, UTXOs, tokens
- **ecash-lib** : Construction/signature de transactions
- **@scure/bip39/bip32** : Génération mnémonique, dérivation HD
- **ecashaddrjs** : Encodage/décodage adresses
- **HD Path** : `m/44'/1899'/0'/0/0` (standard Cashtab)

---

## 8. Sécurité

- **Aucune clé privée sur serveur**
- **Cryptographie locale (navigateur)**
- **Persistance chiffrée (mnemonic)**
- **Auditabilité du code source**

---

## 9. Tests & Qualité

- **Playwright** : E2E tests (connexion, envoi, profils, tokens, QR, etc.)
- **Linting** : ESLint
- **CI/CD** : Scripts de build/test

---

## 10. Style & Design System

- **Aucun framework UI** (zéro Tailwind, Shadcn, Bootstrap)
- **CSS custom** : `themes.css` (variables, breakpoints, dark mode)
- **Composants atomiques** : `UI.jsx`
- **Responsive** : Mobile-first, breakpoints 400/600/640/768px

---

## 11. Internationalisation

- **i18next** : Support FR/EN, fichiers dans `src/i18n/locales/`
- **Utilisation** : `useTranslation()`

---

## 12. Backend (Supabase)

- **Tables** : `profiles`, `activity_history`
- **Gestion profils** : CRUD, filtrage par tokenId, persistance
- **Gestion historique** : Suivi des actions utilisateur

---

## 13. Fichiers et Répertoires Importants

- `src/components/UI.jsx` : Composants UI custom
- `src/services/ecashWallet.js` : Service wallet (core)
- `src/services/chronikClient.js` : Client blockchain
- `src/services/profilService.js` : Service profils
- `src/atoms.js` : Atoms Jotai
- `src/hooks/` : Hooks custom
- `src/styles/themes.css` : Variables CSS
- `tests/` : E2E tests
- `docs/` : Documentation technique

---

## 14. Avantages de l’Architecture

- **Modularité** : Ajout de features facile
- **Performance** : Bundle optimisé, HMR, WebSocket
- **Sécurité** : Contrôle total sur la cryptographie
- **Expérience développeur** : Code clair, typé, testable
- **Évolutivité** : Multi-profil, multi-token, multi-langue

---

## 15. Ressources & Documentation

- `README.md` : Vue d’ensemble
- `QUICK_START.md` : Guide développeur
- `docs/WALLET_ARCHITECTURE.md` : Architecture détaillée
- `docs/CONFORMITE_CAHIER_DES_CHARGES.md` : Spécifications CSS/UI
- `docs/COMPONENTS.md` : Référence composants
- `tests/README.md` : Guide tests

---

## 16. Utilité de l’Application

- **Gestion sécurisée de portefeuilles eCash**
- **Support multi-profils et multi-tokens**
- **Expérience utilisateur moderne, rapide, mobile**
- **Outil d’administration et d’audit pour créateurs de tokens**
- **Base technique solide pour extensions futures (multi-chain, nouveaux tokens, etc.)**

---

*Document généré automatiquement – 24/12/2025*