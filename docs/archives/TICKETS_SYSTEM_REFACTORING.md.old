# Refonte du Système de Tickets et Vérifications

**Date:** 18 décembre 2025  
**Objectif:** Résoudre les problèmes d'ergonomie, UI/UX et logique métier dans le système de tickets, vérifications et signalements

---

## 🚨 Problèmes identifiés

### 1. **Confusion des statuts**
- ❌ **Vérifications** : `pending`, `info_requested`, `verified`, `rejected` mélangés avec `status` (active, suspended, banned, deleted)
- ❌ **Tickets** : `open`, `in_progress`, `resolved`, `closed` → "résolu mais pas fermé" crée de la confusion
- ❌ **Signalements** : Pas de statuts clairs (`admin_status` dans profile_reports)

### 2. **Manque de détails contextuels**
- ❌ Admin ne voit pas les détails du profil/jeton dans un ticket
- ❌ Créateur ne voit pas l'adresse eCash complète du client
- ❌ Client ne voit pas quel jeton est concerné par le ticket
- ❌ Historique de conversation fragmenté

### 3. **Conversation bidirectionnelle cassée**
- ❌ Client crée ticket → Créateur ne peut pas répondre
- ❌ Créateur répond → Client ne peut pas contre-répondre
- ❌ Admin intervient → Pas de notification aux parties
- ❌ Pas de thread de conversation unifiée

### 4. **Pollution de l'affichage**
- ❌ Tickets résolus/clos polluent la vue admin
- ❌ Pas de filtres intelligents (À traiter, Résolus récents, Archivés)
- ❌ Pas de badges de compteurs clairs

### 5. **Formulaires insuffisants**
- ❌ Manque de contexte automatique (jeton concerné, profil, etc.)
- ❌ Pas d'anticipation des problèmes (FAQ intégrée, suggestions)
- ❌ Pas de pièces jointes possibles

---

## 🎯 Solution : Architecture unifiée

### A. Schéma de statuts clarifiés

#### **Vérifications** (profiles table)
```
verification_status:
  - unverified    : Profil non vérifié (défaut)
  - pending       : Demande en attente de vérification
  - info_requested: Admin demande des informations supplémentaires
  - verified      : Profil vérifié ✅
  - rejected      : Demande refusée ❌

status (séparé):
  - active        : Profil actif (défaut)
  - suspended     : Suspendu temporairement
  - banned        : Banni définitivement
  - deleted       : Soft delete (conservation historique)
```

#### **Tickets** (tickets table - REFONTE)
```sql
CREATE TYPE ticket_status AS ENUM (
  'open',           -- Nouveau ticket non traité
  'awaiting_reply', -- En attente de réponse (admin/créateur)
  'in_progress',    -- Pris en charge
  'resolved',       -- Résolu (mais conversation ouverte 7j pour feedback)
  'closed'          -- Fermé définitivement (archivé après 30j)
);

CREATE TYPE ticket_type AS ENUM (
  'admin_creator',  -- Créateur → Admin
  'admin_client',   -- Client → Admin
  'creator_client', -- Client → Créateur (via token)
  'report'          -- Signalement
);

CREATE TYPE ticket_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS:
  - type ticket_type NOT NULL
  - status ticket_status DEFAULT 'open'
  - priority ticket_priority DEFAULT 'normal'
  - token_id TEXT -- ID du jeton concerné (si applicable)
  - creator_profile_id UUID -- ID profil créateur (si applicable)
  - client_address TEXT -- Adresse client (si applicable)
  - resolved_at TIMESTAMP
  - closed_at TIMESTAMP
  - auto_close_at TIMESTAMP -- Fermeture automatique 30j après résolution
  - conversation JSONB DEFAULT '[]' -- Thread de messages
  - metadata JSONB -- Contexte additionnel
```

#### **Signalements** (profile_reports table - REFONTE)
```sql
CREATE TYPE report_status AS ENUM (
  'pending',        -- Nouveau signalement
  'investigating',  -- En cours d'investigation
  'resolved',       -- Résolu (action prise)
  'dismissed'       -- Rejeté (pas de suite)
);

ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS:
  - status report_status DEFAULT 'pending'
  - investigated_by TEXT -- Adresse admin
  - investigated_at TIMESTAMP
  - admin_notes TEXT -- Notes internes admin
  - action_taken TEXT -- Action prise (blocage, avertissement, etc.)
```

---

### B. Flux de conversation unifiés

