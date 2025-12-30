# Phase 3 - ManageFarmPage Refactoring - Plan d'Exécution

**Date:** Janvier 2025  
**Statut:** En cours  
**Fichier cible:** `src/pages/ManageFarmPage.jsx` (1917 lignes actuellement)

---

## 📊 État Actuel

### Structure existante (5 onglets):
1. **📋 Infos** - Nom, description, produits, services
2. **📍 Localisation** - Adresse, ville, code postal, pays
3. **📞 Contact** - Email, téléphone, réseaux sociaux
4. **🏆 Certifications** - Certificats, liens de vérification
5. **🔒 Vérification** - Statut, demande de vérification

### Problèmes identifiés:
- ❌ Trop d'onglets pour navigation mobile
- ❌ Pas de visibilité sur les tokens liés
- ❌ Sécurité et suppression noyées dans le contenu
- ❌ Communication admin dispersée (en bas de page)
- ❌ Layout non optimisé (1 colonne alors que place disponible)

---

## 🎯 Nouvelle Structure (4 onglets principaux)

### **Onglet 1: 🏡 Profil**
**Contenu regroupé:**
- Sections existantes disposées en **grid 2 colonnes** (desktop)
- Colonne gauche:
  - InfosTab (nom, description, produits, services)
  - CertificationsTab (certifications nationales/internationales)
- Colonne droite:
  - LocationTab (adresse complète)
  - ContactTab (email, téléphone, réseaux sociaux)
  - VerificationTab (statut, confidentialité)
- **Responsive**: Sur mobile, passage à 1 colonne automatique

**Boutons d'action:**
- Bouton "Enregistrer" en bas de chaque section
- Grisé si aucune modification
- Alertes si champs sensibles modifiés

---

### **Onglet 2: 🪙 Mes Jetons Liés**
**Nouveau contenu:**

```jsx
<Card>
  <CardContent>
    <h2>Jetons associés à mon profil</h2>
    <p className="text-sm text-secondary">
      Gérez la visibilité de vos jetons dans votre profil public
    </p>
    
    {tokensWithStats.length === 0 ? (
      <InfoBox type="info">
        Aucun jeton associé. Créez ou importez un jeton pour commencer.
      </InfoBox>
    ) : (
      <div className="tokens-table">
        <table>
          <thead>
            <tr>
              <th>Jeton</th>
              <th>Ticker</th>
              <th>Offre</th>
              <th>Type</th>
              <th>Visible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokensWithStats.map(token => (
              <tr key={token.tokenId}>
                <td>
                  <div className="d-flex align-center gap-2">
                    <img src={token.image} width="32" />
                    <span>{token.name}</span>
                  </div>
                </td>
                <td><strong>{token.ticker}</strong></td>
                <td>{token.supply}</td>
                <td>
                  <Badge variant={token.isVariable ? 'success' : 'secondary'}>
                    {token.isVariable ? '🔄 Variable' : '🔒 Fixe'}
                  </Badge>
                </td>
                <td>
                  <VisibilityToggle
                    isVisible={token.isVisible}
                    onChange={() => handleToggleTokenVisibility(token.tokenId)}
                    disabled={togglingVisibility[token.tokenId]}
                  />
                </td>
                <td>
                  <Button 
                    size="sm"
                    onClick={() => navigate(`/token/${token.tokenId}`)}
                  >
                    Gérer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    
    <div className="d-flex gap-2 mt-4">
      <Button onClick={() => setShowCreateTokenModal(true)}>
        ✨ Créer un jeton
      </Button>
      <Button variant="outline" onClick={() => setShowImportTokenModal(true)}>
        📥 Importer un jeton
      </Button>
    </div>
  </CardContent>
</Card>
```

**Fonctionnalités:**
- Liste tous les tokens associés au profil
- Toggle de visibilité par token (isVisible)
- Lien direct vers TokenDetailsPage
- Boutons création/import de tokens

---

### **Onglet 3: 🔒 Sécurité & Confidentialité**
**Nouveau contenu:**

