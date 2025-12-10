# 🔍 Debug Console Commands

## Vérifier l'état du wallet

Ouvrez la console du navigateur (F12) et copiez-collez ces commandes :

### 1. Vérifier le localStorage
```javascript
console.log('=== FARM WALLET STORAGE ===');
console.log('Mnemonic exists:', !!localStorage.getItem('farm-wallet-mnemonic'));
console.log('Favorite farms:', localStorage.getItem('farm-wallet-favorite-farms'));
console.log('Selected farm:', localStorage.getItem('farm-wallet-selected-farm'));
```

### 2. Forcer une reconnexion
```javascript
console.log('🔄 Forçage de reconnexion...');
window.location.reload();
```

### 3. Réinitialiser complètement le wallet (⚠️ ATTENTION : efface tout)
```javascript
console.log('⚠️ RESET TOTAL DU WALLET');
localStorage.removeItem('farm-wallet-mnemonic');
localStorage.removeItem('farm-wallet-favorite-farms');
localStorage.removeItem('farm-wallet-selected-farm');
window.location.reload();
```

### 4. Vérifier l'état des atoms Jotai
```javascript
// Dans la console, après avoir chargé la page
console.log('=== JOTAI ATOMS STATE ===');
// Le store Jotai n'est pas directement accessible, mais vous verrez les logs
// des hooks dans la console
```

## Logs à surveiller

Quand vous rechargez la page, vous devriez voir dans la console :

1. `🏗️ EcashWallet constructor called`
2. `✅ Wallet initialized - Address: ecash:qp...`
3. `🔍 useEcashWallet - Auto-init check:`
4. `🏠 Hook address extracted: ecash:qp...`
5. `📍 ADRESSE DASHBOARD: ecash:qp...` ou `📍 ADRESSE SETTINGS: ecash:qp...`

Si vous ne voyez pas ces logs dans l'ordre, c'est qu'il y a un problème d'initialisation.
