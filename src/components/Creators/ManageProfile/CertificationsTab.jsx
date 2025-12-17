import React from 'react';
import { Card, CardContent, Stack, Input } from '../../UI';

/**
 * Onglet Certifications
 * Gère les certifications nationales et internationales et les labels
 */
const CertificationsTab = ({ formData, handleChange, handleUrlBlur, openLink }) => {
  return (
    <Card>
      <CardContent style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span>
            <span>Certifications</span>
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Valorisez vos labels et certifications (optionnel)
          </p>
        </div>

        <Stack spacing="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Certification nationale & Label (AB, etc.)"
              type="text"
              name="nationalcertification"
              value={formData.nationalcertification}
              onChange={handleChange}
              placeholder="Ex: Agriculture Biologique"
              leftIcon={<span style={{ fontSize: '1.2rem' }}>🇫🇷</span>}
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Lien certification nationale & Label"
                type="text"
                name="nationalcertificationweblink"
                value={formData.nationalcertificationweblink}
                onChange={handleChange}
                onBlur={() => handleUrlBlur('nationalcertificationweblink')}
                placeholder="certificat-agence.fr/..."
                leftIcon={<span style={{ fontSize: '1.2rem' }}>🔗</span>}
              />
              {formData.nationalcertificationweblink && (
                <button
                  type="button"
                  onClick={() => openLink(formData.nationalcertificationweblink)}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Certification internationale & Label"
              type="text"
              name="internationalcertification"
              value={formData.internationalcertification}
              onChange={handleChange}
              placeholder="Ex: Ecocert, Demeter"
              leftIcon={<span style={{ fontSize: '1.2rem' }}>🌍</span>}
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Lien certification internationale & Label"
                type="text"
                name="internationalcertificationweblink"
                value={formData.internationalcertificationweblink}
                onChange={handleChange}
                onBlur={() => handleUrlBlur('internationalcertificationweblink')}
                placeholder="ecocert.com/..."
                leftIcon={<span style={{ fontSize: '1.2rem' }}>🔗</span>}
              />
              {formData.internationalcertificationweblink && (
                <button
                  type="button"
                  onClick={() => openLink(formData.internationalcertificationweblink)}
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
          </div>

          {/* Certifications supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Certification & Label 1"
              type="text"
              name="certification1"
              value={formData.certification1}
              onChange={handleChange}
              placeholder="Ex: MSC, Rainforest Alliance..."
              leftIcon={<span style={{ fontSize: '1.2rem' }}>🏅</span>}
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Lien certification & Label 1"
                type="text"
                name="certification1weblink"
                value={formData.certification1weblink}
                onChange={handleChange}
                onBlur={() => handleUrlBlur('certification1weblink')}
                placeholder="https://..."
                leftIcon={<span style={{ fontSize: '1.2rem' }}>🔗</span>}
              />
              {formData.certification1weblink && (
                <button
                  type="button"
                  onClick={() => openLink(formData.certification1weblink)}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Certification & Label 2"
              type="text"
              name="certification2"
              value={formData.certification2}
              onChange={handleChange}
              placeholder="Ex: Fair Trade, Organic..."
              leftIcon={<span style={{ fontSize: '1.2rem' }}>🏅</span>}
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Lien certification & Label 2"
                type="text"
                name="certification2weblink"
                value={formData.certification2weblink}
                onChange={handleChange}
                onBlur={() => handleUrlBlur('certification2weblink')}
                placeholder="https://..."
                leftIcon={<span style={{ fontSize: '1.2rem' }}>🔗</span>}
              />
              {formData.certification2weblink && (
                <button
                  type="button"
                  onClick={() => openLink(formData.certification2weblink)}
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
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CertificationsTab;