#### **Flux 1: Client → Admin**
```
1. Client crée ticket (formulaire avec contexte)
2. Ticket status = 'open'
3. Admin reçoit notification
4. Admin répond → status = 'in_progress'
5. Client reçoit notification
6. Client peut répondre → status = 'awaiting_reply'
7. Admin marque résolu → status = 'resolved' (7j pour feedback)
8. Si pas de réponse 7j → status = 'closed' (archivé 30j)
```

#### **Flux 2: Client → Créateur** (2 points d'entrée)

**Point d'entrée A: Depuis la page du jeton**
```
1. Client sur TokenPage → Bouton "💬 Contacter le créateur"
2. ClientTicketForm s'ouvre avec contexte AUTO-REMPLI:
   ✅ type = 'creator_client'
   ✅ token_id = (détecté depuis useParams)
   ✅ ticker = (chargé depuis tokenInfo)
   ✅ creator_profile_id = (chargé depuis profiles)
   ✅ creator_name = (chargé depuis profiles)
3. Client remplit: sujet, catégorie, description
4. Soumission → Ticket créé avec status = 'open'
5. Créateur reçoit notification (SupportTab)
6. Créateur répond → status = 'in_progress'
7. Client reçoit notification
8. Client peut répondre → Thread de conversation bidirectionnel
9. Créateur peut escalader à Admin si besoin
```

**Point d'entrée B: Depuis SettingsPage (support général)**
```
1. Client sur SettingsPage → Onglet "Support" → Bouton "Nouveau ticket"
2. ClientTicketForm s'ouvre avec sélecteur:
   - Type: "Admin" (admin_client) OU "Créateur" (creator_client)
   - Si "Créateur" sélectionné:
     → Dropdown "Sélectionner un jeton" (liste des jetons détenus)
     → Au choix: contexte AUTO-REMPLI (tokenId, ticker, créateur)
3. Client remplit: sujet, catégorie, description
4. Soumission → Ticket créé selon le type choisi
5. Flux identique au Point A
```

#### **Flux 3: Créateur → Admin**
```
1. Créateur crée ticket (vérification, support, etc.)
2. Ticket type = 'admin_creator', status = 'open'
3. Admin reçoit notification
4. Admin répond → status = 'in_progress'
5. Créateur répond → Thread de conversation
6. Admin résout → status = 'resolved'
```

#### **Flux 4: Signalements**
```
1. Utilisateur signale profil/jeton
2. profile_reports créé, status = 'pending'
3. Admin reçoit notification
4. Admin ouvre → status = 'investigating'
5. Admin peut:
   - Contacter créateur (via ticket auto-créé)
   - Bloquer profil (is_blocked_from_creating)
   - Rejeter signalement → status = 'dismissed'
6. Admin résout → status = 'resolved', action_taken renseigné
```

---

### C. Composants à créer/refondre

#### 1. **TicketDetailModal** (nouveau)
```jsx
<TicketDetailModal
  ticket={ticket}
  userRole="admin" // ou "creator" ou "client"
  onReply={handleReply}
  onClose={handleClose}
  onEscalate={handleEscalate}
  onResolve={handleResolve}
>
  {/* Sections contextuelles */}
  <TicketContext>
    {ticket.token_id && <TokenMiniCard tokenId={ticket.token_id} />}
    {ticket.creator_profile_id && <ProfileMiniCard profileId={ticket.creator_profile_id} />}
    {ticket.client_address && <ClientAddressCard address={ticket.client_address} />}
  </TicketContext>
  
  {/* Thread de conversation */}
  <ConversationThread messages={ticket.conversation} />
  
  {/* Actions selon rôle */}
  <TicketActions userRole={userRole} status={ticket.status} />
</TicketDetailModal>
```

