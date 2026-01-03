# Component Documentation

**Dernière mise à jour** : Janvier 2026  
**Architecture** : React 19.1 + TypeScript

## Overview

JLN Wallet utilise des **composants atomiques personnalisés** sans framework UI (pas de Tailwind, pas de Shadcn, pas de Bootstrap).

Tous les composants utilisent des variables CSS définies dans `src/styles/themes.css`.

---

## Composants UI Atomiques (`src/components/UI/`)

Structure modulaire avec exports centralisés via `src/components/UI/index.ts`.

### Modules disponibles

| Fichier | Composants exportés |
|---------|---------------------|
| `Card.tsx` | `Card`, `CardContent` |
| `Button.tsx` | `Button` |
| `Layout.tsx` | `Stack`, `Container` |
| `Inputs.tsx` | `Input`, `Select`, `Textarea` |
| `Badge.tsx` | `Badge`, `StatusBadge` |
| `Modal.tsx` | `Modal` |
| `Tabs.tsx` | `Tabs`, `Tab` |
| `Toggles.tsx` | `Toggle`, `Checkbox` |
| `BalanceCard.tsx` | `BalanceCard` |
| `Feedback.tsx` | `Spinner`, `Alert`, `Toast` |
| `Accordion.tsx` | `Accordion`, `AccordionItem` |

---

### Card

Container avec style cohérent.

```tsx
import { Card, CardContent } from '../components/UI';

<Card>
  <CardContent>
    <h2>Balance</h2>
    <p>1000 XEC</p>
  </CardContent>
</Card>
```

**Props:**
- `children` - Contenu de la carte
- `className` - Classes CSS additionnelles
- `onClick` - Handler de clic (rend la carte interactive)

---

### Button

Bouton réutilisable avec variantes.

```tsx
import { Button } from '../components/UI';

<Button variant="primary" onClick={handleClick}>
  Envoyer
</Button>

<Button variant="secondary" disabled>
  Chargement...
</Button>
```

**Props:**
- `variant` - `"primary"` | `"secondary"` | `"danger"` (défaut: `"primary"`)
- `children` - Texte/contenu du bouton
- `onClick` - Handler de clic
- `disabled` - Désactiver le bouton
- `type` - Type HTML (`"button"` | `"submit"`)
- `className` - Classes CSS additionnelles

**Variantes:**
- `primary` - Couleur accent bleue (actions principales)
- `secondary` - Couleur grise (actions secondaires)
- `danger` - Couleur rouge (actions destructives)

---

### Stack

Container flexbox pour espacer les éléments.

```tsx
import { Stack } from '../components/UI';

<Stack direction="column" gap="1rem">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</Stack>

<Stack direction="row" gap="0.5rem" align="center">
  <span>Prix:</span>
  <strong>$0.00003</strong>
</Stack>
```

**Props:**
- `direction` - `"row"` | `"column"` (défaut: `"column"`)
- `gap` - Valeur CSS gap (défaut: `"1rem"`)
- `align` - Propriété CSS `align-items`
- `justify` - Propriété CSS `justify-content`
- `className` - Classes CSS additionnelles
- `children` - Contenu du stack

---

### Input

Champ de saisie avec label et gestion d'erreurs.

```tsx
import { Input } from '../components/UI';

<Input
  label="Montant"
  value={amount}
  onChange={setAmount}
  placeholder="0.00"
  error={error}
  suffix="XEC"
/>
```

**Props:**
- `label` - Label du champ
- `value` - Valeur contrôlée
- `onChange` - Handler de changement
- `placeholder` - Texte placeholder
- `error` - Message d'erreur
- `suffix` - Texte/élément après l'input
- `prefix` - Texte/élément avant l'input

---

### Modal

Fenêtre modale accessible.

```tsx
import { Modal } from '../components/UI';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirmer l'envoi"
>
  <p>Voulez-vous envoyer 100 XEC ?</p>
  <Button onClick={confirm}>Confirmer</Button>
</Modal>
```

**Props:**
- `isOpen` - État d'ouverture
- `onClose` - Handler de fermeture
- `title` - Titre de la modale
- `children` - Contenu
- `size` - `"sm"` | `"md"` | `"lg"`

---

### Tabs

Navigation par onglets.

```tsx
import { Tabs, Tab } from '../components/UI';

<Tabs activeTab={activeTab} onTabChange={setActiveTab}>
  <Tab name="receive">Recevoir</Tab>
  <Tab name="send">Envoyer</Tab>
  <Tab name="history">Historique</Tab>
</Tabs>
```

