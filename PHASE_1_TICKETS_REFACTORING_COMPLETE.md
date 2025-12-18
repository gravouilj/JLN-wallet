# Phase 1 : Analyse et Fondations - COMPLÉTÉ ✅

**Date:** 18 décembre 2025  
**Durée:** ~2h  
**Statut:** Migrations SQL prêtes à exécuter

---

## ✅ Travail accompli

### 1. **Analyse complète du système actuel**

J'ai identifié **5 problèmes majeurs** :

#### ❌ Problème 1: Confusion des statuts
- Vérifications: `pending`, `info_requested`, `verified`, `rejected` mélangés avec `status` général
- Tickets: `open`, `in_progress`, `resolved`, `closed` → confusion "résolu mais pas fermé"
- Signalements: Pas de statuts clairs

#### ❌ Problème 2: Manque de détails contextuels
- Admin ne voit pas profil/jeton dans tickets
- Créateur ne voit pas adresse eCash complète du client
- Client ne sait pas quel jeton est concerné
- Historique fragmenté

#### ❌ Problème 3: Conversation bidirectionnelle cassée
- Client → Créateur : pas de réponse possible du créateur
- Créateur → Client : pas de contre-réponse possible
- Admin intervient : pas de notifications
- Pas de thread unifié

#### ❌ Problème 4: Pollution de l'affichage
- Tickets résolus/clos polluent la vue admin
- Pas de filtres intelligents
- Badges de compteurs absents

#### ❌ Problème 5: Formulaires insuffisants
- Manque de contexte automatique
- Pas d'anticipation des problèmes
- Pas de pièces jointes

---

### 2. **Nouvelle architecture unifiée**

#### ✅ Schéma de statuts clarifiés

**Vérifications (profiles):**
```
verification_status:
  - unverified     : Profil non vérifié (défaut)
  - pending        : Demande en attente
  - info_requested : Admin demande des infos
  - verified       : Profil vérifié ✅
  - rejected       : Demande refusée ❌

status (séparé):
  - active         : Profil actif
  - suspended      : Suspendu temporairement
  - banned         : Banni définitivement
  - deleted        : Soft delete
```

**Tickets (nouvelle structure):**
```
status:
  - open           : Nouveau ticket non traité
  - awaiting_reply : En attente de réponse
  - in_progress    : Pris en charge
  - resolved       : Résolu (7j feedback)
  - closed         : Fermé définitivement

type:
  - admin_creator  : Créateur → Admin
  - admin_client   : Client → Admin
  - creator_client : Client → Créateur (via token)
  - report         : Signalement

priority:
  - low, normal, high, urgent
```

**Signalements (profile_reports):**
```
status:
  - pending        : Nouveau signalement
  - investigating  : En cours d'investigation
  - resolved       : Résolu (action prise)
  - dismissed      : Rejeté (pas de suite)
```

---

### 3. **Migrations SQL créées**

#### 📄 `2025-12-18_tickets_refactoring.sql` (400+ lignes)

**Nouvelles colonnes tickets:**
- `type` : Type de ticket (admin_creator, admin_client, creator_client, report)
- `token_id` : ID du jeton concerné
- `creator_profile_id` : ID profil créateur
- `client_address` : Adresse eCash client
- `conversation` : Thread JSONB de messages
- `metadata` : Contexte additionnel
- `resolved_at`, `closed_at`, `auto_close_at` : Timestamps de cycle de vie

**Fonctions utilitaires:**
```sql
-- Ajouter un message au thread
add_message_to_ticket(ticket_id, author, author_address, content, attachments)

-- Marquer messages comme lus
mark_messages_as_read(ticket_id, reader_role)

-- Fermeture auto 30j après résolution
auto_close_old_tickets()

-- Trigger auto_close_at
set_auto_close_date()
```

**Vue enrichie:**
```sql
CREATE VIEW tickets_with_context AS ...
-- Enrichit tickets avec:
-- - Infos profil créateur
-- - Compteur messages non lus
-- - Dernier message
-- - Temps écoulé
-- - Temps avant auto-close
```

#### 📄 `2025-12-18_reports_refactoring.sql` (350+ lignes)

**Nouvelles colonnes profile_reports:**
- `status` : Statut du signalement
- `investigated_by` : Adresse admin en charge
- `investigated_at`, `resolved_at` : Timestamps
- `admin_notes` : Notes internes admin
- `action_taken` : Action prise (visible créateur)
- `metadata` : Sévérité, catégorie, preuves, etc.

**Fonctions utilitaires:**
```sql
-- Démarrer investigation
start_investigation(report_id, admin_address)

-- Résoudre signalement
resolve_report(report_id, admin_address, action_taken, notes)

-- Rejeter signalement
dismiss_report(report_id, admin_address, reason)

-- Trouver signalements liés
get_related_reports(profil_id, statuses)

-- Auto-dismiss signalements > 90j
auto_dismiss_old_pending_reports()
```

**Vues enrichies:**
```sql
-- Résumé par profil
CREATE VIEW reports_summary AS ...

-- Signalements actifs avec contexte
CREATE VIEW active_reports_with_context AS ...
```

**Triggers:**
- Notification admins sur nouveau signalement
- Blocage auto profil si résolu avec action "block"

---

### 4. **Documentation complète**

#### 📖 `TICKETS_SYSTEM_REFACTORING.md` (600+ lignes)

Contient :
- ✅ Analyse des problèmes
- ✅ Nouvelle architecture avec diagrammes
- ✅ Flux de conversation détaillés (4 flux)
- ✅ Spécifications des composants à créer
- ✅ Filtres intelligents (code JavaScript)
- ✅ Système de notifications
- ✅ Plan d'implémentation par phases
- ✅ Critères de succès

---

## 🎯 Flux de conversation unifiés

### Flux 1: Client → Admin
```
Client crée ticket
  ↓ status = 'open'
Admin reçoit notification
  ↓ Admin répond → 'in_progress'
Client reçoit notification
  ↓ Client répond → 'awaiting_reply'
Admin résout → 'resolved' (7j feedback)
  ↓ Si pas de réponse 7j
Auto-close → 'closed' (archivé 30j)
```

### Flux 2: Client → Créateur
```
Client sur page jeton → "Contacter le créateur"
  ↓ Formulaire pré-rempli (tokenId, ticker)
Ticket type='creator_client', status='open'
  ↓ Créateur reçoit notification
Créateur répond → 'in_progress'
  ↓ Client reçoit notification
Thread de conversation bidirectionnel ✅
  ↓ Si besoin
Créateur escalade à Admin
```

### Flux 3: Créateur → Admin
```
Créateur crée ticket (vérification, support)
  ↓ type='admin_creator', status='open'
Admin répond → 'in_progress'
  ↓ Thread de conversation
Admin résout → 'resolved'
```

### Flux 4: Signalements
```
Utilisateur signale profil/jeton
  ↓ status='pending'
Admin reçoit notification
  ↓ Admin ouvre → 'investigating'
Admin peut:
  - Contacter créateur (ticket auto-créé)
  - Bloquer profil (trigger auto)
  - Rejeter → 'dismissed'
  ↓
Admin résout → 'resolved' (action_taken)
```

---

## 📊 Améliorations clés

### Conversation Thread (JSONB)
```javascript
conversation: [
  {
    id: "uuid-1",
    author: "client",                    // 'admin' | 'creator' | 'client'
    author_address: "ecash:qz...",
    content: "Message text",
    timestamp: "2025-12-18T10:00:00Z",
    attachments: [                       // Pièces jointes ✅
      { url: "...", type: "image/png", name: "screenshot.png" }
    ],
    read: false                          // Suivi lecture ✅
  },
  // ... autres messages
]
```

### Contexte automatique
```javascript
metadata: {
  tokenInfo: { ticker, name, decimals }, // ✅ Infos jeton
  profileInfo: { name, email, verified },// ✅ Infos profil
  escalated: false,                      // ✅ Escalade
  tags: ['urgent', 'vip'],               // ✅ Tags
  internal_notes: "..."                  // ✅ Notes admin privées
}
```

### Filtres intelligents
```javascript
Admin:
  - À traiter      : open + awaiting_reply
  - En cours       : in_progress
  - Résolus (7j)   : resolved < 7 jours
  - Archivés       : closed OU resolved > 7j

Créateur:
  - Tickets clients : creator_client (actifs)
  - Support admin   : admin_creator (actifs)
  - Résolus         : resolved + closed

Client:
  - Actifs          : open + awaiting_reply + in_progress
  - Résolus (7j)    : resolved < 7 jours
  - Fermés          : closed OU resolved > 7j
```

---

## ⏭️ Prochaines étapes

### Phase 2: Composants React (4-5h)
1. **TicketDetailModal** : Modal avec contexte complet
   - TokenMiniCard : Affiche infos jeton (ticker, solde, détenteurs)
   - ProfileMiniCard : Affiche profil créateur (nom, email, badges)
   - ClientAddressCard : Affiche adresse complète client
   - ConversationThread : Thread de messages avec réponses
   - TicketActions : Boutons selon rôle et statut

