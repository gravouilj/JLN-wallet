# 📇 Guide d'Utilisation - Carnet d'Adresses

## 🎯 À quoi ça sert ?

Le carnet d'adresses vous permet de **sauvegarder des noms personnalisés** pour les adresses eCash de vos contacts. Au lieu de voir `ecash:qq7urqsxn7v3dxn8ufj5jwzugfsjvf3x0c8utpvz0p`, vous verrez **"Alice"** ! 👤

---

## 🚀 Démarrage rapide

### 1. Sauvegarder un contact depuis l'Airdrop

1. **Calculez les détenteurs** dans l'onglet Airdrop
2. Trouvez une adresse que vous voulez mémoriser
3. Cliquez sur **"💾 Sauvegarder dans le carnet"**
4. Entrez un nom (ex: "Alice", "Bob", "Partenaire XYZ")
5. Validez avec **✅** ou appuyez sur **Enter**

✨ **Magie !** Le nom s'affiche instantanément et sera mémorisé pour tous les futurs calculs.

### 2. Voir le carnet d'adresses du jeton

1. Sous le bouton "Distribuer maintenant"
2. Cliquez sur **"📇 Afficher le carnet d'adresses du jeton"**
3. Vous voyez tous les contacts enregistrés pour ce jeton
4. Cliquez sur un nom pour copier son adresse

### 3. Gérer tous vos contacts

1. Allez sur **ManageTokenPage** (page de gestion des tokens)
2. Cliquez sur **"👁️ Afficher"** dans la section "Carnet d'Adresses Complet"
3. Vous pouvez :
   - 🔍 **Rechercher** par nom ou adresse
   - ➕ **Ajouter** de nouveaux contacts
   - ✏️ **Modifier** le nom d'un contact
   - 🗑️ **Supprimer** un contact
   - 📥 **Exporter** tous vos contacts en JSON
   - 📤 **Importer** des contacts depuis un fichier JSON

---

## 📋 Fonctionnalités détaillées

### Dans les résultats d'Airdrop

#### Avant (sans carnet)
```
ecash:qq7urqsxn7v3dxn8ufj5jwzugfsjvf3x0c8utpvz0p
💰 1,000 jetons
+ 10 XEC
```

#### Après (avec carnet)
```
👤 Alice  ← Nom enregistré dans le carnet
ecash:qq7urqsxn7v3dxn8ufj5jwzugfsjvf3x0c8utpvz0p  ← Cliquer pour copier
💰 1,000 jetons
+ 10 XEC

[🗑️ Retirer du carnet]  ← Supprimer ce contact
```

### Actions disponibles

| Action | Icône | Description |
|--------|-------|-------------|
| **Copier l'adresse** | 📋 | Copie l'adresse complète dans le presse-papier |
| **Sauvegarder** | 💾 | Enregistre l'adresse avec un nom personnalisé |
| **Modifier** | ✏️ | Change le nom d'un contact existant |
| **Supprimer** | 🗑️ | Retire le contact du carnet |
| **Exporter** | 📥 | Télécharge tous vos contacts en JSON |
| **Importer** | 📤 | Charge des contacts depuis un fichier JSON |

---

## 💡 Cas d'usage pratiques

### 1. Identifier vos VIP
Vous faites régulièrement des airdrops à vos plus gros détenteurs ? Enregistrez-les comme "VIP Alice", "VIP Bob", etc. Vous les identifierez instantanément lors des prochains calculs !

### 2. Suivre vos partenaires
Vous avez des partenaires commerciaux qui détiennent votre token ? Enregistrez-les avec leurs noms d'entreprise pour un suivi facile.

### 3. Gérer une communauté
Vous connaissez personnellement certains de vos détenteurs ? Ajoutez leurs pseudos ou vrais noms pour créer un lien plus personnel.

### 4. Backup de vos contacts
Exportez régulièrement votre carnet en JSON pour avoir une sauvegarde. Si vous changez d'appareil ou réinstallez votre navigateur, vous pourrez réimporter tous vos contacts en 1 clic !

---

## 🔐 Sécurité & Confidentialité

### Où sont stockées mes données ?
- **LocalStorage** de votre navigateur (sur votre appareil uniquement)
- **Aucune donnée** n'est envoyée à un serveur externe
- **Vous avez le contrôle total** de vos contacts

### Que se passe-t-il si je nettoie mes données de navigation ?
- ⚠️ Vos contacts seront **supprimés** si vous effacez le localStorage
- 💡 **Solution** : Exportez régulièrement vos contacts en JSON !
- 📥 Vous pourrez les réimporter en 1 clic après réinstallation

