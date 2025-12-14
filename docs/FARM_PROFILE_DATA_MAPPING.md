# Mapping des Données - Composants Farm ↔ DB ↔ Affichage

**Date:** 14 décembre 2025  
**Objectif:** Documenter le mapping complet entre les onglets de ManageFarmPage, la base de données Supabase, et l'affichage dans FarmProfileCard/Modal

---

## 🗺️ LocationTab → DB → Affichage

### Onglet LocationTab (Edition)

**Champs dans le formulaire:**
```jsx
formData.locationCountry    // Pays * (select)
formData.locationRegion     // Région * (text)
formData.locationDepartment // Département * (text)
formData.city               // Ville * (text)
formData.postalCode         // Code postal * (text)
formData.streetAddress      // Adresse de la rue * (text)
formData.addressComplement  // Complément d'adresse (text, optionnel)
```

**Champs obligatoires (*):**
- Pays
- Région
- Département
- Ville
- Code postal
- Adresse de la rue

### Base de Données Supabase

**Table `farms`:**
```sql
location_country TEXT      -- Pays
location_region TEXT       -- Région
location_department TEXT   -- Département
city TEXT                  -- Ville
postal_code TEXT           -- Code postal
street_address TEXT        -- Adresse de la rue
address_complement TEXT    -- Complément d'adresse
```

### Affichage Public (FarmProfileCard)

**Carte:**
```jsx
🇫🇷 {farm.location_country}  // Drapeau du pays
📍 {farm.city}                // Badge ville
📮 {dept}                     // Badge département (si France: 2 premiers chiffres du code postal)
🏛️ {farm.location_department} // Badge département (si autre pays)
```

**Logique:**
- Si `location_country === 'France'` → Afficher badge `📮 {2 premiers chiffres de postal_code}`
- Sinon → Afficher badge `🏛️ {location_department}`

### Affichage Public (FarmProfileModal)

**Modal:**
```jsx
🇫🇷 {farm.location_country}     // Drapeau
🗺️ {farm.location_region}       // Badge région
📮 {dept}                        // Badge code département (si France)
🏛️ {farm.location_department}   // Badge département (si autre pays)
📍 {farm.city}                   // Badge ville
```

**Section Contact → Adresse complète:**
```jsx
📮 {farm.street_address}
   {farm.address_complement}
   {farm.postal_code} {farm.city}
   {farm.location_department}, {farm.location_region}
   {farm.location_country}
```

---

## 🔐 VerificationTab → DB → Affichage

### Onglet VerificationTab (Edition)

**Champs avec privacy toggle:**
```jsx
formData.email                        // Email * (requis pour vérification)
privacy.hideEmail                     // Toggle visibilité email

formData.phone                        // Téléphone * (requis)
privacy.hidePhone                     // Toggle visibilité téléphone

formData.companyid                    // SIRET/Company ID * (requis)
privacy.hideCompanyID                 // Toggle visibilité SIRET

formData.legalRepresentative          // Représentant légal (optionnel)
privacy.hideLegalRep                  // Toggle visibilité représentant
```

**Mapping JS:**
```jsx
// État privacy
const [privacy, setPrivacy] = useState({
  hideEmail: false,
  hidePhone: false,
  hideCompanyID: false,    // ⚠️ Ancien nom: hideSiret
  hideLegalRep: false
});

// Fonction handlePrivacyChange
handlePrivacyChange('hideCompanyID', !val)  // Utiliser hideCompanyID
```

### Base de Données Supabase

**Table `farms` → Colonne `certifications` (JSONB):**
```json
{
  "siret": "12345678901234",
  "siret_link": "https://...",
  "legal_representative": "Jean Dupont",
  "hide_email": false,
  "hide_phone": false,
  "hide_company_id": false,    // ⚠️ Nouveau nom (remplace hide_siret)
  "hide_legal_rep": false
}
```

**Colonnes top-level:**
```sql
email TEXT NOT NULL
phone TEXT NOT NULL
```

### Affichage Public (FarmProfileModal)

**Lecture des flags depuis DB:**
```jsx
const certifications = farm.certifications || {};

// Privacy flags depuis certifications JSONB
const hideEmail = certifications.hide_email || false;
const hidePhone = certifications.hide_phone || false;
const hideLegalRep = certifications.hide_legal_rep || false;
const hideCompanyID = certifications.hide_company_id || certifications.hide_siret || false;
```

**Section Contact:**
```jsx
{farm.email && !hideEmail && (
  <p>📧 <a href={`mailto:${farm.email}`}>{farm.email}</a></p>
)}

{farm.phone && !hidePhone && (
  <p>☎️ {farm.phone}</p>
)}
```

**Section À Propos:**
```jsx
{!hideLegalRep && certifications.legal_representative && (
  <p><strong>👤 Représentant légal:</strong> {certifications.legal_representative}</p>
)}

{!hideCompanyID && certifications.siret && (
  <p>
    <strong>🏢 N° d'entreprise:</strong> {certifications.siret}
    {certifications.siret_link && (
      <a href={certifications.siret_link} target="_blank">🔗 Vérifier</a>
    )}
  </p>
)}
```

---

## 💎 Tokens → DB → Affichage

### Base de Données

**Table `farms` → Colonne `tokens` (JSONB Array):**
```json
[
  {
    "tokenId": "abc123...",
    "ticker": "FARM",
    "name": "Token Ferme",
    "purpose": "Points de fidélité",
    "counterpart": "Réductions sur produits",
    "isVisible": true
  }
]
```

### Affichage Public (FarmProfileCard)

