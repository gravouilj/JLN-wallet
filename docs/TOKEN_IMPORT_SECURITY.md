# Sécurisation de l'Import de Jetons

## Vue d'ensemble

Le système empêche qu'un même jeton soit revendiqué par plusieurs fermes différentes, évitant ainsi les conflits de gestion.

## Architecture

### Backend - `FarmService.checkTokenAvailability()`

**Localisation:** `src/services/farmService.js` (lignes ~148-220)

**Signature:**
```javascript
async checkTokenAvailability(tokenId, currentUserAddress)
```

**Retour:**
```javascript
{
  isAvailable: boolean,
  existingFarmName: string | null,
  existingFarmOwner: string | null,
  isReimport: boolean // true si le token est déjà dans la ferme de l'utilisateur
}
```

**Logique:**
1. Récupère TOUTES les fermes actives depuis Supabase
2. Cherche le `tokenId` dans:
   - Le champ `tokenId` principal (token de création)
   - Le tableau `tokens[]` (tokens importés)
3. Si trouvé:
   - Compare `owner_address` avec `currentUserAddress`
   - Si même propriétaire → `isAvailable: true, isReimport: true` (ré-import autorisé)
   - Si propriétaire différent → `isAvailable: false` (import bloqué)
4. Si non trouvé → `isAvailable: true` (disponible)

### Frontend - Points de vérification

#### 1. ImportTokenModal.jsx

**Localisation:** `src/components/ImportTokenModal.jsx`

**Fonction `handleSearch()`** (lignes ~25-130)
- Appelée lors de la recherche d'un token par ID
- Vérifie la disponibilité AVANT d'afficher la prévisualisation
- Bloque avec message d'erreur si déjà utilisé par une autre ferme
- Affiche une info si ré-import détecté

**Fonction `handleQuickImport()`** (lignes ~160-255)
- Appelée lors de l'import rapide (avec objectif/contrepartie)
- Vérifie la disponibilité AVANT d'enregistrer dans Supabase
- Bloque avec message d'erreur si déjà utilisé par une autre ferme

#### 2. CompleteTokenImportPage.jsx

**Localisation:** `src/pages/CompleteTokenImportPage.jsx`

**Fonction `handleSubmit()`** (lignes ~90-210)
- Appelée lors de l'import complet avec création/mise à jour de ferme
- Vérifie la disponibilité au début du processus
- Bloque avec message d'erreur si déjà utilisé par une autre ferme

## Scénarios de test

### ✅ Scénario 1: Import d'un token disponible
1. Utilisateur A cherche un token jamais importé
2. `checkTokenAvailability()` retourne `{ isAvailable: true }`
3. Import autorisé → Token ajouté à la ferme de A

### ⛔ Scénario 2: Tentative d'import d'un token déjà utilisé
1. Token déjà dans la ferme de l'utilisateur B (Ferme Bio)
2. Utilisateur A tente d'importer ce token
3. `checkTokenAvailability()` retourne `{ isAvailable: false, existingFarmName: "Ferme Bio" }`
4. Message d'erreur affiché: "⛔ Ce jeton est déjà géré par la ferme 'Ferme Bio'. Vous ne pouvez pas l'importer."
5. Import bloqué

### ✅ Scénario 3: Ré-import par le propriétaire
1. Token déjà dans la ferme de l'utilisateur A
2. Utilisateur A tente de le ré-importer
3. `checkTokenAvailability()` retourne `{ isAvailable: true, isReimport: true }`
4. Message informatif: "💡 Ce jeton est déjà dans votre ferme. Vous pouvez le mettre à jour."
5. Import autorisé (mise à jour possible)

### ✅ Scénario 4: Token principal vs tokens importés
1. Utilisateur A a créé un token (stocké dans `tokenId`)
2. Utilisateur B tente de l'importer dans son tableau `tokens[]`
3. Détection correcte → Import bloqué

### ✅ Scénario 5: Vérification multi-points
1. Token bloqué dès la recherche (ImportTokenModal.handleSearch)
2. Si contournement UI, bloqué à l'import rapide (handleQuickImport)
3. Si contournement modal, bloqué à l'import complet (CompleteTokenImportPage)
4. Sécurité en profondeur

## Messages utilisateur

### Messages d'erreur
- **Import bloqué:** `⛔ Ce jeton est déjà géré par la ferme "[Nom]". Vous ne pouvez pas l'importer.`
- Emoji: ⛔ (haute visibilité)
- Type: `error` (notification rouge)

### Messages informatifs
- **Ré-import:** `💡 Ce jeton est déjà dans votre ferme. Vous pouvez le mettre à jour.`
- Emoji: 💡 (information)
- Type: `info` (notification bleue)

## Intégration avec la synchronisation

La vérification s'intègre parfaitement avec le système de synchronisation existant:
- Si import autorisé → `refreshFarms()` appelé
- Synchronisation automatique entre `TokenDetailsPage` et `ManageFarmPage`
- Pas de conflits possibles grâce à la vérification en amont

## Cas limites gérés

1. **Token supprimé puis ré-importé:** Autorisé (ferme du propriétaire toujours active)
2. **Ferme masquée mais token présent:** Détecté et bloqué pour les autres
3. **Ferme en attente de suppression:** Détecté (status `pending_deletion`)
4. **Token dans tokenId ET tokens[]:** Les deux vérifications fonctionnent
5. **Adresses en minuscule/majuscule:** Comparaison exacte (blockchain eCash)

## Logs de débogage

```javascript
// FarmService.checkTokenAvailability
console.log('🔍 Vérification disponibilité token:', { tokenId, currentUserAddress });
console.log(`📊 ${allFarms?.length || 0} fermes à vérifier`);
console.log('✅ Token disponible (non utilisé)');
console.log('✅ Token disponible (déjà dans votre ferme - ré-import autorisé)');
console.log('❌ Token déjà utilisé par:', farmWithToken.name);

// ImportTokenModal / CompleteTokenImportPage
console.log('🔍 Vérification disponibilité avant import...');
console.log('ℹ️ Ré-import détecté (token déjà dans votre ferme)');
```

## Maintenance future

### Pour ajouter un nouveau point d'import:
1. Importer `FarmService`
2. Appeler `checkTokenAvailability(tokenId, userAddress)` AVANT l'import
3. Vérifier `isAvailable`
4. Bloquer avec message `⛔` si `false`
5. Afficher info `💡` si `isReimport: true`

### Pour modifier la logique de vérification:
- Modifier uniquement `FarmService.checkTokenAvailability()`
- Tous les points d'import utilisent cette fonction centralisée
- Cohérence garantie

## Sécurité

- ✅ Vérification côté serveur (Supabase)
- ✅ Validation multiple (3 points d'entrée)
- ✅ Gestion des ré-imports (propriétaire existant)
- ✅ Messages clairs et bloquants
- ✅ Logs détaillés pour debugging
- ✅ Exception documentée (ré-import autorisé)
