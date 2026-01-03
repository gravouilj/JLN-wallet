# Architecture Professionnelle eCash Wallet

## 🏗️ Architecture Technique

### Stack Technologique

```
┌─────────────────────────────────────────────────┐
│            React Application Layer              │
│  (Components, Pages, Hooks)                     │
├─────────────────────────────────────────────────┤
│         State Management (Jotai)                │
│  (Atoms for wallet, balance, tokens)            │
├─────────────────────────────────────────────────┤
│      Custom Hooks Layer                         │
│  - useEcashWallet                               │
│  - useEcashBalance                              │
│  - useEcashToken                                │
│  - useEcashXec                                  │
├─────────────────────────────────────────────────┤
│      Wallet Service Layer                       │
│  src/services/ecashWallet.ts                    │
│  - EcashWallet class                            │
│  - Transaction building                         │
│  - Key management                               │
├─────────────────────────────────────────────────┤
│      Blockchain Libraries                       │
│  ┌───────────────┐  ┌───────────────┐          │
│  │  chronik-client│  │  ecash-lib   │          │
│  │  (Query chain) │  │  (Tx signing)│          │
│  └───────────────┘  └───────────────┘          │
├─────────────────────────────────────────────────┤
│      Cryptography Layer                         │
│  - @scure/bip39 (Mnemonics)                     │
│  - @scure/bip32 (HD keys)                       │
│  - ecashaddrjs (Address encoding)               │
└─────────────────────────────────────────────────┘
```

## 📦 Packages NPM Utilisés

### Core Blockchain

- **chronik-client** (^2.2.1) : Client pour interroger la blockchain eCash
  - UTXOs
  - Balances
  - Token info
  - Transaction broadcasting

- **ecash-lib** (^4.3.2) : Bibliothèque pour construire et signer des transactions
  - TxBuilder
  - P2PKH signatures
  - Script generation

### Cryptography

- **@scure/bip39** (^1.5.4) : Gestion des mnémoniques BIP39
- **@scure/bip32** (^1.5.0) : Dérivation HD des clés
- **ecashaddrjs** (^2.0.0) : Encodage/décodage des adresses eCash

## 🔑 Wallet Service (`src/services/ecashWallet.ts`)

### Classe `EcashWallet`

Classe principale qui encapsule toute la logique du portefeuille.

#### Initialisation

```javascript
const wallet = new EcashWallet(mnemonic, hdPath);
```

**Processus d'initialisation :**
1. Conversion du mnemonic en seed (BIP39)
2. Dérivation HD des clés (BIP32)
3. Génération de l'adresse eCash
4. Création du script P2PKH

#### Méthodes Principales

##### 1. `getBalance()`
```javascript
const balance = await wallet.getBalance();
// Returns: { 
//   balance: 100.5,        // Spendable XEC
//   totalBalance: 105.5,   // Total including token dust
//   balanceSats: 10050,
//   totalBalanceSats: 10550,
//   utxos: [...]
// }
```

**Fonctionnement :**
- Query Chronik pour les UTXOs
- Sépare les UTXOs purs XEC des UTXOs avec tokens
- Calcule balance disponible vs totale

##### 2. `getTokenBalance(tokenId)`
```javascript
const tokenBalance = await wallet.getTokenBalance(tokenId);
// Returns: {
//   tokenId: "abc123...",
//   balance: "1000000",  // String for big numbers
//   utxos: [...]
// }
```

**Fonctionnement :**
- Filtre les UTXOs par tokenId
- Somme les montants de tokens
- Retourne les UTXOs utilisables

##### 3. `getTokenInfo(tokenId)`
```javascript
const info = await wallet.getTokenInfo(tokenId);
// Returns: {
//   tokenId: "abc123...",
//   tokenType: {...},
//   genesisInfo: {
//     tokenTicker: "FARM",
//     tokenName: "Farm Token",
//     decimals: 2
//   }
// }
```

##### 4. `sendXec(toAddress, amountXec)`
```javascript
const result = await wallet.sendXec("ecash:qp...", 100.5);
// Returns: {
//   txid: "abc123...",
//   rawTx: "0100000..."
// }
```

**Processus de transaction :**
1. Validation de l'adresse
2. Vérification du solde
3. Sélection des UTXOs (non-token)
4. Construction de la transaction avec TxBuilder
5. Ajout des inputs avec signatories
6. Ajout des outputs (destinataire + change)
7. Signature de la transaction
8. Broadcast via Chronik

##### 5. `sendToken(tokenId, toAddress, amount)`
```javascript
const result = await wallet.sendToken(
  "abc123...",
  "ecash:qp...", 
  "1000"
);
```

**Processus spécifique aux tokens :**
1. Vérification du solde de tokens
2. Sélection des UTXOs contenant le token
3. Ajout d'un UTXO XEC pour les frais
4. Construction des outputs :
   - Output token vers destinataire (+ 546 sats dust)
   - Output change token vers soi-même (si nécessaire)
5. Signature et broadcast

## 🪝 React Hooks (`src/hooks/useEcashWallet.ts`)

### `useEcashWallet()`

Hook principal pour la gestion du wallet.

```javascript
const {
  wallet,              // Instance EcashWallet
  walletConnected,     // Boolean
  loading,             // Boolean
  error,               // String | null
  generateNewWallet,   // Function
  importWallet,        // Function
  disconnectWallet,    // Function
  resetWallet,         // Function
  initializeWallet     // Function
} = useEcashWallet();
```

