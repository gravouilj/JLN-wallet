import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
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

// Layout & Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminGateRoute from './components/Admin/AdminGateRoute';
import ThemeProvider from './components/ThemeProvider';
import Notification from './components/Notification';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingAdminButton from './components/Admin/FloatingAdminButton';
import Header from './components/Header'; // ✅ AJOUT INDISPENSABLE

// SECURITY COMPONENTS
import UnlockWallet from './components/Auth/UnlockWallet';
import OnboardingModal from './components/eCash/OnboardingModal';

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
import './styles/landing.css';

/**
 * Composant de sécurité (Guard)
 * Intercepte l'accès aux routes privées (ex: /wallet).
 * - Si connecté : Affiche la page.
 * - Si wallet verrouillé : Affiche Login.
 * - Si aucun wallet : Affiche Wizard (Mode page bloquante).
 */
const WalletAuthGuard = ({ children }) => {
  const mnemonic = useAtomValue(mnemonicAtom);
  const hasEncryptedWallet = useAtomValue(hasEncryptedWalletAtom);

  // 1. L'utilisateur est connecté (clé en RAM) -> Accès autorisé
  if (mnemonic) {
    return children;
  }

  // 2. Un wallet existe mais est verrouillé -> Demande mot de passe
  if (hasEncryptedWallet) {
    return (
      <div className="main-content center-screen">
        <UnlockWallet />
      </div>
    );
  }

  // 3. Aucun wallet n'existe -> Wizard de création (Mode Bloquant)
  // isPageMode=true retire le bouton "Fermer" car on est sur une route privée
  return <OnboardingModal isPageMode={true} />;
};

function App() {
  const [locale] = useAtom(localeAtom);
  const [isModalOpen, setIsModalOpen] = useAtom(walletModalOpenAtom); // ✅ Gestion ouverture modal depuis Header
  const { loading } = useEcashWallet();

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

  // Show loading state while wallet initializes (global check)
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
            
            {/* ✅ LE HEADER DOIT ÊTRE ICI POUR ÊTRE VISIBLE PARTOUT */}
            <Header />

            {/* ✅ MODAL GLOBAL (Popup) */}
            {/* S'ouvre quand on clique sur "Connexion" dans le Header */}
            {isModalOpen && (
               <div style={{
                 position: 'fixed', 
                 zIndex: 9999, 
                 top:0, left:0, 
                 width:'100%', height:'100%',
                 pointerEvents: 'none' // Permet de cliquer à travers le container vide, le modal réactivera les events
               }}>
                 {/* On passe une fonction onClose pour fermer le modal */}
                 <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                    <OnboardingModal onClose={() => setIsModalOpen(false)} />
                 </div>
               </div>
            )}

            <Routes>
              {/* ========================================
                  ROUTES PUBLIQUES (Sans wallet requis)
                  ======================================== */}
              
              {/* Annuaire - Point d'entrée public */}
              <Route path="/" element={<DirectoryPage />} />
              
              {/* Espace Créateur - DOIT Être PUBLIC */}
              <Route path="/landingpage" element={<LandingPage />} />
              
              {/* FAQ - Page d'aide publique */}
              <Route path="/faq" element={<FaqPage />} />
              
              {/* ========================================
                  ROUTES PRIVÉES (Wallet + Auth requis)
                  Toutes ces routes sont enveloppées dans WalletAuthGuard
                  ======================================== */}
              
              {/* Dashboard personnel (Wallet, profil optionnel) */}
              <Route 
                path="/wallet" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <ClientWalletPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Envoyer des tokens */}
              <Route 
                path="/send" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <SendPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Profil favorites - redirection vers annuaire */}
              <Route path="/favorites" element={<Navigate to="/" replace />} />
              
              {/* Paramètres */}
              <Route 
                path="/settings" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <SettingsPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Création de jetons - redirige vers manage-token (wizard intégré) */}
              <Route 
                path="/create-token" 
                element={<Navigate to="/manage-token" replace />}
              />
              
              {/* Compléter l'import d'un token existant */}
              <Route 
                path="/complete-token-import" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <CompleteTokenImportPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Gestion de jetons - Nécessite au minimum 1 mint baton */}
              <Route 
                path="/manage-token" 
                element={
                  <WalletAuthGuard>
                    <AdminGateRoute fallbackRoute="/wallet">
                      <ErrorBoundary>
                        <ManageTokenPage />
                      </ErrorBoundary>
                    </AdminGateRoute>
                  </WalletAuthGuard>
                }
              />
              
              {/* Détails d'un token spécifique */}
              <Route 
                path="/token/:tokenId" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <TokenPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Demande de listing d'un token */}
              <Route 
                path="/request-listing/:tokenId" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <RequestListingPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Gestion des informations du profil */}
              <Route 
                path="/manage-profile/:tokenId" 
                element={
                  <WalletAuthGuard>
                    <AdminGateRoute fallbackRoute="/manage-token">
                      <ErrorBoundary>
                        <ManageProfilePage />
                      </ErrorBoundary>
                    </AdminGateRoute>
                  </WalletAuthGuard>
                }
              />
              
              {/* Page de gestion sans tokenId (création nouveau profil) */}
              <Route 
                path="/manage-profile" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <ManageProfilePage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Page de support pour les créateurs */}
              <Route 
                path="/support" 
                element={
                  <WalletAuthGuard>
                    <ProtectedRoute requireProfile={false}>
                      <ErrorBoundary>
                        <SupportPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </WalletAuthGuard>
                } 
              />
              
              {/* Page d'administration - Vérification des profils */}
              <Route 
                path="/admin/verification" 
                element={
                  <WalletAuthGuard>
                    <AdminGateRoute fallbackRoute="/">
                      <ErrorBoundary>
                        <AdminVerificationPage />
                      </ErrorBoundary>
                    </AdminGateRoute>
                  </WalletAuthGuard>
                }
              />
              
              {/* Page d'administration - Dashboard principal */}
              <Route 
                path="/admin" 
                element={
                  <WalletAuthGuard>
                    <AdminGateRoute fallbackRoute="/">
                      <ErrorBoundary>
                        <AdminDashboard />
                      </ErrorBoundary>
                    </AdminGateRoute>
                  </WalletAuthGuard>
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