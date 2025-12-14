import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Badge, StatusBadge, Button } from '../UI';
import { AdminChatSection } from '../Communication';

/**
 * AdminProfilCard - Carte de profil de ferme pour l'administration
 * 
 * Conforme au STYLING_GUIDE.md :
 * - Classes utilitaires (d-flex, gap-*, mb-*, p-*, rounded-*, etc.)
 * - Variables CSS pour les couleurs
 * - Architecture modulaire et réutilisable
 * 
 * Utilisé dans les onglets "En Attente" et "Tous" de AdminVerificationPage
 * 
 * @param {Object} props
 * @param {Object} props.farm - Données de la ferme
 * @param {Function} props.onUpdateStatus - Callback pour changer le statut
 * @param {Function} props.onSendMessage - Callback pour envoyer un message
 * @param {Function} props.onCloseConversation - Callback pour fermer une conversation
 * @param {boolean} props.showActions - Afficher les actions de validation/refus (onglet "En Attente")
 * @param {boolean} props.processing - Indique si une action est en cours
 */
const AdminProfilCard = ({
  farm,
  onUpdateStatus,
  onSendMessage,
  onCloseConversation,
  showActions = false,
  processing = false
}) => {
  const navigate = useNavigate();

  // Détection nouveau message du créateur
  const lastMsg = farm.communication_history?.slice(-1)[0];
  const hasNewReply = lastMsg && lastMsg.author !== 'admin' && lastMsg.author !== 'system';

  return (
    <Card 
      className="admin-profil-card"
      style={{ 
        borderLeft: hasNewReply ? '4px solid var(--accent-primary)' : '1px solid var(--border-primary)',
        transition: 'all 0.2s'
      }}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="d-flex justify-between align-start mb-4 pb-4" style={{
          borderBottom: '1px solid var(--border-primary)'
        }}>
          <div className="flex-1">
            <h3 className="text-lg font-bold d-flex align-center gap-2 mb-2" style={{
              color: 'var(--text-primary)'
            }}>
              {farm.name}
              {hasNewReply && <Badge variant="info">💬 Nouvelle réponse</Badge>}
            </h3>
            <div className="text-xs text-secondary" style={{ 
              fontFamily: 'monospace',
              opacity: 0.7 
            }}>
              ID: {farm.owner_address?.substring(0, 12)}...
            </div>
          </div>
          
          {/* Badges de statut */}
          <div className="d-flex flex-column gap-2" style={{ alignItems: 'flex-end' }}>
            <StatusBadge status={farm.status} type="farm" />
            <StatusBadge status={farm.verification_status} type="verification" />
          </div>
        </div>

        {/* Informations de la ferme */}
        <div className="admin-profil-info mb-4" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px'
        }}>
          {/* Bloc Coordonnées */}
          <div className="info-block p-3 rounded" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)'
          }}>
            <div className="d-flex flex-column gap-2 text-sm">
              <div className="d-flex align-center gap-2">
                <span className="text-lg">📍</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Adresse:</strong> {farm.street_address || farm.address || farm.city || 'Non renseignée'}
                </div>
              </div>
              <div className="d-flex align-center gap-2">
                <span className="text-lg">🏙️</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Ville:</strong> {farm.city || 'Non renseignée'} {farm.postal_code ? `(${farm.postal_code})` : ''}
                </div>
              </div>
              <div className="d-flex align-center gap-2">
                <span className="text-lg">📧</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Email:</strong>{' '}
                  {farm.email ? (
                    <a 
                      href={`mailto:${farm.email}`} 
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                    >
                      {farm.email}
                    </a>
                  ) : (
                    'Non renseigné'
                  )}
                </div>
              </div>
              <div className="d-flex align-center gap-2">
                <span className="text-lg">📞</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Tel:</strong> {farm.phone || 'Non renseigné'}
                </div>
              </div>
            </div>
          </div>

          {/* Bloc Certifications */}
          <div className="info-block p-3 rounded" style={{
            backgroundColor: 'var(--info-light)',
            border: '1px solid var(--border-info)'
          }}>
            <div className="d-flex flex-column gap-2 text-sm">
              <div className="d-flex align-center gap-2">
                <span className="text-lg">🏢</span>
                <div className="flex-1" style={{ color: 'var(--text-info)' }}>
                  <strong>SIRET:</strong> {farm.certifications?.siret || 'Non renseigné'}
                </div>
              </div>
              {farm.certifications?.siret_link && (
                <a 
                  href={farm.certifications.siret_link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs hover-opacity"
                  style={{ 
                    color: 'var(--accent-primary)',
                    textDecoration: 'underline',
                    paddingLeft: '28px'
                  }}
                >
                  🔗 Vérifier la preuve
                </a>
              )}
              <div className="d-flex align-center gap-2">
                <span className="text-lg">👤</span>
                <div className="flex-1" style={{ color: 'var(--text-info)' }}>
                  <strong>Représentant:</strong> {farm.certifications?.legal_representative || 'Non renseigné'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jetons Associés */}
        {farm.tokens && farm.tokens.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-secondary uppercase mb-2">
              Jetons associés
            </h4>
            <div className="d-flex flex-wrap gap-2">
              {farm.tokens.map((token, i) => (
                <Button 
                  key={i}
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/token/${token.tokenId}`)}
                  style={{
                    fontSize: '0.75rem',
                    height: '32px',
                    padding: '0 12px'
                  }}
                >
                  🪙 {token.ticker || 'UNK'} ↗
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Section Chat Admin */}
        <AdminChatSection
          farm={farm}
          onSendMessage={onSendMessage}
          onSendGeneralMessage={onSendMessage}
          onCloseConversation={onCloseConversation}
          loading={processing}
        />

        {/* Actions de validation (onglet "En Attente") */}
        {showActions && (
          <div className="d-flex gap-2 justify-end mt-5 pt-4" style={{
            borderTop: '1px solid var(--border-primary)'
          }}>
            <Button 
              variant="danger"
              size="sm"
              onClick={() => onUpdateStatus(farm.id, 'rejected')}
              disabled={processing}
              className="hover-lift"
            >
              🚫 Refuser
            </Button>
            <Button 
              size="sm"
              onClick={() => onUpdateStatus(farm.id, 'verified')}
              disabled={processing}
              className="hover-lift"
              style={{ 
                backgroundColor: 'var(--accent-success)',
                borderColor: 'var(--accent-success)',
                color: 'white'
              }}
            >
              ✅ Valider Badge
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminProfilCard;
