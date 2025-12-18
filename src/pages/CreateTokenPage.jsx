import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { useTranslation } from '../hooks/useTranslation';
import { useEcashWallet, useEcashBalance } from '../hooks/useEcashWallet';
import { useXecPrice } from '../hooks/useXecPrice';
import { useAdmin } from '../hooks/useAdmin';
import { walletConnectedAtom, walletAtom, notificationAtom, walletModalOpenAtom } from '../atoms';
import { profilService } from '../services/profilService';
import { addEntry, ACTION_TYPES } from '../services/historyService';
import { checkCreatorBlocked } from '../services/antifraudService';

const CreateTokenPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // State atoms
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [wallet] = useAtom(walletAtom);
  const setNotification = useSetAtom(notificationAtom);
  const setWalletModalOpen = useSetAtom(walletModalOpenAtom);
  
  // Hooks
  const { wallet: walletInstance, address } = useEcashWallet();
  const { balance } = useEcashBalance();
  const xecPrice = useXecPrice();
  const { isAdmin } = useAdmin();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    decimals: 0,
    quantity: '',
    isFixedSupply: false,
    url: '',
    purpose: '', // Objectif du token
    counterpart: '', // Contrepartie du token
    imageFile: null // Image uploadée
  });
  
  // Loading states
  const [creating, setCreating] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Anti-fraud state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState(null);
  const [checkingBlock, setCheckingBlock] = useState(true);
  
  // Vérifier le blocage au montage
  useEffect(() => {
    const checkBlock = async () => {
      if (!address) {
        setCheckingBlock(false);
        return;
      }
      
      try {
        const blockStatus = await checkCreatorBlocked(address);
        setIsBlocked(blockStatus.isBlocked);
        setBlockReason(blockStatus.reason);
        
        if (blockStatus.isBlocked) {
          setNotification({
            type: 'error',
            message: `🚫 Création bloquée : ${blockStatus.reason}`,
            duration: 8000
          });
        }
      } catch (error) {
        console.error('❌ Erreur vérification blocage:', error);
      } finally {
        setCheckingBlock(false);
      }
    };
    
    checkBlock();
  }, [address, setNotification]);

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler pour l'image
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: '⚠️ Veuillez sélectionner une image valide' });
      return;
    }

    // Vérifier la taille (200 Ko max, idéalement < 50 Ko)
    const maxSize = 200 * 1024; // 200 Ko
    const idealSize = 50 * 1024; // 50 Ko
    if (file.size > maxSize) {
      setNotification({ type: 'error', message: '⚠️ Image trop volumineuse. Maximum 200 Ko.' });
      return;
    }
    if (file.size > idealSize) {
      setNotification({ type: 'warning', message: '⚠️ Image > 50 Ko. Idéalement < 50 Ko pour optimisation blockchain.' });
    }

    // Vérifier les dimensions (256x256 pixels)
    const img = new Image();
    img.onload = () => {
      if (img.width !== 256 || img.height !== 256) {
        setNotification({ type: 'error', message: '⚠️ L\'image doit faire exactement 256x256 pixels.' });
        URL.revokeObjectURL(img.src);
        return;
      }

      // Tout est OK - stocker l'image
      handleInputChange('imageFile', file);
      setImagePreview(URL.createObjectURL(file));
      setNotification({ type: 'success', message: `✅ Image validée (${(file.size / 1024).toFixed(1)} Ko)` });
    };
    img.onerror = () => {
      setNotification({ type: 'error', message: '⚠️ Impossible de charger l\'image' });
    };
    img.src = URL.createObjectURL(file);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    handleInputChange('imageFile', null);
  };

  // Validation: Check if form is valid
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.ticker.trim() !== '' &&
      formData.ticker.length <= 5 &&
      formData.quantity !== '' &&
      Number(formData.quantity) > 0 &&
      formData.purpose.trim() !== '' &&
      formData.counterpart.trim() !== '' &&
      balance >= 25
    );
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    
    // Vérification anti-fraude
    if (isBlocked) {
      setNotification({
        type: 'error',
        message: `🚫 Action bloquée : ${blockReason || 'Signalements actifs'}. Veuillez résoudre vos tickets d'abord.`,
        duration: 8000
      });
      return;
    }
    
    // Validation
    if (!formData.name.trim()) {
      setNotification({ type: 'error', message: t('createToken.validation.nameRequired') });
      return;
    }
    
    if (!formData.ticker.trim()) {
      setNotification({ type: 'error', message: t('createToken.validation.tickerRequired') });
      return;
    }
    
    if (formData.ticker.length > 5) {
      setNotification({ type: 'error', message: t('createToken.validation.tickerTooLong') });
      return;
    }

    if (!formData.purpose.trim()) {
      setNotification({ type: 'error', message: '⚠️ L\'objectif du token est obligatoire' });
      return;
    }

    if (!formData.counterpart.trim()) {
      setNotification({ type: 'error', message: '⚠️ La contrepartie du token est obligatoire' });
      return;
    }
    
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setNotification({ type: 'error', message: t('createToken.validation.quantityPositive') });
      return;
    }
    
    // Vérifier que la quantité * 10^decimals ne dépasse pas MAX_SAFE_INTEGER
    const totalAtoms = Number(formData.quantity) * Math.pow(10, Number(formData.decimals));
    if (totalAtoms > Number.MAX_SAFE_INTEGER) {
      setNotification({ 
        type: 'error', 
        message: `⚠️ Quantité trop grande: ${totalAtoms.toExponential(2)} atoms dépasse la limite sécurisée (${Number.MAX_SAFE_INTEGER}). Réduisez la quantité ou les décimales.`
      });
      return;
    }
    
    // Avertir si la quantité en atoms n'est pas un entier exact
    if (!Number.isInteger(totalAtoms)) {
      setNotification({ 
        type: 'warning', 
        message: `⚠️ Attention: ${formData.quantity} avec ${formData.decimals} décimales donnera ${totalAtoms} atoms (arrondi possible). Continuer?`
      });
      // Ne pas bloquer, juste avertir
    }
    
    // Check XEC balance
    if (balance < 25) {
      setNotification({ type: 'error', message: t('createToken.validation.insufficientXec') });
      return;
    }

    try {
      setCreating(true);
      
      // 1. Uploader l'image sur Supabase si présente
      let tokenImageUrl = '';
      if (formData.imageFile) {
        try {
          setUploadingImage(true);
          const { supabase } = await import('../services/supabaseClient');
          
          // Générer un nom unique pour l'image
          const fileExt = formData.imageFile.name.split('.').pop();
          const fileName = `token_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          // Upload dans le bucket 'token-images'
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('token-images')
            .upload(fileName, formData.imageFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Récupérer l'URL publique
          const { data: urlData } = supabase.storage
            .from('token-images')
            .getPublicUrl(fileName);

          tokenImageUrl = urlData.publicUrl;
          console.log('✅ Image uploadée:', tokenImageUrl);
          
        } catch (imgErr) {
          console.error('⚠️ Erreur upload image:', imgErr);
          setNotification({ type: 'warning', message: '⚠️ Erreur upload image. Création du jeton sans image.' });
        } finally {
          setUploadingImage(false);
        }
      }
      
      // 2. Déterminer l'URL du token (site web ou image)
      let tokenUrl = formData.url.trim();
      
      if (!tokenUrl && tokenImageUrl) {
        // Pas d'URL fournie mais image uploadée → utiliser l'URL de l'image
        tokenUrl = tokenImageUrl;
      }
      // Si ni URL ni image: tokenUrl reste vide (pas de défaut)
      
      const params = {
        name: formData.name.trim(),
        ticker: formData.ticker.trim().toUpperCase(),
        url: tokenUrl,
        decimals: parseInt(formData.decimals),
        quantity: parseInt(formData.quantity),
        isFixedSupply: formData.isFixedSupply
      };
      
      console.log('🚀 Creating token with params:', params);
      
      const result = await walletInstance.createToken(params);
      
      console.log('✅ Token created:', result);
      
      // Pré-enregistrer le profile dans Supabase avec l'objectif et la contrepartie
      if (address && formData.purpose && formData.counterpart) {
        try {
          // Vérifier si un profile existe déjà
          const existingProfile = await profilService.getMyProfile(address);
          
          const tokenEntry = {
            tokenId: result.txid,
            ticker: formData.ticker.trim().toUpperCase(),
            purpose: formData.purpose,
            counterpart: formData.counterpart,
            purposeUpdatedAt: new Date().toISOString(),
            counterpartUpdatedAt: new Date().toISOString(),
            isVisible: true
          };
          
          if (existingProfile) {
            // Ajouter le token à la liste existante
            const existingTokens = existingProfile.tokens || [];
            const updatedTokens = [...existingTokens, tokenEntry];
            
            await profilService.saveProfil({
              ...existingProfile,
              tokens: updatedTokens
            }, address);
            
            console.log('✅ Token ajouté à la profile existant');
          } else {
            // Créer un nouveau profile minimal
            await profilService.saveProfil({
              name: formData.name,
              description: '', // Description vide, le purpose/counterpart sont dans le token
              country: 'France',
              email: '', // À compléter plus tard
              tokens: [tokenEntry]
            }, address);
            
            console.log('✅ Profile créé avec le token');
          }
        } catch (profileErr) {
          console.warn('⚠️ Erreur pré-enregistrement profile (non bloquant):', profileErr);
        }
      }
      
      // Enregistrer dans l'historique
      try {
        await addEntry({
          owner_address: address,
          token_id: result.txid,
          token_ticker: formData.ticker.trim().toUpperCase(),
          action_type: ACTION_TYPES.CREATE,
          amount: formData.quantity.toString(),
          tx_id: result.txid,
          details: {
            name: formData.name,
            decimals: parseInt(formData.decimals),
            isFixedSupply: formData.isFixedSupply
          }
        });
        console.log('✅ Création enregistrée dans l\'historique');
      } catch (histErr) {
        console.warn('⚠️ Erreur enregistrement historique:', histErr);
      }
      
      setNotification({
        type: 'success',
        message: `✅ Jeton ${formData.ticker} créé avec succès ! Redirection vers "Gérer mes jetons"...`
      });
      
      // Rediriger vers ManageTokenPage après un court délai
      setTimeout(() => {
        navigate('/manage-tokens');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error creating token:', error);
      setNotification({
        type: 'error',
        message: `${t('createToken.errorTitle')}: ${error.message}`
      });
    } finally {
      setCreating(false);
    }
  };

  const handleConnectWallet = () => {
    if (location.pathname === '/') {
      setWalletModalOpen(true);
    } else {
      navigate('/');
      setTimeout(() => {
        setWalletModalOpen(true);
      }, 100);
    }
  };

  // Calculate estimated cost in EUR
  const estimatedCostXec = 25;
  const estimatedCostEur = xecPrice && typeof xecPrice.convert === 'function' 
    ? xecPrice.convert(estimatedCostXec, 'EUR').toFixed(4) 
    : '...';

  // Wallet not connected view
  if (!walletConnected || !wallet) {
    return (
      <MobileLayout title={t('createToken.title')}>
        <div className="settings-page-content">
          <h1 className="page-header-title">🛠️ {t('createToken.title')}</h1>
          
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary, #f5f5f5)',
            borderRadius: '12px',
            margin: '20px 0'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <p style={{ 
              fontSize: '1rem', 
              color: 'var(--text-primary, #000)',
              marginBottom: '20px'
            }}>
              {t('createToken.connectWallet')}
            </p>
            <button
              onClick={handleConnectWallet}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-color, #0074e4)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              🔓 {t('common.connect')}
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Form view (main)
  return (
    <MobileLayout title={t('createToken.title')}>
      <div className="settings-page-content">
        <h1 className="page-header-title">🛠️ {t('createToken.title')}</h1>
        
        {/* Bandeau de blocage anti-fraude */}
        {isBlocked && (
          <div style={{
            padding: '16px',
            marginBottom: '24px',
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '10px',
            fontSize: '0.9rem',
            color: '#991b1b',
            lineHeight: '1.6'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '1.5rem' }}>🚫</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', marginBottom: '8px' }}>
                  Création de jetons bloquée
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                  <strong>Raison :</strong> {blockReason}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
                  💡 Pour débloquer : Résolvez vos tickets en attente dans la section Support.
                </div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleCreateToken}>
          {/* Info Balance & Cost */}
          <div style={{
            padding: '14px',
            marginBottom: '24px',
            backgroundColor: 'var(--bg-secondary, #f0f9ff)',
            borderRadius: '10px',
            fontSize: '0.9rem',
            color: 'var(--text-primary, #000)',
            lineHeight: '1.6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>💰 {t('wallet.balance')}:</span>
              <strong>{balance?.toFixed(2) || 0} XEC</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💵 {t('createToken.estimatedCost')}</span>
              <strong>{t('createToken.estimatedCostEur', { price: estimatedCostEur })}</strong>
            </div>
          </div>

          {/* SECTION MODIFIABLE */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '10px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✏️ Informations modifiables après création
            </h3>
            <p style={{
              fontSize: '0.85rem',
              color: '#047857',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Ces champs peuvent être mis à jour ultérieurement dans "Gérer mes jetons"
            </p>
          </div>

          {/* Purpose/Objectif - EN PREMIER */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="purpose" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              🎯 Objectif du jeton <span style={{ color: '#ef4444' }}>*</span>
            </label>
            
            {/* Choix suggérés pour l'objectif */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {[
                'Jeton de fidélité',
                'Récompense client',
                'Monnaie locale',
                'Cashback',
                'Points de fidélité',
                'Accès exclusif',
                'Carte cadeau'
              ].map((suggestion) => {
                const currentTags = formData.purpose.split(',').map(t => t.trim()).filter(Boolean);
                const isSelected = currentTags.includes(suggestion);
                
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        // Retirer le tag
                        const newTags = currentTags.filter(t => t !== suggestion);
                        handleInputChange('purpose', newTags.join(', '));
                      } else {
                        // Ajouter le tag
                        const newValue = formData.purpose.trim() 
                          ? `${formData.purpose.trim()}, ${suggestion}`
                          : suggestion;
                        handleInputChange('purpose', newValue);
                      }
                    }}
                    disabled={creating}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: isSelected ? 'var(--primary-color, #007bff)' : 'var(--bg-secondary, #f5f5f5)',
                      color: isSelected ? '#fff' : 'var(--text-primary, #333)',
                      border: '1px solid var(--border-color, #ddd)',
                      borderRadius: '16px',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: creating ? 0.6 : 1
                    }}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>

            <textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="Ex: Jeton de fidélité pour achats directs à la ferme, points de récompense, prévente de récoltes..."
              disabled={creating}
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 Décrivez brièvement l'utilité de ce jeton ({formData.purpose.length}/500 caractères)
            </small>
          </div>

          {/* Counterpart/Contrepartie - EN SECOND */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="counterpart" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              🤝 Contrepartie du jeton <span style={{ color: '#ef4444' }}>*</span>
            </label>
            
            {/* Choix suggérés pour la contrepartie */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {[
                '1 jeton = 1€ de réduction',
                'Réduction de 10%',
                'Accès prioritaire',
                'Produit gratuit',
                'Livraison offerte',
                'Droit de vote',
                'Événements exclusifs'
              ].map((suggestion) => {
                const currentTags = formData.counterpart.split(',').map(t => t.trim()).filter(Boolean);
                const isSelected = currentTags.includes(suggestion);
                
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        // Retirer le tag
                        const newTags = currentTags.filter(t => t !== suggestion);
                        handleInputChange('counterpart', newTags.join(', '));
                      } else {
                        // Ajouter le tag
                        const newValue = formData.counterpart.trim() 
                          ? `${formData.counterpart.trim()}, ${suggestion}`
                          : suggestion;
                        handleInputChange('counterpart', newValue);
                      }
                    }}
                    disabled={creating}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: isSelected ? 'var(--primary-color, #007bff)' : 'var(--bg-secondary, #f5f5f5)',
                      color: isSelected ? '#fff' : 'var(--text-primary, #333)',
                      border: '1px solid var(--border-color, #ddd)',
                      borderRadius: '16px',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: creating ? 0.6 : 1
                    }}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>

            <textarea
              id="counterpart"
              value={formData.counterpart}
              onChange={(e) => handleInputChange('counterpart', e.target.value)}
              placeholder="Ex: Réduction de 10% sur les achats, Accès prioritaire aux nouveaux produits, Droit de vote sur les décisions de la ferme..."
              disabled={creating}
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 Quelle contrepartie offrez-vous aux détenteurs ? ({formData.counterpart.length}/500 caractères)
            </small>
          </div>

          {/* SECTION BLOCKCHAIN IMMUABLE */}
          <div style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '10px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: '#ef4444',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔒 Informations blockchain (IMMUABLES)
            </h3>
            <p style={{
              fontSize: '0.85rem',
              color: '#991b1b',
              margin: 0,
              lineHeight: '1.5'
            }}>
              ⚠️ Ces informations seront inscrites définitivement dans la blockchain et ne pourront PLUS être modifiées (sauf la quantité si offre variable).
            </p>
          </div>

          {/* Supply Type (Radio Buttons) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '12px'
            }}>
              {t('createToken.supply')} <span style={{ color: '#dc2626' }}>*</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#ef4444', marginLeft: '8px' }}>
                🔒 Immuable
              </span>
            </label>
            
            {/* Variable Supply */}
            <div style={{
              padding: '12px',
              border: `2px solid ${!formData.isFixedSupply ? 'var(--primary-color, #0074e4)' : 'var(--border-color, #ddd)'}`,
              borderRadius: '8px',
              marginBottom: '10px',
              cursor: 'pointer',
              backgroundColor: !formData.isFixedSupply ? 'var(--bg-secondary, #f0f9ff)' : 'var(--bg-primary, #fff)',
              transition: 'all 0.2s'
            }}
            onClick={() => handleInputChange('isFixedSupply', false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="radio"
                  id="supply-variable"
                  name="supply"
                  checked={!formData.isFixedSupply}
                  onChange={() => handleInputChange('isFixedSupply', false)}
                  disabled={creating}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="supply-variable" style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--text-primary, #000)',
                  cursor: 'pointer',
                  flex: 1
                }}>
                  🔄 {t('createToken.supplyVariable')}
                </label>
              </div>
              <small style={{
                display: 'block',
                marginTop: '6px',
                marginLeft: '30px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary, #666)',
                lineHeight: '1.4'
              }}>
                {t('createToken.supplyVariableHelp')}
              </small>
            </div>

            {/* Fixed Supply */}
            <div style={{
              padding: '12px',
              border: `2px solid ${formData.isFixedSupply ? '#dc2626' : 'var(--border-color, #ddd)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: formData.isFixedSupply ? '#fef2f2' : 'var(--bg-primary, #fff)',
              transition: 'all 0.2s'
            }}
            onClick={() => handleInputChange('isFixedSupply', true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="radio"
                  id="supply-fixed"
                  name="supply"
                  checked={formData.isFixedSupply}
                  onChange={() => handleInputChange('isFixedSupply', true)}
                  disabled={creating}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="supply-fixed" style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--text-primary, #000)',
                  cursor: 'pointer',
                  flex: 1
                }}>
                  🔒 {t('createToken.supplyFixed')}
                </label>
              </div>
              <small style={{
                display: 'block',
                marginTop: '6px',
                marginLeft: '30px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary, #666)',
                lineHeight: '1.4'
              }}>
                {t('createToken.supplyFixedHelp')}
              </small>
            </div>
          </div>
          
          {/* Token Name */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="token-name" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              {t('createToken.tokenName')} <span style={{ color: '#dc2626' }}>*</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#ef4444', marginLeft: '8px' }}>
                🔒 Immuable
              </span>
            </label>
            <input
              id="token-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('createToken.tokenNamePlaceholder')}
              disabled={creating}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 {t('createToken.tokenNameHelp')}
            </small>
          </div>

          {/* Ticker */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="ticker" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              {t('createToken.ticker')} <span style={{ color: '#dc2626' }}>*</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#ef4444', marginLeft: '8px' }}>
                🔒 Immuable
              </span>
            </label>
            <input
              id="ticker"
              type="text"
              value={formData.ticker}
              onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
              placeholder={t('createToken.tickerPlaceholder')}
              maxLength={5}
              disabled={creating}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box',
                textTransform: 'uppercase'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 {t('createToken.tickerHelp')}
            </small>
          </div>

          {/* Decimals */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="decimals" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              {t('createToken.decimals')} <span style={{ color: '#dc2626' }}>*</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#ef4444', marginLeft: '8px' }}>
                🔒 Immuable
              </span>
            </label>
            <input
              id="decimals"
              type="number"
              min="0"
              max="9"
              value={formData.decimals}
              onChange={(e) => {
                const val = Math.max(0, Math.min(9, parseInt(e.target.value) || 0));
                handleInputChange('decimals', val);
              }}
              disabled={creating}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 Nombre de décimales (0 à 9). Ex: 0 = jetons entiers, 2 = centimes, 4 = précision fine
            </small>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="quantity" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              {t('createToken.quantity')} <span style={{ color: '#dc2626' }}>*</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: formData.isFixedSupply ? '#ef4444' : '#10b981', marginLeft: '8px' }}>
                {formData.isFixedSupply ? '🔒 Immuable (offre fixe)' : '✏️ Modifiable (offre variable)'}
              </span>
            </label>
            <input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              placeholder={t('createToken.quantityPlaceholder')}
              min="1"
              disabled={creating}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 {t('createToken.quantityHelp')}
              {formData.quantity && Number(formData.quantity) > 0 && formData.decimals >= 0 && (
                <>
                  <br />
                  ⚠️ <strong>Important:</strong> La quantité réelle mintée sera:{' '}
                  <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                    {Number(formData.quantity) * Math.pow(10, Number(formData.decimals))} atoms
                  </code>
                  {' '}(quantité × 10^{formData.decimals} décimales)
                </>
              )}
            </small>
          </div>

          {/* Site internet du Jeton (Optional mais immuable) */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="url" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              🌐 Site internet du Jeton <span style={{ fontSize: '0.85rem', color: '#999' }}>(Optionnel)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#ef4444', marginLeft: '8px' }}>
                🔒 Immuable
              </span>
            </label>
            <input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://votre-site.com"
              disabled={creating}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #000)',
                boxSizing: 'border-box'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.4'
            }}>
              💡 URL inscrite dans la blockchain (ne pourra plus être modifiée).
            </small>
          </div>

          {/* Image du Jeton (Optional mais immuable) */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="image" style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: 'var(--text-primary, #000)',
              marginBottom: '8px'
            }}>
              🖼️ Image du Jeton <span style={{ fontSize: '0.85rem', color: '#999' }}>(Optionnel)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#10b981', marginLeft: '8px' }}>
                ✏️ Modifiable
              </span>
            </label>
            
            {!imagePreview ? (
              <div>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={creating || uploadingImage}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '2px dashed var(--border-color, #ddd)',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary, #000)',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                />
                <small style={{
                  display: 'block',
                  marginTop: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #666)',
                  lineHeight: '1.4'
                }}>
                  ⚠️ <strong>Restrictions:</strong> 256x256 pixels exactement, Max 200 Ko (Idéalement &lt; 50 Ko)
                </small>
              </div>
            ) : (
              <div style={{
                padding: '12px',
                border: '2px solid #10b981',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    style={{
                      width: '64px',
                      height: '64px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #10b981'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#047857', marginBottom: '4px' }}>
                      ✅ Image validée
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                      {formData.imageFile?.name} ({(formData.imageFile?.size / 1024).toFixed(1)} Ko)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={creating}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      borderRadius: '6px',
                      border: '1px solid #ef4444',
                      backgroundColor: '#fff',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Immutability Warning */}
          <div style={{
            padding: '16px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '10px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '0.9rem',
              color: '#856404',
              lineHeight: '1.6',
              fontWeight: '500'
            }}>
              ⚠️ {t('createToken.immutabilityWarning')}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={creating || !isFormValid()}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: (creating || !isFormValid()) ? '#ccc' : 'var(--primary-color, #0074e4)',
              color: '#fff',
              cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (creating || !isFormValid()) ? 0.6 : 1
            }}
          >
            {creating ? `⏳ ${t('createToken.creating')}` : `🚀 ${t('createToken.createButton')}`}
          </button>
        </form>
      </div>
    </MobileLayout>
  );
};

export default CreateTokenPage;
