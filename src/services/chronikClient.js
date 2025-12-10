/**
 * Chronik Client Manager - Singleton with caching and fallback
 * Provides centralized Chronik client access with connection strategies
 */

import { ChronikClient } from 'chronik-client';

// Chronik URL stable (chronik-native2.fabien.cash fonctionne mieux en Codespaces)
const CHRONIK_URL = 'https://chronik-native2.fabien.cash';

// Fallback URLs publiques
const FALLBACK_URLS = [
  'https://chronik.be.cash/xec',
  'https://chronik.pay2.house/xec'
];

// Cache configuration
const CACHE_TTL = 30000; // 30 seconds
const TIMEOUT_MS = 10000; // 10 second timeout for connection attempts

class ChronikManager {
  constructor() {
    this.chronikClient = null;
    this.initPromise = null;
    this.blockchainInfoCache = null;
    this.blockchainInfoCacheTime = 0;
  }

  /**
   * Helper to wrap promises with timeout
   */
  async withTimeout(promise, timeoutMs = TIMEOUT_MS) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Initialize Chronik client with fallback strategy
   * Uses chronik-native2.fabien.cash as primary (better CORS handling)
   */
  async initializeChronik() {
    if (this.chronikClient) {
      return this.chronikClient;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log('🔄 Initializing Chronik client...');

      // Try primary URL first
      try {
        console.log(`  📡 Trying primary: ${CHRONIK_URL}...`);
        const client = new ChronikClient(CHRONIK_URL);
        
        // Test connection with genesis block
        const genesisBlock = await this.withTimeout(client.block(0), 5000);
        console.log(`  ✅ Connected to ${CHRONIK_URL} - Genesis: ${genesisBlock.blockInfo.hash.substring(0, 16)}...`);
        
        this.chronikClient = client;
        return client;
      } catch (err) {
        console.warn(`  ⚠️ Primary failed: ${err.message}, trying fallbacks...`);
      }

      // Try fallback URLs
      for (const url of FALLBACK_URLS) {
        try {
          console.log(`  📡 Trying fallback ${url}...`);
          const client = new ChronikClient(url);
          
          const genesisBlock = await this.withTimeout(client.block(0), 5000);
          console.log(`  ✅ Connected to ${url} - Genesis: ${genesisBlock.blockInfo.hash.substring(0, 16)}...`);
          
          this.chronikClient = client;
          return client;
        } catch (err) {
          console.warn(`  ⚠️ Failed to connect to ${url}:`, err.message);
        }
      }

      // All URLs failed
      const error = new Error(`Failed to connect to any Chronik instance. Tried: ${CHRONIK_URL}, ${FALLBACK_URLS.join(', ')}`);
      console.error('❌ Chronik initialization failed:', error.message);
      console.error('💡 Check your internet connection and firewall settings');
      throw error;
    })();

    return this.initPromise;
  }

  /**
   * Get Chronik client instance (lazy initialization)
   */
  async getClient() {
    if (!this.chronikClient) {
      await this.initializeChronik();
    }
    return this.chronikClient;
  }

  /**
   * Get blockchain info with caching
   */
  async getBlockchainInfo(forceRefresh = false) {
    const now = Date.now();

    // Return cached data if available and fresh
    if (
      !forceRefresh &&
      this.blockchainInfoCache &&
      now - this.blockchainInfoCacheTime < CACHE_TTL
    ) {
      return this.blockchainInfoCache;
    }

    try {
      const client = await this.getClient();
      const info = await this.withTimeout(client.blockchainInfo(), 5000);
      
      // Update cache
      this.blockchainInfoCache = info;
      this.blockchainInfoCacheTime = now;
      
      return info;
    } catch (error) {
      console.error('Failed to get blockchain info:', error.message);
      
      // Return stale cache if available
      if (this.blockchainInfoCache) {
        console.warn('Returning stale blockchain info from cache');
        return this.blockchainInfoCache;
      }
      
      throw error;
    }
  }

  /**
   * Check connection health
   */
  async checkConnection() {
    console.log('🔍 ChronikManager: Checking connection health...');
    try {
      const info = await this.getBlockchainInfo(true);
      console.log('✅ ChronikManager: Connection healthy, block height:', info.tipHeight);
      return {
        connected: true,
        blockHeight: info.tipHeight,
        error: null
      };
    } catch (error) {
      console.error('❌ ChronikManager: Connection check failed:', error.message);
      return {
        connected: false,
        blockHeight: 0,
        error: error.message
      };
    }
  }

  /**
   * Reset client (force reconnection)
   */
  reset() {
    this.chronikClient = null;
    this.initPromise = null;
    this.blockchainInfoCache = null;
    this.blockchainInfoCacheTime = 0;
  }
}

// Singleton instance
const chronikManager = new ChronikManager();

export default chronikManager;
export { ChronikManager };
