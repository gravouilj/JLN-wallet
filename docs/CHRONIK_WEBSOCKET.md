# Chronik WebSocket - Mises à jour en temps réel

## Vue d'ensemble

Le wallet utilise maintenant **Chronik WebSocket** pour recevoir des mises à jour instantanées des transactions, au lieu de faire du polling toutes les 10 secondes.

## Architecture

### 1. Hook `useChronikWebSocket`
**Fichier:** `src/hooks/useChronikWebSocket.ts`

Ce hook gère la connexion WebSocket avec Chronik et s'occupe de :
- ✅ Connexion automatique au WebSocket Chronik
- ✅ Souscription à l'adresse du wallet (via script p2pkh)
- ✅ Souscription aux nouveaux blocs
- ✅ Reconnexion automatique en cas de déconnexion
- ✅ Keep-alive pour maintenir la connexion

### 2. Intégration dans l'application
**Fichier:** `src/App.tsx`

Le hook est initialisé au niveau global de l'application :
```typescript
function App() {
  const { walletConnected, loading, initializeWallet } = useEcashWallet();
  
  // Initialize Chronik WebSocket for real-time balance updates
  useChronikWebSocket();
  
  // ... rest of app
}
```

### 3. Flux de données

```
┌─────────────────┐
│  Chronik Node   │
│   (Blockchain)  │
└────────┬────────┘
         │
         │ WebSocket
         │ (Real-time)
         ▼
┌─────────────────────┐
│ useChronikWebSocket │
│   (Subscribe to     │
│   wallet address)   │
└────────┬────────────┘
         │
         │ Trigger
         ▼
┌─────────────────────┐
│ balanceRefresh      │
│ TriggerAtom         │
└────────┬────────────┘
         │
         │ useEffect
         ▼
┌─────────────────────┐
│   useBalance()      │
│   fetchBalance()    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   UI Updates        │
│   (Balance shown)   │
└─────────────────────┘
```

## Types de messages WebSocket écoutés

### 1. **Transaction Messages**
- `Tx` - Nouvelle transaction
- `AddedToMempool` - Transaction ajoutée au mempool
- `Confirmed` - Transaction confirmée

**Action:** Déclenche un refresh du solde + notification utilisateur

### 2. **Block Messages**
- `BlockConnected` - Nouveau bloc miné

**Action:** Déclenche un refresh du solde

## Avantages

### ✅ Avant (Polling)
- ⏱️ Délai de 0-10 secondes avant de voir une nouvelle transaction
- 📡 Requête HTTP toutes les 10 secondes (même sans activité)
- 🔋 Consomme de la bande passante inutilement

### ✅ Après (WebSocket)
- ⚡ Mise à jour **instantanée** dès qu'une transaction arrive
- 📡 Une seule connexion persistante (économie de ressources)
- 🔔 Notification immédiate à l'utilisateur
- 🔄 Reconnexion automatique en cas de problème

## Configuration WebSocket

```javascript
const ws = chronik.ws({
  onMessage: handleMessage,      // Gère les messages reçus
  onReconnect: handleReconnect,  // Gère les reconnexions
  keepAlive: true,               // Maintient la connexion active
});

// Souscriptions
ws.subscribeToBlocks();                           // Nouveaux blocs
ws.subscribeToScript('p2pkh', scriptPayload);    // Transactions du wallet
```

## Souscription à l'adresse

Le WebSocket souscrit au **script p2pkh** du wallet, pas directement à l'adresse. C'est plus fiable et efficient.

**Exemple:**
```javascript
const scriptType = 'p2pkh';
const scriptPayload = wallet.pkh (as hex); // Public Key Hash
ws.subscribeToScript(scriptType, scriptPayload);
```

## Cycle de vie

### Initialisation
1. Wallet se connecte
2. Hook détecte `walletConnected = true`
3. Création de la connexion WebSocket
4. Attente de l'ouverture : `await ws.waitForOpen()`
5. Souscription aux blocs et au script du wallet

### Utilisation normale
- WebSocket écoute en arrière-plan
- Reçoit les messages en temps réel
- Déclenche `balanceRefreshTriggerAtom` quand nécessaire
- `useBalance` hook réagit et fetch les nouvelles données

### Déconnexion
1. Utilisateur déconnecte le wallet
2. Hook détecte `walletConnected = false`
3. Désinscription du script
4. Fermeture du WebSocket
5. Nettoyage des références

## Gestion des erreurs

- **Échec de connexion :** Logged dans la console, n'empêche pas l'application de fonctionner
- **Déconnexion :** Reconnexion automatique via `onReconnect`
- **Keep-alive :** Ping régulier pour éviter les timeouts

## Compatibilité

✅ Compatible avec la dernière version de `chronik-client` (v3.6.1)
✅ Fonctionne dans le navigateur (pas besoin de Node.js)
✅ Support des reconnexions automatiques
✅ Keep-alive côté serveur (depuis chronik-client 0.10.1)

## Notifications

Quand une transaction est détectée :
```javascript
setNotification({
  type: 'info',
  message: '💰 Nouvelle transaction détectée'
});
```

## Logs de débogage

Les logs dans la console vous permettent de suivre l'activité :
- `🚀 Initializing Chronik WebSocket...`
- `✅ Chronik WebSocket connected`
- `🔔 Subscribing to p2pkh script: [hash]`
- `📨 Chronik WebSocket message: [msg]`
- `💰 Transaction detected! Refreshing balance...`
- `🔄 Chronik WebSocket reconnecting...`

## Testing

Pour tester que ça fonctionne :

1. **Connecter votre wallet**
2. **Copier votre adresse eCash**
3. **Envoyer des XEC à cette adresse** (depuis un autre wallet ou un faucet)
4. **Observer :**
   - Message dans la console : `💰 Transaction detected!`
   - Notification en haut de l'écran
   - Solde se met à jour automatiquement

## Ressources

- [Chronik Client Documentation](https://www.npmjs.com/package/chronik-client)
- [eCash WebSocket API](https://chronik.fabien.cash/)
- [Bitcoin ABC Chronik](https://github.com/bitcoin-abc/bitcoin-abc/tree/main/chronik)
