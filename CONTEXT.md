# 📘 JLN Wallet - Contexte Technique & Règles

## 🎯 Vue d'ensemble
JLN Wallet est un portefeuille web non-custodial pour la blockchain eCash (XEC).
Il permet de gérer des XEC et des eTokens (SLP/ALP), avec des fonctionnalités avancées pour les créateurs (Mint, Burn, Airdrop).

## 🛠️ Stack Technique
- **Core Framework**: React 19 + Vite 6
- **Language**: JavaScript (UI) + TypeScript (Services Critiques)
- **State Management**: Jotai (Atomic state)
- **Styling**: CSS Custom (No Tailwind framework dependencies)
- **Blockchain**: `ecash-lib`, `chronik-client`
- **Backend**: Supabase (Authentification anonyme & DB Profils)
- **Testing**: Playwright (E2E)

## 🔒 Règles de Sécurité (CRITIQUE)
1. **Zéro Stockage en Clair** : Le mnémonique (Seed Phrase) ne doit JAMAIS être stocké en `localStorage` ou `sessionStorage`.
2. **Architecture RAM-Only** : La clé privée déchiffrée réside uniquement dans l'atome `mnemonicAtom` (Jotai) en mémoire vive.
3. **Chiffrement** : Le stockage persistant se fait via `src/services/storageService.js` qui utilise `Web Crypto API` (AES-GCM).
4. **Sanitization** : Toute entrée utilisateur (montant, adresse) doit être validée avant envoi à la blockchain.

## 🏗️ Architecture du Code
- **`/src/services/`** : Logique métier pure (API, Crypto). **Doit être stateless.**
  - `ecashWallet.ts` : Cœur du wallet (TypeScript strict).
  - `supabaseClient.js` : Client DB unique.
- **`/src/atoms.js`** : État global de l'application. Source de vérité unique.
- **`/src/config/constants.ts`** : Toutes les constantes (URLs, Chemins, Clés). **Aucune "Magic String" dans le code.**
- **`/src/components/`** : Composants UI réutilisables.
- **`/src/pages/`** : Pages principales routées.

## 🔄 Workflow de Développement
1. **Modification Logic** : Prioriser `ecashWallet.ts`. Vérifier les types dans `src/types/index.ts`.
2. **Build** : Toujours lancer `npm run build` avant de commit pour vérifier les imports statiques/dynamiques.
3. **Imports** : Utiliser des imports statiques (`import { X } from Y`) en haut des fichiers. Éviter `await import()` à l'intérieur des composants pour optimiser le tree-shaking.

## ⚠️ Dettes Techniques Connues
- L'UI est encore majoritairement en `.jsx`. La migration vers `.tsx` est encouragée pour les nouveaux composants.

## 💰 Règles Métier eCash (XEC)
1.  **Unité** : 1 XEC = 100 Satoshis (Sats). Contrairement au Bitcoin (10^8), eCash a 2 décimales.
    *   *Conversion* : `BigInt(Math.round(Number(amountXec) * 100))`
2.  **Dust Limit** : Une transaction ne peut pas envoyer moins de **546 sats** (5.46 XEC). Le code doit bloquer ou avertir en dessous.
3.  **eTokens (SLP/ALP)** :
    *   **Mint Baton** : Si un UTXO a `isMintBaton: true`, c'est le droit de créer des tokens. Il ne doit JAMAIS être brûlé accidentellement lors d'un envoi simple.
    *   **Offre Fixe** : Un token sans Mint Baton actif a une offre fixe.
    *   **Calcul** : Les tokens ont leurs propres décimales (0 à 9). Toujours utiliser les métadonnées on-chain pour le formatage.