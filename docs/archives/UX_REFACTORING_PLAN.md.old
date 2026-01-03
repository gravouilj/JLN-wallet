# 🎯 Plan de Refactorisation UX Admin/Créateur/Client

**Date** : 15 Décembre 2025  
**Status** : En cours  
**Conformité** : STYLING_GUIDE.md v3.0

---

## 📋 Vue d'ensemble

Refonte complète des flux de communication et de gestion pour améliorer l'expérience admin, créateur et client.

---

## 🎨 Principes de Design

### Conformité STYLING_GUIDE.md
- ✅ Classes utilitaires (.d-flex, .gap-*, .p-*, .rounded-*, etc.)
- ✅ Variables CSS (--bg-primary, --accent-primary, --text-primary, etc.)
- ✅ Architecture modulaire et réutilisable
- ✅ Composants pédagogiques avec étapes guidées
- ✅ Feedback utilisateur constant (loading, success, error)

### Patterns UX
- **Progressive Disclosure** : Affichage conditionnel selon contexte
- **Feedback immédiat** : Notifications, badges, états de chargement
- **Actions guidées** : Modals pédagogiques avec étapes
- **Communication claire** : Messages automatiques, historique visible

---

## 🔧 PHASE 1 : Dashboard Admin (PRIORITÉ HAUTE)

### 1.1 AdminDashboard - Layout Principal
**Fichier** : `src/pages/AdminDashboard.jsx`  
**Composants** :
- `<Tabs>` : Vérifications | Support | Paramètres | Statistiques
- Navigation rapide entre sections
- Badge notifications sur onglets

### 1.2 Onglet Vérifications
**Fichier** : `src/pages/AdminVerificationPage.jsx` (refactoring)  
**Sous-onglets** :
- Tous les profils
- En attente de vérification
- Vérifiés
- Refusés
- Blacklistés

**Composants utilisés** :
- `<AdminProfilCard>` ✅ (déjà créé)
- `<SearchFilters>` ✅ (déjà créé)
- `<StatusBadge>` ✅ (déjà existant)

### 1.3 Onglet Support - Système de Tickets
**Fichier** : `src/components/Admin/AdminTicketSystem.jsx` (NOUVEAU)

**Types de tickets** :
1. **Tickets Créateurs** : Questions/support des agriculteurs
2. **Tickets Clients** : Support utilisateurs classiques
3. **Tickets Signalements** : Reports de fermes/tokens

**Component AdminTicket** :
```jsx
<AdminTicket
  ticket={ticket}
  onReply={handleReply}
  onClose={handleClose}
  onEscalate={handleEscalate}
  processing={processing}
/>
```

**Propriétés** :
- ID unique
- Type (creator/client/report)
- Catégorie (technique, financier, modération, etc.)
- Statut (ouvert, en cours, résolu, fermé)
- Priorité (basse, normale, haute, urgente)
- Participants (client/créateur/admin)
- Historique des messages
- Pièces jointes (optionnel)

**Flux Signalement Client → Admin → Créateur** :
1. Client signale une ferme/token
2. Message auto client : "Signalement reçu, en cours de traitement"
3. Admin voit le signalement dans Support > Signalements
4. Admin peut :
   - Afficher/Masquer le signalement au créateur
   - Joindre des pièces justificatives
   - Demander des informations
   - Définir un délai de réponse
5. Si délai dépassé : option auto-masquer profil
6. Créateur répond dans son dashboard
7. Admin traite : Ignorer/Suspendre/Bannir
8. Message auto client : "Signalement traité - [résolution]"
9. Conversation auto-fermée

### 1.4 Onglet Paramètres
**Fichier** : `src/components/Admin/AdminSettings.jsx` (NOUVEAU)

**Sections** :
1. **Configuration CTA**
   - Activer/Désactiver CTAs
   - Position dans directory
   - Message personnalisé
   - Fréquence d'affichage
2. **Délais de réponse**
   - Délai réponse créateur (heures)
   - Action si dépassement (masquer/suspendre)
3. **Notifications**
   - Email admin pour nouveaux tickets
   - Email pour signalements urgents

### 1.5 Onglet Statistiques
**Fichier** : `src/components/Admin/AdminStats.jsx` (NOUVEAU)

**Métriques** :
- Nombre total de créateurs (par statut)
- Nombre total de clients actifs
- Nombre de tokens (créés vs importés)
- Liste détaillée des tokens avec stats
- Nombre total de transactions
- Transactions par token (top 10)
- Commissions collectées par admin
- Evolution temporelle (graphiques)

