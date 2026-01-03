# 📚 JLN Wallet - Documentation Index

**Bienvenue dans la documentation complète de JLN Wallet !**

Ce document vous guide vers la bonne documentation selon votre besoin.

> **Dernière mise à jour** : 2 janvier 2026  
> **Version** : 2.0.1

---

## 🎯 Par Profil

### 👨‍💻 Développeur Débutant sur le Projet

**Commencez ici** (dans cet ordre) :

1. **[QUICK_START.md](./QUICK_START.md)** ⚡ (10 min)
   - Installation rapide
   - Architecture en bref
   - Première tâche à accomplir

2. **[README.md](./README.md)** 📖 (5 min)
   - Vue d'ensemble du projet
   - Stack technologique
   - Quick start

3. **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** 🤖 (15 min)
   - Architecture détaillée
   - Patterns de code
   - Instructions AI

---

### 🏗️ Architecte / Tech Lead

**Documents stratégiques** :

| Document | Description |
|----------|-------------|
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | Architecture complète & patterns |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Vue d'ensemble & métriques |
| [ROADMAP.md](./ROADMAP.md) | Vision long terme & phases |
| [docs/WALLET_ARCHITECTURE.md](./docs/WALLET_ARCHITECTURE.md) | Architecture blockchain détaillée |
| [CONTEXT.md](./CONTEXT.md) | Règles de sécurité et contexte critique |

---

### 🎨 Designer / UX

**Documents design** :

| Document | Description |
|----------|-------------|
| [docs/STYLING_GUIDE.md](./docs/STYLING_GUIDE.md) | Guide de styling complet |
| [docs/COMPONENTS.md](./docs/COMPONENTS.md) | Composants UI disponibles |
| [src/styles/themes.css](./src/styles/themes.css) | Variables CSS (light/dark) |

---

## 📁 Documentation Active

### 🚀 Getting Started

| Document | Description |
|----------|-------------|
| [QUICK_START.md](./QUICK_START.md) | Démarrage rapide pour nouveaux devs |
| [README.md](./README.md) | Vue d'ensemble du projet |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Guide déploiement production |

### 📊 État & Planning

| Document | Description |
|----------|-------------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | État complet (Production-Ready, 8.2/10) |
| [ROADMAP.md](./ROADMAP.md) | Vision long terme et planification |
| [CONTEXT.md](./CONTEXT.md) | Règles de sécurité et architecture |

### 🏗️ Architecture & Technique

| Document | Description |
|----------|-------------|
| [docs/WALLET_ARCHITECTURE.md](./docs/WALLET_ARCHITECTURE.md) | Architecture blockchain complète |
| [docs/CHRONIK_WEBSOCKET.md](./docs/CHRONIK_WEBSOCKET.md) | Intégration WebSocket Chronik |
| [docs/COMPONENTS.md](./docs/COMPONENTS.md) | Référence composants UI TypeScript |
| [docs/SUPABASE_SCHEMA.md](./docs/SUPABASE_SCHEMA.md) | Schéma base de données (profiles, tickets) |
| [docs/ARCHITECTURE_VALIDATION.md](./docs/ARCHITECTURE_VALIDATION.md) | Validation architecture pages |

### 📇 Guides Utilisateur

| Document | Description |
|----------|-------------|
| [docs/ADDRESS_BOOK_USER_GUIDE.md](./docs/ADDRESS_BOOK_USER_GUIDE.md) | Guide carnet d'adresses |
| [docs/STYLING_GUIDE.md](./docs/STYLING_GUIDE.md) | Guide CSS et design system |

---

## 🔍 Recherche par Besoin

| Besoin | Document(s) |
|--------|-------------|
| "Je veux installer le projet" | [QUICK_START.md](./QUICK_START.md) |
| "Je veux comprendre l'architecture" | [docs/WALLET_ARCHITECTURE.md](./docs/WALLET_ARCHITECTURE.md) |
| "Je veux utiliser les composants UI" | [docs/COMPONENTS.md](./docs/COMPONENTS.md) |
| "Je veux utiliser le carnet d'adresses" | [docs/ADDRESS_BOOK_USER_GUIDE.md](./docs/ADDRESS_BOOK_USER_GUIDE.md) |
| "Je veux voir le schéma Supabase" | [docs/SUPABASE_SCHEMA.md](./docs/SUPABASE_SCHEMA.md) |
| "Je veux contribuer" | [README.md](./README.md) + [QUICK_START.md](./QUICK_START.md) |

---

## 📂 Structure Fichiers Clés

```
JLN-wallet/
├── README.md                    # 📖 Vue d'ensemble
├── QUICK_START.md               # ⚡ Démarrage rapide
├── PROJECT_STATUS.md            # 📊 État du projet
├── ROADMAP.md                   # 🗺️ Vision long terme
├── CONTEXT.md                   # 🔐 Règles sécurité
├── .github/
│   └── copilot-instructions.md  # 🤖 Instructions AI (architecture complète)
│
├── docs/                        # 📁 Documentation technique
│   ├── WALLET_ARCHITECTURE.md   # 🏗️ Architecture blockchain
│   ├── ARCHITECTURE_VALIDATION.md # ✅ Validation pages
│   ├── COMPONENTS.md            # 🧩 Composants UI
│   ├── SUPABASE_SCHEMA.md       # 💾 Base de données
│   ├── CHRONIK_WEBSOCKET.md     # 🔌 WebSocket temps réel
│   ├── ADDRESS_BOOK_USER_GUIDE.md # 📇 Guide utilisateur
│   ├── STYLING_GUIDE.md         # 🎨 Guide CSS
│   └── archives/                # 🗄️ Documents historiques
│
└── src/                         # 💻 Code source TypeScript
    ├── components/              # Composants React
    │   ├── UI/                  # Composants atomiques (Button, Card, etc.)
    │   ├── ClientWallet/        # Composants ClientWalletPage
    │   └── eCash/               # Composants blockchain
    ├── hooks/                   # 20+ custom hooks
    ├── services/                # Services (ecashWallet.ts, etc.)
    ├── pages/                   # Pages de l'application
    ├── types/                   # Types TypeScript
    └── styles/                  # CSS (themes.css, etc.)
```

---

## 📝 Notes sur les Fichiers .old

Les fichiers renommés en `.old` contiennent l'historique des phases de développement terminées (Phase 1-6) et la documentation de l'ancienne architecture JavaScript.

Ces fichiers sont conservés pour référence mais ne reflètent plus l'architecture actuelle TypeScript.

---

## ✅ État du Projet

| Métrique | Valeur | Status |
|----------|--------|--------|
| Phase actuelle | Phase 6 (prête) | ✅ |
| Score global | 8.2/10 | ✅ |
| Tests E2E | 235/235 passants | ✅ |
| Architecture | TypeScript | ✅ |
| Vulnérabilités | 0 | ✅ |

**Prochaines étapes** : Phase 6 (Security Hardening + Unit Tests)  
Voir [PROJECT_STATUS.md](./PROJECT_STATUS.md) pour les détails.

---

**Bon développement !** 🚀