#### 2. **ClientTicketForm** (refonte avec auto-détection)
```jsx
<ClientTicketForm
  // Props selon le point d'entrée
  type="creator_client" // ou "admin_client"
  
  // Contexte auto-détecté (depuis TokenPage)
  autoContext={{
    tokenId: "abc123...",      // useParams().tokenId
    ticker: "FARM",             // depuis tokenInfo
    creatorProfileId: "uuid",  // depuis profiles
    creatorName: "Ferme du Soleil"
  }}
  
  // OU mode manuel (depuis SettingsPage)
  allowTypeSelection={true}  // Affiche sélecteur Admin/Créateur
  allowTokenSelection={true} // Affiche dropdown jetons si type=créateur
  
  // Adresse client
  clientAddress={wallet?.address}
  
  // Callbacks
  onSubmit={handleSubmit}
  onCancel={onClose}
>
  {/* Sélecteur de type (SettingsPage uniquement) */}
  {allowTypeSelection && (
    <TypeSelector
      options={[
        { value: 'admin_client', label: '🛡️ Support Admin', icon: '🛡️' },
        { value: 'creator_client', label: '👨‍🌾 Contacter un créateur', icon: '👨‍🌾' }
      ]}
      onChange={setTicketType}
    />
  )}
  
  {/* Sélecteur de jeton (si type=créateur ET mode manuel) */}
  {ticketType === 'creator_client' && allowTokenSelection && (
    <TokenSelector
      tokens={myTokens} // Jetons détenus par le client
      onChange={(token) => setAutoContext({
        tokenId: token.tokenId,
        ticker: token.ticker,
        creatorProfileId: token.creatorProfileId,
        creatorName: token.creatorName
      })}
      placeholder="Sélectionner le jeton concerné"
    />
  )}
  
  {/* Catégories contextuelles */}
  <CategorySelector 
    categories={getContextualCategories(ticketType)}
    withFAQ={true} // FAQ intégrée par catégorie
  />
  
  {/* Anticipation problèmes */}
  <ProblemAnticipation 
    selectedCategory={category}
    tokenId={autoContext?.tokenId}
    onSuggestSolution={handleSuggestSolution}
  />
  
  {/* Pièces jointes (screenshots, etc.) */}
  <AttachmentUpload 
    maxSize={5} // 5MB
    acceptedTypes={['image/*', '.pdf']}
    bucket="ticket-attachments"
  />
</ClientTicketForm>
```

**Logique de détection automatique du contexte:**
```javascript
const ClientTicketForm = ({ 
  type, 
  autoContext, 
  allowTypeSelection, 
  allowTokenSelection,
  clientAddress,
  onSubmit 
}) => {
  const [ticketType, setTicketType] = useState(type || 'admin_client');
  const [context, setContext] = useState(autoContext || null);
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'normal',
    description: ''
  });

  // Si contexte auto-détecté (depuis TokenPage)
  useEffect(() => {
    if (autoContext) {
      setContext(autoContext);
      setTicketType('creator_client');
      // Pré-remplir le sujet
      setFormData(prev => ({
        ...prev,
        subject: `Question sur ${autoContext.ticker}`
      }));
    }
  }, [autoContext]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const ticketData = {
      type: ticketType,
      status: 'open',
      priority: formData.priority,
      subject: formData.subject,
      category: formData.category,
      description: formData.description,
      client_address: clientAddress,
      
      // Contexte selon le type
      ...(ticketType === 'creator_client' && context && {
        token_id: context.tokenId,
        creator_profile_id: context.creatorProfileId,
        metadata: {
          tokenInfo: {
            ticker: context.ticker,
            name: context.name || context.ticker
          },
          profileInfo: {
            name: context.creatorName
          }
        }
      }),
      
      // Conversation initiale
      conversation: [
        {
          id: crypto.randomUUID(),
          author: 'client',
          author_address: clientAddress,
          content: formData.description,
          timestamp: new Date().toISOString(),
          attachments: attachments || [],
          read: false
        }
      ]
    };
    
    await onSubmit(ticketData);
  };
  
  // ... rest of component
};
```

#### 3. **AdminTicketsView** (refonte)
```jsx
<AdminTicketsView>
  {/* Filtres intelligents */}
  <SmartFilters>
    <Tab id="to_handle" badge={toHandleCount}>
      À traiter {/* open + awaiting_reply */}
    </Tab>
    <Tab id="in_progress" badge={inProgressCount}>
      En cours
    </Tab>
    <Tab id="recent_resolved" badge={recentResolvedCount}>
      Résolus (7j) {/* resolved < 7 jours */}
    </Tab>
    <Tab id="archived">
      Archivés {/* closed ou resolved > 7j */}
    </Tab>
  </SmartFilters>
  
  {/* Liste avec contexte */}
  <TicketList tickets={filteredTickets}>
    {tickets.map(ticket => (
      <TicketCard 
        ticket={ticket}
        showContext={true} // Affiche minicard profil/jeton
        onViewDetails={() => openDetailModal(ticket)}
      />
    ))}
  </TicketList>
</AdminTicketsView>
```

