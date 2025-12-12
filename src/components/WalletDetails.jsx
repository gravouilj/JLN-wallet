import React, { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { walletAtom, notificationAtom, savedMnemonicAtom } from '../atoms';
import { Card, CardContent, Button, Badge } from './UI';
import { useEcashWallet } from '../hooks/useEcashWallet';

const WalletDetails = () => {
  const [wallet] = useAtom(walletAtom);
  const [savedMnemonic] = useAtom(savedMnemonicAtom);
  const setNotification = useSetAtom(notificationAtom);
  
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyWIF, setPrivateKeyWIF] = useState('Chargement...');

  // Calculer la clé privée WIF uniquement si demandé (pour la sécurité)
  useEffect(() => {
    if (showPrivateKey && wallet) {
      try {
        // Tentative de récupération propre via le hook ou l'objet wallet
        // Note: Ceci dépend de l'implémentation exacte de votre classe EcashWallet
        const privKey = wallet.sk ? wallet.getPrivateKeyWIF() : 'Non disponible'; 
        // Si getPrivateKeyWIF n'existe pas, adapter selon votre service ecashWallet.js
        // Fallback simple pour l'affichage si la fonction manque
        setPrivateKeyWIF(privKey || 'Clé privée protégée'); 
      } catch (e) {
        setPrivateKeyWIF('Erreur récupération clé');
      }
    }
  }, [showPrivateKey, wallet]);

  const handleCopy = (text, label) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text).then(() => {
      setNotification({ type: 'success', message: `✅ ${label} copié !` });
    }).catch(() => {
      setNotification({ type: 'error', message: '❌ Échec de la copie' });
    });
  };

  if (!wallet) return null;

  const mnemonic = savedMnemonic || 'Phrase non sauvegardée';

  return (
    <div className="space-y-4 mt-4">
      {/* Avertissement de sécurité */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 items-start">
        <span className="text-2xl">⚠️</span>
        <div>
          <h4 className="font-bold text-red-700 dark:text-red-400 text-sm uppercase mb-1">Zone de Danger</h4>
          <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
            Ne partagez <strong>jamais</strong> votre phrase de récupération ou votre clé privée. 
            Quiconque possède ces informations peut voler tous vos fonds.
          </p>
        </div>
      </div>

      {/* Phrase de récupération */}
      <Card>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Phrase de récupération (12 mots)</h3>
            <Button 
              variant="ghost" 
              onClick={() => setShowMnemonic(!showMnemonic)}
              style={{ fontSize: '0.8rem', padding: '4px 12px', height: 'auto' }}
            >
              {showMnemonic ? '🙈 Masquer' : '👁️ Révéler'}
            </Button>
          </div>

          <div className={`p-4 rounded-xl font-mono text-sm border transition-all ${
            showMnemonic 
              ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200' 
              : 'bg-gray-200 dark:bg-gray-800 border-transparent text-transparent select-none'
          }`}>
            {showMnemonic ? mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
          </div>

          {showMnemonic && (
            <div className="mt-3 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => handleCopy(mnemonic, 'Mnemonic')}
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                📋 Copier la phrase
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Note: On peut masquer la clé privée WIF si non essentielle pour simplifier l'UI, 
          ou l'ajouter dans une seconde Card similaire si besoin expert. */}
    </div>
  );
};

export default WalletDetails;