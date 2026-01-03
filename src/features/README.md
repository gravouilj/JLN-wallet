# 🏗️ Features Directory - Architecture Guide

Ce dossier contient les **modules métier** de l'application, organisés par domaine fonctionnel.

## 📁 Structure Actuelle

```
features/
├── wallet/                    # Fonctionnalités portefeuille client
│   ├── components/
│   │   ├── ImmersionComponents.tsx   # Vue immersion token
│   │   ├── SendTokenForm.tsx         # Formulaire d'envoi
│   │   └── WalletComponents.tsx      # Composants wallet
│   ├── index.ts
│   └── types.ts
│
├── token-management/          # Gestion des tokens (créateur)
│   ├── components/
│   │   ├── Send.tsx           # Envoi de tokens
│   │   ├── Airdrop.tsx        # Distribution airdrop
│   │   ├── Mint.tsx           # Création de tokens
│   │   ├── Burn.tsx           # Destruction de tokens
│   │   ├── Message.tsx        # Messages on-chain
│   │   ├── MessageDisplay.tsx # Affichage messages
│   │   ├── HistoryList.tsx    # Historique actions
│   │   ├── HoldersDetails.tsx # Détails détenteurs
│   │   └── ActionFeeEstimate.tsx
│   ├── index.ts
│   └── types.ts
│
├── profile/                   # Gestion profil créateur
│   ├── components/
│   │   ├── AntifraudModals.tsx
│   │   ├── CreateTokenModal.tsx
│   │   ├── ImportTokenModal.tsx
│   │   ├── CreatorTicketForm.tsx
│   │   ├── SupportTab.tsx
│   │   ├── CreatorProfile/    # Composants profil créateur
│   │   │   ├── CreateProfileModal.tsx
│   │   │   ├── CreatorProfileCard.tsx
│   │   │   ├── CreatorProfileModal.tsx
│   │   │   └── index.ts
│   │   └── ManageProfile/     # Onglets gestion profil
│   │       ├── ActiveProfile.tsx
│   │       ├── CertificationsTab.tsx
│   │       ├── ContactTab.tsx
│   │       ├── InfosTab.tsx
│   │       ├── LocationTab.tsx
│   │       ├── SecurityTab.tsx
│   │       ├── TokensListTab.tsx
│   │       └── VerificationTab.tsx
│   ├── index.ts
│   └── types.ts
│
├── admin/                     # Dashboard admin
│   ├── components/
│   │   ├── AdminGateRoute.tsx
│   │   ├── AdminManagement.tsx
│   │   ├── AdminProfilCard.tsx
│   │   ├── AdminReportCard.tsx
│   │   ├── AdminSettings.tsx
│   │   ├── AdminStats.tsx
│   │   ├── AdminTicket.tsx
│   │   ├── AdminTicketSystem.tsx
│   │   ├── BlockedProfileManagement.tsx
│   │   ├── FloatingAdminButton.tsx
│   │   ├── ProfilStatusActions.tsx
│   │   ├── index.ts
│   │   └── index.tsx          # Exports composants
│   └── CTA/
│       ├── CTACard.tsx
│       ├── ctaConfig.ts
│       ├── useCTAInjection.ts
│       └── index.ts
│
├── support/                   # Système de tickets client
│   ├── components/
│   │   ├── ClientTicketForm.tsx
│   │   ├── ClientTicketsList.tsx
│   │   ├── ConversationThread.tsx
│   │   ├── ProfileMiniCard.tsx
│   │   ├── TicketDetailModal.tsx
│   │   ├── TokenMiniCard.tsx
│   │   └── index.ts
│   ├── index.ts
│   └── types.ts
│
└── README.md                  # Ce fichier
```

## 🎯 Règles d'Architecture

### 1. Isolation
- Chaque feature est **autonome**
- Les imports entre features passent par `index.ts`
- Jamais d'import direct dans les sous-dossiers d'une autre feature

### 2. Composants
- Les composants ici sont **métier** (contiennent de la logique)
- Pour les composants **UI purs**, utiliser `src/components/UI/`

### 3. Hooks
- Les hooks de feature sont spécifiques au domaine
- Les hooks partagés restent dans `src/hooks/`

### 4. Exports
```typescript
// features/wallet/index.ts
export { WalletBalance } from './components/WalletBalance';
export { useWalletContext } from './hooks/useWalletContext';
```

## 🔄 Migration Progressive

Les composants existants seront migrés progressivement :
1. `src/components/ClientWallet/` → `features/wallet/`
2. `src/components/eCash/TokenActions/` → `features/token-management/`
3. `src/components/Creators/` → `features/profile/`
4. `src/components/Admin/` → `features/admin/`