**Section Tokens:**
```jsx
{visibleTokens.length > 0 && (
  <div>
    💎 {visibleTokens.length === 1 ? 'Jeton disponible' : `${visibleTokens.length} Jetons disponibles`}
    
    {visibleTokens.map(token => (
      <div>
        {farmTickers[token.tokenId] || token.ticker || 'Jeton'}
        {token.name && ` - ${token.name}`}
      </div>
    ))}
  </div>
)}
```

### Affichage Public (FarmProfileModal)

**Section Tokens (Expandable):**
```jsx
{visibleTokens.length > 0 && (
  <div>
    <h3>💎 {visibleTokens.length === 1 ? 'Jeton disponible' : `${visibleTokens.length} Jetons disponibles`}</h3>
    
    {visibleTokens.map(token => (
      <div onClick={() => toggleTokenExpand(token.tokenId)}>
        <div>{farmTickers[token.tokenId] || token.ticker || 'Jeton'}</div>
        {token.name && <div>{token.name}</div>}
        
        {isExpanded && (
          <>
            {token.purpose && <div>🎯 Objectif: {token.purpose}</div>}
            {token.counterpart && <div>🎁 Contrepartie: {token.counterpart}</div>}
          </>
        )}
      </div>
    ))}
  </div>
)}
```

---

## 📋 Résumé des Changements

### ✅ LocationTab
- **Ajouté:** Astérisques (*) sur Région, Département, Ville, Code postal
- **Corrigé:** Mapping `formData.locationCountry/Region/Department` ↔ `location_country/region/department` (DB)
- **Résultat:** Les champs Pays/Région/Département s'enregistrent maintenant correctement

### ✅ VerificationTab
- **Changé:** `privacy.hideSiret` → `privacy.hideCompanyID`
- **Changé:** `handlePrivacyChange('hideSiret', ...)` → `handlePrivacyChange('hideCompanyID', ...)`
- **Résultat:** Cohérence avec le nom DB `hide_company_id`

### ✅ ManageFarmPage
- **Ajouté:** `locationCountry`, `locationRegion`, `locationDepartment` dans `formData` initial
- **Corrigé:** Chargement depuis DB → `farm.location_country/region/department` vers `formData`
- **Corrigé:** Sauvegarde vers DB → `formData.locationCountry/Region/Department` vers `location_country/region/department`
- **Changé:** `privacy.hideSiret` → `privacy.hideCompanyID` dans tout le fichier
- **Changé:** Sauvegarde `hide_siret` → `hide_company_id` dans certifications JSONB
- **Résultat:** Mapping complet entre formulaire ↔ DB

### ✅ FarmProfileCard
- **Corrigé:** Extraction département FR depuis `farm.postal_code` au lieu de `farm.address`
- **Ajouté:** Condition `location_country === 'France'` pour afficher `📮 frZipCode` ou `🏛️ department`
- **Résultat:** Affichage correct selon le pays

### ✅ FarmProfileModal
- **Corrigé:** Privacy flags lus depuis `certifications.hide_email/phone/company_id/legal_rep`
- **Ajouté:** Fallback `hide_company_id || hide_siret` pour compatibilité
- **Corrigé:** Extraction département FR depuis `farm.postal_code`
- **Ajouté:** Ordre tags: Drapeau → Région → Département/ZIP (si FR) → Ville
- **Résultat:** Privacy toggle fonctionne maintenant correctement

---

## 🧪 Tests à Effectuer

### LocationTab:
- [ ] Remplir tous les champs de localisation
- [ ] Sauvegarder
- [ ] Vérifier dans Supabase: `location_country`, `location_region`, `location_department`, `city`, `postal_code` sont bien remplis
- [ ] Vérifier affichage dans DirectoryPage: drapeau + ville + département/ZIP correct

### VerificationTab:
- [ ] Cocher/décocher "Masquer Email" → Sauvegarder
- [ ] Vérifier dans Supabase: `certifications.hide_email` = true/false
- [ ] Vérifier affichage dans FarmProfileModal: Email masqué/affiché selon toggle
- [ ] Répéter pour Phone, CompanyID, LegalRep

### FarmProfileCard:
- [ ] Ferme France: Vérifier badge `📮 {2 premiers chiffres code postal}`
- [ ] Ferme Belgique: Vérifier badge `🏛️ {location_department}`
- [ ] Texte en français: "Jeton disponible" / "X Jetons disponibles"

### FarmProfileModal:
- [ ] Tags ordre correct: Drapeau → Région → Dept/ZIP → Ville
- [ ] Section tokens: "Jeton disponible" en français
- [ ] Click sur token: Affiche Objectif + Contrepartie
- [ ] Privacy: Email/Phone/CompanyID/LegalRep masqués selon flags
- [ ] Liens certifications cliquables

---

## 📚 Références

- **ManageFarmPage:** [src/pages/ManageFarmPage.jsx](../src/pages/ManageFarmPage.jsx)
- **LocationTab:** [src/components/Farm/LocationTab.jsx](../src/components/Farm/LocationTab.jsx)
- **VerificationTab:** [src/components/Farm/VerificationTab.jsx](../src/components/Farm/VerificationTab.jsx)
- **FarmProfileCard:** [src/components/FarmProfile/FarmProfileCard.jsx](../src/components/FarmProfile/FarmProfileCard.jsx)
- **FarmProfileModal:** [src/components/FarmProfile/FarmProfileModal.jsx](../src/components/FarmProfile/FarmProfileModal.jsx)
- **Schéma DB:** [docs/SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md)
