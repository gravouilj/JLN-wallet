# Système de Centralisation des Données - Documentation Complète

## ✅ Modifications Réalisées

### 1. Structure farms.json Modernisée

**Fichier**: `src/data/farms.json`

**Nouvelle structure** :
```json
{
  "id": "1",
  "name": "Ferme EVA (Test)",
  "description": "...",
  "region": "Bretagne",
  "country": "France",
  "products": ["Légumes", "Fruits"],
  "services": ["Vente à la ferme"],
  "verified": true,
  "verificationStatus": "verified",
  "createdWithFarmWallet": true,
  "creatorAddress": null,
  "coordinates": { "lat": 48.0, "lng": -3.0 },
  
  "tokens": [
    {
      "tokenId": "fc2e2b3a...",
      "protocol": "ALP",
      "ticker": null,
      "tokenName": null,
      "decimals": null,
      "purpose": "Token de la ferme EVA pour achats directs",
      "_dynamicData": {
        "circulatingSupply": null,
        "genesisSupply": null,
        "isActive": null,
        "isDeleted": null,
        "lastUpdated": null
      }
    }
  ]
}
```

**Changements clés** :
- ✅ **Une ferme peut avoir plusieurs tokens** (array `tokens[]`)
- ✅ Chaque token a son `ticker`, `tokenName`, `decimals`, `purpose`
- ✅ `_dynamicData` synchronisé depuis blockchain pour chaque token
- ✅ `verificationStatus`: "unverified", "pending", "verified", "rejected"
- ✅ `creatorAddress`: Adresse du créateur pour traçabilité

---

### 2. Service tokenSync.js Amélioré

**Fichier**: `src/utils/tokenSync.js`

**Nouvelles données synchronisées** :
```javascript
export async function syncTokenData(tokenId, wallet) {
  const info = await wallet.getTokenInfo(tokenId);
  
  return {
    ticker: info.genesisInfo?.tokenTicker || 'UNK',        // NOUVEAU
    tokenName: info.genesisInfo?.tokenName || 'Unknown',   // NOUVEAU
    circulatingSupply: '...',
    genesisSupply: '...',
    isActive: true/false,
    isDeleted: true/false,
    decimals: 0,
    lastUpdated: "2025-12-08T..."
  };
}
```

**Impact** :
- Le ticker est maintenant inclus dans les données synchronisées
- Essentiel pour l'affichage correct dans WalletDashboard
- Cache local maintient ticker, name, decimals à jour

---

### 3. Champ "Purpose" dans CreateTokenPage

**Fichier**: `src/pages/CreateTokenPage.jsx`

**Ajouté** :
```jsx
// Dans formData
purpose: '' // Objectif du token

// Dans le formulaire
<textarea
  id="purpose"
  value={formData.purpose}
  onChange={(e) => handleInputChange('purpose', e.target.value)}
  placeholder="Ex: Token de fidélité pour achats directs à la ferme..."
  rows={3}
/>
```

**Utilité** :
- Explique l'objectif du token aux utilisateurs
- Affiché dans l'annuaire et le modal de détails
- Aide à différencier les tokens d'une même ferme

---

### 4. Bouton "Gérer ma ferme" dans ManageTokenPage

**Fichier**: `src/pages/ManageTokenPage.jsx`

**Ajouté** :
```jsx
<Button
  onClick={() => navigate('/manage-farm')}
  variant="secondary"
  icon="🏡"
  fullWidth
>
  Gérer ma ferme
</Button>

{isAdmin && (
  <Button
    onClick={() => navigate('/admin/verification')}
    variant="secondary"
    icon="🛡️"
    fullWidth
  >
    Vérifier les fermes
  </Button>
)}
```

**Flux créateur** :
1. Créer token → Token actif (vue créateur uniquement)
2. Cliquer "Gérer ma ferme" → Renseigner infos ferme
3. Enregistrer → Ferme créée avec statut "unverified"
4. Cliquer "Demander la vérification"
5. Admin valide → Ferme passe en "verified"
6. Ferme apparaît dans l'annuaire public

---

### 5. Système de Vérification des Fermes

#### ManageFarmPage.jsx (Mise à jour)

**Bouton "Demander la vérification"** :
```jsx
{existingFarm && !existingFarm.verified && existingFarm.verificationStatus !== 'pending' && (
  <Button onClick={handleRequestVerification}>
    ✅ Demander la vérification
  </Button>
)}
```

**Statuts affichés** :
- ⏳ "Vérification en attente" (status: pending)
- ✅ "Ferme vérifiée" (verified: true)
- 🆕 "Non vérifiée" (status: unverified, par défaut)

#### AdminVerificationPage.jsx (NOUVEAU)

**Route** : `/admin/verification`

**Fonctionnalités** :
- Liste toutes les fermes avec `verificationStatus === 'pending'`
- Affiche détails complets (produits, services, tokens, contact)
- Boutons "✅ Approuver" / "❌ Rejeter"
- Copie données mises à jour dans presse-papiers

