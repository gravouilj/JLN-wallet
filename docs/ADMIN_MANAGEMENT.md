# Système de Gestion Admin et Profils Bloqués

## Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités administratives ajoutées au AdminDashboard pour gérer les administrateurs et les profils bloqués.

## 🆕 Nouvelles fonctionnalités

### 1. Gestion des Administrateurs (Super Admin uniquement)

**Composant :** `AdminManagement.jsx`
**Emplacement :** AdminDashboard > Onglet "👥 Admins"

#### Fonctionnalités :

- **Liste des administrateurs** : Affiche tous les admins actifs avec leurs rôles
  - 👑 Super Admin : Peut gérer les admins
  - 🛡️ Modérateur : Peut débloquer des profils
  
- **Ajout d'administrateur** :
  - Formulaire avec adresse wallet eCash (obligatoire)
  - Nom de l'administrateur (obligatoire)
  - Sélection du rôle (moderator / super_admin)
  - Validation format adresse (doit commencer par "ecash:")
  - Enregistrement dans la table `admin_whitelist` publique
  
- **Retrait d'administrateur** :
  - Confirmation obligatoire
  - Raison du retrait obligatoire
  - Enregistrement dans `admin_actions` (transparence publique)
  - Impossible de se retirer soi-même
  
- **Historique des actions** :
  - Affiche les 20 dernières actions admin
  - Types d'actions : ajout/retrait admin, blocage/déblocage profil
  - Totalement transparent (table publique)

#### Restrictions d'accès :

```javascript
// Vérifie si l'utilisateur est super_admin
const adminStatus = await adminService.checkIsAdmin(address);
if (adminStatus.role !== 'super_admin') {
  // Affiche message d'erreur "Accès réservé aux Super Admin"
}
```

---

### 2. Gestion des Profils Bloqués

**Composant :** `BlockedProfileManagement.jsx`
**Emplacement :** AdminVerificationPage > Onglet "🚫 Bloqués"

#### Fonctionnalités :

- **Liste des profils bloqués** :
  - Charge depuis `profiles` WHERE `is_blocked_from_creating = true`
  - Affiche : nom, adresse, email, statut, date de blocage
  - Raison du blocage mise en évidence
  - Compteurs (si disponibles) : signalements actifs, tickets ouverts
  
- **Déblocage de profil** :
  - Bouton "🔓 Débloquer ce profil"
  - Formulaire avec raison de déblocage (obligatoire)
  - Appel à `adminService.adminUnblockProfile()`
  - Vérification automatique que l'admin est dans la whitelist
  - Enregistrement dans `admin_actions` (transparence)
  - Message envoyé au créateur dans `communication_history`
  
- **Filtrage par recherche** :
  - Fonctionne sur nom, email, adresse wallet
  - Recherche instantanée (case-insensitive)

#### Différence avec ManageTokenPage :

⚠️ **Important** : 
- `ManageTokenPage` affiche des **jetons** (tokens) pour les créateurs
- `AdminVerificationPage` affiche des **profils** pour les admins
- Les profils bloqués ne peuvent pas créer/importer de jetons, mais leurs tokens existants restent visibles

---

## 🏗️ Architecture

### Services utilisés

```javascript
// adminService.js
- checkIsAdmin(address)           // Vérifie si admin (whitelist)
- addAdmin(wallet, name, role)    // Ajoute un admin (super_admin only)
- removeAdmin(wallet, reason)     // Retire un admin (super_admin only)
- adminUnblockProfile(profileId)  // Débloque un profil (admin only)
- getAdminList()                  // Liste des admins
- getAdminActionsHistory(limit)   // Historique des actions
```

### Tables Supabase

```sql
-- Whitelist publique des admins
admin_whitelist (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  admin_name TEXT,
  admin_role TEXT CHECK (admin_role IN ('moderator', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  added_at TIMESTAMP,
  added_by TEXT
)

-- Log public des actions admin
admin_actions (
  id UUID PRIMARY KEY,
  action_type TEXT,        -- 'add_admin', 'remove_admin', 'unblock_profile', 'block_profile'
  admin_wallet TEXT,       -- Adresse de l'admin qui a effectué l'action
  target_profile_id UUID,  -- Profil concerné (si applicable)
  reason TEXT,             -- Raison de l'action
  metadata JSONB,          -- Données supplémentaires
  created_at TIMESTAMP
)

-- Profils (colonne ajoutée)
profiles (
  ...
  is_blocked_from_creating BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMP
)
```

### RLS (Row Level Security)

```sql
-- admin_whitelist et admin_actions : Lecture publique, écriture système uniquement
CREATE POLICY "Public can view admin list" ON admin_whitelist FOR SELECT TO public USING (true);
CREATE POLICY "Public can view admin actions" ON admin_actions FOR SELECT TO public USING (true);
```

---

## 📊 Flux utilisateur

### Super Admin ajoute un modérateur

```mermaid
graph LR
A[Super Admin] --> B[AdminDashboard > Admins]
B --> C[Clic ➕ Ajouter un admin]
C --> D[Formulaire: wallet, nom, rôle]
D --> E[adminService.addAdmin()]
E --> F[INSERT INTO admin_whitelist]
E --> G[INSERT INTO admin_actions log]
G --> H[Rechargement liste]
```

