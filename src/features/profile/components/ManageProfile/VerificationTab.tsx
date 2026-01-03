import React from 'react';
import { Card, CardContent, Stack, Input, VisibilityToggle, Button } from '../../../../components/UI';
import { UserProfile } from '../../../../types';

/** Interface pour les paramètres de confidentialité */
interface PrivacySettings {
  hideEmail?: boolean;
  hidePhone?: boolean;
  hideCompanyID?: boolean;
  hideLegalRep?: boolean;
}

/** Interface pour les données du formulaire Verification */
interface VerificationFormData {
  email?: string;
  phone?: string;
  companyid?: string;
  governmentidverificationweblink?: string;
  legalRepresentative?: string;
  [key: string]: string | undefined;
}

/** Interface pour un pays avec indicatif */
interface Country {
  code: string;
  flag: string;
  dialCode: string;
  name: string;
}

/** Props du composant VerificationTab */
interface VerificationTabProps {
  formData: VerificationFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  existingProfiles?: UserProfile | null;
  sensitiveFieldsChanged: boolean;
  privacy: PrivacySettings;
  handlePrivacyChange: (field: keyof PrivacySettings, value: boolean) => void;
  handleUrlBlur: (field: string) => void;
  openLink: (url: string) => void;
  onRequestVerification: (e?: React.FormEvent) => void;
  onSaveWithoutVerification: (e?: React.FormEvent) => void;
}

/**
 * Onglet Vérification
 * Gère les informations de vérification et la confidentialité
 */
