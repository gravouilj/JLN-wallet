import { useMemo } from 'react';
import { CTA_CONFIG, getActiveCTAs } from './ctaConfig';

/**
 * Hook personnalisé pour gérer l'injection des CTA dans une liste de profils
 * @param {Array} profiles - Liste des profils à afficher
 * @param {Object} userContext - Contexte utilisateur (isCreator, etc.)
 * @param {Object} filterContext - État des filtres (searchQuery, selected filters, etc.)
 * @param {Object} config - Configuration optionnelle pour surcharger CTA_CONFIG
 * @returns {Array} Liste des profils avec CTA injectés
 */
export const useCTAInjection = (profiles, userContext, filterContext, config = {}) => {
  const finalConfig = { ...CTA_CONFIG, ...config };
  
  return useMemo(() => {
    console.log('🎯 useCTAInjection called:');
    console.log('- profiles count:', profiles.length);
    console.log('- userContext:', userContext);
    console.log('- finalConfig:', finalConfig);
    
    // Vérifier si on doit afficher les CTA
    const shouldShowCTAs = determineShouldShowCTAs(profiles, filterContext, finalConfig);
    console.log('- shouldShowCTAs:', shouldShowCTAs);
    
    if (!shouldShowCTAs) {
      console.log('❌ CTA disabled by shouldShowCTAs');
      return profiles;
    }
    
    // Obtenir les CTA actifs selon le contexte utilisateur
    const activeCTAs = getActiveCTAs(userContext);
    console.log('- activeCTAs:', activeCTAs.length, activeCTAs.map(c => c.id));
    
    if (activeCTAs.length === 0) {
      console.log('❌ No active CTAs');
      return profiles;
    }
    
    // Si aucun profil et qu'on autorise l'affichage sans résultat
    if (profiles.length === 0 && finalConfig.showOnNoResults) {
      console.log('✅ Showing CTAs (no results)');
      return activeCTAs.map(cta => ({
        id: cta.id,
        isCTA: true,
        ctaType: cta.type,
        ctaConfig: cta,
      }));
    }
    
    // Injecter les CTA dans la liste selon la fréquence configurée
    const result = injectCTAsIntoProfiles(profiles, activeCTAs, finalConfig);
    console.log('✅ Result with CTAs:', result.length, 'items (', result.filter(r => r.isCTA).length, 'CTAs)');
    return result;
  }, [profiles, userContext, filterContext, finalConfig]);
};

/**
 * Déterminer si les CTA doivent être affichés
 */
const determineShouldShowCTAs = (profiles, filterContext, config) => {
  console.log('🔍 determineShouldShowCTAs:');
  console.log('  - profiles.length:', profiles.length);
  console.log('  - minProfilesThreshold:', config.minProfilesThreshold);
  console.log('  - showOnFilterActive:', config.showOnFilterActive);
  
  // Afficher si moins ou égal au seuil de profils
  if (profiles.length <= config.minProfilesThreshold) {
    console.log('  ✅ Show CTAs: profiles <= threshold');
    return true;
  }
  
  // Afficher si des filtres sont actifs
  if (config.showOnFilterActive && isFilterActive(filterContext)) {
    console.log('  ✅ Show CTAs: filters active');
    return true;
  }
  
  console.log('  ❌ Hide CTAs: no conditions met');
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
  
  console.log('💉 injectCTAsIntoProfiles:');
  console.log('  - profiles:', profiles.length);
  console.log('  - activeCTAs:', activeCTAs.length);
  console.log('  - firstCTAPosition:', firstCTAPosition);
  console.log('  - insertionFrequency:', insertionFrequency);
  
  // Insérer les profils avec CTA aux positions appropriées
  profiles.forEach((profile, index) => {
    result.push(profile);
    console.log(`  - Pushed profile at index ${index}`);
    
    // Insérer le premier CTA à la position configurée
    if (index === firstCTAPosition && activeCTAs.length > 0) {
      const cta = activeCTAs[ctaIndex % activeCTAs.length];
      result.push({
        id: cta.id,
        isCTA: true,
        ctaType: cta.type,
        ctaConfig: cta,
      });
      console.log(`  ✅ Inserted first CTA at position ${index}: ${cta.id}`);
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
      console.log(`  ✅ Inserted CTA at position ${index}: ${cta.id}`);
      ctaIndex++;
    }
  });
  
  console.log('  - Result:', result.length, 'items,', result.filter(r => r.isCTA).length, 'CTAs');
  return result;
};