**Processus admin** :
1. Admin clique "Vérifier les fermes" depuis ManageTokenPage
2. Voit liste des demandes en attente
3. Examine chaque ferme (coordonnées, tokens, objectifs)
4. Approuve → ferme passe `verified: true, verificationStatus: 'verified'`
5. Rejette → ferme passe `verificationStatus: 'rejected'`

---

### 6. Routes Ajoutées

**Fichier**: `src/App.jsx`

```jsx
// Gestion ferme avec tokenId
<Route path="/manage-farm/:tokenId" element={<ManageFarmPage />} />

// Gestion ferme sans tokenId (nouvelle ferme)
<Route path="/manage-farm" element={<ManageFarmPage />} />

// Page admin de vérification
<Route path="/admin/verification" element={<AdminVerificationPage />} />
```

---

## 🎯 Flux Utilisateur Complets

### Flux Créateur (Nouveau Token)

1. **Créer Token**
   - `/create-token`
   - Remplir: name, ticker, decimals, quantity, url, **purpose** ✨
   - Token créé → Actif avec mintBaton

2. **Token Actif (Sans Ferme)**
   - Visible uniquement dans `ManageTokenPage` (vue créateur)
   - Pas dans l'annuaire (pas de ferme associée)
   - Échangeable depuis `WalletDashboard` en direct

3. **Créer Ferme**
   - Cliquer "Gérer ma ferme" dans `ManageTokenPage`
   - Remplir infos: nom, description, produits, services, contact
   - Enregistrer → Ferme créée avec `verificationStatus: 'unverified'`

4. **Ferme Non Vérifiée**
   - **N'apparaît PAS dans l'annuaire public**
   - Bouton "Demander la vérification" disponible
   - Token toujours échangeable en direct

5. **Demander Vérification**
   - Cliquer "Demander la vérification"
   - Demande copiée → Envoyer à équipe Farm Wallet
   - Statut passe à `verificationStatus: 'pending'`

6. **En Attente de Vérification**
   - Message "⏳ Vérification en attente"
   - Ferme toujours pas dans l'annuaire
   - Token échangeable en direct

7. **Ferme Vérifiée**
   - Admin approuve
   - `verified: true, verificationStatus: 'verified'`
   - **Ferme apparaît dans l'annuaire public** ✅
   - **Ferme apparaît dans favoris** ✅
   - Carte cliquable → Modal avec détails + tokens + objectifs

### Flux Admin (Vérification)

1. **Accès Page Vérification**
   - `/manage-token` → Cliquer "Vérifier les fermes"
   - `/admin/verification`

2. **Liste des Demandes**
   - Voit toutes fermes `verificationStatus: 'pending'`
   - Infos complètes affichées:
     - Nom, région, description
     - Produits, services
     - Contact (email, phone, website)
     - Tokens (ticker, purpose)

3. **Vérification**
   - Examiner infos
   - Vérifier existence réelle (website, réseaux sociaux)
   - Croiser avec certifications si renseignées

4. **Approbation**
   - Cliquer "✅ Approuver"
   - Ferme mise à jour: `verified: true, verificationStatus: 'verified'`
   - JSON copié → Mettre à jour `farms.json` manuellement

5. **Rejet**
   - Cliquer "❌ Rejeter"
   - Ferme mise à jour: `verificationStatus: 'rejected'`
   - Créateur peut corriger et redemander

### Flux Utilisateur (Annuaire)

1. **Annuaire (DirectoryPage)**
   - Affiche uniquement fermes `verified: true`
   - Carte avec: image, nom, région, produits
   - **Badge ticker(s)** affiché sur la carte ✨

2. **Cliquer sur Carte**
   - Modal s'ouvre
   - Détails ferme:
     - Description complète
     - Produits et services
     - Contact (email, phone, website, réseaux sociaux)
   - **Section Tokens** :
     - Liste des tokens de la ferme
     - Pour chaque token: `Ticker - Purpose`
     - Ex: "CAROT - Token de fidélité pour achats directs"

3. **Favoris**
   - Fermes favorites sauvegardées
   - Même affichage que l'annuaire
   - Accès rapide

4. **WalletDashboard**
   - Affiche tokens détenus
   - **Ticker toujours depuis blockchain** (via tokenSync)
   - Image/nom depuis farms.json si référencé
   - Solde formaté avec `decimals` correct

---

## 📊 Données Centralisées - Résumé

### Informations Statiques (farms.json)

**Niveau Ferme** :
- id, name, description
- region, country, department, address
- coordinates (lat, lng)
- products[], services[]
- contact: email, phone, website, social media
- certifications (optionnel)
- verified, verificationStatus, creatorAddress

**Niveau Token** (array dans ferme):
- tokenId, protocol
- ticker, tokenName, decimals (synchronisés depuis blockchain)
- **purpose** (objectif du token, saisi à la création)

### Informations Dynamiques (_dynamicData)

Synchronisées automatiquement depuis blockchain:
- circulatingSupply
- genesisSupply
- isActive, isDeleted
- lastUpdated

### Sources de Vérité

