import React from 'react';
import { Card, CardContent, Switch, InfoBox } from '../../../../components/UI';
import { UserProfile } from '../../../../types';

/** Interface pour les données du formulaire */
interface FormData {
  profileName?: string;
  description?: string;
  locationCountry?: string;
  locationRegion?: string;
  locationDepartment?: string;
  city?: string;
  postalCode?: string;
  streetAddress?: string;
  [key: string]: string | undefined;
}

/** Props du composant ActiveProfile */
interface ActiveProfileProps {
  existingProfiles: UserProfile | null;
  togglingProfileStatus: boolean;
  onToggleProfileStatus: (status: 'active' | 'draft') => void;
  formData?: FormData;
}

/**
 * ActiveProfile - Gestion de la visibilité globale du profil
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Permet de basculer entre mode "Actif" (visible publiquement) et "Brouillon" (privé).
 * Vérifie que les champs obligatoires de InfoTab et LocationTab sont remplis avant activation.
 * 
 * Champs obligatoires InfoTab:
 * - profileName
 * - description
 * 
 * Champs obligatoires LocationTab:
 * - locationCountry
 * - locationRegion
 * - locationDepartment
 * - city
 * - postalCode
 * - streetAddress
 */
const ActiveProfile: React.FC<ActiveProfileProps> = ({
  existingProfiles,
  togglingProfileStatus,
  onToggleProfileStatus,
  formData = {}
}) => {
  const isActive = existingProfiles?.status === 'active';

  // Vérifier les champs obligatoires
  const requiredFields = {
    infoTab: ['profileName', 'description'],
    locationTab: ['locationCountry', 'locationRegion', 'locationDepartment', 'city', 'postalCode', 'streetAddress']
  };

  const missingInfoFields = requiredFields.infoTab.filter(field => !formData[field] || formData[field]?.trim() === '');
  const missingLocationFields = requiredFields.locationTab.filter(field => !formData[field] || formData[field]?.trim() === '');
  
  const allFieldsComplete = missingInfoFields.length === 0 && missingLocationFields.length === 0;

  const handleToggle = (checked: boolean): void => {
    // Si tentative d'activation avec champs manquants, empêcher
    if (checked && !allFieldsComplete) {
      return;
    }
    
    onToggleProfileStatus(checked ? 'active' : 'draft');
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          🌐 Visibilité du profil
        </h2>

        <div className="d-flex justify-between align-center p-4" style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-primary)'
        }}>
          <div>
            <div className="d-flex align-center gap-2 mb-1">
              <span style={{ fontSize: '1.25rem' }}>
                {isActive ? '✅' : '📝'}
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {isActive ? 'Profil public' : 'Brouillon'}
              </strong>
            </div>
            <p className="text-sm text-secondary mb-0">
              {isActive 
                ? 'Votre profil est visible publiquement sur la plateforme'
                : 'Votre profil est en brouillon et n\'est pas visible publiquement'
              }
            </p>
          </div>
          <Switch
            checked={isActive}
            onChange={handleToggle}
            disabled={togglingProfileStatus || (!isActive && !allFieldsComplete)}
          />
        </div>

        {/* Message si champs obligatoires manquants */}
        {!allFieldsComplete && (
          <InfoBox type="warning" icon="⚠️" className="mt-3">
            <strong>Action requise :</strong> Pour publier votre profil dans l'annuaire, vous devez d'abord compléter tous les champs obligatoires.
            <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
              {missingInfoFields.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  📝 <strong>Onglet Informations générales :</strong> {missingInfoFields.length} champ{missingInfoFields.length > 1 ? 's' : ''} manquant{missingInfoFields.length > 1 ? 's' : ''}
                </div>
              )}
              {missingLocationFields.length > 0 && (
                <div>
                  📍 <strong>Onglet Localisation :</strong> {missingLocationFields.length} champ{missingLocationFields.length > 1 ? 's' : ''} manquant{missingLocationFields.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </InfoBox>
        )}

        {/* Message d'information standard */}
        {allFieldsComplete && (
          <InfoBox type="info" icon="💡" className="mt-3">
            <strong>Activation du profil :</strong> Pour être visible dans l'annuaire public 
            et permettre aux clients de vous découvrir, activez votre profil. Vous pourrez 
            le désactiver temporairement à tout moment.
          </InfoBox>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveProfile;