### Mes contacts sont-ils synchronisés entre appareils ?
- ❌ **Non, pas encore** (stockage local uniquement)
- 🔜 **Bientôt** : Option Supabase pour synchronisation cloud
- 📱 **Pour l'instant** : Exportez/importez manuellement entre appareils

---

## 🛠️ Dépannage

### "Adresse eCash invalide" quand j'ajoute un contact
➡️ **Solution** : Vérifiez que l'adresse commence bien par `ecash:`

### Je ne vois pas mon contact dans les résultats d'Airdrop
➡️ **Solutions** :
1. Vérifiez que l'adresse est exactement la même (copier-coller recommandé)
2. Recalculez les détenteurs pour rafraîchir l'affichage
3. Vérifiez que le contact est bien enregistré dans le carnet du jeton

### Mon carnet d'adresses est vide après un refresh
➡️ **Causes possibles** :
1. Nettoyage manuel du localStorage
2. Mode navigation privée (les données ne persistent pas)
3. Extensions de navigateur qui nettoient le stockage

➡️ **Solution** : Importez votre dernier backup JSON

### Je veux transférer mes contacts sur un autre ordinateur
➡️ **Solution** :
1. Sur l'ordinateur source : Cliquez sur **📥 Exporter**
2. Transférez le fichier `.json` sur le nouvel ordinateur
3. Sur le nouvel ordinateur : Cliquez sur **📤 Importer** et sélectionnez le fichier

---

## 📊 Limites techniques

| Limite | Valeur | Note |
|--------|--------|------|
| **Nombre max de contacts** | ~10,000 | Limité par la taille du localStorage (~5-10MB) |
| **Longueur du nom** | Illimitée | Mais restez raisonnable pour l'affichage ! |
| **Caractères spéciaux** | ✅ Supportés | Emojis, accents, tout est OK |
| **Synchronisation cloud** | ❌ Pas encore | Prévu dans une future mise à jour |

---

## 🎓 Astuces d'expert

### 1. Utilisez des préfixes pour organiser
```
VIP Alice
VIP Bob
PARTENAIRE CompanyXYZ
TEAM John
TEAM Sarah
```

### 2. Exportez régulièrement (une fois par semaine)
- Créez un dossier "Backups Carnet d'Adresses"
- Exportez avec un nom daté : `contacts_2025-12-16.json`

### 3. Dupliquez les contacts importants
Si vous utilisez plusieurs tokens avec les mêmes personnes, enregistrez-les dans chaque carnet de token. Vous les retrouverez plus facilement !

### 4. Recherche rapide
Dans le carnet global, tapez quelques lettres du nom ou de l'adresse pour filtrer instantanément.

---

## ❓ FAQ

### Q: Puis-je avoir le même nom pour deux adresses différentes ?
**R:** Oui ! Les noms ne sont pas uniques. Vous pouvez avoir "Alice" pour plusieurs adresses si vous voulez.

### Q: Puis-je associer un contact à plusieurs tokens ?
**R:** Pas directement. Pour l'instant, un contact est lié à un token OU global (tokenId = null). Mais vous pouvez créer le même contact plusieurs fois avec des tokenId différents.

### Q: Le fichier JSON exporté est-il sécurisé ?
**R:** Le fichier contient vos adresses eCash et les noms. Il ne contient **AUCUNE clé privée** ni information sensible. Mais gardez-le confidentiel si vous ne voulez pas que d'autres voient vos contacts.

### Q: Combien de temps prend l'import d'un gros fichier ?
**R:** Quasi-instantané ! Même avec 1000+ contacts, l'import prend moins d'une seconde.

### Q: Puis-je importer des contacts créés par quelqu'un d'autre ?
**R:** Oui ! Le format JSON est universel. Vous pouvez partager vos contacts avec d'autres utilisateurs de JLN Wallet.

---

## 🆘 Support

### Besoin d'aide ?
- 📖 **Documentation complète** : Voir `ADDRESS_BOOK_SYSTEM.md`
- 🐛 **Bug ou problème** : Ouvrez une issue GitHub
- 💬 **Questions** : Contactez le support via les canaux habituels

### Suggestions d'amélioration ?
Vos retours sont précieux ! N'hésitez pas à proposer de nouvelles fonctionnalités.

---

**Version** : 1.0  
**Dernière mise à jour** : 16 décembre 2025  
**Status** : ✅ Stable et en production

---

🎉 **Profitez de votre nouveau carnet d'adresses !** 🎉
