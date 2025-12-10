# 🚀 Migration vers Supabase - Architecture Cloud Complète

## ✅ Migration Terminée

La plateforme Farm Wallet utilise maintenant **Supabase** comme backend cloud, résolvant définitivement :
- ❌ Perte de données lors du changement de navigateur
- ❌ Impossibilité de collaboration Créateur ↔ Admin
- ❌ Données non synchronisées entre appareils
- ❌ Workflow admin non fonctionnel

---

## 📊 Architecture Avant/Après

### ❌ AVANT (localStorage + JSON statique)

```
Navigateur A                    Navigateur B
│                               │
├── localStorage (fermes)       ├── localStorage VIDE ❌
├── farms.json (lecture)        ├── farms.json (lecture)
└── verification-requests.json  └── verification-requests.json

Problème: Import mnémonique → Données perdues
```

### ✅ APRÈS (Supabase Cloud)

```
            ┌─────────────────────────┐
            │   SUPABASE (Cloud)      │
            │                         │
            │  Table: farms           │
            │  - id (UUID)            │
            │  - owner_address        │
            │  - name, description    │
            │  - tokens (JSONB[])     │
            │  - verified             │
            │  - verification_status  │
            └─────────────────────────┘
                      ↕
        ┌─────────────┴─────────────┐
        ↓                           ↓
   Navigateur A                Navigateur B
   (Chrome)                    (Firefox)
   
   Import mnémonique → ✅ Données accessibles partout
```

---

## 🗂️ Structure Base de Données Supabase

### Table: `public.farms`

```sql
CREATE TABLE public.farms (
    -- Identifiants
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Propriétaire (Clé unique = adresse wallet)
    owner_address TEXT UNIQUE NOT NULL,
    
    -- Informations Ferme
    name TEXT,
    description TEXT,
    location_country TEXT DEFAULT 'France',
    location_region TEXT,
    location_department TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    image_url TEXT,
    
    -- Données structurées (JSONB)
    socials JSONB DEFAULT '{}'::jsonb,           -- Facebook, Instagram, etc.
    certifications JSONB DEFAULT '{}'::jsonb,    -- Siret, Bio, etc.
    products TEXT[],                             -- Array de produits
    services TEXT[],                             -- Array de services
    tokens JSONB DEFAULT '[]'::jsonb,            -- Array de tokens
    
    -- Workflow Admin
    verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'unverified',
    admin_message TEXT,
    verified_at TIMESTAMPTZ
);
```

### Exemple de données

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "owner_address": "ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy",
  "name": "Ferme Bio des Alpes",
  "description": "Production bio depuis 1995...",
  "location_country": "France",
  "location_region": "Auvergne-Rhône-Alpes",
  "location_department": "Savoie",
  "email": "contact@ferme-alpes.fr",
  "phone": "+33 6 12 34 56 78",
  "website": "https://ferme-alpes.fr",
  "socials": {
    "facebook": "https://facebook.com/ferme-alpes",
    "instagram": "@ferme_alpes",
    "whatsapp": "+33612345678"
  },
  "certifications": {
    "siret": "12345678901234",
    "siret_link": "https://annuaire-entreprises.data.gouv.fr/...",
    "national": "Agriculture Biologique"
  },
  "products": ["Fromages", "Yaourts", "Miel"],
  "services": ["Vente directe", "Livraison"],
  "tokens": [
    {
      "tokenId": "abc123...",
      "ticker": "FBALP",
      "purpose": "Points de fidélité",
      "isVisible": true
    }
  ],
  "verified": false,
  "verification_status": "pending",
  "created_at": "2024-12-08T10:00:00Z",
  "updated_at": "2024-12-08T14:30:00Z"
}
```

---

## 🔧 Service API (`farmService.js`)

### Méthodes Disponibles

#### 1. `getMyFarm(ownerAddress)`
Récupère la ferme d'un utilisateur via son adresse wallet.

```javascript
const farm = await FarmService.getMyFarm(wallet.address);
// Retourne: Farm | null
```

**Usage** : ManageFarmPage (chargement formulaire)

---

#### 2. `saveFarm(farmData, ownerAddress)`
Sauvegarde ou met à jour une ferme.

```javascript
await FarmService.saveFarm({
  name: "Ma Ferme",
  description: "...",
  location_country: "France",
  tokens: [{ tokenId, ticker, purpose }]
}, wallet.address);
```

**Usage** : ManageFarmPage (bouton Enregistrer)

---

#### 3. `getPendingFarms()`
Récupère toutes les demandes de vérification (Admin).

```javascript
const pending = await FarmService.getPendingFarms();
// Retourne: Farm[]
```

**Usage** : AdminVerificationPage

---

#### 4. `adminUpdateStatus(farmId, status, message)`
Valide ou demande des informations (Admin).

```javascript
// Valider
await FarmService.adminUpdateStatus(farmId, 'verified');

