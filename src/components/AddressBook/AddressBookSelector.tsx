import { useState } from 'react';
import addressBookService from '../../services/addressBookService';

/**
 * Sélecteur de contact depuis le carnet d'adresses
 * Affiche un bouton qui ouvre une liste déroulante des contacts
 * @param {string} tokenId - ID du token pour filtrer (optionnel)
 * @param {function} onSelectContact - Callback (address, name) => void quand un contact est sélectionné
 */
export const AddressBookSelector = ({ tokenId = null, onSelectContact }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const contacts = addressBookService.getContacts(tokenId);
  
  // Filtrer par recherche
  const filteredContacts = searchQuery
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  const handleSelectContact = (contact) => {
    onSelectContact(contact.address, contact.name);
    setShowDropdown(false);
    setSearchQuery('');
  };

  if (contacts.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de contacts
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          padding: '8px 12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          border: '1px solid #cbd5e1',
          backgroundColor: showDropdown ? '#eff6ff' : '#fff',
          color: showDropdown ? '#3b82f6' : '#475569',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        📇 {showDropdown ? 'Fermer' : 'Carnet'} ({contacts.length})
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          width: '320px',
          maxHeight: '300px',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Recherche */}
          {contacts.length > 3 && (
            <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Rechercher..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Liste des contacts */}
          <div style={{ 
            maxHeight: '240px', 
            overflowY: 'auto',
            padding: '8px'
          }}>
            {filteredContacts.length === 0 ? (
              <div style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }}>
                {searchQuery ? 'Aucun contact trouvé' : 'Aucun contact'}
              </div>
            ) : (
              filteredContacts.map((contact, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectContact(contact)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '600', 
                    color: '#1e293b',
                    marginBottom: '4px'
                  }}>
                    👤 {contact.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#64748b', 
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {contact.address}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '8px 12px', 
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            fontSize: '0.75rem',
            color: '#64748b',
            textAlign: 'center'
          }}>
            Cliquer sur un contact pour l'utiliser
          </div>
        </div>
      )}

      {/* Overlay pour fermer le dropdown en cliquant à l'extérieur */}
      {showDropdown && (
        <div
          onClick={() => setShowDropdown(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};

export default AddressBookSelector;