### Admin débloque un profil bloqué

```mermaid
graph LR
A[Admin] --> B[AdminVerificationPage > Bloqués]
B --> C[Sélectionne un profil]
C --> D[Clic 🔓 Débloquer]
D --> E[Saisit raison déblocage]
E --> F[adminService.adminUnblockProfile()]
F --> G[UPDATE profiles SET is_blocked_from_creating = false]
F --> H[INSERT INTO admin_actions]
F --> I[INSERT INTO communication_history]
I --> J[Profil retiré de la liste]
```

---

## 🔒 Sécurité

### Vérification des permissions

Toutes les actions admin vérifient la whitelist :

```javascript
// Dans adminService.js
const { data: adminCheck } = await supabase
  .from('admin_whitelist')
  .select('admin_role')
  .eq('wallet_address', adminWallet)
  .eq('is_active', true)
  .single();

if (!adminCheck) {
  throw new Error('Accès refusé : vous n\'êtes pas dans la whitelist des administrateurs');
}
```

### Transparence publique

- La table `admin_whitelist` est publiquement consultable (lecture seule)
- La table `admin_actions` enregistre TOUTES les actions admin (lecture seule publique)
- Les raisons de blocage/déblocage sont visibles par les créateurs
- Approche "serverless, permissionless" : pas de secrets, tout est vérifiable

---

## 🧪 Tests

### Test de gestion admin (Super Admin)

1. Connecter un wallet super_admin
2. AdminDashboard > Onglet "👥 Admins"
3. Cliquer "➕ Ajouter un admin"
4. Remplir : adresse `ecash:qz...`, nom "Test Admin", rôle "Modérateur"
5. ✅ Vérifier : admin ajouté dans la liste
6. ✅ Vérifier : action "add_admin" dans l'historique
7. Cliquer "🗑️ Retirer" sur l'admin de test
8. Saisir raison : "Test terminé"
9. ✅ Vérifier : admin retiré de la liste

### Test de déblocage profil (Admin)

1. Connecter un wallet admin (moderator ou super_admin)
2. AdminVerificationPage > Onglet "🚫 Bloqués"
3. Sélectionner un profil bloqué
4. Cliquer "🔓 Débloquer ce profil"
5. Saisir raison : "Tickets résolus"
6. Cliquer "✅ Confirmer le déblocage"
7. ✅ Vérifier : profil retiré de la liste des bloqués
8. ✅ Vérifier : profil peut maintenant créer/importer des jetons
9. ✅ Vérifier : action "unblock_profile" dans l'historique admin

---

## 📝 Notes de développement

### Composants créés

- **`AdminManagement.jsx`** : Gestion de la whitelist des admins (160+ lignes)
- **`BlockedProfileManagement.jsx`** : Affichage et déblocage des profils bloqués (230+ lignes)

### Fichiers modifiés

- **`AdminDashboard.jsx`** :
  - Import de `AdminManagement`
  - Ajout onglet "👥 Admins"
  - Rendu conditionnel pour l'onglet admins

- **`AdminVerificationPage.jsx`** :
  - Import de `BlockedProfileManagement`
  - État `blockedProfiles`
  - Fonction `loadBlockedProfiles()`
  - Ajout onglet "🚫 Bloqués"
  - Adaptation du filtrage pour inclure les profils bloqués
  - Rendu conditionnel pour l'onglet blocked

- **`src/components/Admin/index.js`** :
  - Export de `AdminManagement`
  - Export de `BlockedProfileManagement`

### Dépendances

- `adminService.js` (déjà existant)
- `supabase` (client)
- `useAdmin` hook
- `useEcashWallet` hook
- Composants UI : `Card`, `CardContent`, `Button`, `Stack`, `Badge`, `Tabs`

---

## 🚀 Prochaines étapes

### Améliorations possibles

1. **Pagination** : Pour la liste des admins et profils bloqués
2. **Statistiques** : Dashboard avec métriques (nb admins, nb déblocages/mois, etc.)
3. **Notifications email** : Alerter les créateurs lors du déblocage
4. **Historique filtrable** : Filtres par type d'action, date, admin
5. **Recherche avancée** : Dans l'historique des actions admin
6. **Export CSV** : Des actions admin pour audit externe

---

## ✅ Checklist de déploiement

Avant de déployer en production :

- [ ] Migrations SQL exécutées (admin_whitelist, admin_actions)
- [ ] Super admin initial ajouté dans admin_whitelist
- [ ] Tests de gestion admin effectués
- [ ] Tests de déblocage profil effectués
- [ ] Vérification RLS : lecture publique, écriture système uniquement
- [ ] Documentation partagée avec les admins
- [ ] Politique de modération définie (quand débloquer, critères, etc.)

---

## 📚 Références

- [ANTI_FRAUD_SYSTEM.md](ANTI_FRAUD_SYSTEM.md) - Système anti-fraude complet
- [SUPABASE_SCHEMA.md](docs/SUPABASE_SCHEMA.md) - Schéma de base de données
- [adminService.js](src/services/adminService.js) - Service de gestion admin
- [Migrations SQL](migrations/2025-12-18_admin_whitelist.sql) - Structure des tables admin
