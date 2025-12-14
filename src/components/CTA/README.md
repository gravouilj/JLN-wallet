# Module CTA (Call-To-Action)

## 📁 Architecture

Ce module gère l'affichage et la logique des Call-To-Action dans l'application, notamment sur la DirectoryPage.

### Fichiers

- **`CTACard.jsx`** - Composant de carte CTA réutilisable
- **`useCTAInjection.js`** - Hook personnalisé pour injecter les CTA dans une liste
- **`ctaConfig.js`** - Configuration centralisée des CTA
- **`index.js`** - Barrel export pour une utilisation simplifiée

## 🎯 Utilisation

### Dans DirectoryPage

```jsx
import { CTACard, useCTAInjection } from '../components/CTA';

// Contexte utilisateur
const userContext = { isCreator: userFarms.length > 0 };

// Contexte des filtres
const filterContext = {
  searchQuery,
  selectedCountry,
  selectedRegion,
  // ...
};

// Injecter les CTA dans la liste de fermes
const farmsWithCTAs = useCTAInjection(filteredFarms, userContext, filterContext);

// Affichage
{farmsWithCTAs.map((item) => (
  item.isCTA ? (
    <CTACard key={item.id} cta={item} ctaConfig={item.ctaConfig} />
  ) : (
    <FarmProfileCard key={item.id} farm={item} />
  )
))}
```

## ⚙️ Configuration

### Dans `ctaConfig.js`

#### `CTA_CONFIG` - Paramètres d'affichage

```js
{
  insertionFrequency: 3,        // Tous les 3 profils
  firstCTAPosition: 1,          // Après le 1er profil
  minProfilesThreshold: 5,      // Seuil d'affichage
  showOnFilterActive: true,     // Afficher si filtres actifs
  showOnNoResults: true,        // Afficher si aucun résultat
}
```

#### `CTA_TYPES` - Définition des CTA

```js
{
  MY_ESTABLISHMENT: {
    id: 'cta-my-establishment',
    type: 'start',
    gradient: 'linear-gradient(...)',
    icon: '🚀',
    showCondition: (userContext) => !userContext.isCreator,
    getContent: (t) => ({ ... }),
    onClick: (navigate) => navigate('/farmer-info'),
  },
  // ...
}
```

## 🎨 Personnalisation

### Ajouter un nouveau CTA

1. **Ajouter dans `ctaConfig.js`** :

```js
export const CTA_TYPES = {
  // ... CTA existants
  
  MY_NEW_CTA: {
    id: 'cta-my-new',
    type: 'custom',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: '✨',
    showCondition: (userContext) => true,
    getContent: (t) => ({
      name: t('directory.ctaNewName'),
      description: t('directory.ctaNewDesc'),
      location_region: 'France',
      products: ['Nouveauté'],
      rewards: '🎉 Offre spéciale',
      buttonText: t('directory.ctaNewButton'),
    }),
    onClick: (navigate) => navigate('/new-page'),
  },
};
```

2. **Ajouter les traductions** dans `fr.json` et `en.json` :

```json
{
  "ctaNewName": "Mon Nouveau CTA",
  "ctaNewDesc": "Description...",
  "ctaNewButton": "Action"
}
```

### Modifier la fréquence d'affichage

```jsx
// Dans DirectoryPage ou autre
const customConfig = {
  insertionFrequency: 5,  // Tous les 5 profils au lieu de 3
  firstCTAPosition: 2,    // Après le 2ème profil au lieu du 1er
};

const farmsWithCTAs = useCTAInjection(
  filteredFarms, 
  userContext, 
  filterContext,
  customConfig  // Configuration personnalisée
);
```

### Conditions d'affichage personnalisées

```js
showCondition: (userContext) => {
  // Afficher uniquement pour les utilisateurs premium
  return userContext.isPremium && !userContext.isCreator;
}
```

## 🔧 Hook `useCTAInjection`

### Paramètres

- **`profiles`** (Array) - Liste des profils à afficher
- **`userContext`** (Object) - Contexte utilisateur (`isCreator`, `isPremium`, etc.)
- **`filterContext`** (Object) - État des filtres actifs
- **`config`** (Object, optionnel) - Configuration personnalisée

### Retour

Array de profils avec CTA injectés. Chaque CTA a :

```js
{
  id: string,
  isCTA: true,
  ctaType: string,
  ctaConfig: Object
}
```

## 🎭 Composant `CTACard`

### Props

- **`cta`** - Objet CTA complet
- **`ctaConfig`** - Configuration du CTA (de `CTA_TYPES`)

### Apparence

- Gradient de fond selon le type
- Icône animée (bounce)
- Description centrée
- Badge de récompenses
- Bouton d'action personnalisé
- Effets hover (scale + shadow)

## 📝 Traductions requises

Pour chaque nouveau CTA, ajouter dans `fr.json` et `en.json` :

```json
{
  "ctaXxxName": "Titre du CTA",
  "ctaXxxDesc": "Description complète",
  "ctaXxxRegion": "Localisation",
  "ctaXxxProduct1": "Produit/tag",
  "ctaXxxReward": "🎯 Avantages",
  "ctaXxxButton": "Texte du bouton"
}
```

## 🧪 Tests

### Scénarios à tester

1. **Affichage avec < 5 profils** ✅
2. **Affichage avec filtres actifs** ✅
3. **Utilisateur créateur** : uniquement CTA "Inviter" ✅
4. **Utilisateur non-créateur** : alternance "Débuter" / "Inviter" ✅
5. **Aucun résultat** : affichage de tous les CTA ✅
6. **Clic sur CTA** : redirection correcte ✅

## 🚀 Améliorations futures

- [ ] Analytics sur les clics CTA
- [ ] A/B testing des designs
- [ ] CTA contextuels selon la géolocalisation
- [ ] Animations d'apparition
- [ ] Personnalisation selon l'historique utilisateur
