# Système de Contact Créateur et Sécurité isLinked

## Vue d'ensemble

Le système permet aux clients possédant des tokens de contacter les créateurs directement via l'application, tout en garantissant la sécurité des données lors des changements de statut `isLinked`.

## 1. Contact Créateur pour les Clients

### Accès
Les clients **n'ont PAS accès à TokenPage**. Ils accèdent aux profils via :
- **CreatorProfileCard** (dans DirectoryPage et FavoritesPage)
- **CreatorProfileModal** (popup de détails complet)

### Conditions d'affichage du bouton "Contacter le créateur"

Le bouton est visible SI et SEULEMENT SI :
1. ✅ L'utilisateur est connecté (`walletConnected === true`)
2. ✅ Le token est lié au profil (`token.isLinked === true`)
3. ✅ Le profil existe et contient le token

### Composants modifiés

#### CreatorProfileCard.jsx
```jsx
// Bouton "💬 Contacter le créateur" affiché en bas de la carte
// Visible uniquement si isPrimaryTokenLinked && walletConnected
// Ouvre un modal avec ClientTicketForm
```

#### CreatorProfileModal.jsx
```jsx
// Chaque token affiché peut avoir un bouton "💬 Contacter pour ce jeton"
// Visible dans la section expandable de chaque token si isTokenLinked
// Permet de contacter spécifiquement pour un token donné
```

### Flux utilisateur

```
Client possède Token X du Créateur Y
         ↓
Créateur a lié Token X à son profil (isLinked: true)
         ↓
Client voit "💬 Contacter le créateur" dans CreatorProfileCard/Modal
         ↓
Clic → Modal avec ClientTicketForm
         ↓
Ticket créé avec type='client', farm_id=[profilId], token_id=[tokenId]
         ↓
Créateur reçoit notification dans ManageProfilePage > Support
```

## 2. Sécurité isLinked

### Règle de protection des données

**Si `isLinked` passe de `true` à `false` :**

#### Cas 1 : Tickets/signalements actifs (NON traités)
❌ **INTERDICTION de délier**
- Statuts actifs : `'open'`, `'in_progress'`
- Types concernés : `'client'`, `'report'`, `'creator'`
- **Aucune donnée supprimée**
- Modal d'avertissement affiché au créateur

#### Cas 2 : Aucun ticket actif
✅ **Autorisation de délier + Nettoyage**
- Suppression des tickets fermés/résolus (`'resolved'`, `'closed'`)
- Suppression des messages associés
- Suppression de l'historique du token
- Notification de succès

### Service tokenLinkedService.js

#### Fonctions principales

##### `checkActiveTicketsForToken(tokenId, profilId)`
```javascript
// Vérifie si un token a des tickets non traités
// Retourne: { hasActiveTickets, ticketCount, details }
```

##### `cleanupTokenDataIfSafe(tokenId, profilId)`
```javascript
// Nettoie les données SI aucun ticket actif
// Supprime: tickets fermés, messages, historique
// Retourne: { success, message, deletedCount }
```

##### `updateTokenLinkedStatus(tokenId, profilId, newIsLinkedValue)`
```javascript
// Wrapper complet pour changer isLinked
// Vérifie les tickets, nettoie si nécessaire, met à jour le statut
// Retourne: { success, message, warning }
```

### Composant TokenLinked.jsx (Modifié)

#### Nouveaux comportements

1. **Avant de délier** : Appel à `checkActiveTicketsForToken()`
2. **Si tickets actifs** : Affichage du modal d'avertissement
3. **Si aucun ticket** : Appel à `updateTokenLinkedStatus()` qui nettoie automatiquement
4. **Notifications** : Succès/erreur via `notificationAtom`

#### Modal d'avertissement

Affiche :
- Nombre de tickets non traités
- Répartition par type (client, report, creator)
- Message explicatif
- Astuce pour accéder à l'onglet Support

## 3. Cas particuliers

### Créateur avec plusieurs tokens

Si un créateur a 3 tokens (A, B, C) :
- Token A : `isLinked: true`, 5 tickets actifs
- Token B : `isLinked: true`, 0 ticket actif
- Token C : `isLinked: false`

**Comportement :**
- Token A : ❌ Impossible de délier (tickets actifs)
- Token B : ✅ Peut être délié (nettoyage auto)
- Token C : ✅ Déjà délié

**Important :** Les tickets sont liés au **token spécifique** (`token_id`), pas au profil global.

### Que se passe-t-il avec les tickets après le déliaison ?

#### Tickets traités (resolved/closed)
✅ **Supprimés définitivement** de la base de données
- Table `tickets` : Entrées supprimées
- Table `ticket_messages` : Messages associés supprimés
- Table `activity_history` : Historique supprimé (si existe)

#### Tickets actifs (open/in_progress)
🔒 **Conservés** - Empêchent le déliaison
- Aucune suppression possible tant qu'ils sont actifs
- Le créateur DOIT d'abord les traiter

## 4. Schéma de décision

```
Créateur clique sur Switch isLinked (true → false)
                ↓
        Vérification tickets actifs
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Tickets actifs         Aucun ticket actif
    ↓                       ↓
❌ BLOCAGE            ✅ AUTORISATION
    ↓                       ↓
Modal avertissement    Nettoyage auto
Comptage détaillé      ↓
Lien vers Support      Tickets fermés supprimés
                       Messages supprimés
                       Historique supprimé
                       ↓
                       isLinked = false
                       Notification succès
```