**Component** :
```jsx
<AdminStats>
  <StatCard icon="👨‍🌾" label="Créateurs" value={creatorCount} />
  <StatCard icon="👥" label="Clients" value={clientCount} />
  <StatCard icon="🪙" label="Tokens" value={tokenCount} />
  <StatCard icon="💰" label="Commissions" value={totalFees} />
  <TokenStatsTable tokens={tokens} />
  <TransactionChart data={txData} />
</AdminStats>
```

---

## 🌾 PHASE 2 : Dashboard Créateur (PRIORITÉ HAUTE)

### 2.1 WalletDashboard - Header Amélioré
**Fichier** : `src/pages/WalletDashboard.jsx` (refactoring ligne 1-100)

**Ligne du haut** :
```jsx
<div className="d-flex align-center justify-between">
  {/* Gauche */}
  <div className="d-flex align-center gap-3">
    <h1>Nom du Profil</h1>
    <StatusBadge status={verificationStatus} type="verification" />
    {!hasFarm && <Button variant="primary">Créer mon profil</Button>}
    {hasFarm && !verified && <Button variant="warning">Vérifier mon profil</Button>}
  </div>
  
  {/* Droite */}
  <div className="d-flex align-center gap-2">
    <NotificationBell count={unreadNotifications} />
    {isAdmin && <Button variant="ghost" onClick={() => navigate('/admin')}>Admin</Button>}
  </div>
</div>
```

### 2.2 Boutons Actions Rapides
**Sous le header** :
```jsx
<div className="d-flex gap-3">
  <Button icon="✨" onClick={() => setShowCreateTokenModal(true)}>
    Créer un jeton
  </Button>
  <Button icon="📥" onClick={() => setShowImportTokenModal(true)}>
    Importer un jeton
  </Button>
  <Button icon="⚙️" onClick={() => navigate('/manage-farm')}>
    Gérer mon profil
  </Button>
</div>
```

### 2.3 CreateTokenModal (NOUVEAU)
**Fichier** : `src/components/Token/CreateTokenModal.jsx`

**Flux pédagogique** :
1. Vérification prérequis (profil créé ?)
   - Si non : Afficher `<CreateProfileModal>`
2. Étape 1 : Informations de base
   - Nom du token
   - Ticker (3-12 lettres)
   - Supply totale
   - Decimals (0-9)
3. Étape 2 : Configuration
   - Logo (upload ou URL)
   - Description
   - Site web
4. Étape 3 : Vérification
   - Récapitulatif
   - Coût de création (XEC) - calcul dynamique via la blockchain
5. Étape 4 : Création
   - Transaction blockchain
   - Confirmation
6. Étape 5 : Liaison au profil
   - Associer automatiquement au profil
   - Redirection vers TokenDetailsPage

**Conformité STYLING_GUIDE** :
- Stepper visuel en haut
- Card pour chaque étape
- Boutons Précédent/Suivant
- Loading states
- Messages d'erreur clairs

### 2.4 ImportTokenModal Amélioré
**Fichier** : `src/components/Token/ImportTokenModal.jsx` (refactoring)

**Améliorations** :
1. Détection profil complet
   - Si profil complet : Mode importation rapide (TokenID uniquement)
   - Si profil incomplet : Proposer complétion (optionnel) via `<CreateProfileModal>`
2. Détection doublon
   - Si token déjà importé : Message + fermeture auto après 3s
3. Validation blockchain
   - Vérifier existence du token
   - Afficher infos (ticker, supply, decimals)
4. Liaison optionnelle au profil

### 2.5 CreateProfileModal (NOUVEAU)
**Fichier** : `src/components/Farm/CreateProfileModal.jsx`

**Flux pédagogique** :
1. Étape 1 : Informations de base
   - Nom de la ferme
   - Description courte
   - Pays/Région/Département
2. Étape 2 : Localisation
   - Adresse complète
   - Code postal
   - Ville
3. Étape 3 : Contact
   - Email (avec visibilité)
   - Téléphone (avec visibilité)
   - Réseaux sociaux
4. Étape 4 : Produits & Services
   - Tags produits
   - Tags services
5. Étape 5 : Confirmation
   - Récapitulatif
   - Enregistrement

**Usage** :
- Appelé depuis CreateTokenModal si pas de profil
- Appelé depuis ImportTokenModal si profil incomplet
- Appelé depuis bouton "Créer mon profil"

