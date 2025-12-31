/**
 * Fichier de configuration centralisé pour l'application JLN Wallet.
 * Contient toutes les constantes, URLs d'API, et paramètres critiques.
 */

export const APP_CONFIG = {
  // === CONFIGURATION CRYPTO & WALLET ===
  // Chemin de dérivation HD standard pour eCash (selon Cashtab)
  // Ne pas changer sauf si vous savez ce que vous faites.
  DERIVATION_PATH: "m/44'/1899'/0'/0/0",

  // === URLs & APIs EXTERNES ===
  // Serveurs Chronik pour interagir avec la blockchain eCash
  // Avoir plusieurs serveurs permet un fallback si l'un est en panne.
    CHRONIK_URLS: ['https://chronik.fabien.cash/xec','https://chronik.pay2stay.com/xec', 'https://chronik.be.cash/xec'],

  
  // URL de l'explorateur de blocs pour les liens de transaction
  EXPLORER_URL_TX: 'https://explorer.e.cash/tx/',
  EXPLORER_URL_TOKEN: 'https://explorer.e.cash/token/',

  // API pour récupérer le prix de l'eCash (XEC)
  PRICE_API_URL: 'https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd,eur,gbp,chf',

  // === PARAMÈTRES DE L'APPLICATION ===
  // Nom de l'application (pour le titre, etc.)
  APP_NAME: 'JLN Wallet',
  
  // Version actuelle
  APP_VERSION: '2.0.0-secure',

  // Clés pour le localStorage
  // Préfixer évite les collisions avec d'autres apps sur le même domaine.
  STORAGE_KEYS: {
    VAULT: 'jln_wallet_vault',
    SETTINGS: 'jln_wallet_settings',
    LANGUAGE: 'jlnwallet-language',
    THEME: 'jlnwallet-theme',
    SELECTED_PROFILE: 'jlnwallet-selected-profile',
    FAVORITE_PROFILES: 'jlnwallet-favorite-profiles',
    MNEMONIC_COLLAPSED: 'jlnwallet-mnemonic-collapsed',
    CURRENCY: 'app_currency',
    // ...ajoute d'autres clés si nécessaire

     // --- Application ---
  // Liens externes (si tu en as)
  SUPPORT_EMAIL: 'contact@jln.dev',
  FAQ_URL: '/#/faq',
  GITHUB_REPO: 'https://github.com/gravouilj/JLN-wallet'

  },

  // === SUPABASE (Backend Database) ===
  SUPABASE: {
    URL: 'https://vmlozrwjjatqcjvdqkxu.supabase.co',
    // Idéalement, cette clé devrait venir de import.meta.env.VITE_SUPABASE_KEY
    // Mais pour l'instant, on la centralise ici.
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbG96cndqamF0cWNqdmRxa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjA0OTAsImV4cCI6MjA4MDgzNjQ5MH0.KkPEbDAbtDIMGjPTTMqAARhJ4LYUYVdsrhFhA6V4Iqg'
  },
};