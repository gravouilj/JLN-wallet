// src/services/storageService.ts
import { encryptWalletData, decryptWalletData } from '../utils/security';
import { APP_CONFIG } from '../config/constants';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.VAULT;

export const storageService = {
  hasWallet: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  saveWallet: async (mnemonic: string, password: string): Promise<void> => {
    if (!mnemonic || !password) throw new Error("Données manquantes");
    const encryptedData = await encryptWalletData(mnemonic, password);
    localStorage.setItem(STORAGE_KEY, encryptedData);
  },

  loadWallet: async (password: string): Promise<string> => {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (!encryptedData) throw new Error("Aucun portefeuille trouvé");
    return await decryptWalletData(encryptedData, password);
  },

  clearWallet: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};