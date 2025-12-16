/**
 * Utilitaires de cryptage/décryptage pour messages OP_RETURN
 * Utilise l'API Web Crypto (AES-GCM)
 */

/**
 * Crypte un message avec un mot de passe
 * @param {string} message - Message en clair
 * @param {string} password - Mot de passe
 * @returns {Promise<string>} Message crypté en base64
 */
export async function encryptMessage(message, password) {
  try {
    const encoder = new TextEncoder();
    
    // Dériver une clé depuis le mot de passe
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Générer un salt aléatoire
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Dériver la clé de cryptage
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // IV aléatoire pour AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Crypter le message
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(message)
    );
    
    // Combiner salt + iv + données cryptées
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convertir en base64 avec préfixe
    return 'ENC:' + btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Erreur cryptage:', error);
    throw new Error('Échec du cryptage du message');
  }
}

/**
 * Décrypte un message crypté
 * @param {string} encryptedMessage - Message crypté (avec préfixe ENC:)
 * @param {string} password - Mot de passe
 * @returns {Promise<string>} Message en clair
 */
export async function decryptMessage(encryptedMessage, password) {
  try {
    // Vérifier le préfixe
    if (!encryptedMessage.startsWith('ENC:')) {
      throw new Error('Format de message crypté invalide');
    }
    
    // Décoder depuis base64
    const combined = Uint8Array.from(
      atob(encryptedMessage.slice(4)),
      c => c.charCodeAt(0)
    );
    
    // Extraire salt, iv et données
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Dériver la clé depuis le mot de passe
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Décrypter
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erreur décryptage:', error);
    throw new Error('Échec du décryptage (mauvais mot de passe ou message corrompu)');
  }
}

/**
 * Vérifie si un message est crypté
 * @param {string} message
 * @returns {boolean}
 */
export function isEncrypted(message) {
  return typeof message === 'string' && message.startsWith('ENC:');
}

/**
 * Calcule la taille d'un message après cryptage (estimation)
 * @param {string} message - Message en clair
 * @returns {number} Taille approximative en bytes
 */
export function estimateEncryptedSize(message) {
  // Salt (16) + IV (12) + données cryptées (message + padding GCM ~16)
  const overhead = 16 + 12 + 16;
  const base64Overhead = Math.ceil((message.length + overhead) * 4 / 3);
  return 4 + base64Overhead; // 4 pour "ENC:"
}
