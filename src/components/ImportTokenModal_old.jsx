import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import { Card, CardContent, Button } from './UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { syncTokenData } from '../utils/tokenSync';

const ImportTokenModal = ({ isOpen, onClose, onImportSuccess }) => {
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  const [tokenId, setTokenId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [tokenPreview, setTokenPreview] = useState(null);
  const [step, setStep] = useState('input'); // 'input', 'preview', 'quick', 'importing'
  const [quickPurpose, setQuickPurpose] = useState(''); // Pour l'import rapide
  const [hasExistingFarm, setHasExistingFarm] = useState(false);

  // Debug
  console.log('🎯 ImportTokenModal render - isOpen:', isOpen, 'wallet:', wallet ? 'Connecté' : 'Non connecté');

  const handleSearch = async () => {
    if (!wallet) {
      setNotification({
        type: 'error',
        message: '⚠️ Veuillez connecter votre wallet d\'abord'
      });
      return;
    }

    if (!tokenId.trim()) {
      setNotification({
        type: 'error',
        message: 'Veuillez saisir un Token ID'
      });
      return;
    }

    if (tokenId.length !== 64) {
      setNotification({
        type: 'error',
        message: 'Token ID invalide (doit faire 64 caractères)'
      });
      return;
    }

    setIsImporting(true);
    try {
      // Récupérer les infos complètes depuis la blockchain
      const info = await wallet.getTokenInfo(tokenId);
      
      if (!info || !info.genesisInfo) {
        throw new Error('Token non trouvé sur la blockchain');
      }

      // Vérifier que l'utilisateur possède le mintBaton
      const batons = await wallet.getMintBatons();
      const hasMintBaton = batons.some(b => b.tokenId === tokenId);

      if (!hasMintBaton) {
        setNotification({
          type: 'error',
          message: '❌ Vous ne possédez pas le Droit de Création 🔨 (MintBaton) de ce jeton. Vous devez utiliser l\'adresse avec laquelle le jeton a été créé.'
        });
        setIsImporting(false);
        return;
      }

      // Vérifier si l'utilisateur a déjà une ferme
      const { FarmService } = await import('../services/farmService');
      const existingFarm = await FarmService.getMyFarm(wallet.address);
      setHasExistingFarm(!!existingFarm);

      // Construire l'objet tokenPreview avec TOUTES les données
      const circulatingSupply = info.genesisInfo.circulatingSupply || '0';
      const decimals = info.genesisInfo.decimals || 0;
      
      setTokenPreview({
        tokenId: tokenId,
        name: info.genesisInfo.tokenName || 'Unknown Token',
        ticker: info.genesisInfo.tokenTicker || 'UNK',
        decimals: decimals,
        supply: circulatingSupply,
        image: info.genesisInfo.url || '',
        hasMintBaton: true
      });
      setStep('preview');
    } catch (err) {
      console.error('Erreur recherche token:', err);
      setNotification({
        type: 'error',
        message: `Erreur: ${err.message || 'Token introuvable'}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!wallet) {
      setNotification({
        type: 'error',
        message: '⚠️ Veuillez connecter votre wallet d\'abord'
      });
      return;
    }

    // Rediriger vers la page de complétion avec les données du token
    navigate('/complete-token-import', {
      state: {
        tokenData: {
          tokenId: tokenId,
          ticker: tokenPreview.ticker,
          name: tokenPreview.name,
          decimals: tokenPreview.decimals || 0,
          image: tokenPreview.image || '',
          supply: tokenPreview.supply || '0'
        }
      }
    });

    // Fermer le modal
    handleClose();
  };

  const handleClose = () => {
    setTokenId('');
    setTokenPreview(null);
    setStep('input');
    setIsImporting(false);
    onClose();
  };

  if (!isOpen) {
    console.log('❌ Modal non affiché car isOpen=false');
    return null;
  }

  console.log('✅ Modal affiché car isOpen=true');

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-primary, white)',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h2 style={{ 
                fontSize: '1.75rem',
                fontWeight: 'bold',
                color: 'var(--text-primary, #000)',
                margin: '0 0 8px 0'
              }}>
                🔑 Importer un jeton
              </h2>
              <p style={{ 
                fontSize: '0.95rem',
                color: 'var(--text-secondary, #666)',
                margin: 0
              }}>
                Importez un jeton dont vous possédez le Droit de Création 🔨
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.75rem',
                color: 'var(--text-secondary, #999)',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>

          {/* Step 1: Input */}
          {step === 'input' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token ID (64 caractères)
                </label>
                <input
                  type="text"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value.trim())}
                  placeholder="Ex: abc123def456..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                  maxLength={64}
                  disabled={isImporting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tokenId.length}/64 caractères
                </p>
              </div>

              <Card className="mb-4">
                <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    ℹ️ <strong>Important:</strong> Vous devez posséder le MintBaton de ce jeton pour pouvoir l'importer.
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={handleSearch}
                  disabled={isImporting || tokenId.length !== 64}
                  variant="primary"
                  fullWidth
                >
                  {isImporting ? '🔍 Recherche...' : '🔍 Rechercher'}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  fullWidth
                >
                  Annuler
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && tokenPreview && (
            <>
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={tokenPreview.image || 'https://placehold.co/64x64?text=Token'}
                      alt={tokenPreview.name}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/64x64?text=Token';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {tokenPreview.name}
                      </h3>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        {tokenPreview.ticker}
                      </p>
                      <div className="mt-2">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500 text-white">
                          ✓ MintBaton détecté
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Token ID:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100 text-xs">
                        {tokenId.slice(0, 10)}...{tokenId.slice(-10)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Offre en circulation:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {tokenPreview.supply || '0'} {tokenPreview.ticker}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Décimales:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {tokenPreview.decimals || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-4 bg-green-50 dark:bg-green-950/30">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    ✅ Vous allez être redirigé vers une page pour compléter l'import.
                    <br />
                    <strong>Vous devrez obligatoirement renseigner l'objectif de ce token.</strong>
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  variant="primary"
                  fullWidth
                >
                  ➡️ Compléter l'importation
                </Button>
                <Button
                  onClick={() => {
                    setStep('input');
                    setTokenPreview(null);
                  }}
                  variant="outline"
                  fullWidth
                >
                  ← Retour
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportTokenModal;
