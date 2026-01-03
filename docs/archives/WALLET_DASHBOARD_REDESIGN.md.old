# 🎨 Refonte Visuelle - WalletDashboard

## Vue d'Ensemble

Transformation complète de `src/pages/WalletDashboard.jsx` en un dashboard moderne, propre et fonctionnel, avec une interface à onglets et un design épuré.

---

## ✨ Nouveautés

### 1. 🌾 Sélecteur de Ferme (Farm Selector)

**Avant**: Bannière statique affichant la ferme sélectionnée

**Après**: Menu déroulant interactif

- **Contenu**: Liste uniquement les fermes mises en favoris
- **État vide**: Bouton "➕ Choisir une ferme favorite" redirigeant vers l'annuaire
- **Style**: Dropdown stylisé avec icône de checkmark pour les fermes vérifiées
- **Interaction**: Sélection instantanée avec notification toast de confirmation

```jsx
<select className="farm-dropdown" onChange={handleFarmSelect}>
  <option>🌾 Sélectionner une ferme</option>
  {favoriteFarms.map(farm => (
    <option key={farm.id}>{farm.verified ? '✓ ' : ''}{farm.name}</option>
  ))}
</select>
```

---

### 2. 💰 Affichage des Soldes (Balance Display)

**Avant**: Deux cartes séparées verticalement

**Après**: Une seule carte divisée en deux sections côte-à-côte

#### Layout
- **Gauche (70%)**: Solde du jeton de la ferme sélectionnée
  - Montant en **GRANDE police grasse** (2.5rem, color: primary)
  - Ticker du token (ex: JDP, CAROT)
  - Nom de la ferme en sous-texte
  
- **Droite (30%)**: Solde XEC (eCash)
  - Label "XEC" en petit
  - Montant en police moyenne (1.5rem)
  - Sous-label "Frais réseau"

- **Séparateur vertical**: Ligne légère entre les deux sections

```css
.balance-card-split {
  display: flex;
  border-radius: 16px;
}

.balance-left { flex: 7; } /* 70% */
.balance-separator { width: 1px; }
.balance-right { flex: 3; } /* 30% */
```

#### États
- **Loading**: Animation de pulsation (`...`)
- **Ferme non sélectionnée**: Icône 🌾 + "Sélectionnez une ferme"
- **Ferme sélectionnée**: Affichage complet du solde

---

### 3. 📥📤 Onglets d'Action (Action Tabs)

**Nouveau système d'onglets** pour basculer entre "Recevoir" et "Envoyer"

#### Design
- **2 onglets**: [ Recevoir ] | [ Envoyer ]
- **Onglet actif par défaut**: "Recevoir"
- **Style**: Tabs avec fond bleu pour l'onglet actif
- **Transition**: Animation smooth sur changement

```jsx
<div className="action-tabs">
  <button className={`tab-button ${activeTab === 'receive' ? 'active' : ''}`}>
    📥 Recevoir
  </button>
  <button className={`tab-button ${activeTab === 'send' ? 'active' : ''}`}>
    📤 Envoyer
  </button>
</div>
```

---

### 4. 📥 Onglet "Recevoir" (Receive Tab)

#### Contenu
1. **QR Code**
   - Taille: 220px × 220px
   - Bordure arrondie
   - Fond blanc avec ombre portée
   - Valeur: Adresse eCash du wallet

2. **Adresse eCash**
   - Format écourté: `ecash:qpm...xyz` (10 premiers + 8 derniers caractères)
   - Police monospace (Courier New)
   - Fond gris clair avec bordure

3. **Bouton Copier**
   - Style: Bordure bleue, fond transparent
   - Hover: Fond bleu, texte blanc
   - Notification toast au clic: "Adresse copiée !"

