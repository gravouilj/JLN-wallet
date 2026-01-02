// src/utils/wifUtils.js - WIF operations using ecash-lib

import * as ecc from 'ecash-lib';

/**
 * Convert hex private key to WIF format
 * @param {string} hex - Hex private key (64 characters)
 * @param {boolean} compressed - Whether to create compressed WIF (default: true)
 * @param {boolean} testnet - Whether to create testnet WIF (default: false)
 * @returns {string|null} WIF private key or null if conversion fails
 */
export const hexToWIF = (hex, compressed = true, testnet = false) => {
  try {
    if (!hex || typeof hex !== 'string') {
      return null;
    }

    // Validate hex format
    if (hex.length !== 64 || !/^[a-fA-F0-9]+$/.test(hex)) {
      return null;
    }

    // Convert hex to Uint8Array
    const privateKeyBytes = new Uint8Array(
      hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );

    // Create PrivKey from bytes
    const privKey = new ecc.PrivKey(privateKeyBytes);
    
    // Export to WIF (ecash-lib handles compression and network automatically)
    // For mainnet eCash: compressed keys start with 'K' or 'L'
    const wif = ecc.toWif(privKey, 'mainnet');
    
    return wif;
  } catch (error) {
    console.warn('Hex to WIF conversion failed:', error.message);
    return null;
  }
};

/**
 * Convert WIF to hex private key
 * @param {string} wif - WIF private key
 * @returns {string|null} Hex private key or null if conversion fails
 */
export const wifToHex = (wif) => {
  try {
    if (!wif || typeof wif !== 'string') {
      return null;
    }

    // Parse WIF to PrivKey
    const privKey = ecc.fromWif(wif, 'mainnet');
    
    // Convert to hex
    const hex = Array.from(privKey.bytesLE())
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hex;
  } catch (error) {
    console.warn('WIF to hex conversion failed:', error.message);
    return null;
  }
};

/**
 * Validate WIF (Wallet Import Format) private key
 * @param {string} wif - WIF private key to validate
 * @returns {boolean} True if valid WIF format
 */
export const isValidWIF = (wif) => {
  try {
    if (!wif || typeof wif !== 'string') {
      return false;
    }

    // Try to parse WIF - will throw if invalid
    ecc.fromWif(wif, 'mainnet');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get detailed information about a WIF key
 * @param {string} wif - WIF private key
 * @returns {object|null} WIF info object or null if invalid
 */
export const getWifInfo = (wif) => {
  try {
    if (!isValidWIF(wif)) {
      return null;
    }

    // Detect network and compression from WIF prefix
    const isTestnet = wif.startsWith('c') || wif.startsWith('9');
    const isCompressed = wif.length === 52 || wif.startsWith('c');

    return {
      network: isTestnet ? 'testnet' : 'mainnet',
      compressed: isCompressed,
      valid: true,
      format: isCompressed ? 'compressed' : 'uncompressed'
    };
  } catch (error) {
    console.warn('WIF info extraction failed:', error.message);
    return null;
  }
};

/**
 * Validate and convert WIF (legacy function)
 * @param {string} wif - WIF private key
 * @returns {object|null} Validation result with hex key
 */
export const validateAndConvert = (wif) => {
  if (!isValidWIF(wif)) {
    return null;
  }
  
  const hex = wifToHex(wif);
  const info = getWifInfo(wif);
  
  return {
    valid: true,
    hex,
    ...info
  };
};

// Direct exports for backward compatibility
export default {
  isValidWIF,
  wifToHex,
  hexToWIF,
  getWifInfo,
  validateAndConvert
};