#### 4. **CreatorTicketsView** (refonte)
```jsx
<CreatorTicketsView>
  {/* Onglets clairs */}
  <Tabs>
    <Tab id="from_clients" badge={clientTicketsCount}>
      Tickets clients {/* creator_client */}
    </Tab>
    <Tab id="with_admin" badge={adminTicketsCount}>
      Support admin {/* admin_creator */}
    </Tab>
  </Tabs>
  
  {/* Liste avec détails */}
  <TicketList>
    {tickets.map(ticket => (
      <TicketCard 
        ticket={ticket}
        showClientAddress={true} // Adresse complète visible
        showTokenDetails={true}
        onReply={() => openDetailModal(ticket)}
      />
    ))}
  </TicketList>
</CreatorTicketsView>
```

#### 5. **ClientTicketsList** (suivi optimal)
```jsx
<ClientTicketsList clientAddress={wallet?.address}>
  {/* Header avec actions */}
  <Header>
    <Title>Mes tickets de support</Title>
    <Button onClick={() => setShowNewTicketForm(true)}>
      ➕ Nouveau ticket
    </Button>
  </Header>
  
  {/* Filtres intelligents */}
  <SmartFilters>
    <Tab id="active" badge={activeCount}>
      🟢 Actifs {/* open, awaiting_reply, in_progress */}
    </Tab>
    <Tab id="resolved" badge={resolvedCount}>
      ✅ Résolus (7j) {/* resolved < 7 jours */}
    </Tab>
    <Tab id="closed">
      📦 Fermés {/* closed OU resolved > 7j */}
    </Tab>
  </SmartFilters>
  
  {/* Recherche */}
  <SearchBar 
    placeholder="Rechercher par sujet, jeton, créateur..."
    onSearch={setSearchQuery}
  />
  
  {/* Liste avec CONTEXTE COMPLET */}
  <TicketList>
    {filteredTickets.map(ticket => (
      <TicketCard 
        key={ticket.id}
        ticket={ticket}
        onClick={() => openDetailModal(ticket)}
      >
        {/* En-tête avec statut */}
        <CardHeader>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <TimeAgo date={ticket.created_at} />
        </CardHeader>
        
        {/* Sujet du ticket */}
        <CardTitle>
          {ticket.subject}
          {ticket.unread_count > 0 && (
            <UnreadBadge count={ticket.unread_count} />
          )}
        </CardTitle>
        
        {/* CONTEXTE: Destinataire */}
        <Recipient>
          {ticket.type === 'admin_client' && (
            <>
              <Icon>🛡️</Icon>
              <Label>Support Admin</Label>
            </>
          )}
          {ticket.type === 'creator_client' && (
            <>
              <Icon>👨‍🌾</Icon>
              <Label>Créateur: {ticket.metadata?.profileInfo?.name}</Label>
            </>
          )}
        </Recipient>
        
        {/* CONTEXTE: Jeton concerné (si applicable) */}
        {ticket.token_id && ticket.metadata?.tokenInfo && (
          <TokenContext>
            <TokenIcon ticker={ticket.metadata.tokenInfo.ticker} />
            <TokenLabel>
              {ticket.metadata.tokenInfo.ticker}
              {ticket.metadata.tokenInfo.name && (
                <span> - {ticket.metadata.tokenInfo.name}</span>
              )}
            </TokenLabel>
          </TokenContext>
        )}
        
        {/* Dernier message */}
        {ticket.last_message && (
          <LastMessage>
            <Author>
              {ticket.last_message.author === 'client' && 'Vous'}
              {ticket.last_message.author === 'creator' && 'Créateur'}
              {ticket.last_message.author === 'admin' && 'Admin'}
            </Author>
            <Content>
              {truncate(ticket.last_message.content, 80)}
            </Content>
            <Time>
              {formatRelativeTime(ticket.last_message.timestamp)}
            </Time>
          </LastMessage>
        )}
        
        {/* Actions rapides */}
        <CardActions>
          {canReply(ticket.status) && (
            <Button 
              size="sm" 
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                openReplyModal(ticket);
              }}
            >
              💬 Répondre
            </Button>
          )}
          {ticket.status === 'resolved' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                reopenTicket(ticket.id);
              }}
            >
              🔄 Rouvrir
            </Button>
          )}
          {ticket.status === 'open' && ticket.type === 'creator_client' && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                escalateToAdmin(ticket.id);
              }}
            >
              ⚠️ Escalader à l'admin
            </Button>
          )}
        </CardActions>
      </TicketCard>
    ))}
  </TicketList>
  
  {/* Modal nouveau ticket */}
  {showNewTicketForm && (
    <Modal onClose={() => setShowNewTicketForm(false)}>
      <ClientTicketForm
        allowTypeSelection={true}
        allowTokenSelection={true}
        clientAddress={wallet?.address}
        onSubmit={async (data) => {
          await createTicket(data);
          setShowNewTicketForm(false);
          await reloadTickets();
        }}
        onCancel={() => setShowNewTicketForm(false)}
      />
    </Modal>
  )}
  
  {/* Modal détail ticket */}
  {selectedTicket && (
    <TicketDetailModal
      ticket={selectedTicket}
      userRole="client"
      onReply={handleReply}
      onClose={() => setSelectedTicket(null)}
    />
  )}
</ClientTicketsList>
```