---

### Badge

Indicateur de statut.

```tsx
import { Badge, StatusBadge } from '../components/UI';

<Badge>Nouveau</Badge>
<StatusBadge status="verified">Vérifié</StatusBadge>
<StatusBadge status="pending">En attente</StatusBadge>
```

---

## Composants Layout (`src/components/Layout/`)

### TopBar

Barre de navigation supérieure.

```tsx
import { TopBar } from '../components/Layout/TopBar';

<TopBar />
```

**Fonctionnalités:**
- Affichage du logo
- Bouton paramètres (navigue vers `/settings`)
- Layout mobile responsive
- Compatible dark mode

---

### BottomNavigation

Navigation inférieure pour mobile.

```tsx
import { BottomNavigation } from '../components/Layout/BottomNavigation';

<BottomNavigation />
```

**Éléments de navigation:**
- Home (`/wallet`)
- Send (`/send`)
- Directory (`/`)
- Favorites (`/favorites`)

**Fonctionnalités:**
- État actif surligné
- Icônes pour chaque section
- Position fixe en bas sur mobile
- Caché sur desktop (>768px)

---

### MobileLayout

Container pour design mobile-first.

```tsx
import { MobileLayout } from '../components/Layout/MobileLayout';

<MobileLayout>
  <VotreContenu />
</MobileLayout>
```

**Fonctionnalités:**
- Combine TopBar + contenu + BottomNavigation
- Padding responsive
- Container de scroll
- Gestion des safe areas

---

## Composants ClientWallet (`src/components/ClientWallet/`)

### ImmersionComponents

Composants d'immersion de marque pour `ClientWalletPage`.

```tsx
import {
  TokenHeroSection,
  TokenPurposeCard,
  CreatorSocialLinks,
  CreatorContactCard,
  CreatorActions
} from '../components/ClientWallet/ImmersionComponents';
```

**Composants:**
- `TokenHeroSection` - Header visuel avec image, nom, ticker, badge vérifié
- `TokenPurposeCard` - Utilité (purpose) et contrepartie (counterpart)
- `CreatorSocialLinks` - Liens réseaux sociaux
- `CreatorContactCard` - Infos géographiques et website
- `CreatorActions` - Boutons d'action rapide

---

## Composants eCash (`src/components/eCash/`)

### TokenActions

Actions blockchain (Send, Airdrop, Mint, Burn, Message).

```tsx
import { Send, Airdrop, Mint, Burn, Message } from '../components/eCash/TokenActions';
```

Chaque composant utilise le hook correspondant :
- `useSendToken` - Envoi de tokens
- `useAirdropToken` - Distribution airdrop
- `useMintToken` - Frappe de tokens
- `useBurnToken` - Destruction de tokens

---

## Hooks Personnalisés (`src/hooks/`)

Les hooks centralisent la logique métier. Voir [WALLET_ARCHITECTURE.md](./WALLET_ARCHITECTURE.md) pour les détails.

| Hook | Usage |
|------|-------|
| `useEcashWallet` | Instance wallet, adresse, connexion |
| `useEcashBalance` | Balance avec auto-refresh |
| `useSendToken` | Envoi de tokens avec validation |
| `useMintToken` | Logique de mint |
| `useBurnToken` | Logique de burn |
| `useAirdropToken` | Distribution airdrop |
| `useChronikWebSocket` | Événements blockchain temps réel |
| `useAdmin` | Vérification permissions admin |
| `useAddressBook` | Gestion contacts |

---

## Variables CSS

Les composants utilisent les variables de `src/styles/themes.css`:

```css
/* Couleurs */
var(--primary)          /* #0074e4 - eCash blue */
var(--bg-primary)       /* Background principal */
var(--text-primary)     /* Couleur texte */

/* Espacement */
var(--spacing-xs)       /* 0.25rem */
var(--spacing-sm)       /* 0.5rem */
var(--spacing-md)       /* 1rem */
var(--spacing-lg)       /* 1.5rem */
var(--spacing-xl)       /* 2rem */

/* Bordures */
var(--border-radius)    /* Rayon standard */
var(--border-color)     /* Couleur bordure */
```

---

## Breakpoints (Mobile-First)

```css
/* Mobile (défaut) */
/* Tablette */
@media (min-width: 600px) { }
/* Desktop */
@media (min-width: 768px) { }
/* Large */
@media (min-width: 1024px) { }
```
