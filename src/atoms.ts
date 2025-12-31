import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { storageService } from './services/storageService'; 
import { APP_CONFIG } from './config/constants';
import { EcashWallet } from './services/ecashWallet';
import { BalanceBreakdown } from './types';

// ============================================
// LANGUAGE
// ============================================

const getBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'fr';
  const lang = (navigator.language || 'fr').toLowerCase();
  if (lang.includes('fr')) return 'fr';
  return 'en';
};

const getInitialLocale = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LANGUAGE);
    return saved || getBrowserLanguage();
  }
  return getBrowserLanguage();
};

const _localeAtom = atom<string>(getInitialLocale());

export const localeAtom = atom(
  (get) => get(_localeAtom),
  (_get, set, newLocale: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LANGUAGE, newLocale);
    }
    set(_localeAtom, newLocale);
  }
);
localeAtom.debugLabel = 'localeAtom';
export const languageAtom = localeAtom;

// ============================================
// PROFILES
// ============================================

interface ProfileData {
  tokenId: string;
  [key: string]: any;
}

const getInitialSelectedProfile = (): ProfileData | null => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-selected-profile'); // À mettre dans constants si possible
    return saved ? JSON.parse(saved) : null;
  }
  return null;
};

const _selectedProfileAtom = atom<ProfileData | null>(getInitialSelectedProfile());

export const selectedProfileAtom = atom(
  (get) => get(_selectedProfileAtom),
  (_get, set, newProfile: ProfileData | null) => {
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

export const currentTokenIdAtom = atom<string>((get) => {
  const selectedProfile = get(selectedProfileAtom);
  return selectedProfile?.tokenId || '';
});
export const tokenIdAtom = currentTokenIdAtom;

// ============================================
// WALLET CORE STATE
// ============================================

export const hdPathAtom = atom<string>(APP_CONFIG.DERIVATION_PATH);

export const optionsAtom = atom((get) => {
  const hdPath = get(hdPathAtom);
  return {
    hdPath,
    noUpdate: true,
  };
});

export const walletConnectedAtom = atom<boolean>(false);
// Ici on type explicitement l'instance de la classe
export const walletAtom = atom<EcashWallet | null>(null);

export const tokenAtom = atom<any>(null); // TODO: Typer TokenData plus tard
export const priceAtom = atom<number | any>(0); // TODO: Typer l'objet prix
export const balanceAtom = atom<number>(0); // XEC amount
export const totalBalanceAtom = atom<number>(0);

export const balanceBreakdownAtom = atom<BalanceBreakdown>({
  spendableBalance: 0,
  totalBalance: 0,
  tokenDustValue: 0,
  pureXecUtxos: 0,
  tokenUtxos: 0
});

export const balanceRefreshTriggerAtom = atom<number>(0);
export const tokenRefreshTriggerAtom = atom<number>(0);

// ============================================
// UI STATE
// ============================================

export const busyAtom = atom<boolean>(false);
export const notificationAtom = atom<any>(null); // TODO: Typer Notification { type, message }
export const scriptLoadedAtom = atom<boolean>(false);
export const scriptErrorAtom = atom<any>(null);

// ============================================
// THEME
// ============================================

const getInitialTheme = (): string => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME);
    return savedTheme || 'light';
  }
  return 'light';
};

export const themeAtom = atom<string>(getInitialTheme());

export const themeSetterAtom = atom(null, (_get, set, newTheme: string) => {
  set(themeAtom, newTheme);
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }
});

interface BlockchainStatus {
  connected: boolean;
  blockHeight: number;
  checking: boolean;
  error: any;
  lastChecked: number | null;
}

export const blockchainStatusAtom = atom<BlockchainStatus>({
  connected: false,
  blockHeight: 0,
  checking: true,
  error: null,
  lastChecked: null
});

// ============================================
// MNEMONIC & SECURITY
// ============================================

const getInitialMnemonicCollapsed = (): boolean => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-mnemonic-collapsed');
    return saved === 'true';
  }
  return false;
};

const _mnemonicCollapsedAtom = atom<boolean>(getInitialMnemonicCollapsed());

export const mnemonicCollapsedAtom = atom(
  (get) => get(_mnemonicCollapsedAtom),
  (_get, set, collapsed: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jlnwallet-mnemonic-collapsed', collapsed.toString());
    }
    set(_mnemonicCollapsedAtom, collapsed);
  }
);

export const coinSelectionStrategyAtom = atom<string>('efficient');

// 1. IN-MEMORY MNEMONIC (Non-persistant)
export const mnemonicAtom = atom<string | null>(null);

// 2. CHECK ENCRYPTED VAULT
export const hasEncryptedWalletAtom = atom<boolean>(storageService.hasWallet());

// ============================================
// FAVORITES
// ============================================

const getInitialFavoriteProfiles = (): string[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jlnwallet-favorite-profiles');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
};

const _favoriteProfilesAtom = atom<string[]>(getInitialFavoriteProfiles());

export const favoriteProfilesAtom = atom(
  (get) => get(_favoriteProfilesAtom),
  (_get, set, newFavorites: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jlnwallet-favorite-profiles', JSON.stringify(newFavorites));
    }
    set(_favoriteProfilesAtom, newFavorites);
  }
);

export const isProfileFavoriteAtom = atom((get) => (profileId: string) => {
  const favorites = get(favoriteProfilesAtom);
  return favorites.includes(profileId);
});

export const toggleProfileFavoriteAtom = atom(
  null,
  (get, set, profileId: string) => {
    const favorites = get(favoriteProfilesAtom);
    if (favorites.includes(profileId)) {
      set(favoriteProfilesAtom, favorites.filter(id => id !== profileId));
    } else {
      set(favoriteProfilesAtom, [...favorites, profileId]);
    }
  }
);

// Wallet Modal Open State
export const walletModalOpenAtom = atom<boolean>(false);

// ============================================
// CURRENCY
// ============================================

const getBrowserCurrency = (): string => {
  if (typeof window === 'undefined') return 'EUR';
  const lang = (navigator.language || 'fr').toLowerCase();
  
  if (lang.includes('en-us')) return 'USD';
  if (lang.includes('en-gb')) return 'GBP';
  if (lang.includes('de-ch') || lang.includes('fr-ch')) return 'CHF';
  
  return 'EUR';
};

export const currencyAtom = atomWithStorage<string>('app_currency', getBrowserCurrency());