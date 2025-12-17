import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Badge, StatusBadge, Button } from '../UI';
import { AdminReportMessaging } from '.';

/**
 * AdminReportCard - Carte de ferme signalée pour l'administration
 * 
 * Conforme au STYLING_GUIDE.md :
 * - Classes utilitaires (d-flex, gap-*, mb-*, p-*, rounded-*, etc.)
 * - Variables CSS pour les couleurs
 * - Architecture modulaire et réutilisable
 * 
 * Utilisé dans l'onglet "Signalés" de AdminVerificationPage
 * 
 * @param {Object} props
 * @param {Object} props.profil - Données du profil
 * @param {Array} props.reports - Liste des signalements
 * @param {Function} props.onUpdateStatus - Callback pour changer le statut du profil
 * @param {Function} props.onSendReportMessage - Callback pour envoyer un message lié au signalement
 * @param {Function} props.onToggleReportVisibility - Callback pour changer la visibilité d'un signalement
 * @param {Function} props.onIgnoreReports - Callback pour ignorer tous les signalements
 * @param {boolean} props.processing - Indique si une action est en cours
 */
const AdminReportCard = ({
  profil,
  reports = [],
  onUpdateStatus,
  onSendReportMessage,
  onToggleReportVisibility,
  onIgnoreReports,
  processing = false
}) => {
  const navigate = useNavigate();

  // Détection nouveau message du créateur
  const lastMsg = profil.communication_history?.slice(-1)[0];
  const hasNewReply = lastMsg && lastMsg.author !== 'admin' && lastMsg.author !== 'system';

  // Séparer les signalements ouverts et clos
  const openReports = reports.filter(r => r.admin_status !== 'resolved');
  const closedReports = reports.filter(r => r.admin_status === 'resolved');

  return (
    <Card 
      className="admin-report-card"
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
              {profil.name}
              {hasNewReply && <Badge variant="info">💬 Nouvelle réponse</Badge>}
            </h3>
            <div className="text-xs text-secondary" style={{ 
              fontFamily: 'monospace',
              opacity: 0.7 
            }}>
              ID: {profil.owner_address?.substring(0, 12)}...
            </div>
          </div>
          
          {/* Badges de statut */}
          <div className="d-flex flex-column gap-2" style={{ alignItems: 'flex-end' }}>
            <StatusBadge status={profil.status} type="profil" />
            <StatusBadge status={profil.verification_status} type="verification" />
          </div>
        </div>

        {/* Informations du profil */}
        <div className="admin-report-info mb-4" style={{
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
                  <strong>Adresse:</strong> {profil.street_address || profil.address || profil.city || 'Non renseignée'}
                </div>
              </div>
              <div className="d-flex align-center gap-2">
                <span className="text-lg">🏙️</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Ville:</strong> {profil.city || 'Non renseignée'} {profil.postal_code ? `(${profil.postal_code})` : ''}
                </div>
              </div>
              <div className="d-flex align-center gap-2">
                <span className="text-lg">📧</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Email:</strong>{' '}
                  {profil.email ? (
                    <a 
                      href={`mailto:${profil.email}`} 
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                    >
                      {profil.email}
                    </a>
                  ) : (
                    'Non renseigné'
                  )}
                </div>
              </div>
              <div className="d-flex align-center gap-2">
                <span className="text-lg">📞</span>
                <div className="flex-1" style={{ color: 'var(--text-primary)' }}>
                  <strong>Tel:</strong> {profil.phone || 'Non renseigné'}
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
                  <strong>SIRET:</strong> {profil.certifications?.siret || 'Non renseigné'}
                </div>
              </div>
              {profil.certifications?.siret_link && (
                <a 
                  href={profil.certifications.siret_link} 
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
                  <strong>Représentant:</strong> {profil.certifications?.legal_representative || 'Non renseigné'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Signalements */}
        {reports.length > 0 && (
          <div className="mb-5">
            {/* Signalements Ouverts */}
            {openReports.length > 0 && (
              <div className="mb-4 p-4 rounded-lg" style={{
                backgroundColor: 'var(--notification-error-bg)',
                borderLeft: '4px solid var(--notification-error-border)'
              }}>
                <h4 className="font-bold mb-3 d-flex align-center gap-2" style={{
                  color: 'var(--notification-error-text)'
                }}>
                  🚨 {openReports.length} Signalement{openReports.length > 1 ? 's' : ''} OUVERT{openReports.length > 1 ? 'S' : ''}
                </h4>
                <div className="d-flex flex-column gap-3">
                  {openReports.map((report, idx) => (
                    <div 
                      key={idx}
                      className="text-sm p-3 rounded" 
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--notification-error-border)'
                      }}
                    >
                      <div className="d-flex justify-between align-start gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                            Motif : "{report.reason}"
                          </p>
                          {report.details && (
                            <p className="text-xs text-secondary mt-1">
                              {report.details}
                            </p>
                          )}
                        </div>
                        
                        {/* Toggle de visibilité */}
                        <button
                          onClick={() => onToggleReportVisibility(report.id, !report.visible_to_creator)}
                          disabled={processing}
                          className="text-xs px-3 py-1.5 rounded font-medium cursor-pointer hover-lift"
                          style={{
                            backgroundColor: report.visible_to_creator 
                              ? 'var(--notification-error-bg)' 
                              : 'var(--bg-secondary)',
                            color: report.visible_to_creator 
                              ? 'var(--notification-error-text)' 
                              : 'var(--text-secondary)',
                            border: `1px solid ${report.visible_to_creator ? 'var(--notification-error-border)' : 'var(--border-primary)'}`,
                            transition: 'all 0.2s'
                          }}
                        >
                          {report.visible_to_creator ? '👁️ Visible' : '🙈 Masqué'}
                        </button>
                      </div>
                      
                      <div className="d-flex justify-between align-center text-xs text-secondary pt-2" style={{
                        borderTop: '1px solid var(--border-primary)'
                      }}>
                        <div className="d-flex gap-3">
                          <span>👤 Par : {report.reporter_address?.substring(0, 10)}...</span>
                          <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Signalements Clos */}
            {closedReports.length > 0 && (
              <div className="p-4 rounded-lg" style={{
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: '4px solid var(--border-primary)'
              }}>
                <details>
                  <summary className="font-bold mb-3 d-flex align-center gap-2 cursor-pointer" style={{
                    color: 'var(--text-secondary)'
                  }}>
                    ✓ {closedReports.length} Signalement{closedReports.length > 1 ? 's' : ''} CLOS
                  </summary>
                  <div className="d-flex flex-column gap-3 mt-3">
                    {closedReports.map((report, idx) => (
                      <div 
                        key={idx}
                        className="text-sm p-3 rounded" 
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          opacity: 0.6
                        }}
                      >
                        <div className="d-flex justify-between align-start gap-3 mb-2">
                          <div className="flex-1">
                            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                              Motif : "{report.reason}"
                            </p>
                            {report.details && (
                              <p className="text-xs text-secondary mt-1">
                                {report.details}
                              </p>
                            )}
                          </div>
                          <span className="text-xs px-2 py-1 rounded" style={{
                            backgroundColor: 'var(--accent-success-light)',
                            color: 'var(--accent-success)'
                          }}>
                            ✓ Résolu
                          </span>
                        </div>
                        
                        <div className="d-flex gap-3 text-xs text-secondary pt-2" style={{
                          borderTop: '1px solid var(--border-primary)'
                        }}>
                          <span>👤 Par : {report.reporter_address?.substring(0, 10)}...</span>
                          <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Jetons Associés */}
        {profil.tokens && profil.tokens.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-secondary uppercase mb-2">
              Jetons associés
            </h4>
            <div className="d-flex flex-wrap gap-2">
              {profil.tokens.map((token, i) => (
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

        {/* Section Chat Admin pour Signalements */}
        <AdminReportMessaging
          profil={profil}
          reports={reports}
          onSendReportMessage={onSendReportMessage}
          onToggleReportVisibility={onToggleReportVisibility}
          loading={processing}
        />

        {/* Actions de modération */}
        <div className="d-flex gap-2 justify-end mt-5 pt-4" style={{
          borderTop: '1px solid var(--border-primary)'
        }}>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => onIgnoreReports(profil.id)}
            disabled={processing}
            className="hover-lift"
          >
            ⏭️ Ignorer
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => onUpdateStatus(profil.id, 'suspended')}
            disabled={processing}
            className="hover-lift"
          >
            ⏸️ Suspendre
          </Button>
          <Button 
            variant="danger"
            size="sm"
            onClick={() => onUpdateStatus(profil.id, 'banned')}
            disabled={processing}
            className="hover-lift"
          >
            🛑 Bannir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminReportCard;
