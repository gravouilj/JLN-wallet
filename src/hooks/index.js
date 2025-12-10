// Legacy hooks (wrap new EcashWallet service for backward compatibility)
export { default as useBalance } from './useBalance';
export { useToken } from './useToken';

// New professional hooks
export { 
  useEcashWallet, 
  useEcashBalance, 
  useEcashToken, 
  useEcashXec 
} from './useEcashWallet';

// Utility hooks
export { useTranslation } from './useTranslation';
export { useFarms, useFarm } from './useFarms';
export { useChronikWebSocket } from './useChronikWebSocket';
export { useXecPrice } from './useXecPrice';
export { useAdmin } from './useAdmin';
export { useIsCreator } from './useIsCreator';
