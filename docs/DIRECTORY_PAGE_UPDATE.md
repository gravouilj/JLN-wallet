# Mise à jour de DirectoryPage - Intégration Database Supabase

**Date:** 13 décembre 2025  
**Objectif:** Afficher les fermes depuis la DB 'farms' avec les nouveaux standards UI.jsx et la structure multi-tokens

---

## 📋 Modifications apportées

### 1. **Hook useFarms.js** - Filtrage des fermes visibles

**Fichier:** `src/hooks/useFarms.js`

**Changements:**
- ✅ Filtre uniquement les fermes avec `status='active'` (fermes publiques)
- ✅ Filtre uniquement les fermes ayant au moins 1 token avec `isVisible=true`
- ✅ Log clair: `X fermes visibles chargées (Y actives au total)`

**Avant:**
```javascript
// Charger TOUTES les fermes (tous statuts)
const { data, error } = await supabase
  .from('farms')
  .select('*')
  .order('created_at', { ascending: false });
```

**Après:**
```javascript
// Charger uniquement les fermes ACTIVES avec tokens visibles
const { data, error } = await supabase
  .from('farms')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Filtrer les fermes qui ont au moins 1 token visible
const visibleFarms = (data || []).filter(farm => {
  if (!farm.tokens || !Array.isArray(farm.tokens)) return false;
  return farm.tokens.some(token => token.isVisible === true);
});
```

---

### 2. **DirectoryPage.jsx** - Adaptation au nouveau schéma DB

**Fichier:** `src/pages/DirectoryPage.jsx`

#### A. Import du composant StatusBadge
```javascript
import { Modal, Textarea, Button, StatusBadge } from '../components/UI';
```

#### B. Chargement des tickers multi-tokens
**Avant:** Un seul `farm.tokenId` par ferme  
**Après:** Array `farm.tokens` avec plusieurs tokens

```javascript
// Gérer le nouveau format: tokens array JSONB
if (farm.tokens && Array.isArray(farm.tokens)) {
  for (const token of farm.tokens) {
    if (token.tokenId && token.isVisible) {
      try {
        const info = await wallet.getTokenInfo(token.tokenId);
        tickers[token.tokenId] = info.genesisInfo?.tokenTicker || token.ticker || 'UNK';
      } catch (e) {
        tickers[token.tokenId] = token.ticker || '???';
      }
    }
  }
}
```

#### C. Filtres géographiques mis à jour
Utilisation des nouveaux champs de location avec fallback sur les anciens:
- `farm.location_country || farm.country`
- `farm.location_region || farm.region`
- `farm.location_department || farm.department`

#### D. Affichage des badges de vérification standardisés
```javascript
{farm.verification_status === 'verified' ? (
  <StatusBadge status="verified" type="verification" />
) : farm.verification_status === 'pending' ? (
  <StatusBadge status="pending" type="verification" />
) : farm.verification_status === 'info_requested' ? (
  <StatusBadge status="info_requested" type="verification" />
) : (
  <StatusBadge status="none" type="verification" />
)}
```

---

### 3. **FarmCard Component** - Affichage multi-tokens modernisé

#### A. Gestion des tokens visibles
```javascript
const visibleTokens = farm.tokens?.filter(token => token.isVisible) || [];
const primaryToken = visibleTokens[0]; // Premier token comme principal
```

#### B. Affichage visuel des tokens (carte gradient)
```jsx
{visibleTokens.length > 0 && (
  <div style={{ 
    marginTop: '12px', 
    padding: '12px', 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '10px',
    color: 'white'
  }}>
    <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '6px', opacity: 0.9 }}>
      💎 {visibleTokens.length === 1 ? 'Token disponible' : `${visibleTokens.length} Tokens disponibles`}
    </div>
    {visibleTokens.map((token, idx) => (
      <div key={token.tokenId} style={{ ... }}>
        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
          {farmTickers[token.tokenId] || token.ticker || 'Token'}
        </div>
        {token.purpose && (
          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px' }}>
            {token.purpose}
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

#### C. Localisation avec nouveaux champs
```javascript
<p className="farm-region">
  📍 {farm.location_region || farm.region || 'Non renseigné'}
