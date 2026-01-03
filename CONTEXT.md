# 📘 JLN Wallet - Contexte Technique & Règles

## 🎯 Vue d'ensemble
JLN Wallet est un portefeuille web non-custodial pour la blockchain eCash (XEC).
Il permet de gérer des XEC et des eTokens (SLP/ALP), avec des fonctionnalités avancées pour les créateurs.

## 🛠️ Stack Technique
- **Core Framework**: React 19 + Vite 6
- **Language**: TypeScript (Strict pour Services/Utils/UI Core) + JavaScript (Pages Legacy)
- **State Management**: Jotai (Atomic state)
- **Styling**: CSS Custom + Composants UI modulaires (`src/components/UI`)
- **Blockchain**: `ecash-lib`, `chronik-client`
- **Backend**: Supabase (Authentification anonyme & DB Profils)
- **Testing**: Vitest (Unit) + Playwright (E2E)

## 🔒 Règles de Sécurité (CRITIQUE)
1. **Zéro Stockage en Clair** : Le mnémonique ne doit JAMAIS être stocké brut.
2. **Architecture RAM-Only** : La clé privée déchiffrée réside uniquement dans l'atome `mnemonicAtom` (`src/atoms.ts`).
3. **Chiffrement** : Stockage persistant via `src/services/storageService.ts` (AES-GCM).
4. **Calculs** : Toujours utiliser `BigInt` pour les satoshis. Utiliser le helper `getSats(utxo)` dans `ecashWallet.ts`.

## 🏗️ Architecture du Code
- **`/src/services/`** : Logique métier (TypeScript).
  - `ecashWallet.ts` : Cœur du wallet.
  - `storageService.ts` : Persistance.
  - `supabaseClient.js` : Client DB.
- **`/src/types/`** : Définitions TypeScript globales (`index.ts`).
- **`/src/atoms.ts`** : État global Jotai typé.
- **`/src/config/constants.ts`** : Configuration centralisée.
- **`/src/components/UI/`** : Bibliothèque de composants atomiques (`Button.tsx`, `Card.tsx`, etc.).
- **`/src/pages/`** : Vues principales (encore majoritairement en `.jsx`).

## 🔄 Workflow de Développement
1. **Logique** : Modifier `ecashWallet.ts` en respectant les interfaces.
2. **UI** : Utiliser les composants de `@/components/UI`.
3. **Build** : Lancer `npm run build` pour vérifier le typage.
4. **Tests** : Lancer `npm run test:unit` après toute modification financière.

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