**Fonctions utilitaires pour suivi optimal:**
```javascript
// Déterminer si le client peut répondre
const canReply = (status) => {
  return ['open', 'awaiting_reply', 'in_progress', 'resolved'].includes(status);
};

// Rouvrir un ticket résolu
const reopenTicket = async (ticketId) => {
  await supabase
    .from('tickets')
    .update({ 
      status: 'in_progress',
      resolved_at: null,
      auto_close_at: null
    })
    .eq('id', ticketId);
  
  // Ajouter message système
  await addMessageToTicket(
    ticketId,
    'system',
    'system',
    '🔄 Ticket rouvert par le client'
  );
};

// Escalader à l'admin
const escalateToAdmin = async (ticketId) => {
  await supabase
    .from('tickets')
    .update({ 
      metadata: supabase.raw(`
        jsonb_set(
          metadata, 
          '{escalated}', 
          'true'::jsonb
        )
      `),
      priority: 'high'
    })
    .eq('id', ticketId);
  
  // Créer notification pour admin
  await createAdminNotification({
    type: 'ticket_escalated',
    ticket_id: ticketId,
    message: 'Ticket client escaladé'
  });
};

// Tronquer texte
const truncate = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Temps relatif
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
};
```

---

### D. Filtres intelligents

#### **Admin**
```javascript
const filterTickets = (tickets, filter) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  switch(filter) {
    case 'to_handle':
      return tickets.filter(t => 
        ['open', 'awaiting_reply'].includes(t.status)
      );
    
    case 'in_progress':
      return tickets.filter(t => t.status === 'in_progress');
    
    case 'recent_resolved':
      return tickets.filter(t => 
        t.status === 'resolved' && 
        new Date(t.resolved_at) > sevenDaysAgo
      );
    
    case 'archived':
      return tickets.filter(t => 
        t.status === 'closed' || 
        (t.status === 'resolved' && new Date(t.resolved_at) <= sevenDaysAgo)
      );
    
    default:
      return tickets;
  }
};
```

#### **Créateur**
```javascript
const filterCreatorTickets = (tickets, filter) => {
  switch(filter) {
    case 'from_clients':
      return tickets.filter(t => 
        t.type === 'creator_client' && 
        ['open', 'awaiting_reply', 'in_progress'].includes(t.status)
      );
    
    case 'with_admin':
      return tickets.filter(t => 
        t.type === 'admin_creator' && 
        ['open', 'awaiting_reply', 'in_progress'].includes(t.status)
      );
    
    case 'resolved':
      return tickets.filter(t => 
        ['resolved', 'closed'].includes(t.status)
      );
    
    default:
      return tickets;
  }
};
```

#### **Client**
```javascript
const filterClientTickets = (tickets, filter) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  switch(filter) {
    case 'active':
      return tickets.filter(t => 
        ['open', 'awaiting_reply', 'in_progress'].includes(t.status)
      );
    
    case 'resolved':
      return tickets.filter(t => 
        t.status === 'resolved' && 
        new Date(t.resolved_at) > sevenDaysAgo
      );
    
    case 'closed':
      return tickets.filter(t => 
        t.status === 'closed' || 
        (t.status === 'resolved' && new Date(t.resolved_at) <= sevenDaysAgo)
      );
    
    default:
      return tickets;
  }
};
```

---

### E. Notifications intelligentes

