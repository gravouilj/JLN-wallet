 // ALERTE PROFIL UTILISATEUR
 
 {/* ALERTE DEMANDE D'INFO ADMIN */}
          {existingProfile && existingProfile.verification_status === 'info_requested' && (
            <InfoBox type="warning" icon="💬" title="Informations supplémentaires demandées">
              <strong>Message de l'administrateur :</strong> {existingProfile.admin_message || 'Consultez l\'historique des échanges ci-dessous'}
              <br /><br />
              Répondez dans l'historique des échanges ou corrigez les informations demandées.
            </InfoBox>
          )}

          {/* ALERTE DEMANDE DE VÉRIFICATION EN COURS */}
          {existingProfile && existingProfile.verification_status === 'pending' && (
            <Card style={{ 
              backgroundColor: '#fef3c7', 
              border: '2px solid #fbbf24' 
            }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⏳</span>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#92400e',
                    margin: 0
                  }}>
                    Demande de vérification en cours
                  </h3>
                </div>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#92400e',
                  margin: 0,
                  paddingLeft: '2.25rem'
                }}>
                  Votre demande de validation est en cours d'examen par un administrateur. 
                  Vous serez notifié dès que celle-ci sera traitée.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ALERTE DEMANDE REFUSÉE */}
          {existingProfile && existingProfile.verification_status === 'rejected' && existingProfile.status !== 'banned' && existingProfile.status !== 'deleted' && (
            <InfoBox type="error" icon="🚫" title="Demande de vérification refusée">
              <strong>Motif :</strong> {existingProfile.admin_message || 'Aucun motif fourni'}
              <br /><br />
              Vous pouvez corriger les informations demandées et soumettre une nouvelle demande de vérification.
            </InfoBox>
          )}

          {/* ALERTE FERME BANNIE */}
          {existingProfile && (existingProfile.status === 'banned' || existingProfile.status === 'deleted') && (
            <InfoBox 
              type="error" 
              icon="🛑" 
              title={existingProfile.status === 'banned' ? 'FERME BANNIE' : 'SUPPRESSION EN COURS'}
              style={{ backgroundColor: '#450a0a', borderColor: '#ef4444' }}
            >
              <strong style={{ color: '#fecaca' }}>Motif :</strong> 
              <span style={{ color: '#fecaca' }}> {existingProfile.deletion_reason || existingProfile.admin_message || 'Non spécifié'}</span>
              <br /><br />
              <span style={{ color: '#fecaca' }}>
                {existingProfile.status === 'banned' 
                  ? 'Votre ferme a été bannie. Contactez l\'administrateur pour plus d\'informations.'
                  : 'Votre ferme sera supprimée définitivement dans 1 an. Contactez l\'administrateur si c\'est une erreur.'
                }
              </span>
            </InfoBox>
          )}

          {/* ALERTE RE-VÉRIFICATION ANNUELLE */}
          {existingProfile && checkVerificationAge() !== null && (
            <Card style={{ 
              backgroundColor: '#fee2e2', 
              border: '2px solid #ef4444' 
            }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: '#991b1b',
                      margin: 0,
                      marginBottom: '0.5rem'
                    }}>
                      Vérification annuelle requise
                    </h3>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#991b1b',
                      margin: 0,
                      marginBottom: '0.75rem'
                    }}>
                      Votre vérification date de plus d'un an ({Math.floor(checkVerificationAge() / 365)} an
                      {Math.floor(checkVerificationAge() / 365) > 1 ? 's' : ''}). 
                      Veuillez confirmer que vos informations sont toujours à jour.
                    </p>
                    <Button 
                      variant="danger"
                      onClick={handleConfirmInformation}
                      disabled={confirmingInfo}
                      style={{ 
                        fontSize: '0.875rem',
                        padding: '0.5rem 1rem'
                      }}
                    >
                      {confirmingInfo ? 'Confirmation...' : '✓ Confirmer les informations'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
