import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { localeAtom, savedMnemonicAtom } from './atoms';
import i18n from './i18n';

// Pages
import DirectoryPage from './pages/DirectoryPage';
import ClientWalletPage from './pages/ClientWalletPage';
import SendPage from './pages/SendPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import FaqPage from './pages/FaqPage';
import CreateTokenPage from './pages/CreateTokenPage';
import CompleteTokenImportPage from './pages/CompleteTokenImportPage';
import ManageTokenPage from './pages/ManageTokenPage';
import ManageProfilePage from './pages/ManageProfilePage';
import SupportPage from './pages/SupportPage';
import AdminVerificationPage from './pages/AdminVerificationPage';
import AdminDashboard from './pages/AdminDashboard';
import TokenPage from './pages/TokenPage';
import RequestListingPage from './pages/VerificationRequestPage';

// Layout & Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminGateRoute from './components/Admin/AdminGateRoute';
import ThemeProvider from './components/ThemeProvider';
import Notification from './components/Notification';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingAdminButton from './components/Admin/FloatingAdminButton';

// Hooks
import { useEcashWallet } from './hooks/useEcashWallet';

// i18n
import './i18n';

// Styles
import './App.css';
import './styles/themes.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/utilities.css';

function App() {
  const [locale] = useAtom(localeAtom);
  const [savedMnemonic] = useAtom(savedMnemonicAtom);
  const { walletConnected, loading, initializeWallet } = useEcashWallet();

  useEffect(() => {
    // Initialize i18n on app load
    import('./i18n').then(() => {
      console.log('i18n initialized');
    });
  }, []);

  // Synchronize locale atom with i18n system
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  // NOTE: Auto-initialization is handled by useEcashWallet hook
  // No need to call initializeWallet here to avoid infinite loop

  // Show loading state while wallet initializes
  if (loading) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <ErrorBoundary>
          <div className="app-container">
            <Notification />
            <FloatingAdminButton />
            <Routes>
              {/* ========================================
                  ROUTES PUBLIQUES (Sans wallet requis)
                  ======================================== */}
              
              {/* Annuaire - Point d'entrée public */}
              <Route path="/" element={<DirectoryPage />} />
              
              {/* Espace Producteur - DOIT Être PUBLIC */}
              <Route path="/landing" element={<LandingPage />} />
              
              {/* FAQ - Page d'aide publique */}
              <Route path="/faq" element={<FaqPage />} />
              
              {/* ========================================
                  ROUTES PRIVÉES (Wallet requis)
                  ======================================== */}
              
              {/* Dashboard personnel (Wallet, profil optionnel) */}
              <Route 
                path="/wallet" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <ClientWalletPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Envoyer des tokens */}
              <Route 
                path="/send" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <SendPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Profil favorites - redirection vers annuaire */}
              <Route path="/favorites" element={<Navigate to="/" replace />} />
              
              {/* Paramètres */}
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <SettingsPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Création de jetons */}
              <Route 
                path="/create-token" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <CreateTokenPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Compléter l'import d'un token existant */}
              <Route 
                path="/complete-token-import" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <CompleteTokenImportPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Gestion de jetons - Nécessite au minimum 1 mint baton */}
              <Route 
                path="/manage-token" 
                element={
                  <AdminGateRoute fallbackRoute="/create-token">
                    <ErrorBoundary>
                      <ManageTokenPage />
                    </ErrorBoundary>
                  </AdminGateRoute>
                }
              />
              
              {/* Détails d'un token spécifique */}
              <Route 
                path="/token/:tokenId" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <TokenPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Demande de listing d'un token */}
              <Route 
                path="/request-listing/:tokenId" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <RequestListingPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Gestion des informations du profil */}
              <Route 
                path="/manage-profile/:tokenId" 
                element={
                  <AdminGateRoute fallbackRoute="/manage-token">
                    <ErrorBoundary>
                      <ManageProfilePage />
                    </ErrorBoundary>
                  </AdminGateRoute>
                }
              />
              
              {/* Page de gestion sans tokenId (création nouveau profil) */}
              <Route 
                path="/manage-profile" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <ManageProfilePage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Page de support pour les créateurs */}
              <Route 
                path="/support" 
                element={
                  <ProtectedRoute requireProfile={false}>
                    <ErrorBoundary>
                      <SupportPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Page d'administration - Vérification des profils */}
              <Route 
                path="/admin/verification" 
                element={
                  <AdminGateRoute fallbackRoute="/">
                    <ErrorBoundary>
                      <AdminVerificationPage />
                    </ErrorBoundary>
                  </AdminGateRoute>
                }
              />
              
              {/* Page d'administration - Dashboard principal */}
              <Route 
                path="/admin" 
                element={
                  <AdminGateRoute fallbackRoute="/">
                    <ErrorBoundary>
                      <AdminDashboard />
                    </ErrorBoundary>
                  </AdminGateRoute>
                }
              />
              
              {/* ========================================
                  REDIRECTIONS & COMPATIBILITÉ
                  ======================================== */}
              
              {/* Anciennes routes */}
              <Route path="/home" element={<Navigate to="/wallet" replace />} />
              <Route path="/directory" element={<Navigate to="/" replace />} />
              <Route path="/fund" element={<Navigate to="/settings" replace />} />
              
              {/* Catch-all - Redirection vers annuaire */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App;