## 5. Messages utilisateur

### Créateur tente de délier avec tickets actifs
```
⚠️ Tickets non traités

Impossible de délier ce jeton du profil : 3 ticket(s) ou signalement(s)
sont encore en attente de traitement.

Répartition :
• 👤 2 ticket(s) client
• 🚨 1 signalement(s)

Pour des raisons de sécurité et de traçabilité, vous devez d'abord traiter
tous les tickets et signalements avant de pouvoir délier ce jeton de votre profil.

💡 Astuce : Rendez-vous dans l'onglet Support de votre profil pour traiter ces tickets.

[Bouton: Compris]
```

### Déliaison réussie
```
✅ Token délié et données nettoyées avec succès

3 ticket(s) fermé(s) supprimés
5 message(s) supprimés
2 entrée(s) d'historique supprimées
```

### Client essaie de contacter créateur avec token délié
Le bouton "💬 Contacter le créateur" **n'apparaît pas** si `isLinked === false`.

## 6. Tables affectées

### `tickets`
- Colonne `token_id` : Lien vers le token
- Colonne `farm_id` : Lien vers le profil
- Colonne `status` : Détermine si actif ou supprimable

### `ticket_messages`
- Colonne `ticket_id` : Lien vers le ticket
- Supprimé en cascade avec les tickets

### `activity_history` (si existe)
- Colonne `token_id` : Lien vers le token
- Supprimé lors du nettoyage

### `profiles`
- Colonne `tokens` (JSONB) : Contient `isLinked` pour chaque token

## 7. Sécurité et traçabilité

### Pourquoi cette règle stricte ?

1. **Responsabilité légale** : Les tickets peuvent contenir des plaintes ou signalements importants
2. **Service client** : Ne pas abandonner les clients en cours de conversation
3. **Traçabilité** : Historique nécessaire en cas de litige
4. **Confiance** : Garantit que le créateur ne peut pas "fuir" ses responsabilités

### Que faire si un créateur veut absolument délier ?

1. Aller dans **ManageProfilePage > Onglet Support**
2. Traiter tous les tickets en attente (répondre, résoudre, fermer)
3. Attendre que tous les tickets soient en statut `'resolved'` ou `'closed'`
4. Retenter le déliaison → Succès ✅

## 8. Tests recommandés

### Test 1 : Contact créateur
1. Créer un token avec isLinked=true
2. Se connecter comme client (autre wallet)
3. Aller sur DirectoryPage
4. Cliquer sur la carte du créateur
5. ✅ Vérifier bouton "Contacter le créateur" visible
6. Cliquer → Modal avec formulaire
7. Envoyer un message
8. ✅ Vérifier notification succès

### Test 2 : Déliaison avec tickets actifs
1. Créer un ticket via TokenPage
2. Statut ticket : `'open'`
3. Aller dans ManageProfilePage > Token avec switch isLinked
4. Cliquer sur le switch (true → false)
5. ✅ Vérifier modal d'avertissement apparaît
6. ✅ Vérifier comptage correct des tickets
7. Fermer modal
8. ✅ Vérifier isLinked toujours `true`

### Test 3 : Déliaison sans tickets actifs
1. S'assurer qu'aucun ticket actif n'existe pour le token
2. Aller dans ManageProfilePage > Token avec switch isLinked
3. Cliquer sur le switch (true → false)
4. ✅ Vérifier notification succès
5. ✅ Vérifier isLinked passé à `false`
6. Recharger DirectoryPage
7. ✅ Vérifier bouton "Contacter" n'apparaît plus

### Test 4 : Créateur avec plusieurs tokens
1. Créer 2 tokens (A et B) tous deux isLinked=true
2. Créer un ticket pour token A uniquement
3. Essayer de délier token A → ❌ Bloqué
4. Essayer de délier token B → ✅ Réussi
5. ✅ Vérifier que les données de B sont supprimées
6. ✅ Vérifier que les données de A sont préservées

## 9. Fichiers modifiés

### Services
- ✅ `src/services/tokenLinkedService.js` (NOUVEAU)
- ✅ `src/services/profilService.js` (existant)

### Composants
- ✅ `src/components/CreatorProfile/CreatorProfileCard.jsx`
- ✅ `src/components/CreatorProfile/CreatorProfileModal.jsx`
- ✅ `src/components/TokenPage/TokenLinked.jsx`
- ✅ `src/components/Client/ClientTicketForm.jsx`

### Pages
- ✅ `src/pages/TokenPage.jsx` (déjà fait précédemment)
- ✅ `src/pages/SettingsPage.jsx` (déjà fait précédemment)

## 10. Prochaines étapes

1. ✅ Tester tous les scénarios mentionnés
2. ⏳ Documenter dans README utilisateur
3. ⏳ Ajouter logs détaillés pour debugging
4. ⏳ Créer migration SQL si besoin (indexes sur token_id)
5. ⏳ Ajouter tests automatisés (Playwright)

---

**Date de création :** 16 décembre 2025  
**Auteur :** GitHub Copilot  
**Révision :** 1.0
