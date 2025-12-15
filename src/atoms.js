import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { loadMnemonic, saveMnemonic } from './utils/mnemonicStorage';

// ============================================
// LANGUAGE & AUTO-DETECTION
// ============================================

/**
 * Détecte la langue appropriée selon le navigateur
 * @returns {string} Code langue ('fr' ou 'en')
 */
const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return 'fr';
  
  const lang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
  
  // Détecte si la langue du navigateur est du français
  if (lang.includes('fr')) return 'fr';
  
  // Par défaut, retourne 'en' pour les autres langues
  return 'en';
};

// Language/Locale atom with localStorage persistence and browser auto-detection
const getInitialLocale = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-language');
    return saved || getBrowserLanguage(); // Auto-détecte si rien n'est sauvegardé
  }
  return getBrowserLanguage();
};

const _localeAtom = atom(getInitialLocale());

export const localeAtom = atom(
  (get) => get(_localeAtom),
  (get, set, newLocale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jlnwallet-language', newLocale);
    }
    set(_localeAtom, newLocale);
  }
);
localeAtom.debugLabel = 'localeAtom';

// Language atom - alias for localeAtom for consistency
export const languageAtom = localeAtom;
languageAtom.debugLabel = 'languageAtom';

// ============================================
// JLN WALLET PLATFORM - Dynamic Token System
// ============================================

// Selected profile atom with localStorage persistence
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
selectedProfileAtom.debugLabel = 'selectedProfileAtom';

// Current Token ID atom - derived from selected profile
// This replaces the old static VITE_TOKEN_ID approach
export const currentTokenIdAtom = atom((get) => {
  const selectedProfile = get(selectedProfileAtom);
  return selectedProfile?.tokenId || '';
});
currentTokenIdAtom.debugLabel = 'currentTokenIdAtom';

// Legacy tokenIdAtom - now redirects to currentTokenIdAtom for backward compatibility
export const tokenIdAtom = currentTokenIdAtom;
tokenIdAtom.debugLabel = 'tokenIdAtom';

// Fixed HD derivation path - always Cashtab type (1899)
export const hdPathAtom = atom("m/44'/1899'/0'/0/0");
hdPathAtom.debugLabel = 'hdPathAtom';

// XEC wallet options - simplified, no analytics
export const optionsAtom = atom((get) => {
  const hdPath = get(hdPathAtom);

  return {
    hdPath,
    // EcashWallet handles Chronik connection internally
    noUpdate: true,
  };
});
optionsAtom.debugLabel = 'optionsAtom';

// Wallet connection and instance atoms
export const walletConnectedAtom = atom(false);
walletConnectedAtom.debugLabel = 'walletConnectedAtom';

export const walletAtom = atom(null);
walletAtom.debugLabel = 'walletAtom';

// Single token state (instead of eTokens array)
export const tokenAtom = atom(null);
tokenAtom.debugLabel = 'tokenAtom';

// XEC price in USD
export const priceAtom = atom(0);
priceAtom.debugLabel = 'priceAtom';

// XEC balance (in XEC units - from wallet.getXecBalance())
export const balanceAtom = atom(0);
balanceAtom.debugLabel = 'balanceAtom';

// Total balance (all UTXOs including token dust)
export const totalBalanceAtom = atom(0);
totalBalanceAtom.debugLabel = 'totalBalanceAtom';

// Balance breakdown for detailed display
export const balanceBreakdownAtom = atom({
  spendableBalance: 0,
  totalBalance: 0,
  tokenDustValue: 0,
  pureXecUtxos: 0,
  tokenUtxos: 0
});
balanceBreakdownAtom.debugLabel = 'balanceBreakdownAtom';

// Refresh trigger atoms
export const balanceRefreshTriggerAtom = atom(0);
balanceRefreshTriggerAtom.debugLabel = 'balanceRefreshTriggerAtom';

export const tokenRefreshTriggerAtom = atom(0);
tokenRefreshTriggerAtom.debugLabel = 'tokenRefreshTriggerAtom';

// UI state atoms
export const busyAtom = atom(false);
busyAtom.debugLabel = 'busyAtom';

export const notificationAtom = atom(null);
notificationAtom.debugLabel = 'notificationAtom';

// Script loading state atoms
export const scriptLoadedAtom = atom(false);
scriptLoadedAtom.debugLabel = 'scriptLoadedAtom';

export const scriptErrorAtom = atom(null);
scriptErrorAtom.debugLabel = 'scriptErrorAtom';


// Theme management atom with localStorage persistence
const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('jlnwallet-theme');
    return savedTheme || 'light'; // Default to light theme
  }
  return 'light';
};

export const themeAtom = atom(getInitialTheme());
themeAtom.debugLabel = 'themeAtom';

