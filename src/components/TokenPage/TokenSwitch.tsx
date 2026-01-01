 //Switch 🔗 isLinked et  👁️ isVisible */}
 
 // 🔗 Associer un token créé (Mint Baton) au profil de l'utilisateur
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
      const walletAddress = wallet.getAddress();
      
      // Vérifier si l'utilisateur a déjà un profil
      const existingProfile = await profilService.getMyProfile(walletAddress);
      
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
      const updatedProfile = await profilService.getProfileByOwner(walletAddress);
      setProfileInfo(updatedProfile);
      refreshProfiles();
      
      setNotification({
        type: 'success',
        message: `✅ Le jeton ${tokenData.ticker} est maintenant associé à votre ferme !`
      });
      
      // Rafraîchir les données (sans reload)
      setTimeout(() => refreshTokenData(), 1000);
      
    } catch (err) {
      console.error('❌ Erreur association:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Impossible d\'associer le jeton à votre ferme'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingProfiles) {
    return (
      <MobileLayout title="Chargement...">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Stack spacing="md">
            <Card>
              <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-gray-900 dark:text-white">Chargement des fermes...</p>
              </CardContent>
            </Card>
          </Stack>
        </PageLayout>
      </MobileLayout>
    );
  }

  if (loading) {
    return (
      <MobileLayout title="Chargement...">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Stack spacing="md">
            <Card>
              <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-900 dark:text-white">Chargement des données...</p>
              </CardContent>
            </Card>
          </Stack>
        </PageLayout>
      </MobileLayout>
    );
  }

  if (!tokenInfo) {
    return (
      <MobileLayout title="Erreur">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Stack spacing="md">
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
          </Stack>
        </PageLayout>
      </MobileLayout>
    );
  }

  {/* 🔗 CTA: ASSOCIER LE JETON À LA FERME */}
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
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
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
              padding: '16px',
              backgroundColor: 'var(--bg-primary, #fff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: '0 0 4px 0'
                }}>
                  👁️ Visible dans l'annuaire
                </h3>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #6b7280)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {isTokenVisible 
                    ? 'Les visiteurs peuvent voir ce jeton sur votre profil'
                    : 'Ce jeton est masqué de votre profil public'}
                </p>
              </div>
              <VisibilityToggle
                isVisible={isTokenVisible}
                onChange={handleToggleVisibility}
                disabled={togglingVisibility}
                labelVisible="Visible"
                labelHidden="Masqué"
              />
            </div>
          )}

          {isCreator && !profileInfo && (
            <Card style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              marginBottom: '16px'
            }}>
              <CardContent className="p-4">
                <p style={{
                  fontSize: '0.85rem',
                  color: '#92400e',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  ⚠️ Ce jeton n'est pas encore lié à un profil. Associez-le pour contrôler sa visibilité publique.
                </p>
              </CardContent>
            </Card>
          )}