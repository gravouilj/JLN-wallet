import { useState, useEffect } from 'react';
import { APP_CONFIG } from '../config/constants';

interface PriceObject {
  eur: number;
  usd: number;
  gbp: number;
  chf: number;
  convert: (xecAmount: number | string, currency: string) => number;
  [key: string]: any;
}

/**
 * Hook pour récupérer le prix du XEC en temps réel
 * Utilise l'API configurée dans constants.js
 */
export const useXecPrice = (): PriceObject | null => {
  const [price, setPrice] = useState<PriceObject | null>(null);

  useEffect(() => {
    const fetchPrice = async (): Promise<void> => {
      try {
        const res = await fetch(APP_CONFIG.PRICE_API_URL);
        const data = await res.json();
        
        if (data?.ecash) {
          const prices = data.ecash;
          
          const priceObj: PriceObject = {
            eur: prices.eur || 0,
            usd: prices.usd || 0,
            gbp: prices.gbp || 0,
            chf: prices.chf || 0,
            
            convert: (xecAmount: number | string, currency: string): number => {
              if (!xecAmount) return 0;
              const currencyCode = (currency || 'EUR').toLowerCase();
              const rate = priceObj[currencyCode] as number;
              
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
