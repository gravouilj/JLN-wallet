// src/utils/security.ts

interface SecurityConfig {
  algo: string;
  length: number;
  kdf: string;
  hash: string;
  iterations: number;
  saltLength: number;
}

const CONFIG: SecurityConfig = {
  algo: 'AES-GCM',
  length: 256,
  kdf: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 100000,
  saltLength: 16
};

// --- Convertisseurs Typés ---

const buff_to_base64 = (buff: Uint8Array): string => {
  let binary = '';
  const len = buff.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buff[i]);
  }
  return btoa(binary);
};

const base64_to_buff = (b64: string): Uint8Array => {
  const binary_string = atob(b64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

/**
 * Dérive une clé cryptographique
 */
async function getKeyMaterial(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: CONFIG.kdf },
    false,
    ["deriveBits", "deriveKey"]
  );
}

async function deriveKey(keyMaterial: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    {
      name: CONFIG.kdf,
      // FIX 1: Cast 'as any' pour le salt
      salt: salt as any,
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
 * Chiffre les données
 */
export async function encryptWalletData(sensitiveData: string, password: string): Promise<string> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(CONFIG.saltLength));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);

    const encodedData = new TextEncoder().encode(sensitiveData);

    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      { 
        name: CONFIG.algo, 
        // FIX 2: Cast 'as any' pour l'IV
        iv: iv as any 
      },
      key,
      encodedData
    );

    const encryptedContentArray = new Uint8Array(encryptedContentBuffer);

    return JSON.stringify({
      salt: buff_to_base64(salt),
      iv: buff_to_base64(iv),
      ciphertext: buff_to_base64(encryptedContentArray)
    });

  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Impossible de sécuriser le portefeuille.");
  }
}

/**
 * Déchiffre les données
 */
export async function decryptWalletData(encryptedStorageString: string, password: string): Promise<string> {
  try {
    const data = JSON.parse(encryptedStorageString);

    if (!data.salt || !data.iv || !data.ciphertext) {
      throw new Error("Données corrompues");
    }

    const salt = base64_to_buff(data.salt);
    const iv = base64_to_buff(data.iv);
    const ciphertext = base64_to_buff(data.ciphertext);

    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { 
        name: CONFIG.algo, 
        // FIX 3: Cast 'as any' pour l'IV
        iv: iv as any 
      },
      key,
      // FIX 4: Cast 'as any' pour le ciphertext
      ciphertext as any
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    throw new Error("Mot de passe incorrect ou données corrompues.");
  }
}