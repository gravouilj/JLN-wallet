import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { Button, Input, Card, CardContent, Stack } from './UI';
import { savedMnemonicAtom } from '../atoms';

const WalletConnect = ({ onConnected }) => {
  const { importWallet, generateNewWallet } = useEcashWallet();
  const [savedMnemonic] = useAtom(savedMnemonicAtom);
  
  const [mode, setMode] = useState('menu'); // 'menu', 'import', 'create'
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnectSaved = async () => {
    setLoading(true);
    try {
      await importWallet(savedMnemonic);
      if (onConnected) onConnected();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await importWallet(mnemonicInput);
      if (onConnected) onConnected();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await generateNewWallet();
      if (onConnected) onConnected();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'import') {
    return (
      <Stack spacing="md">
        <h3 className="text-lg font-bold text-center">Importer un portefeuille</h3>
        <textarea
          className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900"
          rows={3}
          placeholder="Saisissez vos 12 mots ici..."
          value={mnemonicInput}
          onChange={(e) => setMnemonicInput(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setMode('menu')} fullWidth>Retour</Button>
          <Button onClick={handleImport} disabled={!mnemonicInput || loading} fullWidth>
            {loading ? '...' : 'Importer'}
          </Button>
        </div>
      </Stack>
    );
  }

  return (
    <Stack spacing="md">
      {savedMnemonic && (
        <Button onClick={handleConnectSaved} disabled={loading} fullWidth className="bg-green-600 hover:bg-green-700 text-white">
          {loading ? 'Connexion...' : '🔓 Déverrouiller mon portefeuille'}
        </Button>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <Button variant="primary" onClick={() => handleGenerate()} disabled={loading}>
          ✨ Créer
        </Button>
        <Button variant="outline" onClick={() => setMode('import')} disabled={loading}>
          📥 Importer
        </Button>
      </div>
      
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </Stack>
  );
};

export default WalletConnect;
