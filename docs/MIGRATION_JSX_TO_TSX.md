# 🔄 Plan de Migration JSX → TSX

**Date** : 2 janvier 2026  
**Fichiers concernés** : 24 fichiers JSX

## 📋 Liste des Fichiers à Migrer

### Priorité 1 - Composants Métier (haute utilisation)

| Fichier | Localisation | Action |
|---------|--------------|--------|
| `HistoryList.jsx` | `eCash/TokenActions/` | Migrer → TSX |
| `ActionFeeEstimate.jsx` | `eCash/TokenActions/` | Migrer → TSX |
| `Message.jsx` | `eCash/TokenActions/` | Migrer → TSX |
| `HoldersDetails.jsx` | `eCash/TokenActions/` | Migrer → TSX |
| `MessageDisplay.jsx` | `eCash/TokenActions/` | Migrer → TSX |

### Priorité 2 - Composants Creators

| Fichier | Localisation | Action |
|---------|--------------|--------|
| `ActiveProfile.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `VerificationTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `LocationTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `TokensListTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `InfosTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `SecurityTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `ContactTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `CertificationsTab.jsx` | `Creators/ManageProfile/` | Migrer → TSX |
| `CreatorProfileCard.jsx` | `Creators/CreatorProfile/` | Migrer → TSX |
| `CreatorProfileModal.jsx` | `Creators/CreatorProfile/` | Migrer → TSX |
| `CreateProfileModal.jsx` | `Creators/CreatorProfile/` | Migrer → TSX |

### Priorité 3 - Composants Divers

| Fichier | Localisation | Action |
|---------|--------------|--------|
| `HistoryCollapse.jsx` | `components/` | Migrer → TSX |
| `Faq.jsx` | `components/` | Migrer → TSX |
| `Alertes.jsx` | `components/` | Migrer → TSX |
| `NotificationBell.jsx` | `components/` | Migrer → TSX |
| `TokenDetailsCard.jsx` | `components/` | Migrer → TSX |
| `SearchFilters.jsx` | `components/` | Migrer → TSX |
| `CTACard.jsx` | `Admin/CTA/` | Migrer → TSX |

### À Supprimer - Stories

| Fichier | Action |
|---------|--------|
| `stories/Page.jsx` | Supprimer (non utilisé) |
| `stories/Button.jsx` | Supprimer (non utilisé) |

## 🛠️ Process de Migration

Pour chaque fichier :

1. **Renommer** : `.jsx` → `.tsx`
2. **Ajouter types** : Props interfaces, state types
3. **Corriger imports** : Enlever `.jsx` des imports
4. **Valider** : `npm run build` sans erreurs

## ⚠️ Points d'Attention

- Les composants dans `eCash/TokenActions/` sont utilisés par `TokenPage.tsx`
- Les tabs `ManageProfile/` sont utilisés par `ManageProfilePage.tsx`
- Certains fichiers peuvent avoir des dépendances croisées

## 📊 Progression

- [ ] 0/24 fichiers migrés
- [ ] Stories supprimées
