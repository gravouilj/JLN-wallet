# 🛡️ Système Anti-Arnaque de JLN Wallet

## Vue d'ensemble

Le système anti-arnaque de JLN Wallet protège les détenteurs de jetons contre les comportements frauduleux des créateurs tout en permettant une gestion permissionless et flexible des jetons.

## Principes fondamentaux

### 1. Transparence & Traçabilité

- **Tous les changements de statut sont tracés** (communication_history)
- **Les profils supprimés sont archivés** (profile_history) pour détecter les réinscriptions frauduleuses
- **Les détenteurs conservent l'accès** même si le créateur tente de masquer/délier le jeton

### 2. Protection des détenteurs

- Les détenteurs actuels **voient toujours** les jetons même si :
  - `isVisible = false` (masqué de l'annuaire)
  - `isLinked = false` (dissocié du profil)
- Emoji 🔓 "dissocié" affiché dans CreatorProfileCard/Modal pour transparence

### 3. Gestion permissionless autorisée

- Les créateurs **peuvent** masquer/délier leurs jetons (autonomie)
- **MAIS** des garde-fous automatiques se déclenchent en cas de signalements actifs

---

## Règles de blocage automatique

### Déclencheurs

Un créateur est **automatiquement bloqué** (`is_blocked_from_creating = true`) si :

```
(Signalements actifs > 0) ET (Tentative de modifier isVisible OU isLinked)
```

### Conséquences du blocage

❌ **Interdit** :
- Créer de nouveaux jetons
- Importer des jetons existants

✅ **Autorisé** :
- Gérer les jetons existants
- Envoyer/recevoir des jetons
- Répondre aux tickets clients

### Déblocage

Un créateur est **débloqué automatiquement** quand :

1. Tous les signalements sont traités
2. **ET** les clients ont marqué les tickets comme "Résolu"

L'admin peut aussi débloquer manuellement via `admin_unblock_profile()`.

---

## Modals d'avertissement

### 1. ActiveReportsWarningModal

**Quand ?** Le créateur a des signalements actifs et tente de modifier isVisible/isLinked.

**Affichage** :
- 🚫 "Action bloquée : Signalements actifs"
- Nombre de signalements non résolus
- Explication des raisons du blocage
- Processus de déblocage (traiter tickets → client résout → déblocage auto)

**Résultat** :
- Action **refusée**
- Blocage immédiat (`is_blocked_from_creating = true`)
- Message système dans communication_history

### 2. ActiveHoldersWarningModal

**Quand ?** Le créateur n'a PAS de signalements mais a des détenteurs actifs.

**Affichage** :
- ⚠️ "X détenteur(s) actif(s)"
- Explication des conséquences pour :
  - **Détenteurs actuels** : Conservent l'accès ✅
  - **Non-détenteurs** : Ne voient plus le jeton ❌
- Note sur la gestion permissionless
- Boutons : "Annuler" / "Oui, continuer"

**Résultat** :
- Action **autorisée** après confirmation
- Pas de blocage

---

## Architecture de la base de données

### Nouveaux champs dans `profiles`

```sql
is_blocked_from_creating BOOLEAN DEFAULT FALSE
blocked_reason TEXT
blocked_at TIMESTAMP WITH TIME ZONE
```

### Nouvelle table `profile_history`

Stocke les profils supprimés pour détecter les doublons :

```sql
CREATE TABLE profile_history (
  id UUID PRIMARY KEY,
  original_profile_id UUID,
  wallet_address TEXT,
  
  -- Données InfoTab
  profile_name TEXT,
  description TEXT,
  category TEXT,
  
  -- Données LocationTab
  location_country TEXT,
  location_region TEXT,
  location_department TEXT,
  city TEXT,
  postal_code TEXT,
  street_address TEXT,
  
  -- Données VerificationTab
  contact_email TEXT,
  contact_phone TEXT,
  business_registration TEXT,
  
  -- Métadonnées
  deletion_reason TEXT,
  had_active_reports BOOLEAN DEFAULT FALSE,
  had_unresolved_tickets BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Vue admin `blocked_profiles_view`

Affiche tous les profils bloqués avec :
- Nombre de signalements actifs
- Nombre de tickets non résolus
- Date du blocage
- Raison du blocage

---

## Services

### antifraudService.js

```javascript
// Validation avant toggle
validateTokenToggle(profileId, wallet, tokenId)
// Retourne : { canToggle, blockReason, activeReports, activeHolders, showWarning }

// Comptage
getActiveReportsCount(profileId)
getUnresolvedTicketsCount(profileId)
getActiveHoldersCount(wallet, tokenId)

// Blocage/déblocage
blockCreator(profileId, reason)
unblockCreator(profileId, adminWallet, unblockReason)

// Détection doublons
checkDuplicateProfileData({ email, phone, businessReg, postalCode, streetAddress })
// Retourne : { isDuplicate, matchedFields, lastDeletionDate, hadFraudHistory }
```

---

## Flux de validation

### TokenVisible / TokenLinked

```
1. Utilisateur clique sur toggle
      ↓
2. Vérification tickets actifs (TokenLinked uniquement)
   - Si tickets actifs → Modal "Tickets non traités" → STOP
      ↓
3. antifraudService.validateTokenToggle()
      ↓
4a. Signalements actifs + Détenteurs actifs
    → blockCreator()
    → ActiveReportsWarningModal
    → STOP (action refusée)
      ↓
4b. Pas de signalements + Détenteurs actifs
    → ActiveHoldersWarningModal
    → Confirmation utilisateur
    → Procéder au toggle
      ↓
4c. Aucun problème
    → Procéder directement au toggle
```

---

## Protection contre réinscription frauduleuse

### Trigger automatique

Quand un profil passe en `status = 'deleted'` ou `'banned'` :

1. **Archivage** dans `profile_history`
2. **Stockage** de toutes les données sensibles
3. **Marquage** si signalements actifs (`had_active_reports`)

### Détection lors de nouvelle inscription

La fonction `check_duplicate_profile_data()` compare :

- **Email** de contact
- **Téléphone** de contact
- **SIRET/SIREN** (business_registration)
- **Adresse postale** (postal_code + street_address)

Si **match trouvé** :

```javascript
{
  isDuplicate: true,
  matchedFields: ['email', 'business_registration'],
  lastDeletionDate: '2025-01-15T10:30:00Z',
  hadFraudHistory: true // Avait des signalements lors de la suppression
}
```

**Action recommandée** :

- Si `hadFraudHistory = true` → **Bloquer l'inscription**
- Si `hadFraudHistory = false` → **Avertir l'admin** (vérification manuelle)

---

## Interface Admin (ManageTokenPage)

### Filtres proposés

```jsx
<button onClick={() => setActiveFilter('blocked')}>
  🚫 Profils bloqués ({blockedCount})
</button>

<button onClick={() => setActiveFilter('with-reports')}>
  🚨 Avec signalements ({reportsCount})
</button>
```

### Actions admin

**Débloquer un créateur** :

```javascript
await antifraudService.unblockCreator(
  profileId, 
  adminWallet, 
  "Signalements traités manuellement par admin"
);
```

**Bloquer manuellement** :

```javascript
await antifraudService.blockCreator(
  profileId, 
  "Comportement frauduleux détecté par admin"
);
```

---

## Middleware de blocage

### CreateTokenPage

```javascript
useEffect(() => {
  const checkBlocked = async () => {
    const { isBlocked, reason } = await antifraudService.checkCreatorBlocked(walletAddress);
    
    if (isBlocked) {
      setNotification({
        type: 'error',
        message: `❌ Création bloquée : ${reason}`
      });
      navigate('/manage-tokens');
    }
  };
  
  checkBlocked();
}, [walletAddress]);
```

### ImportTokenModal

```javascript
const handleImport = async () => {
  const { isBlocked, reason } = await antifraudService.checkCreatorBlocked(walletAddress);
  
  if (isBlocked) {
    setNotification({
      type: 'error',
      message: `❌ Importation bloquée : ${reason}`
    });
    return;
  }
  
  // Procéder à l'importation...
};
```

---

## Cas d'usage

### Scenario 1 : Créateur honnête avec détenteurs

1. Créateur veut masquer un jeton temporairement
2. **Validation** : Pas de signalements, 50 détenteurs actifs
3. **Résultat** : ActiveHoldersWarningModal affiché
4. **Après confirmation** : Toggle autorisé, détenteurs conservent accès

### Scenario 2 : Créateur signalé tente de masquer

1. Créateur avec 3 signalements tente de masquer jeton
2. **Validation** : 3 signalements actifs, 25 détenteurs
3. **Résultat** : 
   - Action **refusée**
   - Blocage automatique (`is_blocked_from_creating = true`)
   - ActiveReportsWarningModal affiché
   - Impossibilité de créer/importer de nouveaux jetons

### Scenario 3 : Créateur résout les signalements

1. Créateur traite les 3 signalements via Support
2. Clients marquent tickets comme "Résolu"
3. **Déblocage automatique** : `is_blocked_from_creating = false`
4. Création/importation de nouveau autorisées

### Scenario 4 : Suppression & réinscription

1. Créateur avec signalements supprime son compte
2. **Archivage** dans `profile_history` avec `had_active_reports = true`
3. Tentative de réinscription avec même email/SIRET
4. **Détection** : `checkDuplicateProfileData()` retourne `isDuplicate = true`
5. **Action** : Inscription bloquée ou soumise à validation admin

---

## Fichiers modifiés

- `migrations/2025-12-18_anti_fraud_system.sql` ✅
- `src/services/antifraudService.js` ✅
- `src/components/Modals/AntifraudModals.jsx` ✅
- `src/components/TokenPage/TokenVisible.jsx` ✅
- `src/components/TokenPage/TokenLinked.jsx` ✅
- `src/pages/TokenPage.jsx` ✅ (section collapsible fermée par défaut)

## TODO restant

- [ ] Middleware dans CreateTokenPage
- [ ] Middleware dans ImportTokenModal
- [ ] Interface admin dans ManageTokenPage (filtres + actions)
- [ ] Tests E2E pour scénarios de blocage

---

## Logs & Monitoring

Tous les événements sont tracés :

```sql
-- Exemple de log système
INSERT INTO communication_history (profile_id, message, sender_type) VALUES (
  '...', 
  '🚫 Blocage automatique : Tentative de modification isVisible avec 2 signalement(s) actif(s)', 
  'system'
);
```

**Événements tracés** :
- Blocages automatiques
- Déblocages manuels (admin)
- Tentatives de création/importation bloquées
- Détection de profils dupliqués

---

## Conformité & Éthique

Ce système garantit :

✅ **Transparence** : Les détenteurs voient toujours les jetons  
✅ **Traçabilité** : Tous les changements sont loggés  
✅ **Protection** : Blocage automatique en cas de signalements  
✅ **Flexibilité** : Gestion permissionless autorisée (sauf fraude)  
✅ **Équité** : Déblocage automatique après résolution  

---

**Dernière mise à jour** : 2025-12-18  
**Version** : 1.0.0