```jsx
<div className="receive-content">
  <div className="qr-code-display">
    <QRCodeSVG value={wallet.getAddress()} size={220} />
  </div>
  <div className="address-display-container">
    <div className="address-label">Votre adresse eCash</div>
    <div className="address-value">{formatAddress(wallet.getAddress())}</div>
    <button className="copy-btn" onClick={handleCopyAddress}>
      📋 Copier
    </button>
  </div>
</div>
```

---

### 5. 📤 Onglet "Envoyer" (Send Tab)

#### Contenu
Intégration du composant existant `<TokenSend />`

- **Champ Destinataire**: Adresse eCash du bénéficiaire
- **Champ Montant**: Montant de tokens à envoyer
- **Bouton Envoyer**: Validation et envoi de transaction
- **Scanner QR**: Option pour scanner une adresse

```jsx
<div className="send-content">
  <TokenSend />
</div>
```

---

## 🎨 Styles CSS

### Fichier: `src/styles/home.css`

#### Nouvelles classes

| Classe | Description |
|--------|-------------|
| `.dashboard-content` | Container principal du dashboard |
| `.farm-selector-section` | Section du sélecteur de ferme |
| `.farm-dropdown` | Menu déroulant stylisé |
| `.add-favorite-btn` | Bouton "Ajouter un favori" (style outline) |
| `.balance-card-split` | Carte de soldes divisée |
| `.balance-left` / `.balance-right` | Sections gauche/droite |
| `.balance-separator` | Ligne de séparation verticale |
| `.balance-main-amount` | Montant du token (gros, bleu) |
| `.balance-xec-amount` | Montant XEC (moyen) |
| `.action-tabs` | Container des onglets |
| `.tab-button` / `.tab-button.active` | Boutons d'onglet |
| `.tab-content` | Container du contenu des onglets |
| `.receive-content` / `.send-content` | Contenu spécifique par onglet |
| `.qr-code-display` | Container du QR code |
| `.address-display-container` | Container de l'adresse |
| `.copy-btn` | Bouton de copie stylisé |
| `.loading-pulse` | Animation de chargement |

#### Couleurs et Variables CSS

```css
/* Utilise les variables CSS existantes */
--primary-color: #007bff (bleu)
--text-color: texte principal
--text-secondary: texte secondaire
--card-background: fond des cartes
--border-color: bordures
--background-color: fond de page
```

#### Responsive

```css
@media (max-width: 480px) {
  .balance-main-amount { font-size: 2rem; }
  .balance-xec-amount { font-size: 1.25rem; }
  .qr-code-display svg { width: 180px; height: 180px; }
}
```

---

## 🌐 Traductions (i18n)

### Nouvelles clés ajoutées

#### `fr.json` (Français)
```json
{
  "wallet": {
    "selectFarm": "🌾 Sélectionner une ferme",
    "addFavorite": "Choisir une ferme favorite",
    "farmSelected": "sélectionnée",
    "noFarmSelected": "Sélectionnez une ferme",
    "receive": "Recevoir",
    "send": "Envoyer",
    "yourAddress": "Votre adresse eCash"
  }
}
```

#### `en.json` (English)
```json
{
  "wallet": {
    "selectFarm": "🌾 Select a farm",
    "addFavorite": "Choose a favorite farm",
    "farmSelected": "selected",
    "noFarmSelected": "Select a farm",
    "receive": "Receive",
    "send": "Send",
    "yourAddress": "Your eCash address"
  }
}
```

---

## 🔧 Changements Techniques

