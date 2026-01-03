/**
 * Derived Atoms - Atoms calculés automatiquement
 * 
 * Ces atoms sont en lecture seule et se mettent à jour automatiquement
 * quand leurs dépendances changent. Cela garantit la cohérence de l'état.
 */

import { atom } from 'jotai';
import { 
  walletAtom, 
  walletConnectedAtom, 
  balanceAtom, 
  selectedProfileAtom,
  favoriteProfilesAtom,
  themeAtom,
  localeAtom,
  balanceBreakdownAtom
} from './atoms';

// ============================================
// WALLET DERIVED ATOMS
// ============================================

/**
 * Adresse du wallet (dérivée de walletAtom)
 * Évite d'appeler wallet.getAddress() partout
 */
export const walletAddressAtom = atom<string>((get) => {
  const wallet = get(walletAtom);
  return wallet?.getAddress() ?? '';
});

/**
 * État complet du wallet (combinaison de plusieurs atoms)
 */
export const walletStateAtom = atom((get) => ({
  isConnected: get(walletConnectedAtom),
  address: get(walletAddressAtom),
  balance: get(balanceAtom),
  balanceBreakdown: get(balanceBreakdownAtom),
  wallet: get(walletAtom),
}));

/**
 * Balance formatée en XEC (avec séparateur de milliers)
 */
export const formattedBalanceAtom = atom<string>((get) => {
  const balance = get(balanceAtom);
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
});

/**
 * Indicateur "a des fonds" (balance > dust threshold)
 */
export const hasFundsAtom = atom<boolean>((get) => {
  const balance = get(balanceAtom);
  return balance > 5.46; // Dust threshold
});

// ============================================
// PROFILE DERIVED ATOMS
// ============================================

/**
 * Token ID du profil sélectionné (dérivé)
 * Garantit la synchronisation profile ↔ tokenId
 */
export const activeTokenIdAtom = atom<string>((get) => {
  const profile = get(selectedProfileAtom);
  return profile?.tokenId ?? '';
});

/**
 * Vérifie si un profil est sélectionné
 */
export const hasSelectedProfileAtom = atom<boolean>((get) => {
  const profile = get(selectedProfileAtom);
  return profile !== null;
});

/**
 * Nombre de profils favoris
 */
export const favoritesCountAtom = atom<number>((get) => {
  const favorites = get(favoriteProfilesAtom);
  return favorites.length;
});

/**
 * Profil sélectionné est-il un favori ?
 */
export const isSelectedProfileFavoriteAtom = atom<boolean>((get) => {
  const profile = get(selectedProfileAtom);
  const favorites = get(favoriteProfilesAtom);
  if (!profile) return false;
  return favorites.includes(profile.tokenId);
});

// ============================================
// UI DERIVED ATOMS
// ============================================

/**
 * Mode sombre actif
 */
export const isDarkModeAtom = atom<boolean>((get) => {
  return get(themeAtom) === 'dark';
});

/**
 * Locale actuelle est français
 */
export const isFrenchLocaleAtom = atom<boolean>((get) => {
  return get(localeAtom) === 'fr';
});

// ============================================
// COMBINED STATE ATOMS (pour les pages)
// ============================================

/**
 * État complet pour ClientWalletPage
 * Regroupe tout ce dont la page a besoin en un seul atom
 */
export const clientWalletPageStateAtom = atom((get) => ({
  // Wallet
  isConnected: get(walletConnectedAtom),
  address: get(walletAddressAtom),
  balance: get(balanceAtom),
  hasFunds: get(hasFundsAtom),
  
  // Profile
  selectedProfile: get(selectedProfileAtom),
  hasSelectedProfile: get(hasSelectedProfileAtom),
  activeTokenId: get(activeTokenIdAtom),
  isSelectedFavorite: get(isSelectedProfileFavoriteAtom),
  
  // UI
  isDarkMode: get(isDarkModeAtom),
}));
