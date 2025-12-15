import React from 'react';
import { Card, CardContent, Stack, Input } from '../UI';

/**
 * Onglet Localisation
 * Gère l'adresse complète de la ferme
 */
const LocationTab = ({ formData, handleChange }) => {
  return (
    <Card>
      <CardContent style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📍</span>
            <span>Localisation</span>
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Adresse complète de votre établissement
          </p>
        </div>
        <Stack spacing="md">
          {/* Note informative en haut */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f0f9ff',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            🗺️ <strong>Info :</strong> Ces informations permettront aux visiteurs de trouver votre établissement et de filtrer les résultats par région.
          </div>

          {/* Grille responsive pour les champs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Ligne 1: Pays + Région */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Pays *
              </label>
              <select
                name="locationCountry"
                value={formData.locationCountry}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0 16px',
                  height: '50px',
                  fontSize: '1rem',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-input, #fff)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="France">🇫🇷 France</option>
                <option value="Belgique">🇧🇪 Belgique</option>
                <option value="Suisse">🇨🇭 Suisse</option>
                <option value="Luxembourg">🇱🇺 Luxembourg</option>
                <option value="Canada">🇨🇦 Canada</option>
                <option value="Autre">🌍 Autre</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px', marginLeft: '2px' }}>
                Pays où se situe votre établissement
              </p>
            </div>

            <Input
              label="Région *"
              type="text"
              name="locationRegion"
              value={formData.locationRegion}
              onChange={handleChange}
              required
              placeholder="Ex: Occitanie, Québec..."
              helperText="Région administrative"
            />

            {/* Ligne 2: Département + Ville */}
            <Input
              label="Département *"
              type="text"
              name="locationDepartment"
              value={formData.locationDepartment}
              onChange={handleChange}
              required
              placeholder="Ex: Haute-Garonne, 31..."
              helperText="Département ou province"
            />

            <Input
              label="Ville *"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              placeholder="Ex: Toulouse"
              helperText="Ville ou commune"
            />

            {/* Ligne 3: Code postal + Rue */}
            <Input
              label="Code postal *"
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              required
              placeholder="Ex: 31000"
              helperText="Code postal"
            />

            <Input
              label="Adresse de la rue *"
              type="text"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              placeholder="Ex: 123 Chemin des Champs"
              required
              helperText="Numéro et nom de rue"
            />
          </div>

          {/* Complément d'adresse en pleine largeur */}
          <Input
            label="Complément d'adresse"
            type="text"
            name="addressComplement"
            value={formData.addressComplement}
            onChange={handleChange}
            placeholder="Ex: Bâtiment B, Porte 3, Lieu-dit..."
            helperText="Informations supplémentaires (optionnel)"
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LocationTab;
