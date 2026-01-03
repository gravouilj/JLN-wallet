import React from 'react';
import { Modal, Button, InfoBox } from '../../../components/UI';

/**
 * ActiveReportsWarningModal - Modal d'avertissement si signalements actifs
 * 
 * Affiché quand un créateur avec des signalements actifs tente de :
 * - Masquer un jeton de l'annuaire (isVisible = false)
 * - Délier un jeton de son profil (isLinked = false)
 * 
 * Conséquence : BLOCAGE AUTOMATIQUE de la création/importation de jetons
 * 
 * @param {boolean} isOpen - Modal ouverte/fermée
 * @param {function} onClose - Callback fermeture
 * @param {number} activeReportsCount - Nombre de signalements actifs
 */
export const ActiveReportsWarningModal = ({ isOpen, onClose, activeReportsCount }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header>
        🚫 Action bloquée : Signalements actifs
      </Modal.Header>
      <Modal.Body>
        <div style={{ padding: '20px' }}>
          <InfoBox type="error" icon="⚠️">
            <strong>Cette action est interdite</strong><br />
            Vous avez actuellement <strong>{activeReportsCount} signalement{activeReportsCount > 1 ? 's' : ''}</strong> non résolu{activeReportsCount > 1 ? 's' : ''} sur votre profil.
          </InfoBox>

          <div style={{ marginTop: '20px', lineHeight: '1.6' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              🛡️ Pourquoi cette restriction ?
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Pour protéger vos détenteurs contre les arnaques, <strong>JLN Wallet interdit aux créateurs signalés</strong> de :
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li>Masquer un jeton de l'annuaire public</li>
              <li>Délier un jeton de leur profil</li>
            </ul>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Ces actions pourraient cacher des informations importantes aux détenteurs et faciliter la fraude.
            </p>

            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fee2e2', 
              borderLeft: '4px solid #ef4444', 
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0, fontWeight: '600' }}>
                ⛔ Conséquence : Votre compte est maintenant <strong>bloqué</strong> pour la création et l'importation de nouveaux jetons.
              </p>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              ✅ Comment débloquer votre compte ?
            </h4>
            <ol style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: '8px' }}>
                Consultez l'onglet <strong>Support Client</strong> pour voir les signalements
              </li>
              <li style={{ marginBottom: '8px' }}>
                Répondez aux préoccupations de vos détenteurs
              </li>
              <li style={{ marginBottom: '8px' }}>
                Le client doit marquer le ticket comme <strong>"Résolu"</strong>
              </li>
              <li style={{ marginBottom: '8px' }}>
                Une fois tous les signalements résolus, votre compte sera automatiquement débloqué
              </li>
            </ol>

            <div style={{ 
              padding: '16px', 
              backgroundColor: '#dbeafe', 
              borderRadius: '6px',
              marginTop: '16px'
            }}>
              <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0 }}>
                💡 <strong>Note :</strong> Vos jetons existants restent fonctionnels. Seules la création et l'importation de nouveaux jetons sont bloquées.
              </p>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose} fullWidth>
          J'ai compris
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/**
 * ActiveHoldersWarningModal - Modal d'avertissement si détenteurs actifs
 * 
 * Affiché quand un créateur (sans signalements) tente de :
 * - Masquer un jeton avec des détenteurs actifs
 * - Délier un jeton avec des détenteurs actifs
 * 
 * Pas de blocage, juste un avertissement sur les conséquences.
 * 
 * @param {boolean} isOpen - Modal ouverte/fermée
 * @param {function} onClose - Callback fermeture
 * @param {function} onConfirm - Callback confirmation
 * @param {number} activeHoldersCount - Nombre de détenteurs actifs
 * @param {string} actionType - 'visibility' ou 'linked'
 * @param {boolean} newValue - true si activation, false si désactivation
 */
export const ActiveHoldersWarningModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  activeHoldersCount, 
  actionType, 
  newValue 
}) => {
  const isVisibility = actionType === 'visibility';
  const isActivating = newValue;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header>
        ⚠️ {activeHoldersCount} détenteur{activeHoldersCount > 1 ? 's' : ''} actif{activeHoldersCount > 1 ? 's' : ''}
      </Modal.Header>
      <Modal.Body>
        <div style={{ padding: '20px' }}>
          <InfoBox type="warning" icon="👥">
            Ce jeton a actuellement <strong>{activeHoldersCount} détenteur{activeHoldersCount > 1 ? 's' : ''}</strong> avec un solde supérieur à zéro.
          </InfoBox>

          <div style={{ marginTop: '20px', lineHeight: '1.6' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {isVisibility ? (
                newValue ? '👁️ Rendre le jeton visible' : '🙈 Masquer le jeton'
              ) : (
                newValue ? '🔗 Lier le jeton au profil' : '🔓 Délier le jeton du profil'
              )}
            </h4>

            {!isActivating && (
              <>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {isVisibility ? (
                    <>En masquant ce jeton de l'annuaire public :</>
                  ) : (
                    <>En déliant ce jeton de votre profil :</>
                  )}
                </p>

                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#fef3c7', 
                  borderLeft: '4px solid #f59e0b', 
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ fontSize: '0.9rem', color: '#92400e', margin: '0 0 12px 0', fontWeight: '600' }}>
                    ✅ Les détenteurs actuels ({activeHoldersCount}) :
                  </p>
                  <ul style={{ paddingLeft: '20px', margin: '0', fontSize: '0.85rem', color: '#92400e' }}>
                    <li>Continueront de <strong>voir le jeton</strong> dans votre profil</li>
                    <li>Auront toujours accès aux <strong>informations enrichies</strong></li>
                    <li>Pourront toujours vous <strong>contacter</strong> via le système de tickets</li>
                    {!isVisibility && (
                      <li>Verront l'emoji 🔓 <strong>"dissocié"</strong> pour indiquer le changement</li>
                    )}
                  </ul>
                </div>

                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f3f4f6', 
                  borderLeft: '4px solid #6b7280', 
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ fontSize: '0.9rem', color: '#374151', margin: '0 0 12px 0', fontWeight: '600' }}>
                    ❌ Les non-détenteurs :
                  </p>
                  <ul style={{ paddingLeft: '20px', margin: '0', fontSize: '0.85rem', color: '#374151' }}>
                    {isVisibility ? (
                      <>
                        <li>Ne verront <strong>plus le jeton</strong> dans l'annuaire</li>
                        <li>Ne pourront <strong>pas découvrir</strong> votre jeton</li>
                      </>
                    ) : (
                      <>
                        <li>Ne verront <strong>plus les infos enrichies</strong> (objectif, contrepartie)</li>
                        <li>Accès limité aux <strong>données blockchain uniquement</strong></li>
                      </>
                    )}
                  </ul>
                </div>

                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#dbeafe', 
                  borderRadius: '6px',
                  marginTop: '16px'
                }}>
                  <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0 }}>
                    💡 <strong>Gestion permissionless :</strong> Cette action est autorisée pour permettre une gestion flexible de vos jetons et de votre communauté, tout en protégeant vos détenteurs actuels.
                  </p>
                </div>
              </>
            )}

            {isActivating && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {isVisibility ? (
                  <>Votre jeton redeviendra visible dans l'annuaire public pour tous les utilisateurs.</>
                ) : (
                  <>Votre jeton sera de nouveau lié à votre profil avec toutes les informations enrichies disponibles.</>
                )}
              </p>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {isActivating ? 'Confirmer' : 'Oui, continuer'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default { ActiveReportsWarningModal, ActiveHoldersWarningModal };
