import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai'; 
import { localeAtom, mnemonicAtom, hasEncryptedWalletAtom, walletModalOpenAtom } from './atoms';
import i18n from './i18n';

// Pages
import DirectoryPage from './pages/DirectoryPage';
import ClientWalletPage from './pages/ClientWalletPage';
import SendPage from './pages/SendPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import FaqPage from './pages/FaqPage';
import CompleteTokenImportPage from './pages/CompleteTokenImportPage';
import ManageTokenPage from './pages/ManageTokenPage';
import ManageProfilePage from './pages/ManageProfilePage';
import SupportPage from './pages/SupportPage';
import AdminVerificationPage from './pages/AdminVerificationPage';
import AdminDashboard from './pages/AdminDashboard';
import TokenPage from './pages/TokenPage';
import RequestListingPage from './pages/VerificationRequestPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminGateRoute from './components/Admin/AdminGateRoute';
import ThemeProvider from './components/ThemeProvider';
import Notification from './components/Notification';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingAdminButton from './components/Admin/FloatingAdminButton';
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
              <Route path="/faq" element={<FaqPage />} />

              {/* === PRIVÉ (Guard actif) === */}
              <Route path="/wallet" element={<WalletAuthGuard><ClientWalletPage /></WalletAuthGuard>} />
              <Route path="/send" element={<WalletAuthGuard><SendPage /></WalletAuthGuard>} />
              <Route path="/settings" element={<WalletAuthGuard><SettingsPage /></WalletAuthGuard>} />
              <Route path="/create-token" element={<Navigate to="/manage-token" replace />} />
              <Route path="/complete-token-import" element={<WalletAuthGuard><CompleteTokenImportPage /></WalletAuthGuard>} />
              <Route path="/manage-token" element={<WalletAuthGuard><AdminGateRoute fallbackRoute="/wallet"><ManageTokenPage /></AdminGateRoute></WalletAuthGuard>} />
              <Route path="/token/:tokenId" element={<WalletAuthGuard><TokenPage /></WalletAuthGuard>} />
              <Route path="/request-listing/:tokenId" element={<WalletAuthGuard><RequestListingPage /></WalletAuthGuard>} />
              <Route path="/manage-profile/:tokenId" element={<WalletAuthGuard><AdminGateRoute fallbackRoute="/manage-token"><ManageProfilePage /></AdminGateRoute></WalletAuthGuard>} />
              <Route path="/manage-profile" element={<WalletAuthGuard><ManageProfilePage /></WalletAuthGuard>} />
              <Route path="/support" element={<WalletAuthGuard><SupportPage /></WalletAuthGuard>} />
              <Route path="/admin/verification" element={<WalletAuthGuard><AdminGateRoute fallbackRoute="/"><AdminVerificationPage /></AdminGateRoute></WalletAuthGuard>} />
              <Route path="/admin" element={<WalletAuthGuard><AdminGateRoute fallbackRoute="/"><AdminDashboard /></AdminGateRoute></WalletAuthGuard>} />

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