const VerificationTab: React.FC<VerificationTabProps> = ({ 
  formData, 
  handleChange, 
  existingProfiles,
  sensitiveFieldsChanged,
  privacy,
  handlePrivacyChange,
  handleUrlBlur,
  openLink,
  onRequestVerification,
  onSaveWithoutVerification
}) => {
  const [selectedCountry, setSelectedCountry] = React.useState<string>('FR');

  // Liste des pays avec indicatifs
  const countries: Country[] = [
    { code: 'FR', flag: '🇫🇷', dialCode: '+33', name: 'France' },
    { code: 'BE', flag: '🇧🇪', dialCode: '+32', name: 'Belgique' },
    { code: 'CH', flag: '🇨🇭', dialCode: '+41', name: 'Suisse' },
    { code: 'CA', flag: '🇨🇦', dialCode: '+1', name: 'Canada' },
    { code: 'US', flag: '🇺🇸', dialCode: '+1', name: 'États-Unis' },
    { code: 'GB', flag: '🇬🇧', dialCode: '+44', name: 'Royaume-Uni' },
    { code: 'DE', flag: '🇩🇪', dialCode: '+49', name: 'Allemagne' },
    { code: 'ES', flag: '🇪🇸', dialCode: '+34', name: 'Espagne' },
    { code: 'IT', flag: '🇮🇹', dialCode: '+39', name: 'Italie' },
    { code: 'PT', flag: '🇵🇹', dialCode: '+351', name: 'Portugal' },
  ];

  const currentCountry = countries.find(c => c.code === selectedCountry) || countries[0];
  // Vérifier si tous les champs requis sont remplis
  const canRequestVerification = () => {
    return !!(
      formData.companyid &&
      formData.governmentidverificationweblink &&
      formData.phone &&
      formData.email &&
      formData.legalRepresentative
    );
  };

  // Liste des champs manquants
  const getMissingFields = () => {
    const missing = [];
    if (!formData.companyid) missing.push('SIRET');
    if (!formData.governmentidverificationweblink) missing.push('Preuve SIRET');
    if (!formData.phone) missing.push('Téléphone');
    if (!formData.email) missing.push('Email');
    if (!formData.legalRepresentative) missing.push('Représentant légal');
    return missing;
  };

  const isVerified = existingProfiles?.verified;
  const isPending = existingProfiles?.verification_status === 'pending';
  const canRequest = canRequestVerification() && !isVerified && !isPending;

  return (
    <Card style={{ 
      backgroundColor: '#f0f9ff', 
      borderColor: '#0ea5e9',
      border: '2px solid #0ea5e9',
      boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.1), 0 2px 4px -1px rgba(14, 165, 233, 0.06)'
    }}>
      <CardContent style={{ padding: '24px' }}>
        {/* Titre du composant */}
        <div style={{
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #0ea5e9'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#0369a1',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            Vérification de l'établissement
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#0369a1',
            margin: '8px 0 0 0',
            opacity: 0.8
          }}>
            Complétez ces informations pour obtenir le badge vérifié
          </p>
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#dbeafe',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#0369a1'
          }}>
            💡 La vérification n'est pas obligatoire pour apparaître dans l'annuaire
          </div>
        </div>
        {/* Avertissement modification champs sensibles */}
        {existingProfiles?.verified && sensitiveFieldsChanged && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '0.9rem', 
                  color: '#92400e',
                  margin: 0,
                  fontWeight: '600',
                  lineHeight: '1.5'
                }}>
                  <strong>Modification détectée :</strong> Les changements sur le SIRET nécessiteront une nouvelle validation administrative.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <Stack spacing="md">
          {/* Email avec switch confidentialité */}
          <div>
            <Input
              label="Email *"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@maferme.fr"
              required
              disabled={isPending}
              helperText={isPending ? "Modification bloquée pendant l'examen" : "Requis pour la vérification et les notifications"}
            />
            <div style={{ marginTop: '8px' }}>
              <VisibilityToggle
                isVisible={!privacy.hideEmail}
                onChange={(val) => handlePrivacyChange('hideEmail', !val)}
                labelVisible="Public"
                labelHidden="Masqué"
              />
            </div>
          </div>

          {/* Téléphone avec switch confidentialité */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Téléphone *
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                disabled={isPending}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  minWidth: '120px',
                  height: '44px',
                  outline: 'none',
                  opacity: isPending ? 0.6 : 1
                }}
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.dialCode}
                  </option>
                ))}
              </select>
              <div style={{ flex: 1 }}>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0698300182"
                  required
                  disabled={isPending}
                />
              </div>
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              margin: '0 0 8px 0'
            }}>
              {isPending ? "Modification bloquée pendant l'examen" : `Requis pour la vérification (Format : ${currentCountry.flag} ${currentCountry.dialCode} + votre numéro)`}
            </p>
            <div style={{ marginTop: '8px' }}>
              <VisibilityToggle
                isVisible={!privacy.hidePhone}
                onChange={(val) => handlePrivacyChange('hidePhone', !val)}
                labelVisible="Public"
                labelHidden="Masqué"
              />
            </div>
          </div>
        
          {/* SIREt / Company ID avec switch confidentialité */}
          <div>
            <Input
              label="SIRET / Company ID *"
              type="text"
              name="companyid"
              value={formData.companyid}
              onChange={handleChange}
              placeholder="12345678901234"
              disabled={isPending}
              helperText={isPending ? "Modification bloquée pendant l'examen" : "Requis pour la vérification"}
            />
            <div style={{ marginTop: '8px' }}>
              <VisibilityToggle
                isVisible={!privacy.hideCompanyID}
                onChange={(val) => handlePrivacyChange('hideCompanyID', !val)}
                labelVisible="Public"
                labelHidden="Masqué"
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Input
              label="Lien de vérification SIRET *"
              type="text"
              name="governmentidverificationweblink"
              value={formData.governmentidverificationweblink}
              onChange={handleChange}
              onBlur={() => !isPending && handleUrlBlur('governmentidverificationweblink')}
              placeholder="annuaire-entreprises.data.gouv.fr/..."
              disabled={isPending}
              helperText={isPending ? "Modification bloquée pendant l'examen" : "Lien vers l'annuaire officiel (requis pour validation)"}
              leftIcon={<span style={{ fontSize: '1.2rem' }}>🏛️</span>}
            />
            {formData.governmentidverificationweblink && (
              <button
                type="button"
                onClick={() => openLink(formData.governmentidverificationweblink || '')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '38px',
                  padding: '8px 12px',
                  backgroundColor: '#0074e4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
              >
                🔗 Vérifier
              </button>
            )}
          </div>

          {/* Représentant légal avec switch */}
          <div>
            <Input
              label="Représentant légal *"
              type="text"
              name="legalRepresentative"
              value={formData.legalRepresentative}
              onChange={handleChange}
              placeholder="Ex: Jean Dupont"
              required
              disabled={isPending}
              helperText={isPending ? "Modification bloquée pendant l'examen" : "Requis pour la vérification"}
            />
            <div style={{ marginTop: '8px' }}>
              <VisibilityToggle
                isVisible={!privacy.hideLegalRep}
                onChange={(val) => handlePrivacyChange('hideLegalRep', !val)}
                labelVisible="Public"
                labelHidden="Masqué"
              />
            </div>
          </div>

          {/* Note de sécurité */}
          <div style={{
            marginTop: '20px',
            padding: '14px 16px',
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#92400e',
            lineHeight: '1.5'
          }}>
            <strong>🔐 Confidentialité :</strong> Les informations masquées restent accessibles aux administrateurs pour la vérification, mais ne seront pas affichées publiquement.
          </div>

          {/* Statut de vérification */}
          {isVerified && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#d1fae5',
              border: '2px solid #10b981',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '2rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: '700', color: '#065f46', fontSize: '1rem' }}>
                  Établissement vérifié
                </div>
                <div style={{ fontSize: '0.875rem', color: '#059669', marginTop: '4px' }}>
                  Votre établissement a été validé par un administrateur
                </div>
              </div>
            </div>
          )}

          {isPending && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '2rem' }}>⏳</span>
              <div>
                <div style={{ fontWeight: '700', color: '#92400e', fontSize: '1rem' }}>
                  Demande en cours d'examen
                </div>
                <div style={{ fontSize: '0.875rem', color: '#b45309', marginTop: '4px' }}>
                  Un administrateur examine votre demande de vérification
                </div>
              </div>
            </div>
          )}

          {/* Bouton demander vérification */}
          {!isVerified && !isPending && (
            <div style={{ marginTop: '24px' }}>
              {!canRequest && getMissingFields().length > 0 && (
                <div style={{
                  marginBottom: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#dbeafe',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#1e40af',
                  lineHeight: '1.5'
                }}>
                  <strong>ℹ️ Pour demander la vérification, veuillez compléter :</strong>
                  <ul style={{ margin: '6px 0 0 20px', paddingLeft: 0 }}>
                    {getMissingFields().map((field, idx) => (
                      <li key={idx} style={{ marginBottom: '2px' }}>• {field}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                {/* Bouton Enregistrer sans vérification */}
                <Button
                  type="button"
                  onClick={onSaveWithoutVerification}
                  variant="outline"
                  style={{
                    width: '100%',
                    height: '48px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    borderColor: '#3b82f6',
                    color: '#3b82f6',
                    backgroundColor: '#fff',
                    transition: 'all 0.2s ease'
                  }}
                >
                  💾 Enregistrer les coordonnées
                </Button>
                
                {/* Bouton Demander vérification */}
                <Button
                  type="button"
                  onClick={onRequestVerification}
                  disabled={!canRequest}
                  variant="primary"
                  style={{
                    width: '100%',
                    height: '48px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    backgroundColor: canRequest ? '#10b981' : '#cbd5e1',
                    borderColor: canRequest ? '#10b981' : '#cbd5e1',
                    color: '#ffffff',
                    cursor: canRequest ? 'pointer' : 'not-allowed',
                    opacity: canRequest ? 1 : 0.7,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {canRequest 
                    ? '✅ Demander la vérification' 
                    : '🔒 Complétez les champs requis pour vérifier'}
                </Button>
              </div>
              
              {sensitiveFieldsChanged && existingProfiles?.verified && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#92400e',
                  lineHeight: '1.5'
                }}>
                  ⚠️ <strong>Important :</strong> La modification de ces informations nécessitera une nouvelle validation par l'administrateur. Votre profil restera visible mais passera en statut "En attente de vérification".
                </div>
              )}
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default VerificationTab;