#### **Règles de notification**
```javascript
const notificationRules = {
  // Client crée ticket
  'ticket.created.client': {
    notify: ['admin', 'creator'], // selon type
    message: 'Nouveau ticket de {client_address}'
  },
  
  // Admin/Créateur répond
  'ticket.replied': {
    notify: ['client'],
    message: 'Réponse à votre ticket #{ticket_id}'
  },
  
  // Client répond
  'ticket.client_reply': {
    notify: ['admin', 'creator'],
    message: 'Nouvelle réponse de {client_address}'
  },
  
  // Ticket résolu
  'ticket.resolved': {
    notify: ['client'],
    message: 'Votre ticket #{ticket_id} a été résolu'
  },
  
  // Auto-fermeture imminente
  'ticket.auto_close_warning': {
    notify: ['client'],
    message: 'Votre ticket sera fermé dans 24h (pas de réponse)'
  },
  
  // Signalement créé
  'report.created': {
    notify: ['admin'],
    priority: 'high',
    message: 'Nouveau signalement sur {profile_name}'
  }
};
```

---

### F. Migration SQL

```sql
-- 1. Modifier table tickets
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'admin_client',
  ADD COLUMN IF NOT EXISTS token_id TEXT,
  ADD COLUMN IF NOT EXISTS creator_profile_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS client_address TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_close_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS conversation JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Modifier table profile_reports
ALTER TABLE profile_reports
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS investigated_by TEXT,
  ADD COLUMN IF NOT EXISTS investigated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS action_taken TEXT;

-- 3. Index pour performances
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_token_id ON tickets(token_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_profile_id ON tickets(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_address ON tickets(client_address);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets(resolved_at);

CREATE INDEX IF NOT EXISTS idx_profile_reports_status ON profile_reports(status);
CREATE INDEX IF NOT EXISTS idx_profile_reports_profil_id ON profile_reports(profil_id);

-- 4. Fonction auto-close tickets résolus > 30j
CREATE OR REPLACE FUNCTION auto_close_old_tickets()
RETURNS void AS $$
BEGIN
  UPDATE tickets
  SET status = 'closed',
      closed_at = NOW()
  WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger pour auto_close_at
CREATE OR REPLACE FUNCTION set_auto_close_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
    NEW.auto_close_at = NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_auto_close_date
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION set_auto_close_date();
```

---

## 📋 Plan d'implémentation

### Phase 1: Migrations et modèles (2h)
- [x] Créer migration SQL pour tickets
- [ ] Créer migration SQL pour profile_reports
- [ ] Mettre à jour les types TypeScript/JSDoc
- [ ] Tester migrations en dev

### Phase 2: Composants de base (4h)
- [ ] Créer TicketDetailModal
- [ ] Créer TokenMiniCard
- [ ] Créer ProfileMiniCard
- [ ] Créer ConversationThread
- [ ] Créer SmartFilters

### Phase 3: Formulaires améliorés (3h)
- [ ] Refondre ClientTicketForm
- [ ] Refondre CreatorTicketForm
- [ ] Ajouter CategorySelector avec FAQ
- [ ] Ajouter ProblemAnticipation
- [ ] Ajouter AttachmentUpload

### Phase 4: Vues refondues (5h)
- [ ] Refondre AdminTicketsView
- [ ] Refondre CreatorTicketsView (SupportTab)
- [ ] Refondre ClientTicketsView
- [ ] Intégrer filtres intelligents
- [ ] Tester conversation bidirectionnelle

### Phase 5: Notifications (2h)
- [ ] Implémenter système de notifications
- [ ] Ajouter badges de compteurs
- [ ] Tester notifications en temps réel

### Phase 6: Tests et polish (2h)
- [ ] Tester tous les flux de bout en bout
- [ ] Vérifier performances
- [ ] Documentation utilisateur

**Total estimé: 18h**

---

## ✅ Critères de succès

- ✅ Admin voit contexte complet (profil, jeton, adresse) dans chaque ticket
- ✅ Créateur peut répondre aux tickets clients et voir adresse complète
- ✅ Client peut répondre aux réponses du créateur
- ✅ Tickets résolus ne polluent plus la vue (filtre "Archivés")
- ✅ Statuts clairs et cohérents (pas de "résolu mais pas fermé")
- ✅ Formulaires anticipent les problèmes avec FAQ intégrée
- ✅ Conversation bidirectionnelle fluide avec thread
- ✅ Notifications pertinentes selon le rôle

---

## 🔗 Références

- [SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md) - Schéma actuel
- [ANTI_FRAUD_SYSTEM.md](ANTI_FRAUD_SYSTEM.md) - Système anti-fraude
- [COMPONENTS.md](COMPONENTS.md) - Composants UI existants