### 2.6 Section NetworkFeesAvail (NOUVEAU)
**Fichier** : `src/components/Wallet/NetworkFeesAvail.jsx`

**Affichage** :
```jsx
<Card className="network-fees-card">
  <CardContent>
    <div className="d-flex align-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-secondary">
          Frais réseau disponibles
        </h3>
        <p className="text-2xl font-bold text-primary">
          {availableFees} XEC
        </p>
      </div>
      <Button size="sm" variant="outline">
        Historique
      </Button>
    </div>
  </CardContent>
</Card>
```

### 2.7 Section Aperçu des Jetons - Filtres
**Ajout de SearchFilters** :
```jsx
<SearchFilters
  searchQuery={tokenSearchQuery}
  onSearchChange={setTokenSearchQuery}
  filters={[
    {
      id: 'sort',
      label: 'Trier par',
      icon: '🔽',
      value: sortBy,
      options: [
        { value: 'balance', label: 'Solde' },
        { value: 'name', label: 'Nom' },
        { value: 'date', label: 'Date' }
      ],
      onChange: setSortBy
    }
  ]}
/>
```

### 2.8 Section Historique
**Deux sous-sections** :
1. **Historique Actions** : HistoryList (actions profil, tokens)
2. **Historique Transactions XEC** : TransactionsList

---

## 🔧 PHASE 3 : ManageFarmPage - Refactoring (PRIORITÉ HAUTE)

### 3.1 Nouvelle Structure en Onglets
**Fichier** : `src/pages/ManageFarmPage.jsx` (refactoring majeur)

**Onglet 1 : Profil** (sections en grid 2 colonnes)
1. InfosTab ✅ (déjà existant)
2. LocationTab ✅ (déjà existant)
3. ContactTab ✅ + amélioration (email + tel avec isVisible)
4. CertificationsTab ✅ (déjà existant)
5. VerificationTab ✅ + bouton "Demander vérification"

**Bouton Enregistrer** : En bas de chaque section, grisé si pas de modifications

**Onglet 2 : Mes Jetons Liés**
- Tableau récapitulatif
- Colonnes : Token | Ticker | Supply | Lié | Actions
- Toggle isLinked
- Bouton Modifier (vers TokenDetailsPage)

**Onglet 3 : Sécurité & Confidentialité**
- Switch isVisible (masquer profil du directory)
- Section Suppression du profil
  - Avertissement
  - Confirmation double
  - Soft delete

**Onglet 4 : Support & Communication**
- Liste des tickets ouverts par le créateur
- Bouton "Nouveau ticket"
- Tickets de signalement (affichage conditionnel selon admin)

### 3.2 Layout Grid 2 Colonnes
```jsx
<div className="manage-farm-grid" style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '24px'
}}>
  <InfosTab {...props} />
  <LocationTab {...props} />
  <ContactTab {...props} />
  <CertificationsTab {...props} />
  <VerificationTab {...props} />
</div>
```

---

## 👥 PHASE 4 : Client - Support (PRIORITÉ MOYENNE)

### 4.1 Settings Page - Onglet Support
**Fichier** : `src/pages/SettingsPage.jsx` (ajout)

**Fonctionnalités** :
- Envoyer un ticket à l'admin
- Envoyer un ticket au créateur d'un token possédé
- Voir historique des tickets

**Component ClientTicketForm** :
```jsx
<ClientTicketForm
  type="admin" // ou "creator"
  tokenId={selectedTokenId} // si type="creator"
  onSubmit={handleSubmit}
/>
```

---

## 📦 Composants à Créer (par priorité)

### ✅ Déjà créés
- AdminProfilCard
- AdminReportCard
- SearchFilters
- Faq
- OnboardingModal

### 🔴 PRIORITÉ 1 (Dashboard Admin)
1. `AdminDashboard.jsx` - Layout principal admin
2. `AdminTicketSystem.jsx` - Système de tickets complet
3. `AdminTicket.jsx` - Card de ticket individuel
4. `AdminSettings.jsx` - Paramètres admin
5. `AdminStats.jsx` - Statistiques

### 🟠 PRIORITÉ 2 (Dashboard Créateur)
1. `CreateTokenModal.jsx` - Création guidée de token
2. `CreateProfileModal.jsx` - Création guidée de profil
3. `ImportTokenModal.jsx` - Refactoring avec améliorations
4. `NetworkFeesAvail.jsx` - Affichage frais réseau
5. `NotificationBell.jsx` - Cloche de notifications

