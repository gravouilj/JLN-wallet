import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { storageService } from './services/storageService'; 
import { APP_CONFIG } from './config/constants'; // ✅ Import de la config

// ============================================
// LANGUAGE & AUTO-DETECTION
// ============================================

const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return 'fr';
  const lang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
  if (lang.includes('fr')) return 'fr';
  return 'en';
};

const getInitialLocale = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LANGUAGE);
    return saved || getBrowserLanguage();
  }
  return getBrowserLanguage();
};

const _localeAtom = atom(getInitialLocale());

export const localeAtom = atom(
  (get) => get(_localeAtom),
  (get, set, newLocale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LANGUAGE, newLocale);
    }
    set(_localeAtom, newLocale);
  }
);
localeAtom.debugLabel = 'localeAtom';
export const languageAtom = localeAtom;

// ============================================
// JLN WALLET PLATFORM
// ============================================

const getInitialSelectedProfile = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-selected-profile');
    return saved ? JSON.parse(saved) : null;
  }
  return null;
};

const _selectedProfileAtom = atom(getInitialSelectedProfile());

export const selectedProfileAtom = atom(
  (get) => get(_selectedProfileAtom),
  (get, set, newProfile) => {
    if (typeof window !== 'undefined') {
      if (newProfile) {
        localStorage.setItem('jlnwallet-selected-profile', JSON.stringify(newProfile));
      } else {
        localStorage.removeItem('jlnwallet-selected-profile');
      }
    }
    set(_selectedProfileAtom, newProfile);
  }
);

export const currentTokenIdAtom = atom((get) => {
  const selectedProfile = get(selectedProfileAtom);
  return selectedProfile?.tokenId || '';
});
export const tokenIdAtom = currentTokenIdAtom;

// ============================================
// CORE WALLET CONFIG
// ============================================

// ✅ Utilisation de la constante pour le chemin de dérivation
export const hdPathAtom = atom(APP_CONFIG.DERIVATION_PATH);

export const optionsAtom = atom((get) => {
  const hdPath = get(hdPathAtom);
  return {
    hdPath,
    noUpdate: true,
  };
});

export const walletConnectedAtom = atom(false);
export const walletAtom = atom(null);
export const tokenAtom = atom(null);
export const priceAtom = atom(0);
export const balanceAtom = atom(0);
export const totalBalanceAtom = atom(0);

export const balanceBreakdownAtom = atom({
  spendableBalance: 0,
  totalBalance: 0,
  tokenDustValue: 0,
  pureXecUtxos: 0,
  tokenUtxos: 0
});

export const balanceRefreshTriggerAtom = atom(0);
export const tokenRefreshTriggerAtom = atom(0);

// ============================================
// UI STATE
// ============================================

export const busyAtom = atom(false);
export const notificationAtom = atom(null);
export const scriptLoadedAtom = atom(false);
export const scriptErrorAtom = atom(null);

// ============================================
// THEME MANAGEMENT
// ============================================

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME);
    return savedTheme || 'light';
  }
  return 'light';
};

export const themeAtom = atom(getInitialTheme());

export const themeSetterAtom = atom(null, (get, set, newTheme) => {
  set(themeAtom, newTheme);
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }
});

export const blockchainStatusAtom = atom({
  connected: false,
  blockHeight: 0,
  checking: true,
  error: null,
  lastChecked: null
});

// ============================================
// MNEMONIC & SECURITY
// ============================================

const getInitialMnemonicCollapsed = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-mnemonic-collapsed');
    return saved === 'true';
  }
  return false;
};

const _mnemonicCollapsedAtom = atom(getInitialMnemonicCollapsed());

export const mnemonicCollapsedAtom = atom(
  (get) => get(_mnemonicCollapsedAtom),
  (get, set, collapsed) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jlnwallet-mnemonic-collapsed', collapsed.toString());
    }
    set(_mnemonicCollapsedAtom, collapsed);
  }
);

export const coinSelectionStrategyAtom = atom('efficient');

// 1. IN-MEMORY MNEMONIC (Non-persistant)
export const mnemonicAtom = atom(null);

// 2. CHECK ENCRYPTED VAULT
export const hasEncryptedWalletAtom = atom(storageService.hasWallet());

// ============================================
// FAVORITES
// ============================================

const getInitialFavoriteProfiles = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-favorite-profiles');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
};

const _favoriteProfilesAtom = atom(getInitialFavoriteProfiles());

export const favoriteProfilesAtom = atom(
  (get) => get(_favoriteProfilesAtom),
  (get, set, newFavorites) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jlnwallet-favorite-profiles', JSON.stringify(newFavorites));
    }
    set(_favoriteProfilesAtom, newFavorites);
  }
);

export const isProfileFavoriteAtom = atom((get) => (profileId) => {
  const favorites = get(favoriteProfilesAtom);
  return favorites.includes(profileId);
});

export const toggleProfileFavoriteAtom = atom(
  null,
  (get, set, profileId) => {
    const favorites = get(favoriteProfilesAtom);
    if (favorites.includes(profileId)) {
      set(favoriteProfilesAtom, favorites.filter(id => id !== profileId));
    } else {
      set(favoriteProfilesAtom, [...favorites, profileId]);
    }
  }
);

// Wallet Modal Open State
export const walletModalOpenAtom = atom(false);

// ============================================
// CURRENCY
// ============================================

const getBrowserCurrency = () => {
  if (typeof window === 'undefined') return 'EUR';
  const lang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
  
  if (lang.includes('en-us')) return 'USD';
  if (lang.includes('en-gb')) return 'GBP';
  if (lang.includes('de-ch') || lang.includes('fr-ch')) return 'CHF';
  
  return 'EUR';
};

export const currencyAtom = atomWithStorage('app_currency', getBrowserCurrency());