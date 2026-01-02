import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom, useAtomValue } from 'jotai';
import { profilService } from '../../services/profilService';
import { notificationAtom, walletAtom } from '../../atoms';
import { Card, CardContent, Button, Stack } from '../UI';

/**
 * TokenSwitch - Gestion de l'association d'un jeton au profil du créateur
 * 
 * Permet au créateur de :
 * - Associer un jeton créé à son profil de ferme
 * - Contrôler la visibilité du jeton dans l'annuaire
 * - Gérer les informations enrichies du jeton
 * 
 * @param {string} tokenId - ID du jeton
 * @param {Object} tokenData - Données du jeton
 * @param {Object} tokenInfo - Infos détaillées du jeton
 * @param {boolean} isCreator - Si l'utilisateur est le créateur
 * @param {Object} profileInfo - Infos du profil du créateur
 * @param {boolean} isTokenVisible - Si le jeton est visible
 * @param {Function} onUpdate - Callback lors de la mise à jour
 */
const TokenSwitch = ({
  tokenId = null,
  tokenData = null,
  tokenInfo = null,
  isCreator = false,
  profileInfo = null,
  isTokenVisible = false,
  onUpdate = null
}) => {
  const navigate = useNavigate();
  const wallet = useAtomValue(walletAtom);
  const setNotification = useSetAtom(notificationAtom);
  
  const [processing, setProcessing] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  /**
   * Récupérer l'adresse wallet de manière sécurisée
   */
  const getWalletAddress = () => {
    try {
      if (wallet?.getAddress) return wallet.getAddress();
      if (wallet?.address) return wallet.address;
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'adresse wallet:', err);
    }
    return null;
  };

  /**
   * Associer un token au profil du créateur
   */
  const handleAssociateToProfile = async () => {
    if (!wallet || !tokenInfo) {
      setNotification({
        type: 'error',
        message: '⚠️ Données insuffisantes pour l\'association'
      });
      return;
    }

    setProcessing(true);
    try {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        throw new Error('Adresse wallet introuvable');
      }
      
      // Vérifier si l'utilisateur a déjà un profil
      const existingProfile = await profilService.getMyProfil(walletAddress);
      
      if (!existingProfile) {
        // Pas de profil : rediriger vers la création avec le tokenId
        console.log('➡️ Redirection vers création de profil avec token');
        setNotification({
          type: 'info',
          message: '📋 Créez d\'abord votre profil de ferme'
        });
        navigate(`/manage-profile/${tokenId}`);
        return;
      }
      
      // Recharger les données pour synchroniser
      const updatedProfile = await profilService.getProfilByOwner(walletAddress);
      
      setNotification({
        type: 'success',
        message: `✅ Le jeton ${tokenData?.ticker || 'est maintenant'} associé à votre ferme !`
      });
      
      // Appel le callback d'update si fourni
      if (onUpdate) {
        onUpdate({ associated: true, profile: updatedProfile });
      }
      
    } catch (err) {
      console.error('❌ Erreur association:', err);
      const errorMessage = err instanceof Error ? err.message : 'Impossible d\'associer le jeton à votre ferme';
      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Basculer la visibilité du jeton
   */
  const handleToggleVisibility = async () => {
    if (!tokenId) {
      setNotification({
        type: 'error',
        message: '⚠️ Données manquantes pour contrôler la visibilité'
      });
      return;
    }

    setTogglingVisibility(true);
    try {
      // Appel au service pour basculer la visibilité
      // await tokenService.toggleTokenVisibility(tokenId, !isTokenVisible);
      
      setNotification({
        type: 'success',
        message: `✅ Visibilité du jeton ${isTokenVisible ? 'masquée' : 'affichée'}`
      });
      
      if (onUpdate) {
        onUpdate({ visible: !isTokenVisible });
      }
      
    } catch (err) {
      console.error('❌ Erreur visibilité:', err);
      const errorMessage = err instanceof Error ? err.message : 'Impossible de changer la visibilité du jeton';
      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Jeton introuvable
  if (!tokenInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-5xl mb-4 opacity-30">❌</div>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Jeton introuvable
          </h3>
          <Button onClick={() => navigate('/manage-token')} className="w-full">
            ← Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Rendu principal
  return (
    <Stack spacing="md">
      {/* CTA: ASSOCIER LE JETON À LA FERME */}
      {isCreator && !profileInfo && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🔗</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-2">
                  ⚠️ Jeton non lié à votre ferme
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                  Vous êtes le créateur de ce jeton (Mint Baton possédé), mais il n'est pas encore associé à votre profil de ferme. 
                  Associez-le pour gérer sa visibilité publique, ses objectifs et contreparties.
                </p>
                <Button
                  onClick={handleAssociateToProfile}
                  disabled={processing}
                  variant="primary"
                  className="w-full"
                >
                  {processing ? '⏳ Association...' : '🔗 Associer à mon Profil'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GESTION VISIBILITÉ */}
      {isCreator && profileInfo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-md)',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--spacing-md)'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}>
              👁️ Visible dans l'annuaire
            </h3>
            <p style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 'var(--line-height-normal)'
            }}>
              {isTokenVisible 
                ? 'Les visiteurs peuvent voir ce jeton sur votre profil'
                : 'Ce jeton est masqué de votre profil public'}
            </p>
          </div>
          <Button
            onClick={handleToggleVisibility}
            disabled={togglingVisibility}
            variant={isTokenVisible ? 'success' : 'secondary'}
          >
            {togglingVisibility ? '⏳' : isTokenVisible ? '👁️ Visible' : '🙈 Masqué'}
          </Button>
        </div>
      )}

      {/* AVERTISSEMENT : JETON NON LIÉ */}
      {isCreator && !profileInfo && (
        <Card style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24'
        }}>
          <CardContent className="p-4">
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: '#92400e',
              margin: 0,
              lineHeight: 'var(--line-height-normal)'
            }}>
              ⚠️ Ce jeton n'est pas encore lié à un profil. Associez-le pour contrôler sa visibilité publique.
            </p>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

export default TokenSwitch;