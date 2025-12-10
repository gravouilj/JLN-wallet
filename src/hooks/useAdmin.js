import { useState, useEffect } from 'react';
import { useEcashWallet } from './useEcashWallet';

/**
 * Récupération du hash depuis les variables d'environnement VITE
 * Le fichier .env.local doit contenir: VITE_ADMIN_HASH=...
 */
const ADMIN_HASH = import.meta.env.VITE_ADMIN_HASH || '';

/**
 * Hash SHA-256 d'une chaîne (async) via Web Crypto API
 */
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * useAdmin - Vérifier si l'utilisateur connecté est super admin
 * @returns {boolean} true si l'utilisateur est super admin
 */
export function useAdmin() {
  const { address } = useEcashWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Nouveau: indique si le check est en cours
  
  useEffect(() => {
    // Si pas d'adresse ou pas de configuration, pas admin
    if (!address || !ADMIN_HASH) {
      setIsAdmin(false);
      setIsChecking(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        setIsChecking(true);
        // 1. Calculer le hash de l'adresse connectée
        const userAddressHash = await sha256(address);
        
        // 2. Comparer avec le hash stocké dans .env.local
        // On compare en minuscule pour éviter les erreurs de casse
        const isMatch = userAddressHash.toLowerCase() === ADMIN_HASH.toLowerCase();
        
        if (isMatch) {
          console.log('👑 Mode ADMIN activé pour :', address);
        }
        
        setIsAdmin(isMatch);
      } catch (error) {
        console.error('Erreur vérification admin:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdmin();
  }, [address]);

  return { isAdmin, isChecking };
}