```jsx
<Stack spacing="md">
  {/* Switch visibilité profil */}
  <Card>
    <CardContent>
      <h2>Visibilité du profil</h2>
      <div className="d-flex justify-between align-center">
        <div>
          <p className="text-sm text-secondary">
            {existingFarm.status === 'active' 
              ? '✅ Votre profil est visible dans l\'annuaire public'
              : '📋 Votre profil est en mode brouillon (non visible)'}
          </p>
        </div>
        <Switch
          checked={existingFarm.status === 'active'}
          onChange={(checked) => handleToggleFarmStatus(checked ? 'active' : 'draft')}
          size="lg"
        />
      </div>
    </CardContent>
  </Card>

  {/* Confidentialité des champs */}
  <Card>
    <CardContent>
      <h2>Confidentialité des informations</h2>
      <p className="text-sm text-secondary mb-4">
        Choisissez quelles informations masquer du profil public
      </p>
      
      <Stack spacing="sm">
        <div className="d-flex justify-between align-center">
          <span>Masquer l'email</span>
          <Switch
            checked={privacy.hideEmail}
            onChange={() => handlePrivacyChange('hideEmail')}
          />
        </div>
        <div className="d-flex justify-between align-center">
          <span>Masquer le téléphone</span>
          <Switch
            checked={privacy.hidePhone}
            onChange={() => handlePrivacyChange('hidePhone')}
          />
        </div>
        <div className="d-flex justify-between align-center">
          <span>Masquer le SIRET/SIREN</span>
          <Switch
            checked={privacy.hideCompanyID}
            onChange={() => handlePrivacyChange('hideCompanyID')}
          />
        </div>
        <div className="d-flex justify-between align-center">
          <span>Masquer le représentant légal</span>
          <Switch
            checked={privacy.hideLegalRep}
            onChange={() => handlePrivacyChange('hideLegalRep')}
          />
        </div>
      </Stack>
    </CardContent>
  </Card>

  {/* Suppression du profil */}
  <Card style={{ 
    backgroundColor: 'var(--error-light)', 
    border: '2px solid var(--accent-error)' 
  }}>
    <CardContent>
      <h2>🗑️ Suppression du profil</h2>
      <p className="text-sm text-secondary mb-3">
        Supprimer définitivement votre profil de l'annuaire
      </p>
      
      <InfoBox type="warning">
        <strong>⚠️ Action irréversible</strong><br />
        Vos données personnelles seront définitivement effacées après un délai de 1 an.
        L'historique blockchain de vos tokens restera visible (immuable).
      </InfoBox>
      
      <Button
        variant="danger"
        onClick={() => setShowDeleteModal(true)}
        className="w-full mt-3"
      >
        Supprimer mon profil
      </Button>
    </CardContent>
  </Card>
</Stack>
```

**Fonctionnalités:**
- Toggle visibilité globale (active/draft)
- Switches confidentialité par champ
- Section suppression avec double confirmation
- Alertes et avertissements clairs

---

### **Onglet 4: 💬 Support & Communication**
**Contenu déplacé + amélioré:**

```jsx
<Stack spacing="md">
  {/* Tickets ouverts */}
  <Card>
    <CardContent>
      <div className="d-flex justify-between align-center mb-4">
        <h2>Mes tickets de support</h2>
        <Button onClick={() => setShowNewTicketModal(true)}>
          ✉️ Nouveau ticket
        </Button>
      </div>
      
      {myTickets.length === 0 ? (
        <InfoBox type="info">
          Aucun ticket ouvert. Contactez l'administration si vous avez besoin d'aide.
        </InfoBox>
      ) : (
        <Stack spacing="sm">
          {myTickets.map(ticket => (
            <Card key={ticket.id} className="ticket-card">
              <CardContent>
                <div className="d-flex justify-between align-center mb-2">
                  <Badge variant={getTicketStatusVariant(ticket.status)}>
                    {ticket.status}
                  </Badge>
                  <span className="text-xs text-secondary">
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
                <h3>{ticket.subject}</h3>
                <p className="text-sm text-secondary">{ticket.category}</p>
                <Button 
                  size="sm" 
                  onClick={() => navigate(`/ticket/${ticket.id}`)}
                >
                  Voir détails
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </CardContent>
  </Card>

  {/* Communication avec admin (existant) */}
  <CommunicationSection
    existingFarm={existingFarm}
    newMessage={newMessage}
    setNewMessage={setNewMessage}
    sendingMessage={sendingMessage}
    handleSendMessage={handleSendMessage}
  />

  {/* Signalements (si admin a affichés) */}
  {existingFarm?.showReports && (
    <ReportsSection
      existingFarm={existingFarm}
      onRespond={handleRespondToReport}
    />
  )}
</Stack>
```