### 🟡 PRIORITÉ 3 (ManageFarmPage)
1. Refactoring structure onglets
2. Amélioration ContactTab (visibility toggles)
3. Onglet Jetons Liés
4. Onglet Sécurité
5. Onglet Support

### 🟢 PRIORITÉ 4 (Client)
1. `ClientTicketForm.jsx` - Formulaire de ticket
2. `ClientTicketList.jsx` - Liste des tickets

---

## 🔄 Flux de Communication - Diagrammes

### Flux Signalement Client → Admin → Créateur
```
Client signale ferme
       ↓
Message auto : "Reçu, traitement en cours"
       ↓
Admin voit signalement (Support > Signalements)
       ↓
Admin décide: Afficher/Masquer au créateur
       ↓
Admin initie conversation avec créateur
       ↓
Admin définit délai réponse (ex: 48h)
       ↓
Créateur reçoit notification
       ↓
Créateur répond dans délai
       ↓
Admin traite: Ignorer/Suspendre/Bannir
       ↓
Message auto client: "Signalement [résolu/rejeté]"
       ↓
Conversation auto-fermée
```

### Flux Ticket Support Standard
```
Client/Créateur ouvre ticket
       ↓
Ticket visible dans Admin > Support
       ↓
Admin assigne catégorie + priorité
       ↓
Conversation bidirectionnelle
       ↓
Admin clôture ticket
       ↓
Notification envoyée
```

---

## 🎯 Métriques de Succès

### UX Admin
- Temps moyen de traitement d'un signalement < 24h
- Temps moyen de réponse ticket < 12h
- Taux de satisfaction admin > 90%

### UX Créateur
- Taux de complétion profil > 80%
- Temps moyen création token < 5 min
- Taux de réponse aux demandes admin > 90%

### UX Client
- Temps moyen résolution signalement < 48h
- Taux de réponse tickets < 24h
- Clarté des statuts > 95%

---

## 📅 Planning de Développement

### Semaine 1 : Admin Dashboard
- [ ] AdminDashboard layout
- [ ] AdminTicketSystem
- [ ] AdminTicket component
- [ ] Tests & intégration

### Semaine 2 : Créateur Dashboard
- [ ] CreateTokenModal
- [ ] CreateProfileModal
- [ ] ImportTokenModal refactoring
- [ ] Tests & intégration

### Semaine 3 : ManageFarmPage
- [ ] Refactoring structure onglets
- [ ] Onglets Jetons/Sécurité/Support
- [ ] Tests & intégration

### Semaine 4 : Client & Finalisation
- [ ] ClientTicketForm
- [ ] Tests E2E complets
- [ ] Documentation utilisateur
- [ ] Déploiement

---

## 📝 Notes Techniques

### Base de données - Nouvelles tables

**tickets** :
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'creator', 'client', 'report'
  category TEXT NOT NULL, -- 'technique', 'financier', 'moderation', etc.
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  subject TEXT NOT NULL,
  created_by TEXT NOT NULL, -- wallet address
  assigned_to TEXT, -- admin wallet address
  farm_id UUID REFERENCES farms(id),
  token_id TEXT,
  response_deadline TIMESTAMP,
  auto_action TEXT, -- 'hide', 'suspend', null
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);
```

**ticket_messages** :
```sql
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL, -- 'admin', 'creator', 'client'
  author_address TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB, -- [{url, filename, type}]
  visible_to TEXT[], -- ['admin', 'creator', 'client']
  created_at TIMESTAMP DEFAULT NOW()
);
```

**admin_settings** :
```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Variables CSS à ajouter
```css
/* Tickets */
--ticket-open-bg: #dbeafe;
--ticket-progress-bg: #fef3c7;
--ticket-resolved-bg: #d1fae5;
--ticket-closed-bg: #f3f4f6;

/* Priorités */
--priority-low: #9ca3af;
--priority-normal: #3b82f6;
--priority-high: #f59e0b;
--priority-urgent: #ef4444;
```

---

## 🔗 Liens Utiles

- [STYLING_GUIDE.md](./STYLING_GUIDE.md)
- [Components UI](../src/components/UI.jsx)
- [AdminProfilCard](../src/components/Admin/AdminProfilCard.jsx)
- [AdminReportCard](../src/components/Admin/AdminReportCard.jsx)

---

**Dernière mise à jour** : 15 Décembre 2025