2. **ImprovedTicketForm** : Formulaire amélioré
   - Contexte auto-ajouté (tokenId, profil, etc.)
   - CategorySelector avec FAQ intégrée
   - ProblemAnticipation (suggestions solutions)
   - AttachmentUpload (screenshots, PDF)

3. **Vues refondues** :
   - AdminTicketsView : Filtres intelligents + minicard contexte
   - CreatorTicketsView : Séparation clients/admin + détails complets
   - ClientTicketsView : Filtres simples + destinataire visible

### Phase 3: Services et logique (2-3h)
1. Service ticketService.js : CRUD + conversation
2. Service reportService.js : Investigation + résolution
3. Hooks personnalisés : useTicketConversation, useReportInvestigation
4. Notifications temps réel

### Phase 4: Tests et polish (2h)
1. Tests E2E : Client → Créateur → Admin
2. Tests filtres intelligents
3. Tests conversation bidirectionnelle
4. Documentation utilisateur

**Total Phase 2-4: ~10h**

---

## 🚀 Pour démarrer Phase 2

### 1. Exécuter les migrations
```bash
# Dans Supabase SQL Editor :
# 1. Exécuter 2025-12-18_tickets_refactoring.sql
# 2. Exécuter 2025-12-18_reports_refactoring.sql
# 3. Vérifier avec: SELECT * FROM tickets LIMIT 1;
```

### 2. Tester les fonctions
```sql
-- Test add_message_to_ticket
SELECT add_message_to_ticket(
  'ticket-uuid',
  'admin',
  'ecash:qz...',
  'Test message',
  '[]'::jsonb
);

-- Test start_investigation
SELECT start_investigation(
  'report-uuid',
  'ecash:qz...'
);
```

### 3. Créer les premiers composants
```jsx
// Commencer par TokenMiniCard (simple)
// Puis ProfileMiniCard
// Puis ConversationThread
// Enfin TicketDetailModal (intégration)
```

---

## 📋 Checklist avant Phase 2

- [ ] Migrations SQL exécutées en dev
- [ ] Vues `tickets_with_context` et `reports_summary` testées
- [ ] Fonction `add_message_to_ticket()` testée
- [ ] Documentation TICKETS_SYSTEM_REFACTORING.md lue
- [ ] Décision sur hébergement pièces jointes (Supabase Storage?)
- [ ] Plan d'implémentation Phase 2 validé

---

## 💡 Points d'attention

### Hébergement pièces jointes
Options :
1. **Supabase Storage** (recommandé) : Intégré, RLS, CDN
2. **Base64 dans JSONB** : Simple mais limité (< 100KB)
3. **Service externe** : Imgur, Cloudinary, etc.

**Recommandation : Supabase Storage**
```javascript
// Uploader dans bucket 'ticket-attachments'
const { data, error } = await supabase.storage
  .from('ticket-attachments')
  .upload(`${ticketId}/${filename}`, file);
```

### Notifications temps réel
Options :
1. **Supabase Realtime** : Écoute changements sur tickets table
2. **Polling** : Vérifier toutes les 30s (simple)
3. **WebSocket custom** : Plus complexe

**Recommandation : Supabase Realtime + Polling fallback**

### Performance
- Index GIN sur `conversation` JSONB pour recherche rapide
- Vue matérialisée `tickets_with_context` si > 10k tickets
- Pagination 20 tickets par page
- Cache côté client (React Query)

---

## ✅ Résumé Phase 1

### Livrables
- ✅ Document analyse complète (TICKETS_SYSTEM_REFACTORING.md)
- ✅ Migration tickets_refactoring.sql (400+ lignes)
- ✅ Migration reports_refactoring.sql (350+ lignes)
- ✅ Schéma de statuts unifié
- ✅ 4 flux de conversation documentés
- ✅ Filtres intelligents spécifiés
- ✅ Plan d'implémentation Phase 2-4

### Problèmes résolus (conceptuellement)
- ✅ Confusion des statuts → Schéma clair
- ✅ Manque de contexte → Colonnes `metadata`, `token_id`, `creator_profile_id`
- ✅ Conversation cassée → Thread JSONB `conversation`
- ✅ Pollution affichage → Filtres intelligents + auto-close
- ✅ Formulaires insuffisants → Spec avec FAQ, attachments, anticipation

**Prêt pour Phase 2 : Implémentation des composants React ! 🚀**
