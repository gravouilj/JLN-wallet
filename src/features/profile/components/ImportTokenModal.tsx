import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../../atoms';
import { Card, CardContent, Button } from '../../../components/UI';
import { useEcashWallet } from '../../../hooks/useEcashWallet';
import { addEntry, ACTION_TYPES } from '../../../services/historyService';
import { checkCreatorBlocked } from '../../../services/antifraudService';
// 👇 1. IMPORT STATIQUE ICI (Au lieu d'attendre dans la fonction)
import { ProfilService } from '../../../services/profilService';

const ImportTokenModal = ({ isOpen, onClose, onImportSuccess }) => {
  const navigate = useNavigate();
  const { wallet, address } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  const [tokenId, setTokenId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [tokenPreview, setTokenPreview] = useState(null);
  const [step, setStep] = useState('input'); // 'input', 'preview', 'quick'
  const [quickPurpose, setQuickPurpose] = useState(''); // Pour l'import rapide
  const [quickCounterpart, setQuickCounterpart] = useState(''); // Contrepartie pour l'import rapide
  const [hasExistingFarm, setHasExistingFarm] = useState(false);
  const [showQuickImport, setShowQuickImport] = useState(false); // Toggle pour afficher/masquer l'import rapide
  
  // Anti-fraud state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState(null);
  
  // Vérifier le blocage quand la modal s'ouvre
  useEffect(() => {
    const checkBlock = async () => {
      if (!isOpen || !address) return;
      
      try {
        const blockStatus = await checkCreatorBlocked(address);
        setIsBlocked(blockStatus.isBlocked);
        setBlockReason(blockStatus.reason);
        
        if (blockStatus.isBlocked) {
          setNotification({
            type: 'error',
            message: `🚫 Importation bloquée : ${blockStatus.reason}`,
            duration: 8000
          });
        }
      } catch (error) {
        console.error('❌ Erreur vérification blocage:', error);
      }
    };
    
    checkBlock();
  }, [isOpen, address, setNotification]);

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

      // Vérifier si l'utilisateur possède le mintBaton (offre variable)
      const batons = await wallet.getMintBatons();
      const hasMintBaton = batons.some(b => 
        b.tokenId.toLowerCase() === tokenId.toLowerCase()
      );
      
      console.log('🔍 Vérification MintBaton:', {
        tokenId,
        hasMintBaton,
        batonsCount: batons.length
      });

      // Déterminer le type d'offre
      const genesisInfo = info.genesisInfo;
      const isFixedSupply = !hasMintBaton; // Si pas de baton = offre fixe
      
      // Si offre fixe, vérifier que l'utilisateur possède au moins des tokens
      if (isFixedSupply) {
        try {
          const tokenBalance = await wallet.getTokenBalance(tokenId);
          const balance = BigInt(tokenBalance.balance || '0');
          
          if (balance === 0n) {
            setNotification({
              type: 'error',
              message: `❌ Ce jeton a une offre fixe et vous n'en possédez aucun. Vous devez avoir des tokens dans votre wallet pour l'importer.`
            });
            setIsImporting(false);
            return;
          }
          
          console.log('✅ Offre fixe - Balance détectée:', tokenBalance.balance);
        } catch (balanceErr) {
          console.error('Erreur vérification balance:', balanceErr);
          setNotification({
            type: 'error',
            message: `❌ Impossible de vérifier votre solde pour ce jeton à offre fixe.`
          });
          setIsImporting(false);
          return;
        }
      }

      // Vérifier si l'utilisateur a déjà un profil
      // 👇 MODIFICATION : Utilisation directe de ProfilService importé statiquement
      const existingProfile = await ProfilService.getMyProfil(address);
      setHasExistingFarm(!!existingProfile);

      // 🔒 NOUVEAU: Vérifier la disponibilité du token (sécurité anti-conflit)
      console.log('🔍 Vérification disponibilité token...');
      // 👇 MODIFICATION : Utilisation directe de ProfilService
      const availability = await ProfilService.checkTokenAvailability(tokenId, address);
      
      if (!availability.isAvailable) {
        setNotification({
          type: 'error',
          message: `⛔ Ce jeton est déjà géré par la ferme "${availability.existingFarmName}". Vous ne pouvez pas l'importer.`
        });
        setIsImporting(false);
        return;
      }
      
      if (availability.isReimport) {
        console.log('ℹ️ Ré-import détecté (token déjà dans votre ferme)');
        setNotification({
          type: 'info',
          message: `💡 Ce jeton est déjà dans votre ferme. Vous pouvez le mettre à jour.`
        });
      }

      // Construire l'objet tokenPreview avec TOUTES les données blockchain
      const decimals = genesisInfo.decimals || 0;
      
      setTokenPreview({
        tokenId: tokenId,
        name: genesisInfo.tokenName || 'Unknown Token',
        ticker: genesisInfo.tokenTicker || 'UNK',
        decimals: decimals,
        supply: genesisInfo.circulatingSupply || '0',
        genesisSupply: genesisInfo.genesisSupply || '0',
        image: genesisInfo.url || '',
        url: genesisInfo.url || '',
        timeFirstSeen: info.timeFirstSeen || null,
        hasMintBaton: hasMintBaton,
        isFixedSupply: isFixedSupply
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

  const handleCompleteImport = () => {
    // Scénario 1: Import complet (pas de profil)
    navigate('/complete-token-import', {
      state: {
        tokenData: {
          tokenId: tokenPreview.tokenId,
          ticker: tokenPreview.ticker,
          name: tokenPreview.name,
          decimals: tokenPreview.decimals,
          image: tokenPreview.image,
          url: tokenPreview.url,
          supply: tokenPreview.supply,
          genesisSupply: tokenPreview.genesisSupply,
          timeFirstSeen: tokenPreview.timeFirstSeen,
          hasMintBaton: tokenPreview.hasMintBaton
        }
      }
    });
    handleClose();
  };

  const handleQuickImport = async () => {
    // Vérification anti-fraude
    if (isBlocked) {
      setNotification({
        type: 'error',
        message: `🚫 Importation bloquée : ${blockReason || 'Signalements actifs'}. Veuillez résoudre vos tickets d'abord.`,
        duration: 8000
      });
      return;
    }
    
    // Scénario 2: Import rapide (profil existant ou non)
    if (!quickPurpose.trim()) {
      setNotification({
        type: 'error',
        message: '⚠️ L\'objectif du token est obligatoire'
      });
      return;
    }

    if (!quickCounterpart.trim()) {
      setNotification({
        type: 'error',
        message: '⚠️ La contrepartie du token est obligatoire'
      });
      return;
    }

    if (!wallet || !address) {
      setNotification({
        type: 'error',
        message: '⚠️ Adresse wallet non disponible. Veuillez reconnecter votre wallet.'
      });
      return;
    }

    console.log('🔍 Import rapide - address:', address);

    setIsImporting(true);
    try {
      // 👇 MODIFICATION : Utilisation directe de ProfilService (Plus d'import dynamique)
      
      // 🔒 NOUVEAU: Vérifier la disponibilité du token avant import
      console.log('🔍 Vérification disponibilité avant import rapide...');
      const availability = await ProfilService.checkTokenAvailability(tokenPreview.tokenId, address);
      
      if (!availability.isAvailable) {
        setNotification({
          type: 'error',
          message: `⛔ Ce jeton est déjà géré par la ferme "${availability.existingFarmName}". Vous ne pouvez pas l'importer.`
        });
        setIsImporting(false);
        return;
      }
      
      const existingProfile = await ProfilService.getMyProfil(address);

      const newTokenData = {
        tokenId: tokenPreview.tokenId,
        ticker: tokenPreview.ticker,
        name: tokenPreview.name,
        decimals: tokenPreview.decimals,
        image: tokenPreview.image,
        purpose: quickPurpose.trim(),
        counterpart: quickCounterpart.trim(),
        purposeUpdatedAt: new Date().toISOString(),
        counterpartUpdatedAt: new Date().toISOString()
      };

      if (existingProfile) {
        // Profil existant: ajouter le token
        const existingTokens = Array.isArray(existingProfile.tokens) ? existingProfile.tokens : [];
        const tokenExists = existingTokens.some(t => t.tokenId === tokenPreview.tokenId);
        
        if (tokenExists) {
          setNotification({
            type: 'warning',
            message: 'Ce token est déjà importé dans votre ferme'
          });
          handleClose();
          return;
        }

        const updatedProfile = {
          ...existingProfile,
          tokens: [...existingTokens, newTokenData]
        };

        await ProfilService.saveProfil(updatedProfile, address);
        setNotification({
          type: 'success',
          message: `Token "${tokenPreview.name}" ajouté à votre profil !`
        });
        
        // Enregistrer dans l'historique
        try {
          await addEntry({
            owner_address: address,
            token_id: tokenPreview.tokenId,
            token_ticker: tokenPreview.ticker,
            action_type: ACTION_TYPES.IMPORT,
            amount: null,
            tx_id: null,
            details: {
              name: tokenPreview.name,
              hasMintBaton: tokenPreview.hasMintBaton,
              isFixedSupply: tokenPreview.isFixedSupply
            }
          });
        } catch (histErr) {
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }
      } else {
        // Pas de profil: créer un profil minimal
        const profileData = {
          name: tokenPreview.name || 'Mon Profil',
          description: '', // Description vide, le purpose/counterpart sont dans le token
          tokens: [newTokenData],
          verification_status: 'none',
          verified: false,
          products: []
        };

        await ProfilService.saveProfil(profileData, address);
        setNotification({
          type: 'success',
          message: `Token "${tokenPreview.name}" importé ! Pour apparaître dans l'annuaire, complétez votre profil.`
        });
        
        // Enregistrer dans l'historique
        try {
          await addEntry({
            owner_address: address,
            token_id: tokenPreview.tokenId,
            token_ticker: tokenPreview.ticker,
            action_type: ACTION_TYPES.IMPORT,
            amount: null,
            tx_id: null,
            details: {
              name: tokenPreview.name,
              hasMintBaton: tokenPreview.hasMintBaton,
              isFixedSupply: tokenPreview.isFixedSupply
            }
          });
        } catch (histErr) {
          console.warn('⚠️ Erreur enregistrement historique:', histErr);
        }
      }

      if (onImportSuccess) onImportSuccess();
      handleClose();
      // Laisser le parent gérer le rafraîchissement des données
    } catch (err) {
      console.error('Erreur import rapide:', err);
      setNotification({
        type: 'error',
        message: `Erreur: ${err.message}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setTokenId('');
    setTokenPreview(null);
    setStep('input');
    setIsImporting(false);
    setQuickPurpose('');
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
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--text-primary, #000)',
                  marginBottom: '10px'
                }}>
                  Identifiant du Jeton (TokenID)
                </label>
                <input
                  type="text"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value.trim())}
                  placeholder="Ex: abc123def456..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid var(--border-color, #e5e5e5)',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary, #000)',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  maxLength={64}
                  disabled={isImporting}
                />
                <p style={{ 
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #666)',
                  marginTop: '6px',
                  margin: '6px 0 0 0'
                }}>
                  {tokenId.length}/64 caractères
                </p>
              </div>

              <Card style={{ marginBottom: '24px' }}>
                <CardContent style={{ 
                  padding: '18px',
                  backgroundColor: 'var(--bg-info, #e0f2fe)',
                  borderRadius: '10px'
                }}>
                  <p style={{ 
                    fontSize: '0.9rem',
                    color: 'var(--text-primary, #000)',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    ℹ️ <strong>Important:</strong> Vous devez posséder le <strong>Droit de Création 🔨 (MintBaton)</strong> de ce jeton. Cela implique d'utiliser l'adresse eCash avec laquelle le jeton a été créé.
                  </p>
                </CardContent>
              </Card>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  onClick={handleSearch}
                  disabled={isImporting || tokenId.length !== 64}
                  variant="primary"
                  fullWidth
                  style={{
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {isImporting ? '🔍 Recherche...' : '🔍 Rechercher'}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  fullWidth
                  style={{
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Annuler
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Preview avec 2 scénarios */}
          {step === 'preview' && tokenPreview && (
            <>
              <Card style={{ marginBottom: '24px' }}>
                <CardContent style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                    <img
                      src={tokenPreview.image || 'https://placehold.co/80x80?text=Token'}
                      alt={tokenPreview.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        border: '2px solid var(--border-color, #e5e5e5)'
                      }}
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/80x80?text=Token';
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        color: 'var(--text-primary, #000)',
                        margin: '0 0 6px 0'
                      }}>
                        {tokenPreview.name}
                      </h3>
                      <p style={{ 
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: 'var(--text-secondary, #666)',
                        textTransform: 'uppercase',
                        margin: '0 0 12px 0'
                      }}>
                        {tokenPreview.ticker}
                      </p>
                      <div>
                        <span style={{ 
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#10b981',
                          color: '#fff'
                        }}>
                          ✓ Droit de Création 🔨 détecté
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-color, #e5e5e5)'
                    }}>
                      <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>
                        Identifiant du Jeton (TokenID):
                      </span>
                      <span style={{ 
                        fontFamily: 'monospace',
                        color: 'var(--text-primary, #000)',
                        fontSize: '0.75rem'
                      }}>
                        {tokenPreview.tokenId.slice(0, 10)}...{tokenPreview.tokenId.slice(-10)}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-color, #e5e5e5)'
                    }}>
                      <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Offre en circulation:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary, #000)' }}>
                        {tokenPreview.supply || '0'} {tokenPreview.ticker}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-color, #e5e5e5)'
                    }}>
                      <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Type d'offre:</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: tokenPreview.isFixedSupply ? '#ef4444' : '#10b981'
                      }}>
                        {tokenPreview.isFixedSupply ? '🔒 Offre Fixe' : '🔄 Offre Variable'}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0'
                    }}>
                      <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Décimales:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary, #000)' }}>
                        {tokenPreview.decimals || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avertissement Offre Fixe */}
              {tokenPreview.isFixedSupply && (
                <Card style={{ marginBottom: '16px', border: '2px solid #f59e0b', backgroundColor: '#fffbeb' }}>
                  <CardContent style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>⚠️</span>
                      <div>
                        <h4 style={{ 
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          color: '#b45309',
                          margin: '0 0 8px 0'
                        }}>
                          Jeton à Offre Fixe
                        </h4>
                        <p style={{ 
                          fontSize: '0.85rem',
                          color: '#92400e',
                          margin: 0,
                          lineHeight: '1.5'
                        }}>
                          Ce jeton a une offre fixe (pas de MintBaton). Vous ne pourrez pas émettre de nouveaux jetons, uniquement les envoyer ou les détruire.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bandeau de blocage anti-fraude */}
              {isBlocked && (
                <Card style={{ marginBottom: '16px', border: '2px solid #ef4444', backgroundColor: '#fef2f2' }}>
                  <CardContent style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🚫</span>
                      <div>
                        <h4 style={{ 
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          color: '#991b1b',
                          margin: '0 0 8px 0'
                        }}>
                          Importation bloquée
                        </h4>
                        <p style={{ 
                          fontSize: '0.85rem',
                          color: '#7f1d1d',
                          margin: '0 0 8px 0',
                          lineHeight: '1.5'
                        }}>
                          <strong>Raison :</strong> {blockReason}
                        </p>
                        <p style={{ 
                          fontSize: '0.75rem',
                          color: '#7f1d1d',
                          margin: 0
                        }}>
                          💡 Pour débloquer : Résolvez vos tickets en attente dans la section Support.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scénario 1: Compléter l'importation (pas de profil) */}
              <Card style={{ marginBottom: '16px' }}>
                <CardContent style={{ 
                  padding: '20px',
                  backgroundColor: hasExistingFarm ? 'var(--bg-secondary, #f5f5f5)' : 'var(--bg-primary, #fff)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{ 
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary, #000)',
                    margin: '0 0 10px 0'
                  }}>
                    {hasExistingFarm ? '📋 Compléter l\'importation' : '🌟 Compléter l\'importation (Recommandé)'}
                  </h4>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary, #666)',
                    margin: '0 0 16px 0',
                    lineHeight: '1.5'
                  }}>
                    {hasExistingFarm 
                      ? 'Ajoutez des informations supplémentaires sur ce token.'
                      : 'Créez votre profil et renseignez les informations pour apparaître dans l\'annuaire.'
                    }
                  </p>
                  <Button
                    onClick={handleCompleteImport}
                    variant={hasExistingFarm ? 'outline' : 'primary'}
                    fullWidth
                    style={{
                      padding: '14px',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    ➡️ Compléter l'importation
                  </Button>
                </CardContent>
              </Card>

              {/* Scénario 2: Import rapide (minimisé par défaut) */}
              <Card style={{ marginBottom: '16px' }}>
                <CardContent style={{ 
                  padding: '20px',
                  backgroundColor: hasExistingFarm ? 'var(--bg-success, #d1fae5)' : 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px'
                }}>
                  <div
                    onClick={() => setShowQuickImport(!showQuickImport)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <h4 style={{ 
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: 'var(--text-primary, #000)',
                      margin: 0
                    }}>
                      {hasExistingFarm ? '⚡ Importation rapide (J\'ai déjà un profil)' : '⚡ Importation rapide (Pas recommandé)'}
                    </h4>
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary, #666)' }}>
                      {showQuickImport ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {showQuickImport && (
                    <>
                      <p style={{ 
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary, #666)',
                        margin: '10px 0 16px 0',
                        lineHeight: '1.5'
                      }}>
                        {hasExistingFarm 
                          ? 'Gagnez du temps ! Renseignez uniquement l\'objectif du jeton.'
                          : 'Import rapide sans créer de profil complet. Votre jeton n\'apparaîtra pas dans l\'annuaire.'
                        }
                      </p>
                        
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'var(--text-primary, #000)',
                          marginBottom: '8px'
                        }}>
                          🎯 Objectif du jeton <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                          value={quickPurpose}
                          onChange={(e) => setQuickPurpose(e.target.value)}
                          placeholder="Ex: Jeton de fidélité pour récompenser mes clients..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid var(--border-color, #e5e5e5)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-primary, #fff)',
                            color: 'var(--text-primary, #000)',
                            fontSize: '0.875rem',
                            minHeight: '80px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            outline: 'none'
                          }}
                          maxLength={500}
                          disabled={isImporting}
                        />
                        <p style={{ 
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary, #666)',
                          marginTop: '4px',
                          margin: '4px 0 0 0'
                        }}>
                          {quickPurpose.length}/500 caractères
                        </p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'var(--text-primary, #000)',
                          marginBottom: '8px'
                        }}>
                          🤝 Contrepartie du jeton <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                          value={quickCounterpart}
                          onChange={(e) => setQuickCounterpart(e.target.value)}
                          placeholder="Ex: Réduction de 10% sur les achats, Accès prioritaire aux nouveaux produits..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid var(--border-color, #e5e5e5)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-primary, #fff)',
                            color: 'var(--text-primary, #000)',
                            fontSize: '0.875rem',
                            minHeight: '80px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            outline: 'none'
                          }}
                          maxLength={500}
                          disabled={isImporting}
                        />
                        <p style={{ 
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary, #666)',
                          marginTop: '4px',
                          margin: '4px 0 0 0'
                        }}>
                          {quickCounterpart.length}/500 caractères
                        </p>
                      </div>

                      <Button
                        onClick={handleQuickImport}
                        disabled={isImporting || !quickPurpose.trim() || !quickCounterpart.trim()}
                        variant="primary"
                        fullWidth
                        style={{
                          padding: '14px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          backgroundColor: hasExistingFarm ? '#10b981' : '#6b7280',
                          borderColor: hasExistingFarm ? '#10b981' : '#6b7280',
                          opacity: (isImporting || !quickPurpose.trim() || !quickCounterpart.trim()) ? 0.5 : 1
                        }}
                      >
                        {isImporting ? '⏳ Import en cours...' : '✅ Compléter l\'Import'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {!hasExistingFarm && (
                <Card style={{ marginBottom: '16px' }}>
                  <CardContent style={{ 
                    padding: '16px',
                    backgroundColor: 'var(--bg-warning, #fef3c7)',
                    borderRadius: '10px'
                  }}>
                    <p style={{ 
                      fontSize: '0.85rem',
                      color: 'var(--text-primary, #000)',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      ⚠️ <strong>Note:</strong> Si vous ne complétez pas les informations sur le créateur, votre jeton n'apparaîtra pas dans l'annuaire public.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => {
                  setStep('input');
                  setTokenPreview(null);
                }}
                variant="outline"
                fullWidth
                style={{
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              >
                ← Retour
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportTokenModal;