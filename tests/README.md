# E2E Testing Guide

## Overview

Tests E2E avec **Playwright** pour garantir la qualité du wallet.

## Installation

```bash
# Installer Playwright browsers
npx playwright install
```

## Commandes

```bash
# Lancer tous les tests
npm test

# Tests avec UI interactive
npm run test:ui

# Tests en mode headed (voir le navigateur)
npm run test:headed

# Debug mode (pause & inspect)
npm run test:debug

# Voir le dernier rapport HTML
npm run test:report
```

## Structure des tests

```
tests/
├── wallet-connection.spec.js   # Connexion/déconnexion wallet
├── profil-selection.spec.js      # Sélecteur de profil + filtrage tokens
├── token-send.spec.js          # Envoi de tokens (form validation)
├── qr-scanner.spec.js          # Scanner QR + affichage QR code
└── sendXEC.spec.js            # Tests existants Send XEC
```

## Configuration

**Fichier:** `playwright.config.js`

- **Base URL:** http://localhost:5173
- **Browsers:** Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Retries:** 2 tentatives sur CI, 0 en local
- **Screenshots:** Uniquement sur échec
- **Vidéos:** Conservées sur échec
- **Dev server:** Lance automatiquement `npm run dev`

## Tests par catégorie

### 1. Wallet Connection (`wallet-connection.spec.js`)
- ✅ Affichage formulaire de connexion
- ✅ Connexion avec mnemonic valide
- ✅ Erreur pour mnemonic invalide
- ✅ Persistance connexion après reload
- ✅ Déconnexion

### 2. Prodil Selection (`profil-selection.spec.js`)
- ✅ Affichage dropdown fermes
- ✅ Chargement fermes depuis profiles.json
- ✅ Filtrage tokens par ferme
- ✅ Persistance sélection ferme
- ✅ Option "All Profiles"

### 3. Token Send (`token-send.spec.js`)
- ✅ Affichage formulaire send
- ✅ Validation feedback adresse (✓/❌)
- ✅ Validation feedback montant
- ✅ Enable/disable bouton Send
- ✅ Support comma→dot (EU users)
- ✅ Erreur insufficient balance
- ✅ Sanitization inputs (XSS prevention)
- ✅ Gestion décimales multiples

### 4. QR Scanner (`qr-scanner.spec.js`)
- ✅ Bouton QR scan visible
- ✅ Ouverture modal scanner
- ✅ Bouton close dans modal
- ✅ Fermeture modal (click close)
- ✅ Permissions caméra
- ✅ Erreur permissions refusées
- ✅ Affichage QR code wallet (receive)
- ✅ Copy address to clipboard

### 5. Send XEC (`sendXEC.spec.js` - existant)
- ✅ 15 tests existants (form, validation, dust prevention, etc.)

## Bonnes pratiques

### Utiliser des sélecteurs robustes
```javascript
// ✅ BON - sémantique HTML
await page.locator('button:has-text("Send")').click();
await page.locator('input[placeholder*="address"]').fill(...);

// ✅ BON - data-testid (ajouter si besoin)
await page.locator('[data-testid="send-button"]').click();

// ❌ ÉVITER - classes CSS (peuvent changer)
await page.locator('.btn-primary').click();
```

### Attendre les éléments
```javascript
// Attendre visibilité
await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });

// Attendre disparition
await expect(page.locator('.loading')).not.toBeVisible();
```

### Ne pas faire de vraies transactions
```javascript
// ❌ ÉVITER - transaction réelle
await page.click('button:has-text("Send")');
await page.waitForResponse('**/api/send');

// ✅ BON - tester UI seulement
await page.fill('input[placeholder*="amount"]', '1');
const sendButton = page.locator('button:has-text("Send")');
await expect(sendButton).toBeEnabled();
// Ne pas cliquer pour éviter envoi réel
```

### Variables d'environnement test
```javascript
// Utiliser mnemonic de test (JAMAIS de vrais fonds)
const TEST_MNEMONIC = 'abandon abandon abandon...'; // 0 XEC
```

## CI/CD

Sur GitHub Actions, Playwright :
- Lance automatiquement les tests
- Retry 2x sur échec
- Génère rapport HTML
- Upload artifacts (screenshots, vidéos)

## Debugging

### Mode UI (recommandé)
```bash
npm run test:ui
```
Interface graphique pour :
- Voir les tests en temps réel
- Inspecter le DOM
- Time travel (revoir chaque étape)

### Mode Debug
```bash
npm run test:debug
```
Ouvre Playwright Inspector avec pause automatique.

### Screenshots & Videos
Automatiquement générés sur échec dans `test-results/`.

## Rapport HTML

Après tests :
```bash
npm run test:report
```
Ouvre rapport interactif avec :
- Résultats par test
- Screenshots
- Vidéos
- Traces (timeline)

## Remarques importantes

⚠️ **Remplacer les valeurs de test** :
- `TEST_MNEMONIC` : Utiliser un wallet test (JAMAIS de vrais fonds)
- `VALID_TOKEN_ID` : Token ID réel de votre environnement test
- Ajuster selectors si structure HTML différente

⚠️ **Permissions caméra** :
- Tests QR scanner nécessitent permissions navigateur
- Sur CI, peut nécessiter configuration spécifique

⚠️ **Dev server** :
- Playwright lance automatiquement `npm run dev`
- Port 5173 doit être libre
- Timeout 120s pour démarrage

## Ressources

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
