import React from 'react';
import { Card, CardContent, Stack, Input, VisibilityToggle } from '../UI';

/**
 * Onglet Vérification
 * Gère les informations de vérification et la confidentialité
 */
const VerificationTab = ({ 
  formData, 
  handleChange, 
  existingFarm,
  sensitiveFieldsChanged,
  privacy,
  handlePrivacyChange,
  handleUrlBlur,
  openLink
}) => {
  return (
    <Card style={{ backgroundColor: '#eff6ff', borderColor: '#3b82f6' }}>
      <CardContent style={{ padding: '24px' }}>
        {/* Avertissement modification champs sensibles */}
        {existingFarm?.verified && sensitiveFieldsChanged && (
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
              helperText="Requis pour la vérification et les notifications"
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
            <Input
              label="Téléphone *"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="6 12 34 56 78"
              required
              helperText="Requis pour la vérification (Format : 6 12 34 56 78)"
              leftIcon={<span style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>🇫🇷 +33</span>}
            />
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
              helperText="Requis pour la vérification"
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
              onBlur={() => handleUrlBlur('governmentidverificationweblink')}
              placeholder="annuaire-entreprises.data.gouv.fr/..."
              helperText="Lien vers l'annuaire officiel (requis pour validation)"
              leftIcon={<span style={{ fontSize: '1.2rem' }}>🏛️</span>}
            />
            {formData.governmentidverificationweblink && (
              <button
                type="button"
                onClick={() => openLink(formData.governmentidverificationweblink)}
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
              label="Représentant légal"
              type="text"
              name="legalRepresentative"
              value={formData.legalRepresentative}
              onChange={handleChange}
              placeholder="Ex: Jean Dupont"
              helperText="Recommandé pour la vérification"
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
        </Stack>
      </CardContent>
    </Card>
  );
};

export default VerificationTab;