### Imports ajoutés
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TokenSend from '../components/TokenSend';
import { useFarms } from '../hooks/useFarms';
import { favoriteFarmsAtom, notificationAtom } from '../atoms';
```

### State Management
```jsx
const [activeTab, setActiveTab] = useState('receive');
const [favoriteFarmIds] = useAtom(favoriteFarmsAtom);
const setNotification = useSetAtom(notificationAtom);
const { farms } = useFarms();
const favoriteFarms = farms.filter(farm => favoriteFarmIds.includes(farm.id));
```

### Nouvelles Fonctions
```jsx
handleFarmSelect(farm)       // Sélection d'une ferme
handleCopyAddress()          // Copie de l'adresse avec toast
formatAddress(address)       // Format écourté de l'adresse
```

---

## 📊 Comparaison Avant/Après

### Structure

| Aspect | Avant | Après |
|--------|-------|-------|
| **En-tête** | Bannière statique | Dropdown interactif |
| **Soldes** | 2 cartes verticales | 1 carte split horizontale |
| **Actions** | Sections séparées | Système d'onglets |
| **QR Code** | Toujours visible | Onglet "Recevoir" |
| **Envoi** | Page séparée | Onglet "Envoyer" intégré |

### UX Améliorée

1. ✅ **Moins de scroll**: Tout sur une seule page
2. ✅ **Navigation intuitive**: Tabs clairs "Recevoir" / "Envoyer"
3. ✅ **Feedback visuel**: Notifications toast pour chaque action
4. ✅ **Hiérarchie visuelle**: Solde token en évidence
5. ✅ **État vide géré**: Bouton CTA pour ajouter des favoris

---

## 🧪 Tests

### Scénarios à tester

#### 1. Sans ferme en favoris
- [ ] Affiche le bouton "➕ Choisir une ferme favorite"
- [ ] Clic redirige vers l'annuaire (`/`)
- [ ] Balance card affiche l'état vide (🌾 icône)

#### 2. Avec fermes en favoris
- [ ] Dropdown affiche toutes les fermes favorites
- [ ] Icône ✓ pour les fermes vérifiées
- [ ] Sélection change le solde affiché
- [ ] Notification toast "Ferme sélectionnée"

#### 3. Onglet "Recevoir"
- [ ] QR code s'affiche correctement (220×220px)
- [ ] Adresse formatée correctement (ecash:qpm...xyz)
- [ ] Bouton "Copier" fonctionne
- [ ] Toast "Adresse copiée !" s'affiche

#### 4. Onglet "Envoyer"
- [ ] Composant TokenSend chargé
- [ ] Formulaire d'envoi fonctionnel
- [ ] Scanner QR accessible

#### 5. Responsive
- [ ] QR code réduit à 180px sur mobile
- [ ] Police des soldes s'adapte
- [ ] Tabs restent cliquables

---

## 🚀 État du Déploiement

- ✅ Fichier WalletDashboard.jsx refactorisé (208 lignes)
- ✅ Styles CSS ajoutés dans home.css (350+ lignes)
- ✅ Traductions FR/EN complétées
- ✅ Aucune erreur de compilation
- ✅ Composants existants réutilisés (TokenSend, MobileLayout)
- ✅ Intégration avec atoms Jotai (favoriteFarms, selectedFarm)

---

## 📝 Notes Techniques

### Performance
- Utilise `useFarms()` hook pour charger les fermes (déjà optimisé)
- `favoriteFarms` calculé une seule fois via filter
- QR Code généré uniquement quand onglet "Recevoir" est actif

### Accessibilité
- Boutons avec labels clairs (emoji + texte)
- Couleurs contrastées (bleu primary sur fond clair)
- Focus states sur tous les éléments interactifs

### Compatibilité
- Fonctionne avec le thème dark/light existant
- Responsive mobile-first
- Compatible avec les atoms Jotai existants

---

## 🎯 Prochaines Améliorations Possibles

1. **Animation de transition** entre les onglets (slide effect)
2. **Historique des transactions** sous les onglets
3. **Graphique d'évolution** du solde token
4. **Partage du QR code** via bouton "Partager"
5. **Mode compact** pour afficher plus d'infos sans scroll

---

**Date de refonte**: 27 novembre 2025  
**Fichiers modifiés**: 4 (WalletDashboard.jsx, home.css, fr.json, en.json)  
**Lignes ajoutées**: ~500 lignes  
**Breaking changes**: Aucun (compatibilité maintenue)
