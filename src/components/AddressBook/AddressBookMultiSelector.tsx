import { useState, useEffect } from 'react';
import addressBookService from '../../services/addressBookService';

// 1. Définition de l'interface pour un Contact
// Cela règle les erreurs "property name does not exist on type never"
export interface Contact {
  name: string;
  address: string;
  tokenId?: string | null;
}

// 2. Définition des Props du composant
interface AddressBookMultiSelectorProps {
  tokenId: string | null;
  onContactsSelected: (contacts: Contact[]) => void;
}

/**
 * Sélecteur de contacts multiples pour mode sendToMany
 */
export const AddressBookMultiSelector = ({ 
  tokenId, 
  onContactsSelected 
}: AddressBookMultiSelectorProps) => {
  // 3. Typage explicite des states (Vague 3 : adieu les "never[]")
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);

  useEffect(() => {
    // On assume que getContacts retourne un Contact[]
    const allContacts = addressBookService.getContacts(tokenId) as Contact[];
    setContacts(allContacts);
  }, [tokenId]);

  const filteredContacts = searchQuery
    ? contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : contacts;

  if (contacts.length === 0) return null;

  // 4. Typage de l'argument contact
  const handleToggleContact = (contact: Contact) => {
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

            <div style={{ padding: '4px' }}>
              {filteredContacts.map((contact) => {
                const isSelected = selectedContacts.find(c => c.address === contact.address);
                return (
                  <div
                    key={contact.address} // Préférer l'adresse à l'index pour la clé
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
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontName: 'monospace' }}>
                        {contact.address.substring(0, 20)}...
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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