**Features :**
- Auto-initialisation au chargement si mnemonic existe
- Génération de nouveau wallet (12 mots)
- Import de wallet existant
- Persistance dans localStorage via Jotai atoms

### `useEcashBalance()`

Hook pour gérer le solde XEC.

```javascript
const {
  balance,           // Number (XEC)
  totalBalance,      // Number (XEC total)
  balanceBreakdown,  // Object with details
  loading,           // Boolean
  error,             // String | null
  refreshBalance     // Function
} = useEcashBalance();
```

**Features :**
- Auto-refresh au montage
- Calcul automatique du token dust
- Comptage des UTXOs par type

### `useEcashToken(tokenId)`

Hook pour opérations sur un token spécifique.

```javascript
const {
  tokenInfo,       // Object with ticker, name, decimals
  tokenBalance,    // String (big number)
  loading,         // Boolean
  error,           // String | null
  sendToken,       // Function(toAddress, amount)
  refreshToken     // Function
} = useEcashToken(tokenId);
```

**Features :**
- Chargement automatique des infos token
- Balance en temps réel
- Envoi de tokens avec refresh automatique

### `useEcashXec()`

Hook pour transactions XEC.

```javascript
const {
  loading,    // Boolean
  error,      // String | null
  sendXec     // Function(toAddress, amountXec)
} = useEcashXec();
```

## 🔐 Sécurité

### Gestion des Clés

1. **Mnémonic** : Stocké chiffré dans localStorage
2. **Clés privées** : Jamais exposées, restent en mémoire
3. **HD Derivation** : BIP32 standard (m/44'/1899'/0'/0/0)

### Validation

- Validation des mnémoniques (BIP39)
- Validation des adresses eCash
- Vérification des soldes avant envoi
- Gestion des erreurs réseau

## 🌐 Connexion Blockchain

### ChronikClient

Multiple nodes pour redondance :
```javascript
const CHRONIK_URLS = [
  'https://chronik.be.cash',
  'https://chronik.pay2stay.com',
  'https://chronik.fabien.cash'
];
```

### Endpoints Utilisés

1. **script(type, hash).utxos()** : Récupération des UTXOs
2. **token(tokenId)** : Infos sur un token
3. **broadcastTx(rawTx)** : Broadcast de transactions
4. **blockchainInfo()** : État de la blockchain

## 📊 State Management (Jotai)

### Atoms Principaux

```javascript
// Wallet atoms
walletAtom              // Instance EcashWallet
walletConnectedAtom     // Boolean
savedMnemonicAtom       // String (encrypted)

// Farm atoms
selectedFarmAtom        // Farm object
currentTokenIdAtom      // Derived from selectedFarm

// Balance atoms
balanceAtom             // Number (spendable XEC)
totalBalanceAtom        // Number (total XEC)
balanceBreakdownAtom    // Object (detailed breakdown)

// Token atoms
tokenAtom               // Current token data

// UI atoms
scriptLoadedAtom        // Boolean (compatibility)
busyAtom                // Boolean
notificationAtom        // Object
```

## 🔄 Flux de Données

### Initialisation du Wallet

```
User loads app
    ↓
Check localStorage for mnemonic
    ↓
If found: useEcashWallet.initializeWallet()
    ↓
Create EcashWallet instance
    ↓
Connect to Chronik
    ↓
Fetch balance (test connection)
    ↓
Update atoms (walletAtom, walletConnectedAtom)
    ↓
UI updates (components re-render)
```

### Envoi de Transaction

```
User clicks "Send"
    ↓
useEcashToken.sendToken(address, amount)
    ↓
Validate inputs
    ↓
wallet.sendToken()
    ↓
Select UTXOs
    ↓
Build transaction (TxBuilder)
    ↓
Sign transaction (P2PKHSignatory)
    ↓
Broadcast (chronik.broadcastTx)
    ↓
Auto-refresh balance
    ↓
Show notification
```

## 🚀 Avantages de cette Architecture

### ✅ Professionnelle
- Code modulaire et maintenable
- Séparation des responsabilités
- Tests unitaires possibles

### ✅ Performance
- Pas de script externe à charger
- Bundle optimisé par Vite
- Imports tree-shakable

### ✅ Sécurité
- Contrôle total sur la cryptographie
- Pas de dépendance externe non-vérifiable
- Code source auditable

### ✅ Évolutivité
- Facile d'ajouter de nouvelles features
- Support multi-chain possible
- Extensible pour nouveaux token types

### ✅ Developer Experience
- TypeScript ready
- Debugging facile
- Hot Module Replacement (HMR)

## 📝 Migration depuis minimal-xec-wallet

### Avant
```javascript
// Chargement du script externe
<script src="/minimal-xec-wallet.min.js"></script>

// Utilisation via window global
const wallet = new window.minimalXecWallet.Wallet(mnemonic);
```

### Après
```javascript
// Import direct NPM
import { createWallet } from './services/ecashWallet';

// Utilisation propre
const wallet = createWallet(mnemonic);
```

## 🔧 Configuration

### Environnement de Développement

```bash
# Installation
npm install

# Développement
npm run dev

# Build production
npm run build
```

### Variables d'Environnement

Aucune variable d'environnement requise ! Le système utilise :
- Chronik public nodes (pas de clé API)
- LocalStorage pour persistance
- HD path standard eCash

## 📚 Ressources

- [ecash-lib Documentation](https://www.npmjs.com/package/ecash-lib)
- [Chronik API](https://chronik.be.cash/docs)
- [BIP39 Standard](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP32 HD Keys](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
