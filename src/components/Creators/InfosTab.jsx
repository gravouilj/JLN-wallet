import React from 'react';
import { Card, CardContent, Stack, Input, Textarea } from '../UI';

/**
 * Onglet Informations générales
 * Gère le nom, description, produits et services de la ferme
 */
const InfosTab = ({
  formData,
  handleChange,
  existingProfiles,
  sensitiveFieldsChanged,
  // Produits
  productTags,
  productInput,
  setProductInput,
  handleProductKeyDown,
  removeProductTag,
  addProductTag,
  productSuggestions,
  // Services
  serviceTags,
  serviceInput,
  setServiceInput,
  handleServiceKeyDown,
  removeServiceTag,
  addServiceTag,
  serviceSuggestions
}) => {
  return (
    <Card>
      <CardContent style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span>
            <span>Informations générales</span>
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Présentez votre établissement et vos activités
          </p>
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
                  <strong>Attention :</strong> Vous avez modifié un champ important (Nom, Adresse ou SIRET). 
                  Ces modifications nécessiteront une nouvelle validation par l'administrateur. 
                  Votre ferme restera visible dans l'annuaire pendant l'examen.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <Stack spacing="md">
          <Input
            label="Nom du créateur *"
            type="text"
            name="creatorName"
            value={formData.creatorName}
            onChange={handleChange}
            placeholder="Ex: Jean Dupont"
            required
          />

          <Textarea
            label="Description *"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Décrivez votre ferme, vos valeurs, vos pratiques..."
            required
          />

          {/* SECTION PRODUITS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              🌾 Produits proposés
            </label>
            
            {/* Tags affichés */}
            {productTags.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)'
              }}>
                {productTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeProductTag(tag)}
                      className="text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: 0,
                        lineHeight: 1,
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Input pour ajouter */}
            <Input
              label="Ajouter un produit"
              type="text"
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              onKeyDown={handleProductKeyDown}
              placeholder="Tapez et appuyez sur Entrée"
              helperText="Appuyez sur Entrée pour ajouter"
            />
            
            {/* Suggestions cliquables */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: '600' }}>
                💡 Suggestions :
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                {productSuggestions.filter(s => !productTags.includes(s)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addProductTag(suggestion)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                    }}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION SERVICES */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              🛠️ Services proposés
            </label>
            
            {/* Tags affichés */}
            {serviceTags.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)'
              }}>
                {serviceTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeServiceTag(tag)}
                      className="text-green-800 dark:text-green-200 hover:text-green-600 dark:hover:text-green-400"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: 0,
                        lineHeight: 1,
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Input pour ajouter */}
            <Input
              label="Ajouter un service"
              type="text"
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              onKeyDown={handleServiceKeyDown}
              placeholder="Tapez et appuyez sur Entrée"
              helperText="Appuyez sur Entrée pour ajouter"
            />
            
            {/* Suggestions cliquables */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: '600' }}>
                💡 Suggestions :
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                {serviceSuggestions.filter(s => !serviceTags.includes(s)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addServiceTag(suggestion)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#10b981';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = '#10b981';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                    }}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default InfosTab;