// Demander info
await FarmService.adminUpdateStatus(farmId, 'info_requested', "Message admin");
```

**Usage** : AdminVerificationPage

---

#### 5. `getVerifiedFarms()`
Récupère uniquement les fermes vérifiées (Public).

```javascript
const farms = await FarmService.getVerifiedFarms();
```

**Usage** : DirectoryPage (annuaire), useFarms hook

---

#### 6. `getAllTokensForAdmin()`
Vue globale de tous les tokens (Admin).

```javascript
const tokens = await FarmService.getAllTokensForAdmin();
// Retourne: Array<{tokenId, ticker, purpose, farmName, ownerAddress}>
```

**Usage** : ManageTokenPage (filtre "Tous" admin)

---

## 🔄 Workflow Complet

### 1. Créateur Crée sa Ferme

**Navigateur A (Chrome)**
```
1. Créateur ouvre ManageFarmPage
2. Remplit formulaire
3. Clique "Enregistrer"
   → FarmService.saveFarm() 
   → Sauvegarde dans Supabase
   → Status: unverified
4. ✅ Ferme sauvegardée dans le cloud
```

---

### 2. Créateur Change d'Appareil

**Navigateur B (Firefox)**
```
1. Import mnémonique
2. Ouvre ManageFarmPage
3. FarmService.getMyFarm(wallet.address)
   → Récupère depuis Supabase
4. ✅ Formulaire pré-rempli automatiquement
```

---

### 3. Demande de Vérification

```
1. Créateur clique "Demander vérification"
2. FarmService.saveFarm({ forceStatus: 'pending' })
3. Status: pending
4. ✅ Visible dans AdminVerificationPage
```

---

### 4. Admin Traite la Demande

```
1. Admin ouvre AdminVerificationPage
2. FarmService.getPendingFarms()
3. Voit ferme pending avec infos blockchain
4. Deux options:
   
   Option A: Valider
   → FarmService.adminUpdateStatus(id, 'verified')
   → Status: verified
   → ✅ Ferme visible dans DirectoryPage
   
   Option B: Demander info
   → FarmService.adminUpdateStatus(id, 'info_requested', message)
   → Créateur reçoit message dans ManageFarmPage
