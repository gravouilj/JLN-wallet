/**
 * Wallet Feature - Public Exports
 * 
 * Ce module regroupe tout ce qui concerne le portefeuille client
 */

// Components
export { HubView } from './components/HubView';
export { TokenDetailView } from './components/TokenDetailView';
export { 
  TokenHeroSection, 
  TokenPurposeCard, 
  CreatorSocialLinks, 
  CreatorContactCard, 
  CreatorActions 
} from './components/ImmersionComponents';

// Hooks
export { useResolvedProfile } from './hooks/useResolvedProfile';
export { useSendTokenForm } from './hooks/useSendTokenForm';

// Utils
export { formatTokenBalance, deriveTicker, formatXecBalance } from './utils/formatTokenBalance';

// Types
export type { WalletFeatureState } from './types';
