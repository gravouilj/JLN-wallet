import { useState, useEffect } from 'react';
import addressBookService from '../services/addressBookService';

/**
 * Sélecteur de contacts multiples pour mode sendToMany
 * Ajoute les contacts sélectionnés au textarea parent
 */
export const AddressBookMultiSelector = ({ tokenId, onContactsSelected }) => {
  const [contacts, setContacts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);

  useEffect(() => {
    const allContacts = addressBookService.getContacts(tokenId);
    setContacts(allContacts);
  }, [tokenId]);

  const filteredContacts = searchQuery
    ? contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : contacts;

  if (contacts.length === 0) return null;

  const handleToggleContact = (contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.find(c => c.address === contact.address);
      if (isSelected) {
        return prev.filter(c => c.address !== contact.address);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleAddSelected = () => {
    if (selectedContacts.length > 0 && onContactsSelected) {
      onContactsSelected(selectedContacts);
      setSelectedContacts([]);
      setShowDropdown(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          padding: '6px 12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          border: '1px solid var(--primary, #3b82f6)',
          backgroundColor: '#fff',
          color: 'var(--primary, #3b82f6)',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
      >
        📇 Carnet ({contacts.length})
        {selectedContacts.length > 0 && (
          <span style={{
            backgroundColor: 'var(--primary, #3b82f6)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '0.75rem'
          }}>
            {selectedContacts.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Overlay pour fermer */}
          <div
            onClick={() => setShowDropdown(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
          />

          {/* Dropdown */}
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            minWidth: '280px',
            maxWidth: '350px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 999,
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {/* Recherche si > 3 contacts */}
            {contacts.length > 3 && (
              <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Rechercher..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Liste de contacts avec checkboxes */}
            <div style={{ padding: '4px' }}>
              {filteredContacts.map((contact, idx) => {
                const isSelected = selectedContacts.find(c => c.address === contact.address);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleContact(contact)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      readOnly
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                        {contact.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {contact.address.substring(0, 20)}...
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bouton pour ajouter les contacts sélectionnés */}
            {selectedContacts.length > 0 && (
              <div style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={handleAddSelected}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor: 'var(--primary, #3b82f6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Ajouter {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AddressBookMultiSelector;
