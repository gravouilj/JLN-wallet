# Système de Signalement des Fermes 🚨

## Vue d'ensemble

Le système de signalement permet aux utilisateurs connectés de signaler des fermes suspectes ou inappropriées. Les signalements sont ensuite examinés par l'équipe administrative.

## Architecture

### Base de données

**Table `farm_reports`:**
```sql
CREATE TABLE farm_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  reporter_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(farm_id, reporter_address)
);

CREATE INDEX idx_farm_reports_farm_id ON farm_reports(farm_id);
CREATE INDEX idx_farm_reports_created_at ON farm_reports(created_at DESC);
CREATE INDEX idx_farm_reports_reporter ON farm_reports(reporter_address);
```

**Points clés:**
- Contrainte `UNIQUE(farm_id, reporter_address)` : Un utilisateur ne peut signaler qu'une seule fois la même ferme
- `ON DELETE CASCADE` : Supprime automatiquement les signalements si la ferme est supprimée
- Indexes optimisés pour les requêtes fréquentes (par ferme, par date, par utilisateur)

### Backend (FarmService)

**Fonctions disponibles:**

#### 1. `reportFarm(farmId, reporterAddress, reason)`
Enregistre un nouveau signalement.

```javascript
await FarmService.reportFarm(
  'uuid-de-la-ferme',
  'ecash:adresse-wallet',
  'Informations trompeuses sur les certifications'
);
```

**Erreurs gérées:**
- Code `23505` : L'utilisateur a déjà signalé cette ferme (contrainte UNIQUE)

#### 2. `getReportedFarms()`
Récupère toutes les fermes signalées avec leurs signalements.

```javascript
const reportedFarms = await FarmService.getReportedFarms();
// Retourne:
// [
//   {
//     farm: { id, name, description, owner_address, verification_status },
//     reports: [{ id, reason, reporter_address, created_at }, ...],
//     count: 5
//   },
//   ...
// ]
```

**Tri:** Les fermes sont triées par nombre de signalements (décroissant), les plus signalées apparaissent en premier.

#### 3. `deleteFarm(farmId)`
Supprime définitivement une ferme (arnaque confirmée).

```javascript
await FarmService.deleteFarm('uuid-de-la-ferme');
```

⚠️ **Action irréversible** : Supprime la ferme ET tous ses signalements (CASCADE).

## Interface Utilisateur

### 1. Bouton de signalement (DirectoryPage)

**Localisation:** FarmCard dans l'annuaire des fermes

