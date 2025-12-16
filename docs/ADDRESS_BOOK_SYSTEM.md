# Système de Carnet d'Adresses

## Vue d'ensemble

Le système de carnet d'adresses permet aux créateurs de jetons de sauvegarder et gérer leurs contacts eCash avec des noms personnalisés. Les noms remplacent automatiquement l'affichage des adresses dans les résultats d'airdrop.

## Architecture

### Fichiers créés

1. **`src/services/addressBookService.js`** - Service de gestion du stockage
2. **`src/components/AddressBook.jsx`** - Composant réutilisable
3. Modifications dans **`src/components/TokenPage/TokenActions/Airdrop.jsx`**
4. Modifications dans **`src/pages/ManageTokenPage.jsx`**

### Stockage

- **LocalStorage** : `jln_address_book`
- Structure d'un contact :
  ```json
  {
    "address": "ecash:qq...",
    "name": "Alice",
    "tokenId": "abc123..." (optionnel),
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
  ```

## Fonctionnalités

### 1. Dans les résultats d'Airdrop

**Améliorations :**
- ✅ Adresse complète affichée (au lieu des 64 derniers caractères)
- ✅ Clic sur l'adresse pour la copier dans le presse-papier
- ✅ Bouton "💾 Sauvegarder dans le carnet" pour chaque détenteur
- ✅ Input inline pour entrer le nom du contact
- ✅ Affichage automatique du nom si l'adresse existe dans le carnet
- ✅ Bordure bleue et icône 👤 pour les contacts enregistrés
- ✅ Bouton "🗑️ Retirer du carnet" pour les contacts existants

**Workflow utilisateur :**
1. Calculer les détenteurs
2. Cliquer sur "💾 Sauvegarder dans le carnet" pour une adresse
3. Entrer un nom (ex: "Alice")
4. Valider avec ✅ ou Entrée
5. Le nom s'affiche instantanément et persiste pour les futurs scans

### 2. Carnet d'adresses du jeton

**Localisation :** Sous le bouton "Distribuer maintenant" dans l'onglet Airdrop

**Fonctionnalités :**
- 📇 Bouton toggle "Afficher/Masquer le carnet d'adresses du jeton"
- Mode compact avec scroll vertical (max 200px)
- Liste filtrée par `tokenId` (contacts de ce jeton uniquement)
- Clic sur un contact → copie l'adresse
- Bouton 🗑️ pour supprimer un contact
- Bouton "➕ Ajouter un contact" avec formulaire inline

**Validation :**
- Vérifie que l'adresse commence par `ecash:`
- Nom et adresse requis
- Feedback immédiat avec notifications

### 3. Carnet d'adresses global

**Localisation :** ManageTokenPage, au-dessus de "Historique Créateur"

**Fonctionnalités :**
- 📇 Section masquable avec bouton "👁️ Afficher/Masquer"
- Mode complet (non-compact) avec toutes les options
- **Recherche** : Filtre par nom ou adresse
- **Export** : Télécharge un fichier JSON avec tous les contacts
- **Import** : Charge des contacts depuis un fichier JSON
- **Gestion** :
  - ✏️ Modifier le nom d'un contact
  - 🗑️ Supprimer un contact
  - 📋 Copier une adresse
- **Affichage** :
  - Nom du contact (en gras)
  - Adresse complète (cliquable, monospace)
  - TokenId associé (si défini)

## API du Service

### `addressBookService`

```javascript
// Récupérer les contacts (tous ou filtrés par token)
getContacts(tokenId = null) → Contact[]

// Récupérer un contact par adresse
getContactByAddress(address, tokenId = null) → Contact | undefined

// Sauvegarder/Mettre à jour un contact
saveContact(address, name, tokenId = null) → boolean

// Supprimer un contact
deleteContact(address, tokenId = null) → boolean

// Rechercher des contacts
searchContacts(query, tokenId = null) → Contact[]

// Grouper par token
getAllContactsByToken() → { [tokenId]: Contact[] }

// Export/Import
exportContacts() → void (télécharge JSON)
importContacts(file) → Promise<boolean>

// Statistiques
getContactsCount(tokenId = null) → number

// Maintenance
clearAll() → boolean (avec confirmation)
```

## Props du Composant AddressBook

```jsx
<AddressBook
  tokenId={null}           // Filtrer par token (null = tous)
  onSelectAddress={fn}     // Callback (address, name) => void
  compact={false}          // Mode compact ou complet
/>
```