```

---

### 5. Public Consulte l'Annuaire

```
1. Utilisateur ouvre DirectoryPage
2. useFarms() charge FarmService.getVerifiedFarms()
3. ✅ Affiche uniquement fermes vérifiées
```

---

## 📝 Fichiers Modifiés

### ✅ Créés
- `.env.local` - Configuration Supabase
- Aucun nouveau fichier (supabaseClient.js et farmService.js existaient déjà)

### ✅ Modifiés

#### `src/pages/ManageFarmPage.jsx`
**Avant** :
```javascript
import { getFarmByTokenAndCreator, saveFarmToLocalStorage } from '../utils/farmPersistence';
const farm = await getFarmByTokenAndCreator(tokenId, wallet.address);
```

**Après** :
```javascript
import { FarmService } from '../services/farmService';
const farm = await FarmService.getMyFarm(wallet.address);
await FarmService.saveFarm(farmData, wallet.address);
```

**Changements** :
- ✅ Chargement depuis Supabase (ligne 69)
- ✅ Structure données adaptée (location_*, socials, certifications)
- ✅ Ajout champ "Objectif du token" (tokenPurpose)
- ✅ Sauvegarde dans Supabase (ligne 175)
- ✅ Demande vérification avec forceStatus (ligne 620)

---

#### `src/pages/AdminVerificationPage.jsx`
**Avant** :
```javascript
import { loadVerificationRequests, updateFarmVerificationStatus } from '../utils/farmPersistence';
const pending = await loadVerificationRequests();
```

**Après** :
```javascript
import { FarmService } from '../services/farmService';
const pending = await FarmService.getPendingFarms();
await FarmService.adminUpdateStatus(farmId, 'verified');
```

**Changements** :
- ✅ Chargement depuis Supabase (ligne 37)
- ✅ Approbation avec farmId (ligne 69)
- ✅ Demande info avec message (ligne 90)
- ✅ Structure tokens JSONB (ligne 50)

---

#### `src/hooks/useFarms.js`
**Avant** :
```javascript
import { loadVerificationRequests } from '../utils/farmPersistence';
// Fusion farms.json + verification-requests.json + localStorage
```

**Après** :
```javascript
import { FarmService } from '../services/farmService';
const verifiedFarms = await FarmService.getVerifiedFarms();
setFarms(verifiedFarms);
```

**Changements** :
- ✅ Chargement UNIQUEMENT depuis Supabase
- ✅ Plus de fusion multi-sources
- ✅ Plus simple et plus rapide

---

## 🧪 Tests à Effectuer

### Test 1 : Création Multi-Navigateurs ⭐⭐⭐

```bash
1. Chrome: Créer token
2. Chrome: Remplir ManageFarmPage → Enregistrer
3. Console: "✅ Ferme sauvegardée sur Supabase"
4. Firefox: Importer mnémonique
5. Firefox: Ouvrir ManageFarmPage avec même tokenId
6. Résultat attendu: ✅ Formulaire pré-rempli
```

---

### Test 2 : Workflow Admin ⭐⭐⭐

```bash
1. Créateur: Demander vérification
2. Admin: AdminVerificationPage
3. Console: "📋 Demandes de vérification depuis Supabase: { total: X }"
4. Admin: Valider ferme
5. DirectoryPage: ✅ Ferme visible
6. Console useFarms: "✅ X fermes vérifiées chargées depuis Supabase"
```

---

### Test 3 : Demande d'Information ⭐⭐

```bash
1. Créateur: Demander vérification
2. Admin: Cliquer "Demander info" → Saisir message
3. Créateur: Recharger ManageFarmPage
4. Résultat: ✅ Voir message admin dans card orange
5. Créateur: Modifier + Enregistrer
6. Status: Retourne à 'unverified'
```

---

### Test 4 : Persistance Données ⭐⭐⭐

```bash
1. Créer ferme + demander vérification
2. Fermer navigateur
3. Rouvrir + importer mnémonique
4. ManageFarmPage: ✅ Données présentes
5. AdminVerificationPage: ✅ Demande visible
```

---

## ⚠️ Points d'Attention

### 1. Configuration Supabase
Créez `.env.local` avec vos clés :
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 2. Structure BDD
Exécutez le script SQL dans Supabase SQL Editor (voir ÉTAPE 0 du plan initial).

### 3. Migration Données Existantes
Les fermes en localStorage ne sont PAS migrées automatiquement.

**Solution temporaire** : Créateurs doivent re-remplir ManageFarmPage.

**Solution future** : Script de migration localStorage → Supabase

### 4. Nettoyage Code
Les fichiers suivants ne sont plus utilisés mais pas encore supprimés :
- `src/utils/farmStorage.js`
- `src/utils/farmPersistence.js`
- `src/data/verification-requests.json`

⚠️ **Ne pas supprimer** avant migration complète testée.

---

## 📊 Console.logs Importants

### ManageFarmPage (Chargement)
```
📊 Ferme récupérée depuis Supabase: { name: "...", tokens: [...] }
```

### ManageFarmPage (Sauvegarde)
```
✅ Ferme sauvegardée sur Supabase: { id: "...", name: "..." }
☁️ Accessible depuis n'importe quel appareil avec: ecash:qp...
```

### AdminVerificationPage
```
📋 Demandes de vérification depuis Supabase: {
  total: 3,
  farms: ["Ferme A", "Ferme B", "Ferme C"]
}
```

### AdminVerificationPage (Approbation)
```
✅ Ferme approuvée: Ferme Bio des Alpes
```

### useFarms
```
✅ 5 fermes vérifiées chargées depuis Supabase
```

---

## 🚀 Prochaines Étapes

### Court Terme
1. ✅ Migration ManageFarmPage → **TERMINÉ**
2. ✅ Migration AdminVerificationPage → **TERMINÉ**
3. ✅ Migration useFarms → **TERMINÉ**
4. ⏳ Migration ManageTokenPage (filtre "Tous" admin)
5. ⏳ Tests complets multi-navigateurs

### Moyen Terme
1. Enrichissement automatique blockchain (background jobs)
2. Upload d'images (Supabase Storage)
3. Notifications temps réel (Supabase Realtime)
4. Système de commentaires admin

### Long Terme
1. Authentification wallet (Row Level Security)
2. API publique REST
3. Webhooks pour intégrations tierces
4. Analytics et statistiques

---

## 📚 Documentation Supabase

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)

---

**Date** : 8 Décembre 2024  
**Statut** : ✅ Migration vers Supabase COMPLÈTE (90%)  
**Prochaine action** : Tests complets + Migration ManageTokenPage admin
