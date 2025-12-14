import React from 'react';
import { Card, CardContent, Stack, Input } from '../UI';

/**
 * Onglet Contact et réseaux sociaux
 * Gère les sites web et les réseaux sociaux de la ferme
 */
const ContactTab = ({ formData, handleChange, handleUrlBlur, openLink, getSocialIcon }) => {
  return (
    <Card>
      <CardContent style={{ padding: '24px' }}>
        <Stack spacing="md">
          <div style={{ position: 'relative' }}>
            <Input
              label="Site web principal"
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              onBlur={() => handleUrlBlur('website')}
              placeholder="maferme.fr"
              helperText="https:// sera ajouté automatiquement"
              leftIcon={<span style={{ fontSize: '1.2rem' }}>{getSocialIcon('website')}</span>}
            />
            {formData.website && (
              <button
                type="button"
                onClick={() => openLink(formData.website)}
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
                🔗 Tester
              </button>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Input
              label="Autre site web"
              type="text"
              name="otherWebsite"
              value={formData.otherWebsite}
              onChange={handleChange}
              onBlur={() => handleUrlBlur('otherWebsite')}
              placeholder="boutique.maferme.fr"
              leftIcon={<span style={{ fontSize: '1.2rem' }}>{getSocialIcon('otherWebsite')}</span>}
            />
            {formData.otherWebsite && (
              <button
                type="button"
                onClick={() => openLink(formData.otherWebsite)}
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
                🔗 Tester
              </button>
            )}
          </div>

          {/* Titre section réseaux sociaux */}
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              🌐 Réseaux sociaux
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Connectez vos réseaux sociaux pour améliorer votre visibilité
            </p>
          </div>

          {/* Grille réseaux sociaux compacte 2x3 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* Colonne gauche */}
            <div style={{ position: 'relative' }}>
              <Input
                label="📘 Facebook"
                type="text"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                onBlur={() => handleUrlBlur('facebook')}
                placeholder="facebook.com/maferme"
              />
              {formData.facebook && (
                <button
                  type="button"
                  onClick={() => openLink(formData.facebook)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '38px',
                    padding: '6px 10px',
                    backgroundColor: '#0074e4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  title="Ouvrir le lien"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                >
                  🔗
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <Input
                label="📹 YouTube"
                type="text"
                name="youtube"
                value={formData.youtube}
                onChange={handleChange}
                onBlur={() => handleUrlBlur('youtube')}
                placeholder="youtube.com/@maferme"
              />
              {formData.youtube && (
                <button
                  type="button"
                  onClick={() => openLink(formData.youtube)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '38px',
                    padding: '6px 10px',
                    backgroundColor: '#0074e4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  title="Ouvrir le lien"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                >
                  🔗
                </button>
              )}
            </div>

            <Input
              label="📷 Instagram"
              type="text"
              name="instagram"
              value={formData.instagram}
              onChange={handleChange}
              placeholder="@maferme"
            />

            <Input
              label="🎵 TikTok"
              type="text"
              name="tiktok"
              value={formData.tiktok}
              onChange={handleChange}
              placeholder="@maferme"
            />

            <Input
              label="💬 WhatsApp"
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="6 12 34 56 78"
            />

            <Input
              label="✈️ Telegram"
              type="text"
              name="telegram"
              value={formData.telegram}
              onChange={handleChange}
              placeholder="@maferme"
            />
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ContactTab;
