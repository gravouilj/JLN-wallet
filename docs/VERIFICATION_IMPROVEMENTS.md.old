# Amélioration du Processus de Vérification - 9 Décembre 2025

## 🎯 Objectif
Enrichir le formulaire de demande de référencement avec les informations nécessaires pour permettre à l'admin de valider la conformité d'une ferme.

## 📋 Modifications apportées

### 1. Nouveaux champs dans ManageFarmPage

#### Champs ajoutés au formulaire
- **Représentant légal** (`legalRepresentative`)
  - Type: Texte
  - Requis pour vérification
  - Exemple: "Jean Dupont"

- **Site web officiel de l'entreprise** (`officialWebsite`)
  - Type: URL
  - Requis pour vérification
  - Lien vers registre officiel (infogreffe.fr, societe.com, etc.)

#### Champs rendus obligatoires

**Toujours obligatoires :**
- ✅ Nom de la ferme
- ✅ Description
- ✅ Email
- ✅ **Adresse complète** (nouveau - affichée dans l'annuaire)

**Obligatoires pour la demande de vérification :**
- ✅ SIRET / Company ID
- ✅ Lien de vérification SIRET
- ✅ Représentant légal (nouveau)
- ✅ Site web officiel entreprise (nouveau)
- ✅ Téléphone

### 2. Validation renforcée

```javascript
// Validation côté formulaire (ManageFarmPage.jsx)
const requestingVerification = existingFarm?.verification_status === 'unverified';
if (requestingVerification) {
  const missingFields = [];
  if (!formData.companyid) missingFields.push('SIRET/Company ID');
  if (!formData.governmentidverificationweblink) missingFields.push('Lien de vérification SIRET');
  if (!formData.legalRepresentative) missingFields.push('Représentant légal');
  if (!formData.officialWebsite) missingFields.push('Site web officiel');
  if (!formData.phone) missingFields.push('Téléphone');
  
  if (missingFields.length > 0) {
    // Afficher erreur avec liste des champs manquants
  }
}
```

### 3. Affichage enrichi dans AdminVerificationPage

Ajout d'une section "🔍 Informations de vérification" affichant :

- **Adresse complète**
- **SIRET / Company ID** avec lien cliquable vers le site de vérification
- **Représentant légal**
- **Site web officiel** avec lien cliquable
- **Certifications** (nationale et internationale) avec liens de vérification

Tous les liens s'ouvrent dans un nouvel onglet (`target="_blank"`).

### 4. Structure base de données (Supabase)

#### Modifications du schéma
```sql
-- Champ address devient obligatoire
ALTER TABLE farms 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Structure JSONB certifications enrichie
{
  "siret": "12345678901234",
  "siret_link": "https://annuaire-entreprises.data.gouv.fr/...",
  "legal_representative": "Jean Dupont",           // NOUVEAU
  "official_website": "https://infogreffe.fr/...", // NOUVEAU
  "national": "Agriculture Biologique",
  "national_link": "https://...",
  "international": "Demeter",
  "international_link": "https://..."
}
```

## 🔄 Workflow de vérification mis à jour

### Étape 1 : Création de la ferme
- Status: `unverified`
- L'utilisateur peut enregistrer sans les champs de vérification

### Étape 2 : Demande de vérification
- L'utilisateur clique sur "Demander la vérification"
- **Validation** : Tous les champs obligatoires doivent être remplis
- Si OK → Status: `pending`
- Si manquant → Erreur listant les champs requis

### Étape 3 : Validation admin
- Admin accède à `/admin/verification`
- Visualise toutes les informations de vérification
- Peut cliquer sur les liens pour vérifier :
  - SIRET sur annuaire-entreprises.data.gouv.fr
  - Entreprise sur infogreffe.fr ou societe.com
  - Certifications nationales/internationales
- Décision :
  - ✅ **Valider** → Status: `verified`, badge vert dans Directory
  - ℹ️ **Demander info** → Status: `info_requested`, message à l'utilisateur

### Étape 4 : Après vérification
- Si modification de la ferme → Retour en `unverified` (sécurité)
- Nouvelle demande nécessaire

## 📁 Fichiers modifiés

```
src/pages/
  ├── ManageFarmPage.jsx       # Formulaire enrichi + validation
  └── AdminVerificationPage.jsx # Affichage infos vérification

src/services/
  └── farmService.js            # Déjà compatible (JSONB flexible)

scripts/
  └── supabase-migration.sql    # Migration BDD (si nécessaire)

docs/
  └── SUPABASE_SCHEMA.md        # Documentation schéma complet
```

## 🚀 Déploiement

### 1. Base de données
```bash
# Exécuter la migration Supabase (si table existe déjà)
psql $DATABASE_URL -f scripts/supabase-migration.sql
```

### 2. Application
Les modifications sont déjà déployées dans le code :
- ✅ Formulaire avec nouveaux champs
- ✅ Validation renforcée
- ✅ Affichage admin enrichi

### 3. Vérification post-déploiement
1. Créer une ferme test
2. Remplir tous les champs obligatoires
3. Demander la vérification
4. Vérifier l'affichage admin
5. Valider la ferme
6. Vérifier le badge vert dans Directory

## 📊 Impact utilisateur

### Pour les créateurs de fermes
- Plus de champs à remplir pour la vérification
- Guidage clair : messages d'erreur listant les champs manquants
- Aide contextuelle sous chaque champ ("Requis pour la vérification")

### Pour les admins
- Toutes les informations nécessaires sur une seule page
- Liens cliquables vers les sites de vérification officiels
- Vérification plus rapide et fiable

### Pour les visiteurs (Directory)
- Badge vert = ferme vérifiée avec toutes les preuves
- Confiance accrue dans les fermes listées

## 🔐 Sécurité

- ✅ Toute modification d'une ferme vérifiée → Retour en `unverified`
- ✅ Admin doit re-valider après chaque changement
- ✅ Liens externes s'ouvrent dans un nouvel onglet (`rel="noopener noreferrer"`)

## 📝 TODO

- [ ] Exécuter la migration SQL sur Supabase
- [ ] Tester le workflow complet avec une ferme réelle
- [ ] Vérifier que tous les liens de vérification sont accessibles
- [ ] Ajouter des tooltips explicatifs pour les champs de vérification
- [ ] Créer une documentation utilisateur (FAQ)

## 🐛 Bugs connus / À surveiller

- Aucun bug connu pour l'instant
- Surveiller la validation côté client vs serveur

## 💡 Améliorations futures possibles

1. **Validation automatique SIRET**
   - API gouvernementale pour vérifier automatiquement le SIRET
   - Pré-remplissage automatique des infos entreprise

2. **Upload de documents**
   - Kbis, certifications, photos
   - Stockage Supabase Storage

3. **Historique de vérification**
   - Table `verification_history` pour tracer les actions admin
   - Audit trail complet

4. **Notification email**
   - Email automatique quand status change
   - Utiliser Supabase Edge Functions + SendGrid

5. **Score de confiance**
   - Calculer un score basé sur les certifications
   - Afficher des étoiles ou badges dans Directory
