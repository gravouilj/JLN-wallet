/**
 * React Hook for Chronik WebSocket
 * Provides real-time updates for wallet transactions
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { 
  walletAtom, 
  walletConnectedAtom,
  balanceRefreshTriggerAtom,
  notificationAtom 
} from '../atoms';

// Conditional logging (only in development)
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);
const error = (...args) => console.error(...args);

/**
 * Hook to manage Chronik WebSocket connection
 * Subscribes to wallet address and triggers balance refresh on new transactions
 */
export const useChronikWebSocket = () => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const setBalanceRefreshTrigger = useSetAtom(balanceRefreshTriggerAtom);
  const setNotification = useSetAtom(notificationAtom);
  
  const wsRef = useRef(null);
  const subscribedAddressRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState(null);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((msg) => {
    log('📨 Chronik WebSocket message:', msg);

    // Handle different message types
    if (msg.type === 'Tx' || msg.type === 'AddedToMempool' || msg.type === 'Confirmed') {
      log('💰 Transaction detected! Refreshing balance...');
      
      // Show notification immediately
      setNotification({
        type: 'info',
        message: '💰 Nouvelle transaction détectée'
      });
      
      // Delay to ensure transaction is fully propagated in Chronik
      // Mempool transactions need time to be indexed
      setTimeout(() => {
        log('🔄 Triggering balance refresh (after 1.5s delay)...');
        setBalanceRefreshTrigger(Date.now());
      }, 1500);
      
    } else if (msg.type === 'BlockConnected') {
      log('⛓️ New block connected, refreshing balance...');
      setTimeout(() => {
        setBalanceRefreshTrigger(Date.now());
      }, 300);
    }
  }, [setBalanceRefreshTrigger, setNotification]);

  /**
   * Handle WebSocket reconnection
   */
  const handleReconnect = useCallback((e) => {
    reconnectAttemptsRef.current += 1;
    log('🔄 Chronik WebSocket reconnecting...', e, `(attempt ${reconnectAttemptsRef.current})`);
    
    setIsConnected(false);
    
    // Reset reconnect counter on successful reconnection
    if (reconnectAttemptsRef.current > 5) {
      error('⚠️ Multiple reconnection attempts, network may be unstable');
      setLastError('Connexion instable');
    }
  }, []);

  /**
   * Subscribe to wallet address
   */
  const subscribeToWallet = useCallback(async (ws, address) => {
    try {
      // Get script type and hash from wallet
      const scriptType = 'p2pkh';
      const scriptPayload = wallet.pkh ? Array.from(wallet.pkh).map(b => b.toString(16).padStart(2, '0')).join('') : null;
      
      if (!scriptPayload) {
        const errMsg = 'Cannot subscribe: wallet pkh not available';
        error('❌', errMsg);
        setLastError(errMsg);
        return;
      }

      log(`🔔 Subscribing to ${scriptType} script:`, scriptPayload);
      
      // Subscribe to script (more reliable than address)
      ws.subscribeToScript(scriptType, scriptPayload);
      
      subscribedAddressRef.current = address;
      log('✅ Subscribed to wallet address:', address);
      setLastError(null);
    } catch (err) {
      error('❌ Failed to subscribe to wallet:', err);
      setLastError(err.message || 'Subscription failed');
    }
  }, [wallet]);

  /**
   * Unsubscribe from previous address
   */
  const unsubscribeFromPrevious = useCallback(async (ws) => {
    if (subscribedAddressRef.current && wallet?.pkh) {
      try {
        const scriptType = 'p2pkh';
        const scriptPayload = Array.from(wallet.pkh).map(b => b.toString(16).padStart(2, '0')).join('');
        
        log(`🔕 Unsubscribing from ${scriptType} script:`, scriptPayload);
        ws.unsubscribeFromScript(scriptType, scriptPayload);
        subscribedAddressRef.current = null;
      } catch (err) {
        console.warn('⚠️ Failed to unsubscribe:', err);
      }
    }
  }, [wallet]);

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!wallet || !walletConnected) {
      // Cleanup if wallet disconnected
      if (wsRef.current) {
        log('👋 Closing Chronik WebSocket (wallet disconnected)');
        unsubscribeFromPrevious(wsRef.current);
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
        setLastError(null);
      }
      return;
    }

    // Initialize WebSocket
    const initWebSocket = async () => {
      try {
        // Wait for wallet to be ready
        await wallet.chronikInitPromise;

        const chronik = wallet.chronik;
        if (!chronik) {
          const errMsg = 'Chronik client not available';
          error('❌', errMsg);
          setLastError(errMsg);
          setIsConnected(false);
          return;
        }

        log('🚀 Initializing Chronik WebSocket...');

        // Create WebSocket connection
        const ws = chronik.ws({
          onMessage: handleMessage,
          onReconnect: handleReconnect,
          // Enable keep-alive to maintain connection
          keepAlive: true,
        });

        // Wait for WebSocket to open
        await ws.waitForOpen();
        log('✅ Chronik WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection

        // Subscribe to blocks for general updates
        ws.subscribeToBlocks();
        log('✅ Subscribed to blocks');

        // Subscribe to wallet address
        const address = wallet.getAddress();
        await subscribeToWallet(ws, address);

        // Store WebSocket reference
        wsRef.current = ws;

        log('🎉 Chronik WebSocket is now active! Real-time updates enabled.');
        log('💡 Send XEC to your address to see instant balance updates!');

      } catch (err) {
        error('❌ Failed to initialize Chronik WebSocket:', err);
        setLastError(err.message || 'Initialization failed');
        setIsConnected(false);
      }
    };

    initWebSocket();

    // Cleanup on unmount or wallet change
    return () => {
      if (wsRef.current) {
        log('🧹 Cleaning up Chronik WebSocket');
        unsubscribeFromPrevious(wsRef.current);
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
        setLastError(null);
      }
    };
  }, [wallet, walletConnected, handleMessage, handleReconnect, subscribeToWallet, unsubscribeFromPrevious]);

  return {
    isConnected,
    lastError,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
};

export default useChronikWebSocket;
