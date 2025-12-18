import { Card, CardContent, Button, InfoBox, Switch, Stack } from '../../UI';
import ActiveProfile from './ActiveProfile';

/**
 * SecurityTab - Gestion de la sécurité et confidentialité du profil
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Permet de gérer :
 * - La visibilité globale du profil (actif/brouillon)
 * - La confidentialité de chaque champ (email, téléphone, SIRET, représentant légal)
 * - La suppression définitive du profil
 * 
 * @param {Object} props
 * @param {Object} props.existingProfiles - Profil de créateur actuel
 * @param {Boolean} props.togglingProfileStatus - État du toggle statut
 * @param {Function} props.onToggleProfileStatus - Callback toggle statut
 * @param {Object} props.privacy - États de confidentialité par champ
 * @param {Function} props.onPrivacyChange - Callback changement confidentialité
 * @param {Function} props.onDeleteProfile - Callback suppression profil
 * @param {Object} props.formData - Données du formulaire pour validation des champs obligatoires
 */
const SecurityTab = ({
  existingProfiles,
  togglingProfileStatus,
  onToggleProfileStatus,
  privacy = {},
  onPrivacyChange,
  onDeleteProfile,
  formData = {}
}) => {
  return (
    <Stack spacing="md">
      {/* Visibilité globale du profil */}
      <ActiveProfile
        existingProfiles={existingProfiles}
        togglingProfileStatus={togglingProfileStatus}
        onToggleProfileStatus={onToggleProfileStatus}
        formData={formData}
      />

      {/* Confidentialité des champs */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            🔒 Confidentialité des informations
          </h2>
          <p className="text-sm text-secondary mb-4">
            Choisissez les informations à masquer du profil public. Elles resteront visibles dans votre espace de gestion.
          </p>

          <Stack spacing="sm">
            {/* Email */}
            <div className="d-flex justify-between align-center p-3" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)'
            }}>
              <div>
                <div className="d-flex align-center gap-2 mb-1">
                  <span>📧</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Email</strong>
                </div>
                <p className="text-sm text-secondary mb-0">
                  {privacy.hideEmail ? 'Masqué du profil public' : 'Visible dans le profil public'}
                </p>
              </div>
              <Switch
                checked={!privacy.hideEmail}
                onChange={(checked) => onPrivacyChange('hideEmail', !checked)}
              />
            </div>

            {/* Téléphone */}
            <div className="d-flex justify-between align-center p-3" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)'
            }}>
              <div>
                <div className="d-flex align-center gap-2 mb-1">
                  <span>📞</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Téléphone</strong>
                </div>
                <p className="text-sm text-secondary mb-0">
                  {privacy.hidePhone ? 'Masqué du profil public' : 'Visible dans le profil public'}
                </p>
              </div>
              <Switch
                checked={!privacy.hidePhone}
                onChange={(checked) => onPrivacyChange('hidePhone', !checked)}
              />
            </div>

            {/* SIRET */}
            <div className="d-flex justify-between align-center p-3" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)'
            }}>
              <div>
                <div className="d-flex align-center gap-2 mb-1">
                  <span>🏢</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Numéro SIRET</strong>
                </div>
                <p className="text-sm text-secondary mb-0">
                  {privacy.hideCompanyID ? 'Masqué du profil public' : 'Visible dans le profil public'}
                </p>
              </div>
              <Switch
                checked={!privacy.hideCompanyID}
                onChange={(checked) => onPrivacyChange('hideCompanyID', !checked)}
              />
            </div>

            {/* Représentant légal */}
            <div className="d-flex justify-between align-center p-3" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)'
            }}>
              <div>
                <div className="d-flex align-center gap-2 mb-1">
                  <span>👤</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Représentant légal</strong>
                </div>
                <p className="text-sm text-secondary mb-0">
                  {privacy.hideLegalRep ? 'Masqué du profil public' : 'Visible dans le profil public'}
                </p>
              </div>
              <Switch
                checked={!privacy.hideLegalRep}
                onChange={(checked) => onPrivacyChange('hideLegalRep', !checked)}
              />
            </div>
          </Stack>

          <InfoBox type="info" icon="💡" className="mt-3">
            <strong>Recommandation :</strong> Nous vous conseillons de rendre visible au moins 
            votre email ou téléphone pour permettre aux clients de vous contacter facilement.
          </InfoBox>
        </CardContent>
      </Card>

      {/* Suppression du profil */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--danger)' }}>
            🗑️ Zone dangereuse
          </h2>
          <p className="text-sm text-secondary mb-4">
            La suppression du profil est irréversible. Toutes vos données seront définitivement supprimées.
          </p>

          <InfoBox type="warning" icon="⚠️" className="mb-3">
            <strong>Attention :</strong> La suppression de votre profil entraînera :
            <ul className="mb-0 mt-2" style={{ paddingLeft: '1.5rem' }}>
              <li>La disparition de votre profil du répertoire public</li>
              <li>La perte de tous vos jetons associés</li>
              <li>La suppression de votre historique de communication</li>
              <li>L'impossibilité de récupérer ces données ultérieurement</li>
            </ul>
          </InfoBox>

          <Button
            variant="danger"
            onClick={onDeleteProfile}
            className="w-full"
          >
            🗑️ Supprimer définitivement mon profil
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default SecurityTab;
