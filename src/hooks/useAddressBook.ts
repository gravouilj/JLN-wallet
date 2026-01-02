import { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import addressBookService from '../services/addressBookService';

interface Contact {
  name: string;
  address: string;
}

interface UseAddressBookReturn {
  contacts: Contact[];
  filteredContacts: Contact[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  addContact: (address: string, name: string) => Promise<boolean>;
  updateContact: (oldAddress: string, newName: string) => Promise<boolean>;
  deleteContact: (address: string) => Promise<boolean>;
  copyAddress: (address: string) => void;
  selectContact: (address: string, name: string) => void;
  exportContacts: () => void;
  importContacts: (file: File) => Promise<boolean>;
  loadContacts: () => void;
}

/**
 * useAddressBook - Hook pour la gestion du carnet d'adresses
 * 
 * Encapsule toute la logique métier:
 * - Chargement/filtrage des contacts
 * - CRUD opérations (add, update, delete)
 * - Validation des adresses eCash
 * - Import/export
 * - Notifications utilisateur
 * 
 * @param {string} tokenId - ID du token pour filtrer (optionnel)
 * @param {Function} onSelectAddress - Callback quand une adresse est sélectionnée
 * @returns {UseAddressBookReturn} État et méthodes
 */
export const useAddressBook = (
  tokenId?: string | null,
  onSelectAddress?: (address: string, name: string) => void
): UseAddressBookReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const setNotification = useSetAtom(notificationAtom);

  // Charger les contacts au montage ou si tokenId change
  useEffect(() => {
    loadContacts();
  }, [tokenId]);

  const loadContacts = () => {
    try {
      setLoading(true);
      const allContacts = addressBookService.getContacts(tokenId || undefined);
      setContacts(allContacts);
    } catch (err) {
      console.error('Erreur chargement carnet:', err);
      setContacts([]);
      setNotification({ type: 'error', message: '❌ Erreur chargement carnet' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrer par recherche
  const filteredContacts = searchQuery
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  // Validation adresse eCash
  const validateAddress = (address: string): boolean => {
    if (!address.trim()) return false;
    if (!address.startsWith('ecash:')) {
      setNotification({ type: 'error', message: 'Adresse eCash invalide (doit commencer par ecash:)' });
      return false;
    }
    return true;
  };

  // Ajouter un contact
  const addContact = async (address: string, name: string): Promise<boolean> => {
    if (!address.trim() || !name.trim()) {
      setNotification({ type: 'error', message: 'Adresse et nom requis' });
      return false;
    }

    if (!validateAddress(address)) {
      return false;
    }

    try {
      const success = addressBookService.saveContact(address.trim(), name.trim(), tokenId || undefined);
      if (success) {
        setNotification({ type: 'success', message: `✅ Contact "${name}" ajouté` });
        loadContacts();
        return true;
      } else {
        setNotification({ type: 'error', message: 'Erreur lors de l\'ajout du contact' });
        return false;
      }
    } catch (err) {
      console.error('Erreur ajout contact:', err);
      setNotification({ type: 'error', message: '❌ Erreur ajout contact' });
      return false;
    }
  };

  // Mettre à jour un contact
  const updateContact = async (oldAddress: string, newName: string): Promise<boolean> => {
    if (!newName.trim()) {
      setNotification({ type: 'error', message: 'Nom requis' });
      return false;
    }

    try {
      const success = addressBookService.saveContact(oldAddress, newName.trim(), tokenId || undefined);
      if (success) {
        setNotification({ type: 'success', message: '✅ Contact mis à jour' });
        loadContacts();
        return true;
      } else {
        setNotification({ type: 'error', message: 'Erreur mise à jour contact' });
        return false;
      }
    } catch (err) {
      console.error('Erreur mise à jour contact:', err);
      setNotification({ type: 'error', message: '❌ Erreur mise à jour' });
      return false;
    }
  };

  // Supprimer un contact
  const deleteContact = async (address: string): Promise<boolean> => {
    try {
      const success = addressBookService.deleteContact(address, tokenId || undefined);
      if (success) {
        setNotification({ type: 'success', message: '🗑️ Contact supprimé' });
        loadContacts();
        return true;
      } else {
        setNotification({ type: 'error', message: 'Erreur suppression contact' });
        return false;
      }
    } catch (err) {
      console.error('Erreur suppression contact:', err);
      setNotification({ type: 'error', message: '❌ Erreur suppression' });
      return false;
    }
  };

  // Copier une adresse au presse-papiers
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setNotification({ type: 'success', message: '📋 Adresse copiée' });
  };

  // Sélectionner une adresse (callback parent + copie)
  const selectContact = (address: string, name: string) => {
    if (onSelectAddress) {
      onSelectAddress(address, name);
    }
    copyAddress(address);
  };

  // Exporter les contacts
  const exportContacts = () => {
    try {
      addressBookService.exportContacts();
      setNotification({ type: 'success', message: '📥 Carnet exporté' });
    } catch (err) {
      console.error('Erreur export:', err);
      setNotification({ type: 'error', message: '❌ Erreur export' });
    }
  };

  // Importer des contacts
  const importContacts = async (file: File): Promise<boolean> => {
    try {
      const success = await addressBookService.importContacts(file);
      if (success) {
        setNotification({ type: 'success', message: '📤 Contacts importés' });
        loadContacts();
        return true;
      } else {
        setNotification({ type: 'error', message: '❌ Erreur import' });
        return false;
      }
    } catch (err) {
      console.error('Erreur import:', err);
      setNotification({ type: 'error', message: '❌ Erreur import' });
      return false;
    }
  };

  return {
    contacts,
    filteredContacts,
    searchQuery,
    setSearchQuery,
    loading,
    addContact,
    updateContact,
    deleteContact,
    copyAddress,
    selectContact,
    exportContacts,
    importContacts,
    loadContacts
  };
};