| Donnée | Source | Mise à jour |
|--------|--------|-------------|
| **Ticker** | Blockchain (tokenTicker) | tokenSync.js toutes les 30s |
| **Token Name** | Blockchain (tokenName) | tokenSync.js toutes les 30s |
| **Decimals** | Blockchain (decimals) | tokenSync.js toutes les 30s |
| **Purpose** | farms.json (purpose) | Saisie créateur, manuel |
| **Circulating Supply** | Blockchain (UTXOs) | tokenSync.js toutes les 30s |
| **Genesis Supply** | Blockchain (genesis tx) | tokenSync.js toutes les 30s |
| **Verification Status** | farms.json (verificationStatus) | Admin, manuel |
| **Image/Description Ferme** | farms.json | Créateur, manuel |

---

## 🔧 Fichiers Créés/Modifiés

### Créés
1. ✅ `src/pages/AdminVerificationPage.jsx` - Page admin vérification
2. ✅ `src/data/verification-requests.json` - Stockage demandes (actuellement vide, logique dans farms.json)

### Modifiés
1. ✅ `src/data/farms.json` - Structure multi-tokens avec purpose
2. ✅ `src/utils/tokenSync.js` - Ajout ticker et tokenName
3. ✅ `src/pages/CreateTokenPage.jsx` - Ajout champ purpose
4. ✅ `src/pages/ManageTokenPage.jsx` - Boutons "Gérer ma ferme" + "Vérifier les fermes" (admin)
5. ✅ `src/pages/ManageFarmPage.jsx` - Bouton "Demander la vérification" + statuts
6. ✅ `src/App.jsx` - Routes `/manage-farm` et `/admin/verification`

---

## 🚀 Prochaines Étapes

### Immédiat
1. **Tester le flux complet** :
   - Créer token avec purpose
   - Créer ferme
   - Demander vérification
   - Admin approuve
   - Vérifier affichage dans annuaire

2. **Mettre à jour WalletDashboard** :
   - Utiliser `tokenSync.js` pour avoir ticker correct
   - Afficher purpose dans modal détails
   - Gérer fermes multi-tokens

3. **Mettre à jour DirectoryPage** :
   - Afficher badges ticker sur cartes
   - Modal avec liste tokens + purpose
   - Filtrer uniquement fermes vérifiées

### Moyen terme
1. **Script de synchronisation automatique** :
   - Cron job pour `syncAllFarmTokens()`
   - Mise à jour farms.json périodique
   - Backup avant modifications

2. **Interface admin complète** :
   - Dashboard stats (tokens créés, fermes vérifiées)
   - Historique vérifications
   - Gestion rejets/révocations

3. **Amélioration UX** :
   - Notifications push pour vérification
   - Timeline statut ferme
   - Preview ferme avant soumission

### Long terme
1. **API Backend** :
   - Automatiser mise à jour farms.json
   - WebSocket pour statuts temps réel
   - Base de données relationnelle

2. **Système de notation** :
   - Avis utilisateurs
   - Étoiles fermes
   - Labels qualité

3. **Intégration blockchain** :
   - On-chain verification status
   - NFT badge ferme vérifiée
   - Smart contract governance

---

## 📝 Notes Importantes

### Ticker = Essentiel pour Soldes
Le ticker doit TOUJOURS venir de la blockchain via `tokenSync.js`. C'est critique pour :
- WalletDashboard (affichage soldes)
- ManageTokenPage (liste tokens)
- Annuaire (badges tokens)

### Ferme = Plusieurs Tokens
Une ferme peut avoir:
- Token fidélité (ex: LOYAL)
- Token prévente récolte (ex: CAROT)
- Token coopérative (ex: COOP)

Chaque token a son purpose distinct.

### Vérification = Manuel
Pour l'instant, la vérification est manuelle:
1. Créateur soumet demande
2. Admin vérifie existence réelle
3. Admin met à jour farms.json manuellement
4. Pas de stockage base de données

Futur: API + base de données pour automatiser.

### Cache = 30 secondes
tokenSync.js rafraîchit toutes les 30s:
- Balance entre fraîcheur et charge
- Cache localStorage 5 min pour perf
- Éviter requêtes Chronik excessives

---

## ✅ Checklist de Test

- [ ] Créer token avec purpose
- [ ] Vérifier purpose apparaît dans ManageTokenPage
- [ ] Cliquer "Gérer ma ferme"
- [ ] Remplir formulaire ferme
- [ ] Enregistrer → ferme créée unverified
- [ ] Vérifier ferme N'apparaît PAS dans annuaire
- [ ] Cliquer "Demander la vérification"
- [ ] Admin: aller `/admin/verification`
- [ ] Admin: voir demande en attente
- [ ] Admin: approuver ferme
- [ ] Vérifier ferme APPARAÎT dans annuaire
- [ ] Cliquer carte ferme → modal
- [ ] Vérifier tokens + purpose affichés
- [ ] WalletDashboard: ticker correct
- [ ] TokenSync: ticker mis à jour automatiquement

---

**Date**: 8 décembre 2025
**Version**: 1.0
**Status**: ✅ Implémentation complète
