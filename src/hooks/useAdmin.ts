import { useState, useEffect } from 'react';
import { useEcashWallet } from './useEcashWallet';

const ADMIN_HASH = (import.meta.env.VITE_ADMIN_HASH || '').trim();

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAdmin() {
  const { address } = useEcashWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    if (!address) {
      setIsAdmin(false);
      setIsChecking(false);
      return;
    }

    if (!ADMIN_HASH) {
      // Uniquement en dev pour ne pas exposer l'info en prod
      if (import.meta.env.DEV) console.warn("⚠️ Admin: VITE_ADMIN_HASH manquant");
      setIsAdmin(false);
      setIsChecking(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        setIsChecking(true);
        const userAddressHash = await sha256(address);
        const isMatch = userAddressHash.toLowerCase() === ADMIN_HASH.toLowerCase();
        
        if (isMatch) {
          console.log('👑 Mode ADMIN activé');
        }
        
        setIsAdmin(isMatch);
      } catch (error) {
        console.error('Erreur admin check:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdmin();
  }, [address]);

  return { isAdmin, isChecking };
}