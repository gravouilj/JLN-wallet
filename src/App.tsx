import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai'; 
import { localeAtom, mnemonicAtom, hasEncryptedWalletAtom, walletModalOpenAtom } from './atoms';
import i18n from './i18n';

// === PAGES - CRITICAL PATH (Eager) ===
import DirectoryPage from './pages/DirectoryPage';
import ClientWalletPage from './pages/ClientWalletPage';
import LandingPage from './pages/LandingPage';
import SettingsPage from './pages/SettingsPage';

// === PAGES - SECONDARY (Lazy Loading) ===
// Lazy load pages not needed on initial load
const SendPage = lazy(() => import('./pages/SendPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const CompleteTokenImportPage = lazy(() => import('./pages/CompleteTokenImportPage'));
const ManageTokenPage = lazy(() => import('./pages/ManageTokenPage'));
const ManageProfilePage = lazy(() => import('./pages/ManageProfilePage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const TokenPage = lazy(() => import('./pages/TokenPage'));

// === PAGES - ADMIN ONLY (Lazy Loading) ===
// These pages are only for admins - no need in initial bundle
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminVerificationPage = lazy(() => import('./pages/AdminVerificationPage'));
const RequestListingPage = lazy(() => import('./pages/VerificationRequestPage'));

// Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminGateRoute from './components/Admin/AdminGateRoute';
import ThemeProvider from './components/ThemeProvider';
import Notification from './components/Notification';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingAdminButton from './components/Admin/FloatingAdminButton';
import LazyBoundary from './components/LazyBoundary';
import TopBar from './components/Layout/TopBar'; // ✅ REMPLACEMENT: Header -> TopBar

// SECURITY COMPONENTS
import UnlockWallet from './components/Auth/UnlockWallet';
import OnboardingModal from './components/eCash/OnboardingModal';

// Hooks
import { useEcashWallet } from './hooks/useEcashWallet';

// i18n & Styles
import './i18n';
import './App.css';
import './styles/themes.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/utilities.css';
import './styles/landing.css';

// --- GUARD DE SÉCURITÉ ---
const WalletAuthGuard = ({ children }) => {
  const mnemonic = useAtomValue(mnemonicAtom);
  const hasEncryptedWallet = useAtomValue(hasEncryptedWalletAtom);

  // 1. Connecté -> Autorisé
  if (mnemonic) return children;

  // 2. Wallet existant mais verrouillé -> Login
  if (hasEncryptedWallet) {
    return (
      <div className="main-content center-screen">
        <UnlockWallet />
      </div>
    );
  }

  // 3. Pas de wallet -> Assistant de création (Mode Page)
  return (
    <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <OnboardingModal isPageMode={true} />
    </div>
  );
};


function App() {
  const [locale] = useAtom(localeAtom);
  
  // setIsModalOpen sert à la fois à lire et modifier l'état
  const [isModalOpen, setIsModalOpen] = useAtom(walletModalOpenAtom); 
  const setWalletModalOpen = useSetAtom(walletModalOpenAtom);
  const mnemonic = useAtomValue(mnemonicAtom);

  const { loading } = useEcashWallet();

  // --- LOGIQUE DE SÉCURITÉ ET NETTOYAGE ---

  // 1. Au démarrage, on force la fermeture du modal pour éviter qu'il traîne
  useEffect(() => {
    setWalletModalOpen(false);
  }, []);

  // 2. Si l'utilisateur se connecte, on ferme le modal de force
  useEffect(() => {
    if (mnemonic) {
      setWalletModalOpen(false);
    }
  }, [mnemonic]);
  // 3. Gestion de la langue

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  if (loading) return <ThemeProvider><LoadingScreen /></ThemeProvider>;

  // Le modal global ne s'affiche que si demandé ET que l'utilisateur n'est pas déjà connecté
  const showGlobalModal = isModalOpen && !mnemonic;

  return (
    <ThemeProvider>
      <Router>
        <ErrorBoundary>
          <div className="app-container" style={{ position: 'relative', minHeight: '100vh' }}>
            <Notification />
            <FloatingAdminButton />
            
            {/* --- MODAL GLOBAL (POPUP) --- */}
            {/* On passe explicitement isPageMode={false} */}
            {showGlobalModal && (
               <OnboardingModal onClose={() => setIsModalOpen(false)} isPageMode={false} />
            )}

            <Routes>
              {/* === PUBLIC (Pas de Guard) === */}
              <Route path="/" element={<DirectoryPage />} />
              <Route path="/landingpage" element={<LandingPage />} />
              <Route path="/faq" element={
                <LazyBoundary>
                  <FaqPage />
                </LazyBoundary>
              } />

              {/* === PRIVÉ (Guard actif) === */}
              <Route path="/wallet" element={<WalletAuthGuard><ClientWalletPage /></WalletAuthGuard>} />
              <Route path="/send" element={
                <LazyBoundary>
                  <WalletAuthGuard><SendPage /></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/settings" element={<WalletAuthGuard><SettingsPage /></WalletAuthGuard>} />
              <Route path="/create-token" element={<Navigate to="/manage-token" replace />} />
              <Route path="/complete-token-import" element={
                <LazyBoundary>
                  <WalletAuthGuard><CompleteTokenImportPage /></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/manage-token" element={
                <LazyBoundary>
                  <WalletAuthGuard><AdminGateRoute fallbackRoute="/wallet"><ManageTokenPage /></AdminGateRoute></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/token/:tokenId" element={
                <LazyBoundary>
                  <WalletAuthGuard><TokenPage /></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/request-listing/:tokenId" element={
                <LazyBoundary>
                  <WalletAuthGuard><RequestListingPage /></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/manage-profile/:tokenId" element={
                <LazyBoundary>
                  <WalletAuthGuard><AdminGateRoute fallbackRoute="/manage-token"><ManageProfilePage /></AdminGateRoute></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/manage-profile" element={
                <LazyBoundary>
                  <WalletAuthGuard><ManageProfilePage /></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/support" element={
                <LazyBoundary>
                  <WalletAuthGuard><SupportPage /></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/admin/verification" element={
                <LazyBoundary>
                  <WalletAuthGuard><AdminGateRoute fallbackRoute="/"><AdminVerificationPage /></AdminGateRoute></WalletAuthGuard>
                </LazyBoundary>
              } />
              <Route path="/admin" element={
                <LazyBoundary>
                  <WalletAuthGuard><AdminGateRoute fallbackRoute="/"><AdminDashboard /></AdminGateRoute></WalletAuthGuard>
                </LazyBoundary>
              } />

              {/* Redirections */}
              <Route path="/home" element={<Navigate to="/wallet" replace />} />
              <Route path="/directory" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App;