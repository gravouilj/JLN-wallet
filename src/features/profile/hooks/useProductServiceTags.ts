/**
 * useProductServiceTags - Manages product and service tag input with suggestions
 * Extracted from ManageProfilePage for tag management logic
 */
import { useState, useCallback, useMemo } from 'react';

// Common suggestions for autocomplete
const PRODUCT_SUGGESTIONS = [
  'Légumes', 'Fruits', 'Viande', 'Volaille', 'Œufs', 'Lait', 'Fromage',
  'Miel', 'Confiture', 'Pain', 'Vin', 'Cidre', 'Jus', 'Huile', 'Farine',
  'Plantes aromatiques', 'Champignons', 'Poisson', 'Crustacés', 'Escargots',
  'Charcuterie', 'Beurre', 'Yaourt', 'Crème', 'Glace', 'Pâtisserie',
  'Bière artisanale', 'Spiritueux', 'Épices', 'Sel', 'Sucre', 'Céréales',
  'Légumineuses', 'Noix', 'Fruits secs', 'Conserves', 'Surgelés',
  'Cosmétiques naturels', 'Savons', 'Laine', 'Cuir', 'Bois', 'Fleurs'
];

const SERVICE_SUGGESTIONS = [
  'Vente à la ferme', 'Marché', 'Livraison', 'Drive fermier', 'Panier',
  'Cueillette', 'Visite pédagogique', 'Ferme pédagogique', 'Gîte', 
  'Camping à la ferme', 'Table d\'hôte', 'Restauration', 'Traiteur',
  'Cours de cuisine', 'Atelier', 'Formation', 'Événements', 'Mariage',
  'Location de salle', 'Séminaire', 'E-commerce', 'Abonnement',
  'Bienvenue à la ferme', 'Accueil groupe', 'Point de vente collectif',
  'AMAP', 'Coopérative', 'Vente en ligne', 'Click & Collect'
];

interface UseProductServiceTagsOptions {
  initialProducts?: string[];
  initialServices?: string[];
  maxTags?: number;
}

/**
 * Hook for managing product and service tags with autocomplete
 */
export function useProductServiceTags(options: UseProductServiceTagsOptions = {}) {
  const { 
    initialProducts = [], 
    initialServices = [],
    maxTags = 20 
  } = options;

  // Tag arrays
  const [productTags, setProductTags] = useState<string[]>(initialProducts);
  const [serviceTags, setServiceTags] = useState<string[]>(initialServices);

  // Input states
  const [productInput, setProductInput] = useState('');
  const [serviceInput, setServiceInput] = useState('');

  // Reset tags from profile data
  const resetFromProfile = useCallback((products: string[] = [], services: string[] = []) => {
    setProductTags(products);
    setServiceTags(services);
    setProductInput('');
    setServiceInput('');
  }, []);

  // Filtered suggestions based on current input
  const productSuggestions = useMemo(() => {
    if (!productInput.trim()) return [];
    const input = productInput.toLowerCase();
    return PRODUCT_SUGGESTIONS.filter(
      s => s.toLowerCase().includes(input) && !productTags.includes(s)
    ).slice(0, 5);
  }, [productInput, productTags]);

  const serviceSuggestions = useMemo(() => {
    if (!serviceInput.trim()) return [];
    const input = serviceInput.toLowerCase();
    return SERVICE_SUGGESTIONS.filter(
      s => s.toLowerCase().includes(input) && !serviceTags.includes(s)
    ).slice(0, 5);
  }, [serviceInput, serviceTags]);

  // Add product tag
  const addProductTag = useCallback((tag?: string) => {
    const tagToAdd = (tag || productInput).trim();
    if (!tagToAdd) return;
    
    if (productTags.length >= maxTags) {
      console.warn(`Maximum ${maxTags} product tags allowed`);
      return;
    }
    
    if (!productTags.includes(tagToAdd)) {
      setProductTags(prev => [...prev, tagToAdd]);
    }
    setProductInput('');
  }, [productInput, productTags, maxTags]);

  // Remove product tag
  const removeProductTag = useCallback((tagToRemove: string) => {
    setProductTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Add service tag
  const addServiceTag = useCallback((tag?: string) => {
    const tagToAdd = (tag || serviceInput).trim();
    if (!tagToAdd) return;
    
    if (serviceTags.length >= maxTags) {
      console.warn(`Maximum ${maxTags} service tags allowed`);
      return;
    }
    
    if (!serviceTags.includes(tagToAdd)) {
      setServiceTags(prev => [...prev, tagToAdd]);
    }
    setServiceInput('');
  }, [serviceInput, serviceTags, maxTags]);

  // Remove service tag
  const removeServiceTag = useCallback((tagToRemove: string) => {
    setServiceTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Handle keyboard events for product input
  const handleProductKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProductTag();
    } else if (e.key === 'Backspace' && !productInput && productTags.length > 0) {
      // Remove last tag on backspace when input is empty
      removeProductTag(productTags[productTags.length - 1]);
    }
  }, [addProductTag, productInput, productTags, removeProductTag]);

  // Handle keyboard events for service input
  const handleServiceKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addServiceTag();
    } else if (e.key === 'Backspace' && !serviceInput && serviceTags.length > 0) {
      removeServiceTag(serviceTags[serviceTags.length - 1]);
    }
  }, [addServiceTag, serviceInput, serviceTags, removeServiceTag]);

  // Check if tags have changed from initial
  const hasTagChanges = useCallback((initialProducts: string[], initialServices: string[]) => {
    if (productTags.length !== initialProducts.length) return true;
    if (serviceTags.length !== initialServices.length) return true;
    
    const productsChanged = !productTags.every(t => initialProducts.includes(t));
    const servicesChanged = !serviceTags.every(t => initialServices.includes(t));
    
    return productsChanged || servicesChanged;
  }, [productTags, serviceTags]);

  return {
    // State
    productTags,
    serviceTags,
    productInput,
    serviceInput,
    productSuggestions,
    serviceSuggestions,

    // Setters
    setProductInput,
    setServiceInput,
    setProductTags,
    setServiceTags,

    // Actions
    addProductTag,
    removeProductTag,
    addServiceTag,
    removeServiceTag,
    handleProductKeyDown,
    handleServiceKeyDown,
    hasTagChanges,
    resetFromProfile,
  };
}

export type UseProductServiceTagsReturn = ReturnType<typeof useProductServiceTags>;

// Export suggestions for external use
export { PRODUCT_SUGGESTIONS, SERVICE_SUGGESTIONS };
