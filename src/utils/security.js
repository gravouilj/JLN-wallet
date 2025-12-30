// src/utils/security.js

// Configuration de sécurité standard
const CONFIG = {
  algo: 'AES-GCM',
  length: 256,
  kdf: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 100000, // Suffisant pour le web, ralentit les attaques brute-force
  saltLength: 16
};

// Convertisseurs Utilitaires (ArrayBuffer <-> Base64)
const buff_to_base64 = (buff) => btoa(String.fromCharCode.apply(null, new Uint8Array(buff)));
const base64_to_buff = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

/**
 * Dérive une clé cryptographique à partir d'un mot de passe et d'un sel
 */
async function getKeyMaterial(password) {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: CONFIG.kdf },
    false,
    ["deriveBits", "deriveKey"]
  );
}

async function deriveKey(keyMaterial, salt) {
  return window.crypto.subtle.deriveKey(
    {
      name: CONFIG.kdf,
      salt: salt,
      iterations: CONFIG.iterations,
      hash: CONFIG.hash
    },
    keyMaterial,
    { name: CONFIG.algo, length: CONFIG.length },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Chiffre des données sensibles (ex: mnemonic) avec un mot de passe
 */
export async function encryptWalletData(sensitiveData, password) {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(CONFIG.saltLength));
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV standard pour GCM
    
    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);
    
    const encodedData = new TextEncoder().encode(sensitiveData);
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: CONFIG.algo, iv: iv },
      key,
      encodedData
    );

    // On retourne un objet JSON stringifié contenant tout ce qu'il faut pour déchiffrer (sauf le mdp)
    return JSON.stringify({
      salt: buff_to_base64(salt),
      iv: buff_to_base64(iv),
      ciphertext: buff_to_base64(encryptedContent)
    });
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Impossible de sécuriser le portefeuille.");
  }
}

/**
 * Déchiffre les données avec le mot de passe
 */
export async function decryptWalletData(encryptedStorageString, password) {
  try {
    const data = JSON.parse(encryptedStorageString);
    const salt = base64_to_buff(data.salt);
    const iv = base64_to_buff(data.iv);
    const ciphertext = base64_to_buff(data.ciphertext);

    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: CONFIG.algo, iv: iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    // Si le déchiffrement échoue, c'est souvent un mauvais mot de passe
    throw new Error("Mot de passe incorrect ou données corrompues.");
  }
}