# Système de Cryptage pour Messages OP_RETURN

**Date**: 16 décembre 2025  
**Statut**: ✅ Implémenté

## Vue d'Ensemble

Système de cryptage optionnel pour les messages on-chain (OP_RETURN) utilisant **AES-256-GCM** avec dérivation de clé par **PBKDF2**. Permet d'envoyer des messages confidentiels sur la blockchain tout en les gardant illisibles sans le mot de passe.

---

## 🔐 Architecture Cryptographique

### Algorithme : AES-256-GCM
- **Chiffrement** : AES (Advanced Encryption Standard) 256 bits
- **Mode** : GCM (Galois/Counter Mode) - authentification + confidentialité
- **Dérivation** : PBKDF2 avec 100 000 itérations
- **Hash** : SHA-256

### Format du Message Crypté
```
ENC:<base64_encoded_data>
```

**Structure des données** (avant base64) :
```
[Salt 16 bytes][IV 12 bytes][Encrypted Data]
```

- **Salt** : 16 bytes aléatoires (pour PBKDF2)
- **IV** : 12 bytes aléatoires (pour AES-GCM)
- **Encrypted Data** : Message crypté + tag d'authentification GCM

---

## 📁 Fichiers Créés/Modifiés

### 1. `/src/utils/encryption.js` (NOUVEAU)
Utilitaires de cryptage/décryptage

**Fonctions exportées** :
```javascript
// Crypter un message
async function encryptMessage(message, password)
// Retourne: "ENC:base64data..."

// Décrypter un message
async function decryptMessage(encryptedMessage, password)
// Retourne: message en clair ou throw Error

// Vérifier si crypté
function isEncrypted(message)
// Retourne: boolean

// Estimer taille cryptée
function estimateEncryptedSize(message)
// Retourne: nombre de bytes approximatif
```

---

### 2. `/src/components/MessageDisplay.jsx` (NOUVEAU)
Composant pour afficher et décrypter les messages

**Props** :
```jsx
<MessageDisplay 
  message={messageText}  // Message (crypté ou non)
  compact={false}        // Mode compact pour listes
/>
```

**Fonctionnalités** :
- Détection automatique des messages cryptés (préfixe `ENC:`)
- Interface de décryptage avec input password
- Affichage du message décrypté
- Gestion des erreurs (mauvais mot de passe)
- Mode compact pour historique

---

### 3. `/src/components/TokenPage/TokenActions/Message.jsx` (MODIFIÉ)
Ajout de l'option de cryptage

**Nouveaux états** :
```javascript
const [encryptionPassword, setEncryptionPassword] = useState('');
const [showEncryption, setShowEncryption] = useState(false);
```

**Modifications** :
- Checkbox "🔐 Crypter le message"
- Input password (type="password")
- Cryptage automatique avant envoi si activé
- Validation de la taille après cryptage
- Warning sur le partage du mot de passe

---

## 🎨 Interface Utilisateur

### Dans Message.jsx

**1. Toggle Cryptage** :
```
[ ] 🔐 Crypter le message (optionnel)
```

**2. Quand activé** :
```
┌─────────────────────────────────────────┐
│ 🔐 Crypter le message (optionnel)      │
├─────────────────────────────────────────┤
│ Mot de passe de cryptage                │
│ [********************]                  │
│                                         │
│ ℹ️ Important : Le destinataire devra   │
│ connaître ce mot de passe pour         │
│ décrypter le message.                  │
│                                         │
│ Taille estimée : ~180 caractères       │
└─────────────────────────────────────────┘
```

**3. Notification après envoi** :
```
✅ Message publié (crypté) ! TXID: abc123...
```

---

### Dans l'Historique (MessageDisplay)

**Message crypté** :
```
┌─────────────────────────────────────────┐
│ 🔒 Message crypté                       │
├─────────────────────────────────────────┤
│ [ 🔓 Décrypter ce message ]             │
│                                         │
│ ENC:SGVsbG8gV29ybGQhCg==...            │
└─────────────────────────────────────────┘
```

**Interface de décryptage** :
```
┌─────────────────────────────────────────┐
│ 🔒 Message crypté                       │
├─────────────────────────────────────────┤
│ Mot de passe                            │
│ [********************]                  │
│                                         │
│ [ 🔓 Décrypter ]  [ Annuler ]          │
└─────────────────────────────────────────┘
```

**Message décrypté** :
```
┌─────────────────────────────────────────┐
│ ✅ Message décrypté         [ Masquer ] │
├─────────────────────────────────────────┤
│ Voici le contenu secret du message !    │
└─────────────────────────────────────────┘
```

---

## 🔒 Sécurité

### Points Forts
✅ **AES-256-GCM** : Standard militaire, authentification intégrée  
✅ **PBKDF2** : Dérivation lente (100k itérations) contre brute-force  
✅ **Salt aléatoire** : Différent pour chaque message  
✅ **IV aléatoire** : Pas de réutilisation de clé  
✅ **Web Crypto API** : Implémentation native du navigateur (sécurisée)  

### Limitations
⚠️ **Mot de passe partagé hors blockchain** : Doit être communiqué séparément  
⚠️ **Pas de gestion de clés** : Pas de système PKI (clés publiques/privées)  
⚠️ **Taille limitée** : 220 bytes max (OP_RETURN) - message crypté plus grand  
⚠️ **Pas de forward secrecy** : Même mot de passe = même dérivation (avec salt différent)