**Apparence:**
- Icône: 🚨
- Style: Bouton transparent avec bordure rouge (#ef4444)
- Hover: Fond rouge, texte blanc
- Visibilité: **Uniquement pour les utilisateurs connectés**

**Comportement:**
```jsx
{walletConnected && (
  <button 
    className="report-farm-btn"
    onClick={(e) => onReport(e, farm)}
    title="Signaler cette ferme"
  >
    🚨
  </button>
)}
```

### 2. Modal de signalement

**Déclenchement:** Clic sur le bouton 🚨

**Contenu:**
- Titre: "🚨 Signaler [Nom de la ferme]"
- Message informatif sur la modération
- Textarea pour la raison (placeholder avec exemples)
- Boutons: "🚨 Signaler" (rouge) + "Annuler" (neutre)

**Validation:**
- La raison ne peut pas être vide
- Désactivation pendant l'envoi (isReporting)

**Retours:**
- Succès: Alert "🚨 Signalement enregistré. L'équipe va examiner votre demande."
- Erreur doublons (23505): "Vous avez déjà signalé cette ferme"
- Erreur générique: "Erreur lors du signalement"

### 3. Onglet Admin (AdminVerificationPage)

**Nouvel onglet:** 🚨 Signalements (n)

**Compteur:** Affiché dans le sous-titre et l'onglet

**Contenu de la Card:**

1. **Header:**
   - Nom de la ferme
   - Badge rouge avec le nombre de signalements

2. **Description:**
   - Propriétaire (adresse tronquée)
   - Description de la ferme

3. **Section signalements:**
   - Encadré rouge avec tous les motifs
   - Pour chaque signalement:
     - Date (format FR)
     - Raison
     - Adresse du signaleur (tronquée)

4. **Actions admin:**
   - ✅ Valider (vert) : La ferme est légitime malgré les signalements
   - ℹ️ Demander plus d'infos : Envoyer un message au créateur
   - 🗑️ Supprimer (arnaque) : Suppression définitive

## Flux de traitement

### Scénario 1 : Signalement par un utilisateur

```
1. Utilisateur connecté sur DirectoryPage
2. Clique sur 🚨 à côté d'une ferme
3. Modal s'ouvre → Saisit la raison
4. Clique "🚨 Signaler"
5. Backend insère dans farm_reports
6. Notification de succès
7. Modal se ferme
```

### Scénario 2 : Modération admin

```
1. Admin ouvre AdminVerificationPage
2. Voit l'onglet "🚨 Signalements (3)"
3. Clique sur l'onglet
4. Liste des fermes triée par nombre de signalements
5. Lit les motifs de chaque signaleur
6. Décide:
   
   Option A - Ferme légitime:
   - Clique "✅ Valider"
   - La ferme devient "verified"
   - Les signalements restent en base (historique)
   
   Option B - Besoin d'infos:
   - Clique "ℹ️ Demander plus d'infos"
   - Saisit un message
   - Le créateur reçoit le message
   - Statut → 'info_requested'
   
   Option C - Arnaque confirmée:
   - Clique "🗑️ Supprimer (arnaque)"
   - Confirmation
   - Ferme supprimée définitivement
   - Signalements supprimés (CASCADE)
```

### Scénario 3 : Doublon (utilisateur signale 2x)

```
1. Utilisateur a déjà signalé la ferme X
2. Tente de signaler à nouveau
3. Backend rejette avec code 23505 (UNIQUE constraint)
4. Frontend affiche: "Vous avez déjà signalé cette ferme"
```

## Sécurité

### Contraintes techniques

1. **Authentification requise:**
   - Le bouton 🚨 n'est visible que si `walletConnected === true`
   - Le `reporter_address` provient du wallet connecté

2. **Prévention des abus:**
   - Contrainte UNIQUE empêche les signalements multiples du même utilisateur
   - Pas de limite de taux (rate limiting) actuellement → À ajouter si besoin

3. **Accès admin:**
   - Seuls les admins (hash SHA-256 vérifié) peuvent voir les signalements
   - Seuls les admins peuvent supprimer des fermes

### Recommandations futures

1. **Rate limiting:**
   - Limiter à 5 signalements par utilisateur par jour
   - Implémenter avec Redis ou table dédiée

2. **Modération automatique:**
   - Si une ferme atteint 10 signalements → masquage automatique
   - Notification automatique à l'admin

3. **Historique:**
   - Conserver un log des fermes supprimées (soft delete)
   - Blacklist des adresses propriétaires d'arnaques confirmées

4. **Notifications:**
   - Email à l'admin quand une ferme atteint un seuil
   - Push notification pour signalements urgents

## Tests

### Test 1 : Signalement normal
```
1. Connecter un wallet
2. Aller sur DirectoryPage
3. Cliquer 🚨 sur une ferme
4. Saisir raison: "Test signalement"
5. Envoyer
6. Vérifier la notification de succès
7. En tant qu'admin, vérifier l'onglet Signalements
```

### Test 2 : Doublon
```
1. Répéter Test 1 avec la même ferme
2. Vérifier l'alerte: "Vous avez déjà signalé cette ferme"
```

### Test 3 : Validation admin
```
1. Admin ouvre AdminVerificationPage
2. Onglet Signalements
3. Clique "✅ Valider" sur une ferme
4. Vérifier que la ferme passe en "verified"
5. Vérifier qu'elle disparaît de l'onglet Signalements
```

### Test 4 : Suppression
```
1. Admin clique "🗑️ Supprimer"
2. Confirmer
3. Vérifier que la ferme disparaît de DirectoryPage
4. Vérifier en BDD que les signalements sont aussi supprimés (CASCADE)
```

## Statistiques

### Requêtes SQL utiles

**Nombre de signalements par ferme:**
```sql
SELECT 
  f.name,
  COUNT(fr.id) as report_count
FROM farms f
LEFT JOIN farm_reports fr ON fr.farm_id = f.id
GROUP BY f.id, f.name
ORDER BY report_count DESC;
```

**Utilisateurs les plus actifs:**
```sql
SELECT 
  reporter_address,
  COUNT(*) as reports_submitted
FROM farm_reports
GROUP BY reporter_address
ORDER BY reports_submitted DESC
LIMIT 10;
```

**Signalements par jour:**
```sql
SELECT 
  DATE(created_at) as report_date,
  COUNT(*) as daily_count
FROM farm_reports
GROUP BY DATE(created_at)
ORDER BY report_date DESC;
```

## Migration

### Pour appliquer la structure

1. **Créer la table:**
```bash
psql -h vmlozrwjjatqcjvdqkxu.supabase.co -U postgres -d postgres -f scripts/002_create_farm_reports.sql
```

2. **Vérifier:**
```sql
SELECT * FROM farm_reports;
```

3. **Test d'insertion:**
```sql
INSERT INTO farm_reports (farm_id, reporter_address, reason)
VALUES (
  'uuid-existant',
  'ecash:test123',
  'Test de signalement'
);
```

## Fichiers modifiés

- ✅ `src/services/farmService.js` - Fonctions reportFarm, getReportedFarms, deleteFarm
- ✅ `src/pages/DirectoryPage.jsx` - Bouton 🚨 + Modal de signalement
- ✅ `src/pages/AdminVerificationPage.jsx` - Onglet Signalements avec liste complète
- ✅ `scripts/002_create_farm_reports.sql` - Script de migration SQL

## Support

Pour toute question sur le système de signalement, consulter:
- `VERIFICATION_SYSTEM_V2.md` - Vue d'ensemble du système de vérification
- `WALLET_ARCHITECTURE.md` - Architecture générale de l'application
