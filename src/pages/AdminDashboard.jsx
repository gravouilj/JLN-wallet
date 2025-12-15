import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import { Tabs, PageLayout, Stack, PageHeader } from '../components/UI';
import AdminTicketSystem from '../components/Admin/AdminTicketSystem';
import AdminVerificationPage from './AdminVerificationPage';
import AdminSettings from '../components/Admin/AdminSettings';
import AdminStats from '../components/Admin/AdminStats';
import { useAdmin } from '../hooks/useAdmin';
import { notificationAtom } from '../atoms';

/**
 * AdminDashboard - Dashboard principal de l'administration
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Sections :
 * - Vérifications : Gestion des profils (en attente, vérifiés, refusés, etc.)
 * - Support : Système de tickets (créateurs, clients, signalements)
 * - Paramètres : Configuration CTA, délais, notifications
 * - Statistiques : Métriques de l'application
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isChecking } = useAdmin();
  const setNotification = useSetAtom(notificationAtom);
  const [activeTab, setActiveTab] = useState('verifications');

  // Redirection si non admin
  useEffect(() => {
    if (!isChecking && !isAdmin) {
      setNotification({ 
        type: 'error', 
        message: 'Accès refusé. Vous devez être administrateur.' 
      });
      navigate('/');
    }
  }, [isAdmin, isChecking, navigate, setNotification]);

  if (isChecking) {
    return (
      <MobileLayout>
        <div className="text-center p-8">
          <div className="loading-spinner text-4xl mb-4">⏳</div>
          <p className="text-secondary">Vérification des permissions...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MobileLayout title="Administration">
      <PageLayout hasBottomNav>
        <Stack spacing="md">
          {/* Header */}
          <PageHeader 
            icon="🛡️" 
            title="Dashboard Admin" 
            subtitle="Gestion et supervision de la plateforme"
          />

          {/* Navigation par onglets */}
          <Tabs
            tabs={[
              { 
                id: 'verifications', 
                label: '✅ Vérifications' 
              },
              { 
                id: 'support', 
                label: '🎫 Support' 
              },
              { 
                id: 'settings', 
                label: '⚙️ Paramètres' 
              },
              { 
                id: 'stats', 
                label: '📊 Statistiques' 
              }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Contenu selon l'onglet actif */}
          <div className="admin-dashboard-content">
            {activeTab === 'verifications' && (
              <AdminVerificationPage embedded />
            )}

            {activeTab === 'support' && (
              <AdminTicketSystem 
                onNotification={setNotification}
              />
            )}

            {activeTab === 'settings' && (
              <AdminSettings 
                onNotification={setNotification}
              />
            )}

            {activeTab === 'stats' && (
              <AdminStats 
                onNotification={setNotification}
              />
            )}
          </div>
        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default AdminDashboard;
