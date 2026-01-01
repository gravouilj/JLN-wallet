import React from 'react';
import { Card, CardContent } from '../UI';

/**
 * ObjectivesCounterparts - Affiche et permet d'éditer l'objectif et la contrepartie d'un token
 * @param {boolean} isCreator - True si l'utilisateur est le créateur
 * @param {object} profileInfo - Informations du profil
 * @param {object} tokenDetails - Détails du token (purpose, counterpart)
 * @param {boolean} editingPurpose - État d'édition de l'objectif
 * @param {boolean} editingCounterpart - État d'édition de la contrepartie
 * @param {string} editPurpose - Valeur de l'objectif en cours d'édition
 * @param {string} editCounterpart - Valeur de la contrepartie en cours d'édition
 * @param {boolean} savingPurpose - État de sauvegarde de l'objectif
 * @param {boolean} savingCounterpart - État de sauvegarde de la contrepartie
 * @param {function} setEditPurpose - Setter pour editPurpose
 * @param {function} setEditCounterpart - Setter pour editCounterpart
 * @param {function} setEditingPurpose - Setter pour editingPurpose
 * @param {function} setEditingCounterpart - Setter pour editingCounterpart
 * @param {function} handleSavePurpose - Handler pour sauvegarder l'objectif
 * @param {function} handleSaveCounterpart - Handler pour sauvegarder la contrepartie
 */
const ObjectivesCounterparts = ({
  isCreator,
  profileInfo,
  tokenDetails,
  editingPurpose,
  editingCounterpart,
  editPurpose,
  editCounterpart,
  savingPurpose,
  savingCounterpart,
  setEditPurpose,
  setEditCounterpart,
  setEditingPurpose,
  setEditingCounterpart,
  handleSavePurpose,
  handleSaveCounterpart
}) => {
  const purposeSuggestions = [
    'Jeton de fidélité',
    'Récompense client',
    'Monnaie locale',
    'Cashback',
    'Points de fidélité',
    'Accès exclusif',
    'Carte cadeau'
  ];

  const counterpartSuggestions = [
    '1 jeton = 1€',
    'Réduction de 10%',
    'Accès prioritaire',
    'Produit gratuit',
    'Livraison offerte',
    'Vote',
    'Event exclusif'
  ];

  const handleToggleTag = (currentValue, setValue, suggestion) => {
    const currentTags = currentValue.split(',').map(t => t.trim()).filter(Boolean);
    const isSelected = currentTags.includes(suggestion);
    
    if (isSelected) {
      const newTags = currentTags.filter(t => t !== suggestion);
      setValue(newTags.join(', '));
    } else {
      const newValue = currentValue.trim() ? `${currentValue.trim()}, ${suggestion}` : suggestion;
      setValue(newValue);
    }
  };

  return (
    <Card>
      <CardContent style={{ padding: '24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px',
          alignItems: 'start' 
        }}>

          {/* COLONNE 1 : OBJECTIF */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: editingPurpose ? '16px' : '12px'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎯 Objectif du Jeton
              </h3>
              {isCreator && profileInfo && !editingPurpose && (
                <button
                  onClick={() => {
                    setEditPurpose(tokenDetails?.purpose || '');
                    setEditingPurpose(true);
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.9rem',
                    backgroundColor: 'transparent',
                    color: 'var(--primary-color, #0074e4)',
                    border: '1px solid var(--primary-color, #0074e4)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-color, #0074e4)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--primary-color, #0074e4)';
                  }}
                >
                  ✏️
                </button>
              )}
            </div>
            
            {editingPurpose ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {purposeSuggestions.map((suggestion) => {
                    const currentTags = editPurpose.split(',').map(t => t.trim()).filter(Boolean);
                    const isSelected = currentTags.includes(suggestion);
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleToggleTag(editPurpose, setEditPurpose, suggestion)}
                        disabled={savingPurpose}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.85rem',
                          backgroundColor: isSelected ? 'var(--primary-color, #0074e4)' : 'var(--bg-secondary, #f5f5f5)',
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                          border: '1px solid var(--border-color, #e5e7eb)',
                          borderRadius: '16px',
                          cursor: savingPurpose ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: savingPurpose ? 0.6 : 1
                        }}
                      >
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder="Ex: Jeton de fidélité..."
                  disabled={savingPurpose}
                  rows={3}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: '6px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={() => setEditingPurpose(false)}
                    disabled={savingPurpose}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color, #e5e7eb)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSavePurpose}
                    disabled={savingPurpose}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      backgroundColor: 'var(--primary-color, #0074e4)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {savingPurpose ? '...' : 'Sauvegarder'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '8px',
                  minHeight: '60px'
                }}>
                  <p style={{ margin: 0, lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    {tokenDetails?.purpose || (isCreator ? 'Aucun objectif défini. Cliquez sur le crayon.' : 'Aucun objectif défini.')}
                  </p>
                </div>
                {tokenDetails?.purposeUpdatedAt && (
                  <small style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)' }}>
                    Modifié le {new Date(tokenDetails.purposeUpdatedAt).toLocaleDateString('fr-FR')}
                  </small>
                )}
              </>
            )}
          </div>

          {/* COLONNE 2 : CONTREPARTIE */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: editingCounterpart ? '16px' : '12px'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🤝 Contrepartie
              </h3>
              {isCreator && profileInfo && !editingCounterpart && (
                <button
                  onClick={() => {
                    setEditCounterpart(tokenDetails?.counterpart || '');
                    setEditingCounterpart(true);
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.9rem',
                    backgroundColor: 'transparent',
                    color: 'var(--primary-color, #0074e4)',
                    border: '1px solid var(--primary-color, #0074e4)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-color, #0074e4)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--primary-color, #0074e4)';
                  }}
                >
                  ✏️
                </button>
              )}
            </div>

            {editingCounterpart ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {counterpartSuggestions.map((suggestion) => {
                    const currentTags = editCounterpart.split(',').map(t => t.trim()).filter(Boolean);
                    const isSelected = currentTags.includes(suggestion);
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleToggleTag(editCounterpart, setEditCounterpart, suggestion)}
                        disabled={savingCounterpart}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.85rem',
                          backgroundColor: isSelected ? 'var(--primary-color, #0074e4)' : 'var(--bg-secondary, #f5f5f5)',
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                          border: '1px solid var(--border-color, #e5e7eb)',
                          borderRadius: '16px',
                          cursor: savingCounterpart ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: savingCounterpart ? 0.6 : 1
                        }}
                      >
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={editCounterpart}
                  onChange={(e) => setEditCounterpart(e.target.value)}
                  placeholder="Ex: 10 jetons = 1 café offert..."
                  disabled={savingCounterpart}
                  rows={3}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: '6px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={() => setEditingCounterpart(false)}
                    disabled={savingCounterpart}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color, #e5e7eb)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveCounterpart}
                    disabled={savingCounterpart}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      backgroundColor: 'var(--primary-color, #0074e4)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {savingCounterpart ? '...' : 'Sauvegarder'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '8px',
                  minHeight: '60px'
                }}>
                  <p style={{ margin: 0, lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    {tokenDetails?.counterpart || (isCreator ? 'Aucune contrepartie définie. Cliquez sur le crayon.' : 'Aucune contrepartie définie.')}
                  </p>
                </div>
                {tokenDetails?.counterpartUpdatedAt && (
                  <small style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)' }}>
                    Modifié le {new Date(tokenDetails.counterpartUpdatedAt).toLocaleDateString('fr-FR')}
                  </small>
                )}
              </>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default ObjectivesCounterparts;