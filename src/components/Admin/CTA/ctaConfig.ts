/**
 * Configuration centralisée des CTA (Call To Action)
 * Permet de configurer facilement le contenu, la fréquence et les conditions d'affichage
 */

export const CTA_CONFIG = {
  // Fréquence d'insertion des CTA dans la liste (tous les X profils)
  insertionFrequency: 5,
  
  // Position du premier CTA (0 = après le 1er profil, 1 = après le 2ème profil, etc.)
  firstCTAPosition: 0,
  
  // Nombre minimum de profils réels avant d'afficher les CTA
  minProfilesThreshold: 1,
  
  // Afficher les CTA quand des filtres sont actifs
  showOnFilterActive: true,
  
  // Afficher les CTA quand aucun résultat
  showOnNoResults: true,
};

/**
 * Définition des CTA disponibles
 * Chaque CTA a un ID, un type, et peut avoir des conditions d'affichage
 */
export const CTA_TYPES = {
  MY_ESTABLISHMENT: {
    id: 'cta-my-establishment',
    type: 'start',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '🚀',
    // Condition : ne pas afficher si l'utilisateur est déjà créateur
    showCondition: (userContext: { isCreator: any; }) => !userContext.isCreator,
    getContent: (t: (arg0: string) => any) => ({
      name: t('directory.ctaMyEstablishmentName'),
      description: t('directory.ctaMyEstablishmentDesc'),
      location_region: t('directory.ctaMyEstablishmentRegion'),
      location_country: 'France',
      products: [t('directory.ctaMyEstablishmentProduct1')],
      rewards: t('directory.ctaMyEstablishmentReward'),
      buttonText: t('directory.ctaStartButton'),
    }),
    onClick: (navigate: (arg0: string) => any) => navigate('/landing-page'),
  },
  
  INVITE_PRODUCER: {
    id: 'cta-invite-producer',
    type: 'invite',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: '🤝',
    // Condition : toujours afficher
    showCondition: () => true,
    getContent: (t: (arg0: string) => any) => ({
      name: t('directory.ctaInviteProducerName'),
      description: t('directory.ctaInviteProducerDesc'),
      location_region: t('directory.ctaInviteProducerRegion'),
      location_country: 'France',
      products: [t('directory.ctaInviteProducerProduct1')],
      rewards: t('directory.ctaInviteProducerReward'),
      buttonText: t('directory.ctaInviteButton'),
    }),
    onClick: (navigate: (arg0: string) => any) => navigate('/landing-page'),
  },
};

/**
 * Obtenir la liste des CTA à afficher selon le contexte utilisateur
 * @param {Object} userContext - Contexte utilisateur (isCreator, etc.)
 * @returns {Array} Liste des types de CTA à afficher
 */
export const getActiveCTAs = (userContext: any) => {
  return Object.values(CTA_TYPES).filter(cta => 
    cta.showCondition(userContext)
  );
};
