/**
 * Service de gestion du carnet d'adresses
 * Stockage localStorage avec option future Supabase
 */

const STORAGE_KEY = 'jln_address_book';

/**
 * Structure d'un contact:
 * {
 *   address: string,
 *   name: string,
 *   tokenId?: string,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */

interface Contact {
  address: string;
  name: string;
  tokenId?: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ContactsByToken {
  [key: string]: Contact[];
}

class AddressBookService {
  /**
   * Récupérer tous les contacts (ou filtrés par tokenId)
   */
  getContacts(tokenId: string | null = null): Contact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const contacts = data ? (JSON.parse(data) as Contact[]) : [];

      if (tokenId) {
        return contacts.filter(c => c.tokenId === tokenId);
      }

      return contacts;
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Erreur lecture carnet d\'adresses:', errMsg);
      return [];
    }
  }

  /**
   * Récupérer un contact par adresse
   */
  getContactByAddress(
    address: string,
    tokenId: string | null = null
  ): Contact | undefined {
    const contacts = this.getContacts(tokenId);
    return contacts.find(c => c.address === address);
  }

  /**
   * Sauvegarder/Mettre à jour un contact
   */
  saveContact(
    address: string,
    name: string,
    tokenId: string | null = null
  ): boolean {
    try {
      const contacts = this.getContacts();
      const existingIndex = contacts.findIndex(
        c => c.address === address && (!tokenId || c.tokenId === tokenId)
      );

      const contactData: Contact = {
        address,
        name: name.trim(),
        tokenId: tokenId || undefined,
        updatedAt: Date.now(),
        createdAt: 0 // sera défini si nouveau
      };

      if (existingIndex >= 0) {
        // Mise à jour
        contacts[existingIndex] = {
          ...contacts[existingIndex],
          ...contactData
        };
      } else {
        // Nouveau contact
        contacts.push({
          ...contactData,
          createdAt: Date.now()
        });
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
      console.log('✅ Contact sauvegardé:', { address, name, tokenId });
      return true;
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Erreur sauvegarde contact:', errMsg);
      return false;
    }
  }

  /**
   * Supprimer un contact
   */
  deleteContact(
    address: string,
    tokenId: string | null = null
  ): boolean {
    try {
      const contacts = this.getContacts();
      const filtered = contacts.filter(
        c => !(c.address === address && (!tokenId || c.tokenId === tokenId))
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ Contact supprimé:', address);
      return true;
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Erreur suppression contact:', errMsg);
      return false;
    }
  }

  /**
   * Récupérer tous les contacts groupés par token
   */
  getAllContactsByToken(): ContactsByToken {
    const contacts = this.getContacts();
    const grouped: ContactsByToken = {};

    contacts.forEach(contact => {
      const key = contact.tokenId || 'general';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(contact);
    });

    return grouped;
  }

  /**
   * Rechercher des contacts par nom ou adresse
   */
  searchContacts(
    query: string,
    tokenId: string | null = null
  ): Contact[] {
    const contacts = this.getContacts(tokenId);
    const lowerQuery = query.toLowerCase();

    return contacts.filter(
      c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.address.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Exporter le carnet d'adresses en JSON
   */
  exportContacts(): void {
    const contacts = this.getContacts();
    const dataStr = JSON.stringify(contacts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `carnet_adresses_${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Importer des contacts depuis un fichier JSON
   */
  async importContacts(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as Contact[];

      if (!Array.isArray(imported)) {
        throw new Error('Format invalide: attendu un tableau');
      }

      const currentContacts = this.getContacts();
      const merged = [...currentContacts];

      imported.forEach(contact => {
        if (contact.address && contact.name) {
          const existingIndex = merged.findIndex(
            c =>
              c.address === contact.address &&
              c.tokenId === contact.tokenId
          );

          if (existingIndex >= 0) {
            // Remplacer si plus récent
            if (
              !merged[existingIndex].updatedAt ||
              contact.updatedAt > merged[existingIndex].updatedAt
            ) {
              merged[existingIndex] = contact;
            }
          } else {
            merged.push(contact);
          }
        }
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      console.log(`✅ ${imported.length} contacts importés`);
      return true;
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Erreur import contacts:', errMsg);
      return false;
    }
  }

  /**
   * Obtenir le nombre total de contacts
   */
  getContactsCount(tokenId: string | null = null): number {
    return this.getContacts(tokenId).length;
  }

  /**
   * Effacer tout le carnet d'adresses (avec confirmation)
   */
  clearAll(): boolean {
    if (
      confirm(
        '⚠️ Êtes-vous sûr de vouloir effacer tout le carnet d\'adresses ?'
      )
    ) {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Carnet d\'adresses effacé');
      return true;
    }
    return false;
  }
}

export default new AddressBookService();
