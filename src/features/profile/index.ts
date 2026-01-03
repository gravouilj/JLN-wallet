/**
 * Profile Feature - Public Exports
 * 
 * Gestion du profil créateur et vue immersive
 */

// Hooks
export {
  useProfileForm,
  useProductServiceTags,
  useProfileSubmit,
  useTokenStats,
  PRODUCT_SUGGESTIONS,
  SERVICE_SUGGESTIONS,
} from './hooks';

export type {
  ProfileFormData,
  PrivacySettings,
  SensitiveFields,
  UseProfileFormReturn,
  UseProductServiceTagsReturn,
  UseProfileSubmitReturn,
  TokenWithStats,
  UseTokenStatsReturn,
} from './hooks';

// Components - Tab components for ManageProfilePage
export { default as InfosTab } from './components/ManageProfile/InfosTab';
export { default as LocationTab } from './components/ManageProfile/LocationTab';
export { default as ContactTab } from './components/ManageProfile/ContactTab';
export { default as CertificationsTab } from './components/ManageProfile/CertificationsTab';
export { default as VerificationTab } from './components/ManageProfile/VerificationTab';
export { default as TokensListTab } from './components/ManageProfile/TokensListTab';
export { default as SecurityTab } from './components/ManageProfile/SecurityTab';

// Types
export type { ProfileFeatureState } from './types';
