import { useState, useEffect } from 'react';
import { APP_CONFIG } from '../config/constants'; 

/**
 * Hook pour récupérer le prix du XEC en temps réel
 * Utilise l'API configurée dans constants.js
 */
export const useXecPrice = () => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(APP_CONFIG.PRICE_API_URL);
        const data = await res.json();
        
        if (data?.ecash) {
          const prices = data.ecash;
          
          const priceObj = {
            eur: prices.eur || 0,
            usd: prices.usd || 0,
            gbp: prices.gbp || 0,
            chf: prices.chf || 0,
            
            convert: (xecAmount, currency) => {
              if (!xecAmount) return 0;
              const currencyCode = (currency || 'EUR').toLowerCase();
              const rate = priceObj[currencyCode];
              
              if (!rate) {
                return 0;
              }
              
              return Number(xecAmount) * rate;
            }
          };
          
          setPrice(priceObj);
        }
      } catch (e) { 
        console.warn('⚠️ Erreur chargement prix XEC:', e);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  return price;
};