</p>
```

---

### 4. **Modal de détails** - Affichage complet des informations

#### A. Badge de vérification avec StatusBadge
Utilise maintenant `verification_status` au lieu de `verified` boolean

#### B. Section Localisation complète
```jsx
<div className="modal-info-row">
  <span className="modal-label">📍 Localisation:</span>
  <span className="modal-value">
    {[
      modalFarm.location_region || modalFarm.region,
      modalFarm.location_department || modalFarm.department,
      modalFarm.location_country
    ].filter(Boolean).join(', ') || 'Non renseignée'}
  </span>
</div>

{modalFarm.address && (
  <div className="modal-info-row">
    <span className="modal-label">📮 Adresse:</span>
    <span className="modal-value">{modalFarm.address}</span>
  </div>
)}
```

#### C. Section Tokens visibles détaillée
```jsx
{modalFarm.tokens && modalFarm.tokens.filter(t => t.isVisible).length > 0 && (
  <div className="modal-section">
    <h3>💎 Tokens disponibles</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {modalFarm.tokens.filter(t => t.isVisible).map((token) => (
        <div key={token.tokenId} style={{...}}>
          <div>{farmTickers[token.tokenId] || token.ticker}</div>
          {token.purpose && <div>{token.purpose}</div>}
          <div>ID: {token.tokenId.substring(0, 16)}...</div>
        </div>
      ))}
    </div>
  </div>
)}
```

#### D. Nouveaux champs affichés
- ✅ `farm.services` (array) - Services proposés
- ✅ `farm.email` au lieu de `contactEmail`
- ✅ `farm.phone` - Numéro de téléphone avec lien `tel:`

#### E. Google Maps amélioré
```javascript
const getGoogleMapsLink = (farm) => {
  const location = [
    farm.address,
    farm.location_region || farm.region,
    farm.location_country || 'France'
  ].filter(Boolean).join(', ');
  const query = encodeURIComponent(location);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};
```

---

## 🎯 Résultat final

### Critères de visibilité dans l'annuaire
Une ferme est visible si:
1. ✅ `status = 'active'` (ferme publique)
2. ✅ Au moins 1 token avec `isVisible = true`

### Affichage des statuts de vérification
- ✅ `verified` → Badge vert "✅ Vérifié"
- ⏳ `pending` → Badge jaune "⏳ En attente"
- 💬 `info_requested` → Badge bleu "💬 Info demandée"
- 📋 `none` → Badge gris "📋 Aucun badge"

### Tokens affichés
- **Carte ferme:** Section gradient avec ticker + objectif
- **Modal détails:** Liste complète avec ID, ticker, et objectif de chaque token
- **Support multi-tokens:** Une ferme peut avoir plusieurs tokens visibles

### Données de localisation
- Support des nouveaux champs: `location_country`, `location_region`, `location_department`
- Fallback sur anciens champs: `country`, `region`, `department`
- Affichage de l'adresse complète: `address`

---

## ✅ Tests de validation

### À vérifier:
1. [ ] Les fermes `status='draft'` n'apparaissent PAS dans l'annuaire
2. [ ] Les fermes `status='active'` sans tokens visibles n'apparaissent PAS
3. [ ] Les fermes avec tokens `isVisible=false` n'apparaissent PAS
4. [ ] Les filtres géographiques fonctionnent avec les nouveaux champs
5. [ ] Les badges de vérification utilisent `verification_status` correctement
6. [ ] Tous les tokens visibles sont affichés dans la carte
7. [ ] La modal affiche toutes les informations (localisation, tokens, services, etc.)
8. [ ] Le lien Google Maps utilise les bonnes coordonnées

---

## 📚 Fichiers modifiés

1. ✅ `src/hooks/useFarms.js` - Filtrage des fermes visibles
2. ✅ `src/pages/DirectoryPage.jsx` - Adaptation au nouveau schéma DB
3. ✅ `src/components/UI.jsx` - Utilisation de StatusBadge (aucune modification)

**Total:** 2 fichiers modifiés, 0 erreurs de compilation