// Theme setter atom that also persists to localStorage
export const themeSetterAtom = atom(null, (get, set, newTheme) => {
  set(themeAtom, newTheme);
  if (typeof window !== 'undefined') {
    localStorage.setItem('jlnwallet-theme', newTheme);
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', newTheme);
  }
});
themeSetterAtom.debugLabel = 'themeSetterAtom';

// Blockchain status atom - shared global state for connection status
export const blockchainStatusAtom = atom({
  connected: false,
  blockHeight: 0,
  checking: true,
  error: null,
  lastChecked: null
});
blockchainStatusAtom.debugLabel = 'blockchainStatusAtom';

// Mnemonic UI state management with localStorage persistence
const getInitialMnemonicCollapsed = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-mnemonic-collapsed');
    return saved === 'true'; // Convert string to boolean, default false (expanded)
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
mnemonicCollapsedAtom.debugLabel = 'mnemonicCollapsedAtom';

// Simplified coin selection strategy - always 'efficient'
export const coinSelectionStrategyAtom = atom('efficient');
coinSelectionStrategyAtom.debugLabel = 'coinSelectionStrategyAtom';

// Saved mnemonic atom with localStorage persistence for wallet restoration
// Using atomWithStorage for automatic localStorage sync (Jotai best practice)
export const savedMnemonicAtom = atomWithStorage('jlnwallet-mnemonic', '', undefined, { unstable_getOnInit: true });
savedMnemonicAtom.debugLabel = 'savedMnemonicAtom';

// Mnemonic setter atom for backward compatibility
// atomWithStorage handles persistence automatically, so this just updates the atom
export const mnemonicSetterAtom = atom(null, (get, set, newMnemonic) => {
  set(savedMnemonicAtom, newMnemonic || '');
});
mnemonicSetterAtom.debugLabel = 'mnemonicSetterAtom';

// ============================================
// FAVORITE PROFILE SYSTEM
// ============================================

// Load favorite profiles from localStorage
const getInitialFavoriteProfiles = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-favorite-profiles');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
};

const _favoriteProfilesAtom = atom(getInitialFavoriteProfiles());

// Favorite profiles atom with localStorage persistence
export const favoriteProfilesAtom = atom(
  (get) => get(_favoriteProfilesAtom),
  (get, set, newFavorites) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jlnwallet-favorite-profiles', JSON.stringify(newFavorites));
    }
    set(_favoriteProfilesAtom, newFavorites);
  }
);
favoriteProfilesAtom.debugLabel = 'favoriteProfilesAtom';

// Helper atom to check if a profile is favorite
export const isProfileFavoriteAtom = atom((get) => (profileId) => {
  const favorites = get(favoriteProfilesAtom);
  return favorites.includes(profileId);
});
isProfileFavoriteAtom.debugLabel = 'isProfileFavoriteAtom';

// Helper atom to toggle favorite status
export const toggleProfileFavoriteAtom = atom(
  null,
  (get, set, profileId) => {
    const favorites = get(favoriteProfilesAtom);
    if (favorites.includes(profileId)) {
      // Remove from favorites
      set(favoriteProfilesAtom, favorites.filter(id => id !== profileId));
    } else {
      // Add to favorites
      set(favoriteProfilesAtom, [...favorites, profileId]);
    }
  }
);
toggleProfileFavoriteAtom.debugLabel = 'toggleProfileFavoriteAtom';

// Wallet Modal Open State
export const walletModalOpenAtom = atom(false);
walletModalOpenAtom.debugLabel = 'walletModalOpenAtom';

// ============================================
// CURRENCY MANAGEMENT
// ============================================

/**
 * Détecte la devise appropriée selon la locale du navigateur
 * Mappe les langues du navigateur à leur devise principale
 * @returns {string} Code devise (EUR, USD, GBP, CHF)
 */
const getBrowserCurrency = () => {
  if (typeof window === 'undefined') return 'EUR';
  
  const lang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
  
  // Mapping intelligent selon la locale
  if (lang.includes('en-us')) return 'USD'; // États-Unis
  if (lang.includes('en-gb')) return 'GBP'; // Royaume-Uni
  if (lang.includes('de-ch') || lang.includes('fr-ch')) return 'CHF'; // Suisse
  
  // PAR DÉFAUT : EUR (France, Belgique, Allemagne, Espagne, Italie et reste du monde francophone)
  return 'EUR';
};

// Currency selection atom with localStorage persistence and intelligent browser detection
// Supported currencies: EUR, USD, GBP, CHF
// Default: getBrowserCurrency() with EUR fallback for francophone audience
export const currencyAtom = atomWithStorage('app_currency', getBrowserCurrency());
currencyAtom.debugLabel = 'currencyAtom';