### Mode Compact
- Liste scrollable (max 200px)
- Bouton "➕ Ajouter un contact"
- Actions réduites (copier, supprimer)
- Utilisé dans Airdrop

### Mode Complet
- Barre de recherche
- Boutons Export/Import
- Actions complètes (copier, modifier, supprimer)
- Affichage riche avec tokenId
- Utilisé dans ManageTokenPage

## Intégration dans Airdrop

### States ajoutés

```javascript
const [showAddressBook, setShowAddressBook] = useState(false);
const [savingContact, setSavingContact] = useState(null);      // Adresse en cours de sauvegarde
const [contactName, setContactName] = useState('');            // Nom temporaire
```

### Affichage des détenteurs

```jsx
{calculatedHolders.map((holder) => {
  const contact = addressBookService.getContactByAddress(holder.address, tokenId);
  const displayName = contact ? contact.name : null;
  
  return (
    <div>
      {displayName && <div>👤 {displayName}</div>}
      <div onClick={() => copyAddress(holder.address)}>
        {holder.address}  {/* Adresse complète */}
      </div>
      {/* Boutons sauvegarder/retirer */}
    </div>
  );
})}
```

## Cas d'usage

### 1. Airdrop régulier à des VIP
1. Scanner les détenteurs la première fois
2. Sauvegarder les VIP dans le carnet avec leurs noms
3. Lors des prochains airdrops, les VIP sont identifiés par leur nom

### 2. Suivi de partenaires
1. Créer des contacts pour chaque partenaire commercial
2. Associer au `tokenId` du jeton partenaire
3. Visualiser rapidement qui reçoit quoi dans les airdrops

### 3. Export/Sauvegarde
1. Exporter le carnet d'adresses en JSON
2. Sauvegarder sur un support externe
3. Importer sur un autre appareil ou après réinstallation

## Évolution Future

### Option Supabase (proposée au créateur)
- [ ] Table `address_book` dans Supabase
- [ ] Colonnes : `id`, `user_address`, `contact_address`, `name`, `token_id`, `created_at`, `updated_at`
- [ ] Toggle dans les paramètres : "Sync avec cloud" vs "Local uniquement"
- [ ] Migration automatique localStorage → Supabase

### Fonctionnalités avancées
- [ ] Groupes de contacts (ex: "VIP", "Équipe", "Investisseurs")
- [ ] Notes sur chaque contact
- [ ] Historique des interactions (airdrops reçus)
- [ ] Export CSV pour analyse
- [ ] Import depuis CSV
- [ ] Recherche avancée (regex, filtres multiples)

## Sécurité & Confidentialité

### Données stockées localement
- ✅ Aucune donnée envoyée à un serveur tiers
- ✅ Contrôle total de l'utilisateur sur ses contacts
- ✅ Export/Import pour backup manuel

### Validation
- ✅ Vérifie le format `ecash:` avant sauvegarde
- ✅ Empêche les doublons (même adresse + même tokenId)
- ✅ Confirmation avant suppression

### Limitations
- ⚠️ Stockage limité par le localStorage du navigateur (~5-10MB)
- ⚠️ Pas de synchronisation entre appareils (pour l'instant)
- ⚠️ Nettoyage des données du navigateur = perte des contacts (pensez à exporter !)

## Tests recommandés

### Test 1 : Airdrop avec carnet
1. Aller sur un token créateur
2. Onglet Airdrop → Calculer détenteurs
3. Sauvegarder 2-3 contacts avec des noms
4. Recalculer → Vérifier que les noms s'affichent

### Test 2 : Carnet global
1. ManageTokenPage → Afficher carnet d'adresses
2. Ajouter un contact manuellement
3. Rechercher par nom
4. Modifier le nom d'un contact
5. Supprimer un contact

### Test 3 : Export/Import
1. Créer 5 contacts
2. Exporter en JSON
3. Effacer le localStorage (`localStorage.removeItem('jln_address_book')`)
4. Importer le fichier JSON
5. Vérifier que tous les contacts sont restaurés

### Test 4 : Validation
1. Essayer d'ajouter une adresse sans `ecash:` → Erreur
2. Essayer d'ajouter sans nom → Erreur
3. Ajouter un doublon (même adresse) → Mise à jour du nom

## Support

Pour toute question ou amélioration :
- 📧 Vérifier les logs console avec `DEV` mode activé
- 📝 Consulter `PROJECT_STATUS.md` pour l'état actuel
- 🐛 Signaler les bugs dans les issues GitHub

---

**Date de création :** 16 décembre 2025  
**Version :** 1.0  
**Status :** ✅ Implémenté et fonctionnel