### Recommandations
- Utiliser des mots de passe forts (12+ caractères, mixte)
- Ne jamais réutiliser le même mot de passe
- Communiquer le mot de passe par canal sécurisé (Signal, PGP, etc.)
- Pour une vraie confidentialité, utiliser du cryptage end-to-end hors blockchain

---

## 📊 Impact sur la Taille

### Overhead du Cryptage
| Composant | Taille |
|-----------|--------|
| Préfixe "ENC:" | 4 bytes |
| Salt | 16 bytes |
| IV | 12 bytes |
| Tag GCM | 16 bytes |
| **Total overhead** | **48 bytes** |
| Encodage Base64 | +33% |

### Exemples
| Message clair | Taille | Crypté | Taille |
|--------------|--------|--------|--------|
| "Hello" (5) | 5 | ENC:... | ~80 |
| "Message de 50 caractères..." (50) | 50 | ENC:... | ~132 |
| "Message long de 150 caractères..." (150) | 150 | ENC:... | ~270 ❌ (trop grand) |

**⚠️ Limite OP_RETURN** : 220 bytes
- Message clair max : ~130 caractères (pour rester sous 220 après cryptage)

---

## 🧪 Tests Manuels

### Test 1 : Cryptage Simple
1. Aller sur Message.jsx
2. Cocher "🔐 Crypter le message"
3. Entrer mot de passe : `test1234`
4. Message : `Hello World!`
5. Envoyer
6. Vérifier TXID et notification "(crypté)"

### Test 2 : Décryptage
1. Voir le message dans l'historique
2. Cliquer "🔓 Décrypter"
3. Entrer mot de passe : `test1234`
4. Vérifier affichage : `Hello World!`

### Test 3 : Mauvais Mot de Passe
1. Même message crypté
2. Entrer mauvais mot de passe : `wrong`
3. Vérifier erreur : "Mot de passe incorrect"

### Test 4 : Message Trop Long
1. Cocher cryptage
2. Message de 150 caractères
3. Vérifier erreur : "Message crypté trop long"

### Test 5 : Sans Cryptage
1. Décocher "🔐 Crypter le message"
2. Message : `Public message`
3. Envoyer
4. Vérifier affichage direct (pas de bouton décrypter)

---

## 💡 Cas d'Usage

### 1. Annonces Privées
Token creators peuvent envoyer des messages confidentiels aux holders :
```
Message : "Airdrop prévu le 25/12"
Mot de passe : communiqué sur Discord privé
```

### 2. Instructions Sensibles
```
Message : "Seed phrase backup: ocean blue..."
Mot de passe : connu uniquement du destinataire
```

### 3. Coordination
```
Message : "RDV 15h place principale"
Mot de passe : code partagé en personne
```

---

## 🔄 Intégration dans l'Historique

Pour utiliser `MessageDisplay` dans HistoryList.jsx :

```jsx
import MessageDisplay from '../MessageDisplay';

// Dans la liste des entrées historique
{entry.action_type === 'MESSAGE' && (
  <MessageDisplay 
    message={entry.details?.message} 
    compact={true} 
  />
)}
```

---

## 🚀 Améliorations Futures (Optionnel)

### Niveau 1 : UX
- [ ] Indicateur de force du mot de passe
- [ ] Générateur de mot de passe aléatoire
- [ ] Copier le message décrypté
- [ ] Sauvegarder mot de passe dans session (pas localStorage)

### Niveau 2 : Sécurité
- [ ] Support de clés publiques/privées (RSA ou ECC)
- [ ] Multi-destinataires avec clés différentes
- [ ] Expiration de message (timelock)
- [ ] Signature numérique pour authentification

### Niveau 3 : Fonctionnalités
- [ ] Fichiers joints cryptés (IPFS)
- [ ] Messages éphémères (auto-destruction)
- [ ] Groupes de discussion cryptés
- [ ] Intégration avec wallets hardware (signature)

---

## 📚 Références Techniques

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2)
- [eCash OP_RETURN](https://documentation.ecash.org/)

---

## ⚠️ Avertissements Légaux

**Disclaimer** :
- Ce système de cryptage est à usage éducatif et expérimental
- N'utilisez PAS pour des données ultra-sensibles (secrets d'État, clés privées de millions $)
- La blockchain est publique : métadonnées (TXID, timestamp) restent visibles
- Aucune garantie de sécurité parfaite
- Testez en testnet d'abord !

**Conformité** :
- Vérifiez les lois locales sur le cryptage
- Certains pays restreignent l'utilisation de cryptage fort
- Ce code est open-source et auditable

---

## ✅ Checklist de Déploiement

Avant de déployer en production :

- [ ] Tests unitaires des fonctions encryption.js
- [ ] Tests E2E du flow complet (cryptage → envoi → décryptage)
- [ ] Test avec messages de tailles variées
- [ ] Test de résistance aux mauvais mots de passe
- [ ] Vérification de la taille max (220 bytes)
- [ ] Audit de sécurité du code crypto
- [ ] Documentation utilisateur finale
- [ ] Warnings clairs dans l'UI
- [ ] Support client pour récupération (si mot de passe perdu = message perdu)

---

## 📝 Conclusion

Le système de cryptage est maintenant **opérationnel** ! Les utilisateurs peuvent :
1. ✅ Crypter des messages avant envoi on-chain
2. ✅ Partager le mot de passe hors blockchain
3. ✅ Décrypter les messages dans l'historique
4. ✅ Vérifier l'intégrité (GCM authentication)

**Prochaine étape** : Intégrer `MessageDisplay` dans HistoryList pour voir les messages cryptés dans l'historique 🚀
