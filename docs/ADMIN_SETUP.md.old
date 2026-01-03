# 👑 Configuration Administrateur

Ce guide explique comment configurer l'accès administrateur à l'application.

---

## 🔐 Principe de Sécurité

L'accès administrateur est protégé par un **hash SHA-256** de votre adresse wallet eCash. Seul le hash est stocké dans la configuration, jamais l'adresse en clair.

**Avantages** :
- ✅ Aucune adresse admin visible dans le code source
- ✅ Protection contre les accès non autorisés
- ✅ Vérification côté client (pas de base de données requise)

---

## ⚙️ Configuration Rapide

### Étape 1 : Générer le Hash

Utilisez le script fourni avec votre adresse wallet eCash :

```bash
node scripts/generate-admin-hash.js ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy
```

**Sortie** :
```
✅ Hash généré avec succès !

📋 Adresse wallet:
  ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy

🔐 Hash SHA-256:
  a1b2c3d4e5f6...

📝 Ajoutez cette ligne dans votre fichier .env.local :

  VITE_ADMIN_HASH=a1b2c3d4e5f6...
```

### Étape 2 : Configurer .env.local

Créez ou modifiez le fichier `.env.local` à la racine du projet :

```dotenv
# Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon

# Admin (Hash SHA-256 de votre adresse wallet)
VITE_ADMIN_HASH=a1b2c3d4e5f6...
```

### Étape 3 : Redémarrer le Serveur

```bash
npm run dev
```

---

## ✅ Vérification

1. **Connectez votre wallet** avec l'adresse configurée
2. **Naviguez vers une page protégée** (ex: `/admin`)
3. **Vérifiez la console** : Vous devriez voir `👑 Mode ADMIN activé pour : ecash:...`

---

## 🚪 Accès au Dashboard Admin

Une fois configuré, l'administrateur a accès à :

### 📍 Routes Admin

- **`/admin`** - Dashboard principal
  - Onglet Vérifications : Gestion des profils de fermes
  - Onglet Support : Système de tickets
  - Onglet Paramètres : Configuration de l'application
  - Onglet Statistiques : Métriques et analytics

- **`/admin/verification`** - Page dédiée aux vérifications (legacy)

### 🎯 Fonctionnalités Admin

**Dans ManageTokenPage** :
- Bouton "Admin" visible uniquement pour l'admin
- Navigation directe vers `/admin`

**Dans AdminDashboard** :
- Gestion des demandes de vérification
- Système de tickets (créateurs/clients/signalements)
- Paramètres globaux de l'application
- Statistiques détaillées

---

## 🔧 Changement d'Administrateur

Pour changer l'adresse admin :

1. Générez un nouveau hash avec la nouvelle adresse
2. Mettez à jour `VITE_ADMIN_HASH` dans `.env.local`
3. Redémarrez le serveur

---

## ⚠️ Sécurité

### ✅ Bonnes Pratiques

- ✅ Ne committez **JAMAIS** le fichier `.env.local`
- ✅ Ajoutez `.env.local` dans `.gitignore`
- ✅ Ne partagez **JAMAIS** votre hash publiquement
- ✅ Utilisez une adresse dédiée pour l'administration

### ❌ À Éviter

- ❌ Ne stockez pas l'adresse admin en clair
- ❌ Ne partagez pas votre fichier `.env.local`
- ❌ N'utilisez pas la même adresse pour l'admin et les tests

---

## 🐛 Dépannage

### Problème : "Accès refusé. Vous devez être administrateur."

**Causes possibles** :
1. `VITE_ADMIN_HASH` non configuré dans `.env.local`
2. Hash incorrect (vérifiez que vous avez copié le hash complet)
3. Adresse wallet différente de celle utilisée pour générer le hash
4. Serveur non redémarré après modification du `.env.local`

**Solution** :
```bash
# 1. Vérifiez que .env.local existe et contient VITE_ADMIN_HASH
cat .env.local

# 2. Régénérez le hash avec votre adresse actuelle
node scripts/generate-admin-hash.js <votre-adresse>

# 3. Mettez à jour .env.local

# 4. Redémarrez le serveur
npm run dev
```

### Problème : Console affiche "Mode ADMIN activé" mais pas d'accès

**Cause** : Le hook `useAdmin` peut avoir un délai de chargement

**Solution** : Vérifiez que le composant attend `isChecking` avant d'afficher l'erreur

```jsx
const { isAdmin, isChecking } = useAdmin();

if (isChecking) {
  return <LoadingScreen />;
}

if (!isAdmin) {
  return <AccessDenied />;
}
```

---

## 📚 Ressources

- **Hook** : `src/hooks/useAdmin.js`
- **Dashboard** : `src/pages/AdminDashboard.jsx`
- **Script** : `scripts/generate-admin-hash.js`
- **Config** : `.env.example`

---

## 🎓 Comment ça marche ?

1. **Génération du Hash** :
   ```javascript
   SHA-256("ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy")
   // → "a1b2c3d4e5f6..."
   ```

2. **Stockage** :
   ```dotenv
   VITE_ADMIN_HASH=a1b2c3d4e5f6...
   ```

3. **Vérification** (dans le hook `useAdmin`) :
   ```javascript
   const userHash = await sha256(currentAddress);
   const isAdmin = userHash === ADMIN_HASH;
   ```

4. **Protection des Routes** :
   ```jsx
   <Route path="/admin" element={
     <AdminGateRoute>
       <AdminDashboard />
     </AdminGateRoute>
   } />
   ```

---

**Dernière mise à jour** : 15 Décembre 2025
