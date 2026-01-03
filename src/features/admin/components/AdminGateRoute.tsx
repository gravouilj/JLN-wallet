import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { walletConnectedAtom } from '../../../atoms';
import { useEcashWallet } from '../../../hooks/useEcashWallet';
import { useAdmin } from '../../../hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../../../components/LoadingScreen';
import DisconnectedView from '../../../components/Layout/DisconnectedView';

/**
 * AdminGateRoute - Route qui vérifie si l'utilisateur a les permissions d'accès
 * Permissions:
 *   1. Super admin (hash de l'adresse correspond)
 *   2. Créateur de jeton (possède au minimum 1 mint baton)
 * 
 * Comportement:
 * - Si pas connecté → DisconnectedView
 * - Si connecté MAIS sans permission → Redirige vers fallbackRoute
 * - Si connecté ET avec permission → Affiche children
 */
const AdminGateRoute = ({ children, fallbackRoute = '/wallet' }) => {
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const { wallet } = useEcashWallet();
  const { isAdmin, isChecking } = useAdmin(); // Récupérer isChecking
  
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      // Attendre que le check admin soit terminé
      if (isChecking) {
        console.log('⏳ AdminGateRoute: Attente vérification admin...');
        return;
      }
      
      try {
        if (!walletConnected || !wallet) {
          if (import.meta.env.DEV) console.log('⚠️ AdminGateRoute: Wallet non connecté');
          setLoading(false);
          return;
        }

        if (import.meta.env.DEV) {
          console.log('🔍 AdminGateRoute: Vérification accès...');
          console.log('👤 isAdmin:', isAdmin);
        }

        // Super admin a toujours accès
        if (isAdmin) {
          console.log('👑 Super admin détecté → Accès autorisé');
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Vérifier mint batons pour les créateurs (pas pour admin)
        if (import.meta.env.DEV) console.log('🔑 Vérification mint batons...');
        const batons = await wallet.getMintBatons();
        if (import.meta.env.DEV) console.log('🔑 Mint batons vérifiés:', batons);
        
        const hasAny = Array.isArray(batons) && batons.length > 0;
        if (import.meta.env.DEV) console.log('✅ A des mint batons:', hasAny);
        
        // Admin a TOUJOURS accès (déjà vérifié plus haut)
        // Créateur a accès seulement s'il a au moins 1 baton
        setHasAccess(hasAny);

        // Si pas d'accès, rediriger
        if (!hasAny) {
          console.log('ℹ️ Utilisateur sans permission → Redirection vers', fallbackRoute);
          navigate(fallbackRoute, { replace: true });
        }
        
        setLoading(false);
      } catch (err) {
        console.warn('⚠️ Erreur vérification accès:', err);
        setError(err.message);
        // En cas d'erreur réseau, permettre l'accès quand même (blockchain down)
        setHasAccess(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [walletConnected, wallet, isAdmin, isChecking, navigate, fallbackRoute]);

  // Pas connecté
  if (!walletConnected) {
    return <DisconnectedView />;
  }

  // Chargement
  if (loading) {
    return <LoadingScreen />;
  }

  // Erreur de blockchain mais permission d'accès
  if (error && hasAccess) {
    console.warn('⚠️ Blockchain inaccessible mais accès permis');
    return children;
  }

  // Pas d'accès - la redirection est déjà faite dans useEffect
  if (!hasAccess) {
    return <LoadingScreen />;
  }

  // Tout est bon
  return children;
};

export default AdminGateRoute;
