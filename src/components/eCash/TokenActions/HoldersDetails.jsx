import React, { useState } from 'react';
import addressBookService from '../../../services/addressBookService';

/**
 * HoldersDetails - Affiche la liste détaillée des détenteurs éligibles
 * 
 * @param {number} holdersCount - Nombre total de détenteurs éligibles
 * @param {Array} calculatedHolders - Liste des détenteurs avec leurs données
 * @param {string} tokenId - ID du token
 * @param {Function} setNotification - Fonction pour afficher les notifications
 * @param {Function} onHoldersUpdate - Callback pour rafraîchir la liste
 */
const HoldersDetails = ({ 
  holdersCount, 
  calculatedHolders = [], 
  tokenId, 
  setNotification,
  onHoldersUpdate 
}) => {
  const [savingContact, setSavingContact] = useState(null);
  const [contactName, setContactName] = useState('');

  const handleSaveContact = (address) => {
    if (contactName.trim()) {
      addressBookService.saveContact(address, contactName.trim(), tokenId);
      setNotification({ type: 'success', message: `✅ "${contactName}" ajouté au carnet` });
      setContactName('');
      setSavingContact(null);
      onHoldersUpdate?.();
    }
  };

  const handleDeleteContact = (address, displayName) => {
    if (confirm(`Supprimer "${displayName}" du carnet ?`)) {
      addressBookService.deleteContact(address, tokenId);
      setNotification({ type: 'success', message: '🗑️ Contact supprimé' });
      onHoldersUpdate?.();
    }
  };

  if (holdersCount === null) return null;

  return (
    <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Liste des détenteurs</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {holdersCount} détenteur{holdersCount > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              const csv = 'Nom,Adresse,Solde\n' + 
                calculatedHolders.map(h => {
                  const contact = addressBookService.getContactByAddress(h.address, tokenId);
                  const name = contact ? contact.name : 'Sans nom';
                  return `"${name}","${h.address}","${h.balance || 0}"`;
                }).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `detenteurs_${tokenId.slice(0, 8)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              setNotification({ type: 'success', message: '📥 Liste exportée' });
            }}
            style={{
              padding: '4px 12px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            📥 Exporter CSV
          </button>
        </div>
      </div>
      
      {/* Liste scrollable des adresses */}
      {calculatedHolders.length > 0 && (
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          {calculatedHolders.map((holder, idx) => {
            // Vérifier si l'adresse existe dans le carnet
            const contact = addressBookService.getContactByAddress(holder.address, tokenId);
            const displayName = contact ? contact.name : null;
            const isEditing = savingContact === holder.address;

            return (
              <div key={idx} style={{ 
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: `1px solid ${displayName ? '#3b82f6' : '#e2e8f0'}`,
                transition: 'all 0.2s'
              }}>
                {/* Nom du contact si existe */}
                {displayName && (
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '600', 
                    color: '#3b82f6',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    👤 {displayName}
                  </div>
                )}

                {/* Ligne principale : Adresse + Solde + XEC */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      onClick={() => {
                        navigator.clipboard.writeText(holder.address);
                        setNotification({ type: 'success', message: '📋 Adresse copiée' });
                      }}
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.8rem',
                        color: displayName ? '#64748b' : '#1e293b',
                        cursor: 'pointer',
                        wordBreak: 'break-all',
                        padding: '4px 8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                      title="Cliquer pour copier l'adresse complète"
                    >
                      {holder.address}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#94a3b8',
                      marginTop: '4px'
                    }}>
                      💰 {Number(holder.balanceFormatted).toLocaleString()} jetons
                    </div>
                  </div>
                </div>

                {/* Actions : Sauvegarder dans carnet */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Nom du contact"
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && contactName.trim()) {
                          handleSaveContact(holder.address);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSaveContact(holder.address)}
                      disabled={!contactName.trim()}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        border: 'none',
                        backgroundColor: contactName.trim() ? '#3b82f6' : '#cbd5e1',
                        color: '#fff',
                        borderRadius: '6px',
                        cursor: contactName.trim() ? 'pointer' : 'not-allowed'
                      }}
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => {
                        setSavingContact(null);
                        setContactName('');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        border: 'none',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {!displayName ? (
                      <button
                        onClick={() => {
                          setSavingContact(holder.address);
                          setContactName('');
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        💾 Sauvegarder dans le carnet
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteContact(holder.address, displayName)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          border: '1px solid #ef4444',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        🗑️ Retirer du carnet
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {holdersCount === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', fontSize: '0.9rem' }}>
          Aucun détenteur ne correspond aux critères.
        </div>
      )}
    </div>
  );
};

export default HoldersDetails;