**Fonctionnalités:**
- Liste des tickets du créateur
- Bouton création nouveau ticket
- Communication avec admin (déplacé depuis le bas)
- Section signalements conditionnelle

---

## 🛠️ Plan d'Implémentation

### Étape 1: Préparer les imports
```javascript
import NetworkFeesAvail from '../components/NetworkFeesAvail';
import NotificationBell from '../components/NotificationBell';
import CreateTokenModal from '../components/CreateTokenModal';
import CreateProfileModal from '../components/CreateProfileModal';
```

### Étape 2: Ajouter states pour nouveaux onglets
```javascript
// Tokens avec stats (déjà existe)
const [tokensWithStats, setTokensWithStats] = useState([]);

// Tickets (nouveau)
const [myTickets, setMyTickets] = useState([]);
const [loadingTickets, setLoadingTickets] = useState(false);
const [showNewTicketModal, setShowNewTicketModal] = useState(false);

// Modals (nouveau)
const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
const [showImportTokenModal, setShowImportTokenModal] = useState(false);
```

### Étape 3: Charger les tickets
```javascript
const loadMyTickets = async () => {
  if (!address) return;
  
  setLoadingTickets(true);
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('created_by', address)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    setMyTickets(data || []);
  } catch (err) {
    console.error('Erreur chargement tickets:', err);
  } finally {
    setLoadingTickets(false);
  }
};

useEffect(() => {
  loadMyTickets();
}, [address]);
```

### Étape 4: Modifier le render principal
```javascript
// Changer la liste des tabs
<Tabs
  tabs={[
    { id: 'profile', label: '🏡 Profil' },
    { id: 'tokens', label: '🪙 Mes Jetons' },
    { id: 'security', label: '🔒 Sécurité' },
    { id: 'support', label: '💬 Support' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>

// Ajouter les nouveaux onglets
{activeTab === 'profile' && (
  <div className="manage-farm-grid">
    {/* Grid 2 colonnes avec tous les tabs existants */}
  </div>
)}

{activeTab === 'tokens' && (
  <TokensListTab {...props} />
)}

{activeTab === 'security' && (
  <SecurityTab {...props} />
)}

{activeTab === 'support' && (
  <SupportTab {...props} />
)}
```

### Étape 5: Créer les composants des nouveaux onglets
- `src/components/Farm/TokensListTab.jsx` (~200 lignes)
- `src/components/Farm/SecurityTab.jsx` (~150 lignes)  
- `src/components/Farm/SupportTab.jsx` (~250 lignes)

---

## 📏 Grid CSS pour Onglet Profil

```css
.manage-farm-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .manage-farm-grid {
    grid-template-columns: 1fr;
  }
}
```

**Disposition:**
```
┌─────────────────────┬─────────────────────┐
│  InfosTab           │  LocationTab        │
│  (Nom, desc,        │  (Adresse complète) │
│   produits,         │                     │
│   services)         ├─────────────────────┤
│                     │  ContactTab         │
├─────────────────────┤  (Email, tél, web)  │
│  CertificationsTab  │                     │
│  (Certificats)      ├─────────────────────┤
│                     │  VerificationTab    │
│                     │  (Statut, privacy)  │
└─────────────────────┴─────────────────────┘
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer TokensListTab.jsx
- [ ] Créer SecurityTab.jsx
- [ ] Créer SupportTab.jsx
- [ ] Modifier la liste des tabs dans ManageFarmPage
- [ ] Ajouter le grid CSS pour onglet profile
- [ ] Charger les tickets depuis Supabase
- [ ] Tester la navigation entre onglets
- [ ] Vérifier le responsive (mobile/desktop)
- [ ] Intégrer CreateTokenModal
- [ ] Intégrer CreateProfileModal
- [ ] Tests E2E

---

## 📊 Estimation

- **TokensListTab.jsx**: ~200 lignes, 1h de dev
- **SecurityTab.jsx**: ~150 lignes, 45min de dev
- **SupportTab.jsx**: ~250 lignes, 1h30 de dev
- **Refactoring ManageFarmPage**: 30min
- **Tests & ajustements**: 1h
- **Total estimé**: ~4h30

---

**Prochaine action**: Créer les 3 nouveaux composants Tab, puis modifier ManageFarmPage.
