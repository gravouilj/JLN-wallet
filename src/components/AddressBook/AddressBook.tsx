import { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../atoms';
import addressBookService from '../../services/addressBookService';
import { Button, Input } from '../UI';

/**
 * Composant Carnet d'Adresses
 * @param {string} tokenId - ID du token pour filtrer (optionnel)
 * @param {function} onSelectAddress - Callback quand une adresse est sélectionnée
 * @param {boolean} compact - Mode compact pour affichage réduit
 */
export const AddressBook = ({ tokenId = null, onSelectAddress = null, compact = false }) => {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const setNotification = useSetAtom(notificationAtom);

  // Charger les contacts
  useEffect(() => {
    loadContacts();
  }, [tokenId]);

  const loadContacts = () => {
    const allContacts = addressBookService.getContacts(tokenId);
    setContacts(allContacts);
  };

  // Filtrer par recherche
  const filteredContacts = searchQuery
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  // Sauvegarder un nouveau contact
  const handleAddContact = () => {
    if (!newAddress.trim() || !newName.trim()) {
      setNotification({ type: 'error', message: 'Adresse et nom requis' });
      return;
    }

    // Validation basique adresse eCash
    if (!newAddress.startsWith('ecash:')) {
      setNotification({ type: 'error', message: 'Adresse eCash invalide (doit commencer par ecash:)' });
      return;
    }

    const success = addressBookService.saveContact(newAddress.trim(), newName.trim(), tokenId);
    if (success) {
      setNotification({ type: 'success', message: `✅ Contact "${newName}" ajouté` });
      setNewAddress('');
      setNewName('');
      setShowAddForm(false);
      loadContacts();
    }
  };

  // Mettre à jour un contact existant
  const handleUpdateContact = (contact) => {
    const newName = prompt('Nouveau nom:', contact.name);
    if (newName && newName.trim()) {
      const success = addressBookService.saveContact(contact.address, newName.trim(), tokenId);
      if (success) {
        setNotification({ type: 'success', message: '✅ Contact mis à jour' });
        loadContacts();
      }
    }
  };

  // Supprimer un contact
  const handleDeleteContact = (contact) => {
    if (confirm(`Supprimer "${contact.name}" ?`)) {
      const success = addressBookService.deleteContact(contact.address, tokenId);
      if (success) {
        setNotification({ type: 'success', message: '🗑️ Contact supprimé' });
        loadContacts();
      }
    }
  };

  // Copier une adresse
  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    setNotification({ type: 'success', message: '📋 Adresse copiée' });
  };

  // Sélectionner une adresse (pour callback parent)
  const handleSelectAddress = (contact) => {
    if (onSelectAddress) {
      onSelectAddress(contact.address, contact.name);
    }
    handleCopyAddress(contact.address);
  };

  // Exporter le carnet
  const handleExport = () => {
    addressBookService.exportContacts();
    setNotification({ type: 'success', message: '📥 Carnet d\'adresses exporté' });
  };

  // Importer des contacts
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await addressBookService.importContacts(file);
      if (success) {
        setNotification({ type: 'success', message: '📤 Contacts importés' });
        loadContacts();
      } else {
        setNotification({ type: 'error', message: '❌ Erreur import' });
      }
    }
  };

  if (compact) {
    return (
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px'
      }}>
        {/* Note de confidentialité */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '0.75rem',
          color: '#065f46',
          display: 'flex',
          alignItems: 'start',
          gap: '6px'
        }}>
          <span>🔒</span>
          <span>
            <strong>Confidentialité :</strong> Vos contacts sont stockés uniquement sur votre appareil, pas sur nos serveurs. Vous pouvez les exporter/importer à tout moment.
          </span>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', margin: 0 }}>
            📇 Carnet d'adresses {tokenId ? '(ce jeton)' : '(tous)'}
          </h4>
          <span style={{ 
            fontSize: '0.75rem', 
            color: '#94a3b8',
            backgroundColor: '#e2e8f0',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {contacts.length} contact{contacts.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Barre de recherche si > 3 contacts */}
        {contacts.length > 3 && (
          <div style={{ marginBottom: '12px' }}>
            <Input
              placeholder="🔍 Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {contacts.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', margin: '12px 0' }}>
            Aucun contact enregistré
          </p>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredContacts.map((contact, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectAddress(contact)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                    {contact.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                    {contact.address.substring(0, 20)}...
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteContact(contact);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    border: 'none',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            border: '1px dashed #cbd5e1',
            backgroundColor: '#fff',
            color: '#3b82f6',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? '❌ Annuler' : '➕ Ajouter un contact'}
        </button>

        {showAddForm && (
          <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Input
              label="Nom du contact"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Alice"
            />
            <Input
              label="Adresse eCash"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="ecash:qq..."
            />
            <Button onClick={handleAddContact} variant="primary" fullWidth>
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Mode complet (non-compact)
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px'
    }}>
      {/* Note de confidentialité */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#ecfdf5',
        border: '1px solid #10b981',
        borderRadius: '10px',
        marginBottom: '20px',
        fontSize: '0.85rem',
        color: '#065f46',
        display: 'flex',
        alignItems: 'start',
        gap: '8px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>🔒</span>
        <div>
          <strong>Confidentialité :</strong> Vos contacts sont stockés uniquement sur votre appareil (localStorage), pas sur nos serveurs. Vous gardez le contrôle total de vos données et pouvez les exporter/importer à tout moment.
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
          📇 Carnet d'adresses {tokenId ? '(ce jeton)' : ''}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            disabled={contacts.length === 0}
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: '600',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              color: '#475569',
              borderRadius: '8px',
              cursor: contacts.length > 0 ? 'pointer' : 'not-allowed',
              opacity: contacts.length > 0 ? 1 : 0.5
            }}
          >
            📥 Exporter
          </button>
          <label style={{
            padding: '6px 12px',
            fontSize: '0.85rem',
            fontWeight: '600',
            border: '1px solid #cbd5e1',
            backgroundColor: '#fff',
            color: '#475569',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            📤 Importer
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: '20px' }}>
        <Input
          placeholder="🔍 Rechercher par nom ou adresse..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Bouton Ajouter */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        style={{
          width: '100%',
          marginBottom: '16px',
          padding: '12px',
          fontSize: '0.9rem',
          fontWeight: '600',
          border: '2px dashed #cbd5e1',
          backgroundColor: showAddForm ? '#eff6ff' : '#fff',
          color: '#3b82f6',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        {showAddForm ? '❌ Annuler l\'ajout' : '➕ Ajouter un nouveau contact'}
      </button>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          <Input
            label="Nom du contact"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Alice"
          />
          <Input
            label="Adresse eCash"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="ecash:qq..."
          />
          <Button onClick={handleAddContact} variant="primary" fullWidth>
            ✅ Enregistrer le contact
          </Button>
        </div>
      )}

      {/* Liste des contacts */}
      <div style={{ 
        fontSize: '0.85rem', 
        color: '#64748b', 
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>
          {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''} 
          {searchQuery && ` (filtré${filteredContacts.length > 1 ? 's' : ''})`}
        </span>
        {contacts.length !== filteredContacts.length && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              border: 'none',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Effacer filtre
          </button>
        )}
      </div>

      {filteredContacts.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#94a3b8',
          backgroundColor: '#f8fafc',
          borderRadius: '10px'
        }}>
          {searchQuery 
            ? '🔍 Aucun contact trouvé avec cette recherche'
            : '📭 Aucun contact enregistré. Ajoutez-en un !'}
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {filteredContacts.map((contact, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                  {contact.name}
                </div>
                <div 
                  onClick={() => handleCopyAddress(contact.address)}
                  style={{ 
                    fontSize: '0.8rem', 
                    color: '#64748b', 
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    userSelect: 'all'
                  }}
                  title="Cliquer pour copier"
                >
                  {contact.address}
                </div>
                {contact.tokenId && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    🔗 {contact.tokenId.substring(0, 16)}...
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleSelectAddress(contact)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Copier l'adresse"
                >
                  📋
                </button>
                <button
                  onClick={() => handleUpdateContact(contact)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    border: '1px solid #f59e0b',
                    backgroundColor: '#fef3c7',
                    color: '#f59e0b',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Modifier le nom"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteContact(contact)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    border: '1px solid #ef4444',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressBook;
