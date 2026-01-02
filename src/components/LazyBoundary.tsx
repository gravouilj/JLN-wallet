import React, { Suspense, ReactNode } from 'react';
import LoadingScreen from './LoadingScreen';

/**
 * LazyBoundary - Wrapper pour React.lazy() avec Suspense
 * 
 * Fournit un état de chargement cohérent lors du lazy loading
 * de pages/composants volumineux avec React.lazy() + Suspense.
 * 
 * Usage:
 * ```tsx
 * const HeavyPage = lazy(() => import('./pages/HeavyPage'));
 * 
 * <LazyBoundary>
 *   <Route path="/heavy" element={<HeavyPage />} />
 * </LazyBoundary>
 * ```
 * 
 * @param {ReactNode} children - Contenu à charger
 * @param {string} fallback - Message de fallback (optionnel)
 */
interface LazyBoundaryProps {
  children: ReactNode;
  fallback?: string;
}

const LazyBoundary: React.FC<LazyBoundaryProps> = ({ 
  children, 
  fallback = '⏳ Chargement...' 
}) => {
  return (
    <Suspense 
      fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}>
          <LoadingScreen />
        </div>
      }
    >
      {children}
    </Suspense>
  );
};

export default LazyBoundary;
