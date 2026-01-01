import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { mnemonicAtom } from '../../atoms';
import { storageService } from '../../services/storageService';

const UnlockWallet = () => {
  const setMnemonic = useSetAtom(mnemonicAtom);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Tente de déchiffrer le wallet stocké
      const mnemonic = await storageService.loadWallet(password);
      
      // Si réussi, on met à jour l'atom global (en mémoire uniquement)
      setMnemonic(mnemonic);
    } catch (err) {
      console.error(err);
      setError('Mot de passe incorrect ou données corrompues.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("ATTENTION : Cela effacera définitivement le portefeuille de cet appareil. Avez-vous votre phrase de récupération ?")) {
      storageService.clearWallet();
      window.location.reload();
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🔐 Déverrouiller</h2>
      
      <form onSubmit={handleUnlock}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mot de passe</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            disabled={loading}
            autoFocus
            style={{ width: '100%', padding: '0.75rem' }}
          />
        </div>

        {error && (
          <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={!password || loading}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}
        >
          {loading ? 'Déchiffrement...' : 'Accéder au Wallet'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button 
          onClick={handleReset}
          style={{ background: 'transparent', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Oublié ? Réinitialiser le wallet
        </button>
      </div>
    </div>
  );
};

export default UnlockWallet;