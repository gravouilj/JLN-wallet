# 🎨 Guide de Style Farm Wallet - CSS Architecture

**Version** : 3.0  
**Date** : Décembre 2025  
**Statut** : Production

---

## 📚 Table des Matières

1. [Architecture CSS](#architecture-css)
2. [Conventions de Nommage](#conventions-de-nommage)
3. [Classes Utilitaires](#classes-utilitaires)
4. [Composants](#composants)
5. [Thèmes](#thèmes)
6. [Bonnes Pratiques](#bonnes-pratiques)
7. [Exemples](#exemples)

---

## 🏗️ Architecture CSS

### Structure des Fichiers

```
src/styles/
├── App.css            # Styles de base + animations globales
├── themes.css         # Système de thèmes (light/dark) + variables CSS
├── layout.css         # Layouts de pages et grilles
├── components.css     # Composants globaux + classes utilitaires métier
├── pages.css          # Styles spécifiques aux pages
└── utilities.css      # Classes utilitaires génériques (NEW)
```

### Ordre d'Import (App.jsx)

```jsx
import './App.css';           // 1. Base
import './styles/themes.css'; // 2. Variables
import './styles/layout.css'; // 3. Layouts
import './styles/components.css'; // 4. Composants
import './styles/pages.css';  // 5. Pages
import './styles/utilities.css'; // 6. Utilities
```

**Pourquoi cet ordre ?**
- Base → Variables → Structure → Détails
- Les variables CSS doivent être définies avant utilisation
- Les utilities sont importées en dernier pour avoir la priorité

---

## 🏷️ Conventions de Nommage

### Variables CSS

**Format** : `--{category}-{property}[-variant]`

```css
/* Couleurs de fond */
--bg-primary          /* Fond principal */
--bg-secondary        /* Fond secondaire */
--bg-tertiary         /* Fond tertiaire */

/* Couleurs de texte */
--text-primary        /* Texte principal */
--text-secondary      /* Texte secondaire */
--text-muted          /* Texte atténué */

/* Couleurs d'accent */
--accent-primary      /* Accent principal (bleu) */
--accent-success      /* Succès (vert) */
--accent-danger       /* Danger (rouge) */
--accent-warning      /* Avertissement (jaune) */

/* Bordures */
--border-primary      /* Bordure principale */
--border-focus        /* Bordure focus */

/* Composants */
--button-bg           /* Fond bouton */
--input-border        /* Bordure input */
--card-shadow         /* Ombre carte */
```

### Classes CSS

**Format** : `{component}-{element}[-modifier]`

```css
/* Composant Transaction */
.tx-container         /* Container principal */
.tx-icon-badge        /* Badge avec icône */
.tx-amount            /* Montant */
.tx-amount.positive   /* Modifier pour montant positif */

/* Composant Section */
.section-header       /* En-tête de section */
.section-title        /* Titre de section */
.section-icon         /* Icône de section */

/* États */
.loading-state        /* État chargement */
.empty-state          /* État vide */
```

---

## 🛠️ Classes Utilitaires

### Spacing (utilities.css)

```css
/* Marges */
.m-0, .m-1, .m-2, .m-3, .m-4, .m-5, .m-6, .m-8
.mt-2, .mb-4, .ml-auto, .mr-2
.mx-auto, .my-3

/* Paddings */
.p-0, .p-1, .p-2, .p-3, .p-4, .p-5, .p-6, .p-8
.pt-2, .pb-4, .pl-3, .pr-3
.px-4, .py-2

/* Gap */
.gap-1, .gap-2, .gap-3, .gap-4, .gap-5, .gap-6
```

**Échelle** : 
- 1 = 4px
- 2 = 8px
- 3 = 12px
- 4 = 16px
- 5 = 20px
- 6 = 24px
- 8 = 32px

### Display & Layout

```css
/* Display */
.d-none, .d-block, .d-flex, .d-grid

/* Flex */
.flex-row, .flex-column, .flex-wrap
.flex-1, .flex-auto

/* Alignment */
.align-center, .align-start, .align-end
.justify-center, .justify-between, .justify-around

/* Grid */
.grid-cols-2, .grid-cols-3, .grid-cols-4
```

### Texte

```css
/* Tailles */
.text-xs    /* 12px */
.text-sm    /* 14px */
.text-base  /* 16px */
.text-lg    /* 18px */
.text-xl    /* 20px */
.text-2xl   /* 24px */

/* Poids */
.font-normal, .font-medium, .font-semibold, .font-bold

/* Alignement */
.text-left, .text-center, .text-right

/* Couleurs */
.text-primary, .text-secondary, .text-muted
.text-success, .text-danger, .text-warning
```

### Background & Borders

```css
/* Backgrounds */
.bg-primary, .bg-secondary, .bg-tertiary

/* Border Radius */
.rounded-sm   /* 4px */
.rounded      /* 8px */
.rounded-md   /* 12px */
.rounded-lg   /* 16px */
.rounded-full /* 9999px */

/* Borders */
.border, .border-2, .border-4
.border-t, .border-b, .border-l, .border-r
```

### Interactions

```css
/* Curseur */
.cursor-pointer, .cursor-not-allowed

/* Hover */
.hover-opacity:hover      /* opacity: 0.8 */
.hover-scale:hover        /* scale(1.05) */
.hover-lift:hover         /* translateY(-2px) + shadow */

/* Disabled */
.disabled                 /* opacity: 0.5 + not-allowed */
```

---

## 🧩 Composants (components.css)

### Transaction

```jsx
<div className="tx-container">
  <div className="tx-icon-badge">
    <span>📥</span>
    <Badge variant="success">Reçu</Badge>
  </div>
  <div className="tx-details">
    <span className="tx-label">De:</span>
    <a className="tx-address" href="...">ecash:qp...</a>
    <div className="tx-date">14 Déc 2025 • 10:30</div>
  </div>
  <div className="tx-amount positive">+123.45 XEC</div>
  <div className="tx-fiat">≈ 0.05 EUR</div>
</div>
```

### Balance

```jsx
<div className="balance-container">
  <div className="balance-label">eCash (XEC)</div>
  <div className="balance-value">1,234.56 XEC</div>
  <div className="balance-fiat">≈ 5.67 EUR</div>
  <div className="balance-divider" />
</div>
```

### Section Header

```jsx
<div className="section-header">
  <span className="section-icon">🏡</span>
  <div className="section-header-content">
    <h2 className="section-title">Ma Ferme</h2>
    <p className="section-subtitle">Gérez vos jetons</p>
  </div>
</div>
```

### États

```jsx
{/* Loading */}
<CardContent className="loading-state">
  <div className="loading-spinner">⏳</div>
  <p className="loading-text">Chargement...</p>
</CardContent>

{/* Empty */}
<CardContent className="empty-state">
  <div className="empty-state-icon">📭</div>
  <p className="empty-state-text">Aucune donnée</p>
</CardContent>
```

### Collapsible

```jsx
<div 
  onClick={handleToggle}
  className="collapsible-header"
>
  <span className="section-icon">💸</span>
  <div className="section-header-content">
    <h2 className="section-title">Transactions</h2>
  </div>
  <span className={`collapsible-arrow ${isOpen ? 'open' : ''}`}>
    ▼
  </span>
</div>
```

### Token Stats

```jsx
<div className="token-stats">
  <div className="token-stat-item">
    <div className="token-stat-label">👥 Détenteurs</div>
    <div className="token-stat-value">123</div>
  </div>
  <div className="token-stat-item">
    <div className="token-stat-label">💰 Solde</div>
    <div className="token-stat-value">1,000</div>
  </div>
</div>
```

---

## 🌓 Thèmes

### Variables CSS par Thème

```css
/* Light Theme */
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a202c;
  --accent-primary: #0074e4;
}

/* Dark Theme */
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --text-primary: #f1f5f9;
  --accent-primary: #0074e4;
}
```

### Utilisation

```jsx
// Changer le thème
document.documentElement.setAttribute('data-theme', 'dark');

// CSS automatiquement mis à jour
<div style={{ backgroundColor: 'var(--bg-primary)' }}>
  Content
</div>
```

### Transitions

Tous les éléments ont des transitions automatiques :

```css
*,
*::before,
*::after {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}
```

---

## ✅ Bonnes Pratiques

### 1. Préférer les Classes CSS aux Styles Inline

❌ **Mauvais**
```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px',
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: '8px'
}}>
  Content
</div>
```

✅ **Bon**
```jsx
<div className="d-flex align-center gap-3 p-4 bg-secondary rounded">
  Content
</div>
```

### 2. Combiner Classes Utilitaires

```jsx
{/* Spacing + Layout + Text */}
<h2 className="text-2xl font-bold text-primary mb-4">
  Titre
</h2>

{/* Flex + Gap + Padding */}
<div className="d-flex gap-4 p-6 bg-secondary rounded-lg">
  Items
</div>
```

### 3. Utiliser les Composants Réutilisables si existants OU demander à en créer un si pertinent

```jsx
{/* Transaction */}
<div className="tx-container">
  <div className="tx-icon-badge">...</div>
  <div className="tx-details">...</div>
  <div className="tx-amount positive">+100 XEC</div>
</div>

{/* Section */}
<div className="section-header">
  <span className="section-icon">🏡</span>
  <div className="section-header-content">
    <h2 className="section-title">Titre</h2>
  </div>
</div>
```

### 4. Variables CSS pour Couleurs & Tailles

❌ **Mauvais**
```css
.my-component {
  color: #1a202c;
  background: #ffffff;
}
```

✅ **Bon**
```css
.my-component {
  color: var(--text-primary);
  background: var(--bg-primary);
}
```

### 5. Styles Inline Seulement si Nécessaire

**Acceptable** :
- Valeurs dynamiques (calculées en JS)
- Overrides très spécifiques ponctuels
- Animations avec state React

```jsx
{/* Dynamique - OK */}
<div style={{ width: `${progress}%` }}>...</div>

{/* Override ponctuel - OK */}
<h2 className="section-title" style={{ fontSize: '1.1rem' }}>
  Titre Custom
</h2>
```

### 6. Responsive Design

```css
/* Mobile First */
.my-component {
  padding: 16px;
  font-size: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .my-component {
    padding: 24px;
    font-size: 1.125rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .my-component {
    padding: 32px;
    font-size: 1.25rem;
  }
}
```

---

## 📋 Exemples Complets

### Page avec Section Collapsible

```jsx
function MyPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="section-header mb-4">
          <span className="section-icon">🏡</span>
          <div className="section-header-content">
            <h2 className="section-title">Ma Ferme</h2>
            <p className="section-subtitle">Gérez vos jetons</p>
          </div>
        </div>

        {/* Stats */}
        <div className="token-stats mb-5">
          <div className="token-stat-item">
            <div className="token-stat-label">👥 Détenteurs</div>
            <div className="token-stat-value">123</div>
          </div>
          <div className="token-stat-item">
            <div className="token-stat-label">💰 Solde</div>
            <div className="token-stat-value">1,000</div>
          </div>
        </div>

        {/* Collapsible */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="collapsible-header"
        >
          <span className="section-icon">💸</span>
          <div className="section-header-content">
            <h2 className="section-title">Transactions</h2>
          </div>
          <span className={`collapsible-arrow ${isOpen ? 'open' : ''}`}>
            ▼
          </span>
        </div>

        {isOpen && (
          <div className="mt-4">
            <TransactionList />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Formulaire avec Utilities

```jsx
<form className="w-full max-w-md mx-auto p-6">
  <h2 className="text-2xl font-bold text-primary mb-6">
    Inscription
  </h2>

  <Input 
    label="Email"
    type="email"
    className="mb-4"
  />

  <Input 
    label="Mot de passe"
    type="password"
    className="mb-4"
  />

  <div className="d-flex align-center gap-2 mb-6">
    <Checkbox label="Se souvenir de moi" />
  </div>

  <Button 
    variant="primary" 
    fullWidth
    className="mb-3"
  >
    Se connecter
  </Button>

  <Button 
    variant="outline" 
    fullWidth
  >
    Créer un compte
  </Button>
</form>
```

### Liste de Transactions

```jsx
function TransactionList({ transactions }) {
  return (
    <div className="d-flex flex-column gap-3">
      {transactions.map(tx => (
        <div key={tx.id} className="tx-container">
          <div className="tx-icon-badge">
            <span>{tx.type === 'received' ? '📥' : '📤'}</span>
            <Badge variant={tx.type === 'received' ? 'success' : 'danger'}>
              {tx.type === 'received' ? 'Reçu' : 'Envoyé'}
            </Badge>
          </div>

          <div className="tx-details">
            <span className="tx-label">
              {tx.type === 'received' ? 'De:' : 'À:'}
            </span>
            <a className="tx-address" href={`/address/${tx.address}`}>
              {tx.address}
            </a>
            <div className="tx-date">{tx.date}</div>
          </div>

          <div className={`tx-amount ${tx.type === 'received' ? 'positive' : 'negative'}`}>
            {tx.type === 'received' ? '+' : '-'}{tx.amount} XEC
          </div>
          <div className="tx-fiat">≈ {tx.fiat} EUR</div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 Migration Guide

### De Styles Inline vers Classes

**Étape 1** : Identifier les styles répétés
```jsx
// Avant
<div style={{ display: 'flex', gap: '12px' }}>...</div>
<div style={{ display: 'flex', gap: '12px' }}>...</div>
```

**Étape 2** : Trouver la classe utilitaire
```jsx
// Après
<div className="d-flex gap-3">...</div>
<div className="d-flex gap-3">...</div>
```

**Étape 3** : Créer un composant si nécessaire
```css
/* components.css */
.my-custom-layout {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
}
```

---

## 📚 Ressources

- [themes.css](../src/styles/themes.css) - Variables CSS
- [utilities.css](../src/styles/utilities.css) - Classes utilitaires
- [components.css](../src/styles/components.css) - Composants
- [UI.jsx](../src/components/UI.jsx) - Composants React

---

## 🆘 FAQ

### Quand utiliser des styles inline ?

✅ **Oui** :
- Valeurs dynamiques calculées en JS
- Overrides ponctuels très spécifiques
- Animations avec state React

❌ **Non** :
- Styles statiques répétés
- Layouts standards
- Couleurs/espacements

### Comment choisir entre classe utilitaire et composant ?

**Classe utilitaire** : Si le pattern est simple et répété souvent
```jsx
<div className="d-flex gap-3 p-4">...</div>
```

**Composant CSS** : Si le pattern est complexe et spécifique au métier
```jsx
<div className="tx-container">...</div>
```

### Dois-je toujours utiliser des variables CSS ?

**Oui pour** :
- Couleurs (thème light/dark)
- Espacements standardisés
- Tailles de police

**Non pour** :
- Valeurs uniques (width calculé, etc.)
- Overrides ponctuels

---

**Dernière mise à jour** : Décembre 2025  
**Maintenu par** : Équipe Farm Wallet
