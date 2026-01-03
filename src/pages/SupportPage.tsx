import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { notificationAtom, selectedProfileAtom, walletConnectedAtom } from '../atoms';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { supabase } from '../services/supabaseClient';
import SupportTab from '../features/profile/components/SupportTab';
import { Card, CardContent, InfoBox } from '../components/UI';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';

/**
 * SupportPage - Page dédiée au support pour les créateurs
 * 
 * Affiche le composant SupportTab avec tous les outils de communication
 * avec l'équipe admin et la gestion des tickets.
 */
const SupportPage = () => {
  const location = useLocation();
  const { address } = useEcashWallet();
  const [, setNotification] = useAtom(notificationAtom);
  const [selectedProfile] = useAtom(selectedProfileAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil du créateur
  useEffect(() => {
    const loadProfile = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('owner_address', address)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        setProfileData(data);
      } catch (err) {
        console.error('❌ Erreur chargement profil:', err);
        setNotification({
          type: 'error',
          message: 'Erreur lors du chargement du profil'
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [address]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>⏳ Chargement...</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardContent className="p-6">
            <InfoBox type="warning" icon="⚠️">
              <strong>Wallet non connecté</strong><br />
              Connectez votre wallet pour accéder au support.
            </InfoBox>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardContent className="p-6">
            <InfoBox type="info" icon="ℹ️">
              <strong>Profil non trouvé</strong><br />
              Vous devez créer un profil de créateur pour accéder au support.
            </InfoBox>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <TopBar />
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <SupportTab
          profilId={profileData.id}
          existingProfiles={profileData}
          walletAddress={address}
          setNotification={setNotification}
          onCreateTicket={(ticket) => {
            console.log('✅ Ticket créé:', ticket);
            setNotification({
              type: 'success',
              message: 'Ticket créé avec succès'
            });
          }}
        />
      </div>
      {walletConnected && <BottomNavigation />}
    </>
  );
};

export default SupportPage;
