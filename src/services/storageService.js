// src/services/storageService.js
import { encryptWalletData, decryptWalletData } from '../utils/security';
import { APP_CONFIG } from '../config/constants'; 

// On récupère les clés depuis la configuration centralisée
const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.VAULT; 
// const SETTINGS_KEY = APP_CONFIG.STORAGE_KEYS.SETTINGS; // (Non utilisé ici pour l'instant, mais prêt)

export const storageService = {
  /**
   * Vérifie si un wallet existe déjà en local
   */
  hasWallet: () => {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  /**
   * Sauvegarde le mnemonic de manière sécurisée
   * @param {string} mnemonic - La phrase secrète
   * @param {string} password - Le mot de passe choisi par l'user
   */
  saveWallet: async (mnemonic, password) => {
    if (!mnemonic || !password) throw new Error("Données manquantes");
    const encryptedData = await encryptWalletData(mnemonic, password);
    localStorage.setItem(STORAGE_KEY, encryptedData);
  },

  /**
   * Récupère le mnemonic (nécessite le mot de passe)
   */
  loadWallet: async (password) => {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (!encryptedData) throw new Error("Aucun portefeuille trouvé");
    
    // Ceci renverra le mnemonic décrypté ou lancera une erreur si mdp faux
    return await decryptWalletData(encryptedData, password);
  },

  /**
   * Supprime le wallet (Logout définitif ou Reset)
   */
  clearWallet: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};