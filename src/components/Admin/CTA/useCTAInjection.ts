import { useMemo } from 'react';
import { CTA_CONFIG, getActiveCTAs } from './ctaConfig';

/**
 * Hook personnalisé pour gérer l'injection des CTA dans une liste de profils
 * Version nettoyée pour la production (sans logs verbeux)
 * @param {Array} profiles - Liste des profils à afficher
 * @param {Object} userContext - Contexte utilisateur (isCreator, etc.)
 * @param {Object} filterContext - État des filtres (searchQuery, selected filters, etc.)
 * @param {Object} config - Configuration optionnelle pour surcharger CTA_CONFIG
 * @returns {Array} Liste des profils avec CTA injectés
 */
export const useCTAInjection = (profiles, userContext, filterContext, config = {}) => {
  const finalConfig = { ...CTA_CONFIG, ...config };
  
  return useMemo(() => {
    // Vérifier si on doit afficher les CTA
    const shouldShowCTAs = determineShouldShowCTAs(profiles, filterContext, finalConfig);
    
    if (!shouldShowCTAs) {
      return profiles;
    }
    
    // Obtenir les CTA actifs selon le contexte utilisateur
    const activeCTAs = getActiveCTAs(userContext);
    
    if (activeCTAs.length === 0) {
      return profiles;
    }
    
    // Si aucun profil et qu'on autorise l'affichage sans résultat
    if (profiles.length === 0 && finalConfig.showOnNoResults) {
      return activeCTAs.map(cta => ({
        id: cta.id,
        isCTA: true,
        ctaType: cta.type,
        ctaConfig: cta,
      }));
    }
    
    // Injecter les CTA dans la liste selon la fréquence configurée
    return injectCTAsIntoProfiles(profiles, activeCTAs, finalConfig);
  }, [profiles, userContext, filterContext, finalConfig]);
};

/**
 * Déterminer si les CTA doivent être affichés
 */
const determineShouldShowCTAs = (profiles, filterContext, config) => {
  // Afficher si moins ou égal au seuil de profils
  if (profiles.length <= config.minProfilesThreshold) {
    return true;
  }
  
  // Afficher si des filtres sont actifs
  if (config.showOnFilterActive && isFilterActive(filterContext)) {
    return true;
  }
  
  return false;
};

/**
 * Vérifier si des filtres sont actifs
 */
const isFilterActive = (filterContext) => {
  const {
    searchQuery,
    selectedCountry,
    selectedRegion,
    selectedDepartment,
    selectedProduct,
    selectedService,
  } = filterContext;
  
  return !!(
    searchQuery ||
    (selectedCountry && selectedCountry !== 'all') ||
    (selectedRegion && selectedRegion !== 'all') ||
    (selectedDepartment && selectedDepartment !== 'all') ||
    (selectedProduct && selectedProduct !== 'all') ||
    (selectedService && selectedService !== 'all')
  );
};

/**
 * Injecter les CTA dans la liste de profils selon la configuration
 */
const injectCTAsIntoProfiles = (profiles, activeCTAs, config) => {
  const result = [];
  let ctaIndex = 0;
  
  const { insertionFrequency, firstCTAPosition } = config;
  
  // Insérer les profils avec CTA aux positions appropriées
  profiles.forEach((profile, index) => {
    result.push(profile);
    
    // Insérer le premier CTA à la position configurée
    if (index === firstCTAPosition && activeCTAs.length > 0) {
      const cta = activeCTAs[ctaIndex % activeCTAs.length];
      result.push({
        id: cta.id,
        isCTA: true,
        ctaType: cta.type,
        ctaConfig: cta,
      });
      ctaIndex++;
    }
    // Insérer les CTA suivants selon la fréquence
    else if (
      index > firstCTAPosition &&
      (index - firstCTAPosition) % insertionFrequency === 0 &&
      activeCTAs.length > 0
    ) {
      const cta = activeCTAs[ctaIndex % activeCTAs.length];
      result.push({
        id: cta.id,
        isCTA: true,
        ctaType: cta.type,
        ctaConfig: cta,
      });
      ctaIndex++;
    }
  });
  
  return result;
};