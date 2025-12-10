import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { localeAtom, savedMnemonicAtom } from './atoms';
import i18n from './i18n';

// Pages
import DirectoryPage from './pages/DirectoryPage';
import WalletDashboard from './pages/WalletDashboard';
import SendPage from './pages/SendPage';
import SettingsPage from './pages/SettingsPage';
import FavoritesPage from './pages/FavoritesPage';
import FarmerInfoPage from './pages/FarmerInfoPage';
import FaqPage from './pages/FaqPage';
import CreateTokenPage from './pages/CreateTokenPage';
import CompleteTokenImportPage from './pages/CompleteTokenImportPage';
import ManageTokenPage from './pages/ManageTokenPage';
import ManageFarmPage from './pages/ManageFarmPage';
import AdminVerificationPage from './pages/AdminVerificationPage';
import TokenDetailsPage from './pages/TokenDetailsPage';
import RequestListingPage from './pages/RequestListingPage';

// Layout & Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminGateRoute from './components/AdminGateRoute';
import ThemeProvider from './components/ThemeProvider';
import Notification from './components/Notification';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Hooks
import { useEcashWallet } from './hooks/useEcashWallet';

// i18n
import './i18n';

// Styles
import './App.css';
import './styles/themes.css';
import './styles/layout.css';
import './styles/components.css';

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
            <Routes>
              {/* ========================================
                  ROUTES PUBLIQUES (Sans wallet requis)
                  ======================================== */}
              
              {/* Annuaire - Point d'entrée public */}
              <Route path="/" element={<DirectoryPage />} />
              
              {/* Espace Producteur - DOIT Être PUBLIC */}
              <Route path="/farmer-info" element={<FarmerInfoPage />} />
              
              {/* FAQ - Page d'aide publique */}
              <Route path="/faq" element={<FaqPage />} />
              
              {/* ========================================
                  ROUTES PRIVÉES (Wallet requis)
                  ======================================== */}
              
              {/* Dashboard personnel (Wallet, ferme optionnelle) */}
              <Route 
                path="/wallet" 
                element={
                  <ProtectedRoute requireFarm={false}>
                    <ErrorBoundary>
                      <WalletDashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Envoyer des tokens */}
              <Route 
                path="/send" 
                element={
                  <ProtectedRoute requireFarm={false}>
                    <ErrorBoundary>
                      <SendPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Fermes favorites */}
              <Route 
                path="/favorites" 
                element={
                  <ProtectedRoute requireFarm={false}>
                    <ErrorBoundary>
                      <FavoritesPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Paramètres */}
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute requireFarm={false}>
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
                  <ProtectedRoute requireFarm={false}>
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
                  <ProtectedRoute requireFarm={false}>
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
                  <ProtectedRoute requireFarm={false}>
                    <ErrorBoundary>
                      <TokenDetailsPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Demande de listing d'un token */}
              <Route 
                path="/request-listing/:tokenId" 
                element={
                  <ProtectedRoute requireFarm={false}>
                    <ErrorBoundary>
                      <RequestListingPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              
              {/* Gestion des informations de la ferme */}
              <Route 
                path="/manage-farm/:tokenId" 
                element={
                  <AdminGateRoute fallbackRoute="/manage-token">
                    <ErrorBoundary>
                      <ManageFarmPage />
                    </ErrorBoundary>
                  </AdminGateRoute>
                }
              />
              
              {/* Page de gestion sans tokenId (création nouvelle ferme) */}
              <Route 
                path="/manage-farm" 
                element={
                  <ProtectedRoute requireFarm={false}>
                    <ErrorBoundary>
                      <ManageFarmPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              
              {/* Page d'administration - Vérification des fermes */}
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