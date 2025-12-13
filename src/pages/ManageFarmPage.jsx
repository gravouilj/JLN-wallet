import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, Input, Textarea, Switch, Tabs, Modal } from '../components/UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useFarms } from '../hooks/useFarms';
import { notificationAtom } from '../atoms';
import { FarmService } from '../services/farmService';

const ManageFarmPage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet, address } = useEcashWallet();
  const { farms, refreshFarms } = useFarms();
  const setNotification = useSetAtom(notificationAtom);

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [existingFarm, setExistingFarm] = useState(null);
  const [formData, setFormData] = useState({
    farmName: '',
    description: '',
    country: 'France',
    region: '',
    department: '',
    city: '',
    postalCode: '',
    streetAddress: '',
    addressComplement: '',
    phone: '',
    email: '',
    website: '',
    otherWebsite: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    whatsapp: '',
    telegram: '',
    products: '',
    services: '',
    tokenPurpose: '',
    companyid: '',
    governmentidverificationweblink: '',
    legalRepresentative: '',
    nationalcertification: '',
    nationalcertificationweblink: '',
    internationalcertification: '',
    internationalcertificationweblink: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [tokensWithStats, setTokensWithStats] = useState([]);
  const [togglingVisibility, setTogglingVisibility] = useState({});
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  
  // Onglets - Initialiser depuis la navigation si disponible
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'infos');
  
  // Tags pour produits et services (séparés)
  const [productTags, setProductTags] = useState([]);
  const [productInput, setProductInput] = useState('');
  const [serviceTags, setServiceTags] = useState([]);
  const [serviceInput, setServiceInput] = useState('');
  
  // Confidentialité
  const [privacy, setPrivacy] = useState({
    hideEmail: false,
    hidePhone: false,
    hideSiret: false,
    hideLegalRep: false
  });
  
  // Tracking modifications champs sensibles
  const [sensitiveFieldsChanged, setSensitiveFieldsChanged] = useState(false);
  const [initialSensitiveFields, setInitialSensitiveFields] = useState(null);
  
  // Modal avertissement modifications sensibles
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState(null);
  
  // Re-vérification annuelle
  const [confirmingInfo, setConfirmingInfo] = useState(false);
  
  // Communication avec admin
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Suppression profil
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = première confirmation, 2 = confirmation finale
  const [deleting, setDeleting] = useState(false);
  
  // Suggestions distinctes
  const productSuggestions = [
    'Légumes', 'Fruits', 'Viande', 'Produits laitiers', 
    'Œufs', 'Miel', 'Céréales', 'Pain', 'Vins', 'Fromages'
  ];
  
  const serviceSuggestions = [
    'Vente directe', 'Cueillette', 'Paniers', 'Livraison',
    'Visite ferme', 'Ateliers', 'Hébergement', 'Restauration'
  ];

  // Calculer le nombre de messages admin non lus (postérieurs au dernier message creator)
  const unreadAdminCount = useMemo(() => {
    if (!existingFarm?.communication_history || existingFarm.communication_history.length === 0) {
      return 0;
    }

    const history = existingFarm.communication_history;
    
    // Trouver l'index du dernier message creator
    let lastCreatorIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].author === 'creator' || history[i].author === 'user') {
        lastCreatorIndex = i;
        break;
      }
    }

    // Si aucun message creator, tous les messages admin sont non lus
    if (lastCreatorIndex === -1) {
      return history.filter(msg => msg.author === 'admin').length;
    }

    // Compter les messages admin après le dernier message creator
    let count = 0;
    for (let i = lastCreatorIndex + 1; i < history.length; i++) {
      if (history[i].author === 'admin') {
        count++;
      }
    }

    return count;
  }, [existingFarm?.communication_history]);

  // Charger le nombre de détenteurs pour chaque token
  useEffect(() => {
    if (!existingFarm?.tokens || !Array.isArray(existingFarm.tokens) || existingFarm.tokens.length === 0 || !wallet) {
      setTokensWithStats([]);
      return;
    }
    
    const loadTokensStats = async () => {
      console.log('🔄 Chargement des données enrichies des jetons...');
      
      const enrichedTokens = await Promise.all(
        existingFarm.tokens.map(async (token) => {
          let tokenInfo = null;
          let holdersCount = 0;
          let tokenName = token.tokenName || 'Sans nom';
          let ticker = token.ticker || 'UNK';
          
          try {
            // 1. Récupérer les vraies infos depuis la blockchain
            console.log(`📡 Récupération info blockchain pour ${token.tokenId}...`);
            tokenInfo = await wallet.getTokenInfo(token.tokenId);
            
            if (tokenInfo?.genesisInfo) {
              tokenName = tokenInfo.genesisInfo.tokenName || tokenName;
              ticker = tokenInfo.genesisInfo.tokenTicker || ticker;
            }
          } catch (err) {
            console.warn(`⚠️ Impossible de charger les infos pour ${token.tokenId}:`, err);
          }
          
          try {
            // 2. Récupérer le nombre de détenteurs via airdrop
            console.log(`👥 Calcul détenteurs pour ${token.tokenId}...`);
            const airdropData = await wallet.calculateAirdropHolders(token.tokenId, 0);
            holdersCount = airdropData?.count || 0;
          } catch (err) {
            console.warn(`⚠️ Impossible de calculer les détenteurs pour ${token.tokenId}:`, err);
            holdersCount = 0;
          }
          
          // 3. Vérifier si le jeton est complet
          const isComplete = !!(token.purpose && token.counterpart);
          
          console.log(`✅ Jeton ${ticker} chargé: ${tokenName}, ${holdersCount} détenteurs, complet: ${isComplete}`);
          
          return { 
            ...token, 
            tokenName,
            ticker,
            holdersCount,
            isComplete,
            // Forcer masqué si incomplet
            isVisible: isComplete ? (token.isVisible !== false) : false
          };
        })
      );
      
      setTokensWithStats(enrichedTokens);
      console.log('✅ Tous les jetons enrichis chargés:', enrichedTokens);
    };
    
    loadTokensStats();
  }, [existingFarm?.tokens, wallet]);

  // Gestion des tags produits
  const addProductTag = (tag) => {
    if (tag && !productTags.includes(tag)) {
      setProductTags(prev => [...prev, tag]);
    }
  };
  
  const removeProductTag = (tagToRemove) => {
    setProductTags(prev => prev.filter(tag => tag !== tagToRemove));
  };
  
  const handleProductKeyDown = (e) => {
    if (e.key === 'Enter' && productInput.trim()) {
      e.preventDefault();
      addProductTag(productInput.trim());
      setProductInput('');
    }
  };
  
  // Gestion des tags services
  const addServiceTag = (tag) => {
    if (tag && !serviceTags.includes(tag)) {
      setServiceTags(prev => [...prev, tag]);
    }
  };
  
  const removeServiceTag = (tagToRemove) => {
    setServiceTags(prev => prev.filter(tag => tag !== tagToRemove));
  };
  
  const handleServiceKeyDown = (e) => {
    if (e.key === 'Enter' && serviceInput.trim()) {
      e.preventDefault();
      addServiceTag(serviceInput.trim());
      setServiceInput('');
    }
  };
  
  // Fonction pour auto-formater les URLs
  const handleUrlBlur = (fieldName) => {
    const value = formData[fieldName];
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: `https://${value}`
      }));
    }
  };
  
  // Obtenir l'icône pour un réseau social
  const getSocialIcon = (fieldName) => {
    const icons = {
      website: '🌐',
      otherWebsite: '🌐',
      facebook: '📘',
      instagram: '📷',
      tiktok: '🎵',
      youtube: '📹',
      whatsapp: '💬',
      telegram: '✈️'
    };
    return icons[fieldName] || '🔗';
  };

  // Ouvrir un lien dans un nouvel onglet
  const openLink = (url) => {
    if (!url) return;
    
    // S'assurer que l'URL a un protocole
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = `https://${url}`;
    }
    
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };
  
  // Fonction pour gérer les changements de confidentialité
  const handlePrivacyChange = (field, checked) => {
    setPrivacy(prev => ({
      ...prev,
      [field]: checked
    }));
  };
  
  // Vérifier si les champs obligatoires pour la vérification sont remplis
  const canRequestVerification = () => {
    return !!(
      formData.companyid &&
      formData.governmentidverificationweblink &&
      formData.phone &&
      formData.email
    );
  };
  
  const getMissingFieldsForVerification = () => {
    const missing = [];
    if (!formData.companyid) missing.push('SIRET');
    if (!formData.governmentidverificationweblink) missing.push('Preuve SIRET');
    if (!formData.phone) missing.push('Téléphone');
    if (!formData.email) missing.push('Email');
    return missing;
  };
  
  // Fonction pour toggle la visibilité
  const handleToggleVisibility = async (tokenId, currentVisibility) => {
    setTogglingVisibility(prev => ({ ...prev, [tokenId]: true }));
    try {
      await FarmService.updateTokenMetadata(address, tokenId, {
        isVisible: !currentVisibility
      });
      
      // Mettre à jour l'état local
      const updatedFarm = await FarmService.getMyFarm(address);
      setExistingFarm(updatedFarm);
      refreshFarms();
      
      setNotification({
        type: 'success',
        message: !currentVisibility 
          ? 'Jeton visible dans l\'annuaire'
          : 'Jeton masqué de l\'annuaire'
      });
    } catch (err) {
      console.error('❌ Erreur toggle visibilité:', err);
      setNotification({
        type: 'error',
        message: 'Impossible de modifier la visibilité'
      });
    } finally {
      setTogglingVisibility(prev => ({ ...prev, [tokenId]: false }));
    }
  };


  // Recharger les données quand on revient sur la page
  useEffect(() => {
    if (address && wallet) {
      // Recharger la ferme depuis Supabase pour voir les modifications
      FarmService.getMyFarm(address).then(farm => {
        if (farm) {
          setExistingFarm(farm);
          console.log('🔄 Ferme rechargée:', farm);
          
          // Initialiser tags produits et services
          if (farm.products && Array.isArray(farm.products)) {
            setProductTags(farm.products);
          } else if (farm.products && typeof farm.products === 'string') {
            setProductTags(farm.products.split(',').map(p => p.trim()).filter(Boolean));
          }
          
          if (farm.services && Array.isArray(farm.services)) {
            setServiceTags(farm.services);
          } else if (farm.services && typeof farm.services === 'string') {
            setServiceTags(farm.services.split(',').map(s => s.trim()).filter(Boolean));
          }
          
          // Charger privacy depuis certifications JSONB
          if (farm.certifications) {
            setPrivacy({
              hideEmail: farm.certifications.hide_email || false,
              hidePhone: farm.certifications.hide_phone || false,
              hideSiret: farm.certifications.hide_siret || false,
              hideLegalRep: farm.certifications.hide_legal_rep || false
            });
          }
        }
      }).catch(err => {
        console.error('❌ Erreur rechargement ferme:', err);
      });
    }
  }, [address, wallet, farms]); // Se déclenche quand farms change (après refreshFarms)

  useEffect(() => {
    const loadData = async () => {
      if (!wallet || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Charger les infos du token SEULEMENT si tokenId existe
        if (tokenId) {
          const info = await wallet.getTokenInfo(tokenId);
          setTokenInfo(info);
        }

        // Charger la ferme depuis Supabase (Cloud)
        const farm = await FarmService.getMyFarm(address);
        console.log('📊 Ferme récupérée depuis Supabase:', farm);
        console.log('🔑 Address utilisée:', address);
        
        if (farm) {
          console.log('✅ Farm trouvée, pré-remplissage du formulaire...');
          console.log('🪙 Tokens dans la ferme:', farm.tokens);
          console.log('📊 Nombre de tokens:', Array.isArray(farm.tokens) ? farm.tokens.length : 0);
          setExistingFarm(farm);
          // Pré-remplir le formulaire avec les données Supabase
          const socials = farm.socials || {};
          const certs = farm.certifications || {};
          const tokenData = Array.isArray(farm.tokens) && farm.tokens.length > 0 ? farm.tokens[0] : {};
          
          const newFormData = {
            farmName: farm.name || '',
            description: farm.description || '',
            country: farm.location_country || 'France',
            region: farm.location_region || '',
            department: farm.location_department || '',
            city: farm.city || '',
            postalCode: farm.postal_code || '',
            streetAddress: farm.street_address || '',
            addressComplement: farm.address_complement || '',
            phone: farm.phone || '',
            email: farm.email || '',
            website: farm.website || '',
            otherWebsite: socials.other_website || '',
            facebook: socials.facebook || '',
            instagram: socials.instagram || '',
            tiktok: socials.tiktok || '',
            youtube: socials.youtube || '',
            whatsapp: socials.whatsapp || '',
            telegram: socials.telegram || '',
            products: Array.isArray(farm.products) ? farm.products.join(', ') : '',
            services: Array.isArray(farm.services) ? farm.services.join(', ') : '',
            tokenPurpose: tokenData.purpose || '',
            companyid: certs.siret || '',
            governmentidverificationweblink: certs.siret_link || '',
            legalRepresentative: certs.legal_representative || '',
            nationalcertification: certs.national || '',
            nationalcertificationweblink: certs.national_link || '',
            internationalcertification: certs.international || '',
            internationalcertificationweblink: certs.international_link || '',
          };
          
          console.log('📄 FormData construit:', newFormData);
          setFormData(newFormData);
          
          // Sauvegarder les valeurs initiales des champs sensibles
          setInitialSensitiveFields({
            farmName: newFormData.farmName,
            streetAddress: newFormData.streetAddress,
            companyid: newFormData.companyid
          });
        } else {
          console.log('⚠️ Aucune farm trouvée pour cette adresse');
        }
      } catch (err) {
        console.error('❌ Erreur chargement données:', err);
        setNotification({
          type: 'error',
          message: 'Impossible de charger les données'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tokenId, wallet, address, farms, setNotification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Vérifier si un champ sensible a été modifié (ferme vérifiée uniquement)
    if (existingFarm?.verified && initialSensitiveFields) {
      const sensitiveFields = ['farmName', 'streetAddress', 'companyid'];
      if (sensitiveFields.includes(name)) {
        // Comparer avec la valeur initiale
        const hasChanged = value !== initialSensitiveFields[name];
        if (hasChanged && !sensitiveFieldsChanged) {
          setSensitiveFieldsChanged(true);
        } else if (!hasChanged) {
          // Vérifier si d'autres champs ont changé
          const otherFieldsChanged = sensitiveFields.some(
            field => field !== name && formData[field] !== initialSensitiveFields[field]
          );
          setSensitiveFieldsChanged(otherFieldsChanged);
        }
      }
    }
  };

  // Vérifier si champs sensibles modifiés/vidés avant sauvegarde
  const checkSensitiveFields = (requestVerification = false) => {
    // Si ferme verified ou pending, vérifier modifications sensibles
    if (!existingFarm || (!existingFarm.verified && existingFarm.verification_status !== 'pending')) {
      return false; // Pas de restriction
    }

    const sensitiveChanges = [];
    
    // Vérifier SIRET
    const currentSiret = formData.companyid || '';
    const initialSiret = existingFarm.certifications?.siret || '';
    if (currentSiret !== initialSiret) {
      if (!currentSiret) {
        sensitiveChanges.push('SIRET supprimé');
      } else {
        sensitiveChanges.push('SIRET modifié');
      }
    }
    
    // Vérifier Email
    const currentEmail = formData.email || '';
    const initialEmail = existingFarm.email || '';
    if (currentEmail !== initialEmail) {
      if (!currentEmail) {
        sensitiveChanges.push('Email supprimé');
      } else {
        sensitiveChanges.push('Email modifié');
      }
    }
    
    // Vérifier Phone
    const currentPhone = formData.phone || '';
    const initialPhone = existingFarm.phone || '';
    if (currentPhone !== initialPhone) {
      if (!currentPhone) {
        sensitiveChanges.push('Téléphone supprimé');
      } else {
        sensitiveChanges.push('Téléphone modifié');
      }
    }

    return sensitiveChanges.length > 0 ? sensitiveChanges : false;
  };

  const handleSubmit = async (e, requestVerification = false) => {
    e?.preventDefault();
    
    // Vérifier modifications sensibles avant validation
    const sensitiveChanges = checkSensitiveFields(requestVerification);
    if (sensitiveChanges) {
      // Afficher modal avertissement
      setPendingSaveAction({ e, requestVerification, sensitiveChanges });
      setShowWarningModal(true);
      return false;
    }
    
    // Continuer avec la sauvegarde normale
    return await performSave(e, requestVerification);
  };

  // Fonction de sauvegarde réelle (appelée après confirmation modal ou directement)
  const performSave = async (e, requestVerification = false) => {
    e?.preventDefault();
    
    // Champs toujours obligatoires
    if (!formData.farmName || !formData.description || !formData.email || !formData.address) {
      setNotification({
        type: 'error',
        message: 'Veuillez remplir tous les champs obligatoires (Nom, Description, Email, Adresse)'
      });
      return false;
    }
    
    // Validation renforcée si demande de vérification explicite
    if (requestVerification) {
      const missingFields = [];
      if (!formData.companyid) missingFields.push('SIRET/Company ID');
      if (!formData.governmentidverificationweblink) missingFields.push('Lien de vérification SIRET');
      if (!formData.phone) missingFields.push('Téléphone');
      
      if (missingFields.length > 0) {
        setNotification({
          type: 'error',
          message: `Pour demander la vérification, veuillez remplir : ${missingFields.join(', ')}`
        });
        return false;
      }
    }

    setSubmitting(true);
    try {
      // Construire l'objet ferme compatible Supabase
      const farmData = {
        name: formData.farmName,
        description: formData.description,
        location_country: formData.country || 'France',
        location_region: formData.region || '',
        location_department: formData.department || '',
        city: formData.city || '',
        postal_code: formData.postalCode || '',
        street_address: formData.streetAddress || '',
        address_complement: formData.addressComplement || '',
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        image_url: existingFarm?.image_url || null,
        
        // Réseaux sociaux (JSONB)
        socials: {
          facebook: formData.facebook || null,
          instagram: formData.instagram || null,
          tiktok: formData.tiktok || null,
          youtube: formData.youtube || null,
          whatsapp: formData.whatsapp || null,
          telegram: formData.telegram || null,
          other_website: formData.otherWebsite || null
        },
        
        // Certifications (JSONB)
        certifications: {
          siret: formData.companyid || null,
          siret_link: formData.governmentidverificationweblink || null,
          legal_representative: formData.legalRepresentative || null,
          national: formData.nationalcertification || null,
          national_link: formData.nationalcertificationweblink || null,
          international: formData.internationalcertification || null,
          international_link: formData.internationalcertificationweblink || null,
          // Privacy settings intégré dans certifications
          hide_email: privacy.hideEmail || false,
          hide_phone: privacy.hidePhone || false,
          hide_siret: privacy.hideSiret || false,
          hide_legal_rep: privacy.hideLegalRep || false
        },
        
        products: productTags,
        services: serviceTags,
        
        // Tokens (JSONB Array) - Conserver les tokens existants et ajouter/mettre à jour le token actuel si tokenId existe
        tokens: (() => {
          const existingTokens = existingFarm?.tokens || [];
          
          // Si pas de tokenId, conserver simplement les tokens existants
          if (!tokenId) {
            return existingTokens;
          }
          
          // Si tokenId existe, ajouter/mettre à jour le token actuel
          const currentToken = {
            tokenId: tokenId,
            ticker: tokenInfo?.genesisInfo?.tokenTicker || 'UNK',
            isVisible: true
          };
          
          // Si le token existe déjà, le mettre à jour, sinon l'ajouter
          const tokenIndex = existingTokens.findIndex(t => t.tokenId === tokenId);
          if (tokenIndex >= 0) {
            const updated = [...existingTokens];
            updated[tokenIndex] = currentToken;
            return updated;
          } else {
            return [...existingTokens, currentToken];
          }
        })()
      };

      // Déterminer le statut de vérification selon les modifications
      let verificationStatus = existingFarm?.verification_status || 'unverified';
      let isVerified = existingFarm?.verified || false;
      
      if (requestVerification) {
        // Demande explicite de vérification
        // IMPORTANT: Forcer 'pending' même si le statut actuel est 'rejected'
        // Cela permet au créateur de re-soumettre sa ferme après correction
        verificationStatus = 'pending';
        isVerified = false;
        
        // Ajouter une entrée système dans l'historique (si colonne existe)
        // TODO: Créer la colonne communication_history (JSONB) dans Supabase
        try {
          const currentHistory = existingFarm?.communication_history || [];
          farmData.communication_history = [
            ...currentHistory,
            {
              author: 'system',
              message: 'Demande de vérification soumise par le créateur',
              timestamp: new Date().toISOString()
            }
          ];
        } catch (err) {
          console.warn('⚠️ communication_history non disponible:', err);
          // Ne pas bloquer la sauvegarde si la colonne n'existe pas encore
        }
      } else if (existingFarm?.verified && sensitiveFieldsChanged) {
        // Ferme vérifiée avec modification de champs sensibles
        verificationStatus = 'unverified';
        isVerified = false;
      }
      
      farmData.verification_status = verificationStatus;
      farmData.verified = isVerified;
      
      // Sauvegarder dans Supabase (Cloud)
      const savedFarm = await FarmService.saveFarm(farmData, address);
      
      console.log('✅ Ferme sauvegardée sur Supabase:', savedFarm);
      console.log('☁️ Accessible depuis n\'importe quel appareil avec:', address);

      // Message adapté selon le statut
      let successMessage = 'Ferme enregistrée avec succès !';
      if (requestVerification) {
        successMessage = 'Enregistré ! Demande de vérification envoyée.';
      } else if (existingFarm?.verified && sensitiveFieldsChanged) {
        successMessage = 'Enregistré ! Une nouvelle vérification sera nécessaire.';
      }
      
      setNotification({
        type: 'success',
        message: successMessage
      });
      
      // Recharger les données
      await refreshFarms();
      const updatedFarm = await FarmService.getMyFarm(address);
      setExistingFarm(updatedFarm);
      
      // Réinitialiser les trackers
      setSensitiveFieldsChanged(false);
      setInitialSensitiveFields({
        farmName: updatedFarm.name,
        streetAddress: updatedFarm.street_address,
        companyid: updatedFarm.certifications?.siret || ''
      });

      // Navigation différée uniquement si demande de vérification
      if (requestVerification) {
        setTimeout(() => {
          navigate('/manage-token');
        }, 3000);
      }

    } catch (err) {
      console.error('❌ Erreur complète:', err);
      console.error('❌ Type:', typeof err);
      console.error('❌ Message:', err.message);
      console.error('❌ Stack:', err.stack);
      
      // Si c'est une erreur Supabase, afficher détails
      if (err.code) {
        console.error('❌ Code Supabase:', err.code);
        console.error('❌ Détails Supabase:', err.details);
        console.error('❌ Hint Supabase:', err.hint);
      }
      
      setNotification({
        type: 'error',
        message: err.message || 'Erreur lors de l\'enregistrement'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Gestion modal avertissement
  const handleConfirmWarning = async () => {
    setShowWarningModal(false);
    if (pendingSaveAction) {
      await performSave(pendingSaveAction.e, pendingSaveAction.requestVerification);
      setPendingSaveAction(null);
    }
  };

  const handleCancelWarning = () => {
    setShowWarningModal(false);
    setPendingSaveAction(null);
  };

  // Vérifier l'âge de la vérification (> 1 an = re-vérification nécessaire)
  const checkVerificationAge = () => {
    if (!existingFarm?.verified || !existingFarm?.verified_at) return null;
    
    const verifiedDate = new Date(existingFarm.verified_at);
    const now = new Date();
    const diffInDays = Math.floor((now - verifiedDate) / (1000 * 60 * 60 * 24));
    const diffInYears = diffInDays / 365;
    
    return diffInYears > 1 ? diffInDays : null;
  };

  // Confirmer les informations (met à jour verified_at)
  const handleConfirmInformation = async () => {
    setConfirmingInfo(true);
    try {
      await FarmService.updateFarm(address, {
        verified_at: new Date().toISOString()
      });
      
      // Recharger les données
      const updatedFarm = await FarmService.getMyFarm(address);
      setExistingFarm(updatedFarm);
      
      setNotification({
        type: 'success',
        message: 'Informations confirmées ! Vérification annuelle mise à jour.'
      });
    } catch (err) {
      console.error('Erreur confirmation:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la confirmation'
      });
    } finally {
      setConfirmingInfo(false);
    }
  };

  // Envoyer un message à l'admin
  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      setNotification({
        type: 'error',
        message: 'Le message ne peut pas être vide'
      });
      return;
    }

    setSendingMessage(true);
    try {
      await FarmService.addMessage(address, 'creator', newMessage.trim());
      
      // Recharger les données
      const updatedFarm = await FarmService.getMyFarm(address);
      setExistingFarm(updatedFarm);
      
      setNewMessage('');
      setNotification({
        type: 'success',
        message: 'Message envoyé avec succès'
      });
    } catch (err) {
      console.error('Erreur envoi message:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de l\'envoi du message'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Gestion suppression profil
  const handleDeleteProfile = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
  };

  const handleConfirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleConfirmDeleteStep2 = async () => {
    setDeleting(true);
    try {
      await FarmService.deleteFarmProfile(address);
      
      setNotification({
        type: 'success',
        message: 'Profil supprimé avec succès. Vos données personnelles ont été effacées.'
      });
      
      // Fermer le modal
      setShowDeleteModal(false);
      
      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err) {
      console.error('Erreur suppression profil:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la suppression du profil'
      });
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
  };

  if (loading) {
    return (
      <MobileLayout title={existingFarm ? "Modifier ma Ferme" : "Référencer ma Ferme"}>
        <PageLayout hasBottomNav>
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">🔄</div>
              <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
            </CardContent>
          </Card>
        </PageLayout>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={existingFarm ? "Profil de mon établissement" : "Référencer mon établissement"}>
      <PageLayout hasBottomNav>
        <Stack spacing="md">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {existingFarm ? '🏡 Profil de mon établissement' : '🌱 Demander le référencement'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {existingFarm 
                  ? 'Mettez à jour les informations de votre établissement dans l\'annuaire.'
                  : 'Remplissez ce formulaire pour apparaître dans l\'annuaire public des établissements.'}
              </p>
            </CardContent>
          </Card>

          {/* ALERTE DEMANDE DE VÉRIFICATION EN COURS */}
          {existingFarm && existingFarm.verification_status === 'pending' && (
            <Card style={{ 
              backgroundColor: '#fef3c7', 
              border: '2px solid #fbbf24' 
            }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⏳</span>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#92400e',
                    margin: 0
                  }}>
                    Demande de vérification en cours
                  </h3>
                </div>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#92400e',
                  margin: 0,
                  paddingLeft: '2.25rem'
                }}>
                  Votre demande de validation est en cours d'examen par un administrateur. 
                  Vous serez notifié dès que celle-ci sera traitée.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ALERTE DEMANDE REFUSÉE */}
          {existingFarm && existingFarm.verification_status === 'rejected' && existingFarm.status !== 'banned' && (
            <Card style={{ 
              backgroundColor: '#fee2e2', 
              border: '2px solid #ef4444' 
            }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🚫</span>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#991b1b',
                    margin: 0
                  }}>
                    Demande de vérification refusée
                  </h3>
                </div>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#991b1b',
                  margin: '0.5rem 0',
                  paddingLeft: '2.25rem'
                }}>
                  <strong>Motif :</strong> {existingFarm.admin_message || 'Aucun motif fourni'}
                </p>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#991b1b',
                  margin: 0,
                  paddingLeft: '2.25rem'
                }}>
                  Veuillez corriger les informations demandées et soumettre à nouveau votre demande.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ALERTE FERME BANNIE */}
          {existingFarm && (existingFarm.status === 'banned' || existingFarm.status === 'pending_deletion') && (
            <Card style={{ 
              backgroundColor: '#450a0a', 
              border: '3px solid #ef4444' 
            }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🛑</span>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#fff',
                    margin: 0
                  }}>
                    {existingFarm.status === 'banned' ? 'FERME BANNIE' : 'SUPPRESSION EN COURS'}
                  </h3>
                </div>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#fecaca',
                  margin: '0.5rem 0',
                  paddingLeft: '2.25rem'
                }}>
                  <strong>Motif :</strong> {existingFarm.deletion_reason || existingFarm.admin_message || 'Non spécifié'}
                </p>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#fecaca',
                  margin: 0,
                  paddingLeft: '2.25rem'
                }}>
                  {existingFarm.status === 'banned' 
                    ? 'Votre ferme a été bannie. Contactez l\'administrateur pour plus d\'informations.'
                    : 'Votre ferme sera supprimée définitivement dans 1 an. Contactez l\'administrateur si c\'est une erreur.'
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* ALERTE RE-VÉRIFICATION ANNUELLE */}
          {existingFarm && checkVerificationAge() !== null && (
            <Card style={{ 
              backgroundColor: '#fee2e2', 
              border: '2px solid #ef4444' 
            }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: '#991b1b',
                      margin: 0,
                      marginBottom: '0.5rem'
                    }}>
                      Vérification annuelle requise
                    </h3>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#991b1b',
                      margin: 0,
                      marginBottom: '0.75rem'
                    }}>
                      Votre vérification date de plus d'un an ({Math.floor(checkVerificationAge() / 365)} an
                      {Math.floor(checkVerificationAge() / 365) > 1 ? 's' : ''}). 
                      Veuillez confirmer que vos informations sont toujours à jour.
                    </p>
                    <Button 
                      variant="danger"
                      onClick={handleConfirmInformation}
                      disabled={confirmingInfo}
                      style={{ 
                        fontSize: '0.875rem',
                        padding: '0.5rem 1rem'
                      }}
                    >
                      {confirmingInfo ? 'Confirmation...' : '✓ Confirmer les informations'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing="md">
              {/* Alerte : En attente de validation */}
              {existingFarm?.verification_status === 'pending' && (
                <Card>
                  <CardContent style={{ 
                    padding: '20px',
                    backgroundColor: '#fef3c7',
                    border: '2px solid #fbbf24'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                      <span style={{ fontSize: '2.5rem' }}>⏳</span>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          fontSize: '1.125rem', 
                          fontWeight: '700', 
                          color: '#92400e',
                          marginBottom: '8px' 
                        }}>
                          En attente de validation
                        </h3>
                        <p style={{ 
                          fontSize: '0.95rem', 
                          color: '#78350f',
                          margin: 0,
                          lineHeight: '1.5'
                        }}>
                          Votre demande de vérification est actuellement en cours d'examen par l'équipe Farm Wallet. 
                          Vous serez notifié dès que votre ferme sera validée.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Onglets de navigation */}
              <Card>
                <CardContent noPadding>
                  <Tabs
                    tabs={[
                      { id: 'infos', label: '📋 Infos' },
                      { id: 'location', label: '📍 Localisation' },
                      { id: 'contact', label: '📞 Contact' },
                      { id: 'certifications', label: '🏆 Certifications' },
                      { id: 'verification', label: '🔒 Vérification' },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                  />
                </CardContent>
              </Card>

              {/* Contenu des onglets */}
              
              {/* ONGLET: Informations */}
              {activeTab === 'infos' && (
                <Card>
                  <CardContent style={{ padding: '24px' }}>
                    {/* Avertissement modification champs sensibles */}
                    {existingFarm?.verified && sensitiveFieldsChanged && (
                      <div style={{
                        padding: '16px',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        marginBottom: '20px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              fontSize: '0.9rem', 
                              color: '#92400e',
                              margin: 0,
                              fontWeight: '600',
                              lineHeight: '1.5'
                            }}>
                              <strong>Attention :</strong> Vous avez modifié un champ important (Nom, Adresse ou SIRET). 
                              Ces modifications nécessiteront une nouvelle validation par l'administrateur. 
                              Votre ferme restera visible dans l'annuaire pendant l'examen.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Stack spacing="md">
                    <Input
                      label="Nom de la ferme *"
                      type="text"
                      name="farmName"
                      value={formData.farmName}
                      onChange={handleChange}
                      placeholder="Ex: Ferme Bio du Soleil"
                      required
                    />

                    <Textarea
                      label="Description *"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Décrivez votre ferme, vos valeurs, vos pratiques..."
                      required
                    />

                    {/* SECTION PRODUITS */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        🌾 Produits proposés
                      </label>
                      
                      {/* Tags affichés */}
                      {productTags.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '12px',
                          padding: '12px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '12px',
                          border: '1px solid var(--border-primary)'
                        }}>
                          {productTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => removeProductTag(tag)}
                                className="text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '1.2rem',
                                  padding: 0,
                                  lineHeight: 1,
                                  fontWeight: 'bold'
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Input pour ajouter */}
                      <Input
                        label="Ajouter un produit"
                        type="text"
                        value={productInput}
                        onChange={(e) => setProductInput(e.target.value)}
                        onKeyDown={handleProductKeyDown}
                        placeholder="Tapez et appuyez sur Entrée"
                        helperText="Appuyez sur Entrée pour ajouter"
                      />
                      
                      {/* Suggestions cliquables */}
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: '600' }}>
                          💡 Suggestions :
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}>
                          {productSuggestions.filter(s => !productTags.includes(s)).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => addProductTag(suggestion)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                              }}
                            >
                              + {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* SECTION SERVICES */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        🛠️ Services proposés
                      </label>
                      
                      {/* Tags affichés */}
                      {serviceTags.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '12px',
                          padding: '12px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '12px',
                          border: '1px solid var(--border-primary)'
                        }}>
                          {serviceTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => removeServiceTag(tag)}
                                className="text-green-800 dark:text-green-200 hover:text-green-600 dark:hover:text-green-400"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '1.2rem',
                                  padding: 0,
                                  lineHeight: 1,
                                  fontWeight: 'bold'
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Input pour ajouter */}
                      <Input
                        label="Ajouter un service"
                        type="text"
                        value={serviceInput}
                        onChange={(e) => setServiceInput(e.target.value)}
                        onKeyDown={handleServiceKeyDown}
                        placeholder="Tapez et appuyez sur Entrée"
                        helperText="Appuyez sur Entrée pour ajouter"
                      />
                      
                      {/* Suggestions cliquables */}
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: '600' }}>
                          💡 Suggestions :
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}>
                          {serviceSuggestions.filter(s => !serviceTags.includes(s)).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => addServiceTag(suggestion)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.borderColor = '#10b981';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                              }}
                            >
                              + {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
              )}

              {/* ONGLET: Localisation */}
              {activeTab === 'location' && (
                <Card>
                  <CardContent style={{ padding: '24px' }}>
                    <Stack spacing="md">
                      {/* Note informative en haut */}
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#f0f9ff',
                        borderLeft: '4px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: '#1e40af'
                      }}>
                        🗺️ <strong>Localisation :</strong> Ces informations permettront aux visiteurs de trouver votre établissement et de filtrer les résultats par région.
                      </div>

                      {/* Grille responsive pour les champs */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                        {/* Ligne 1: Pays + Région */}
                        <Input
                          label="Pays *"
                          type="select"
                          name="locationCountry"
                          value={formData.locationCountry}
                          onChange={handleChange}
                          required
                          helperText="Pays où se situe votre établissement"
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="France">🇫🇷 France</option>
                          <option value="Belgique">🇧🇪 Belgique</option>
                          <option value="Suisse">🇨🇭 Suisse</option>
                          <option value="Luxembourg">🇱🇺 Luxembourg</option>
                          <option value="Canada">🇨🇦 Canada</option>
                          <option value="Autre">🌍 Autre</option>
                        </Input>

                        <Input
                          label="Région"
                          type="text"
                          name="locationRegion"
                          value={formData.locationRegion}
                          onChange={handleChange}
                          placeholder="Ex: Occitanie, Québec..."
                          helperText="Région administrative"
                        />

                        {/* Ligne 2: Département + Ville */}
                        <Input
                          label="Département"
                          type="text"
                          name="locationDepartment"
                          value={formData.locationDepartment}
                          onChange={handleChange}
                          placeholder="Ex: Haute-Garonne, 31..."
                          helperText="Département ou province"
                        />

                        <Input
                          label="Ville"
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Ex: Toulouse"
                          helperText="Ville ou commune"
                        />

                        {/* Ligne 3: Code postal + Rue */}
                        <Input
                          label="Code postal"
                          type="text"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          placeholder="Ex: 31000"
                          helperText="Code postal"
                        />

                        <Input
                          label="Adresse de la rue *"
                          type="text"
                          name="streetAddress"
                          value={formData.streetAddress}
                          onChange={handleChange}
                          placeholder="Ex: 123 Chemin des Champs"
                          required
                          helperText="Numéro et nom de rue"
                        />
                      </div>

                      {/* Complément d'adresse en pleine largeur */}
                      <Input
                        label="Complément d'adresse"
                        type="text"
                        name="addressComplement"
                        value={formData.addressComplement}
                        onChange={handleChange}
                        placeholder="Ex: Bâtiment B, Porte 3, Lieu-dit..."
                        helperText="Informations supplémentaires (optionnel)"
                      />
                    </Stack>
                </CardContent>
              </Card>
              )}

              {/* ONGLET: Contact */}
              {activeTab === 'contact' && (
                <Card>
                  <CardContent style={{ padding: '24px' }}>
                    <Stack spacing="md">
                      <div style={{ position: 'relative' }}>
                        <Input
                          label="Site web principal"
                          type="text"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          onBlur={() => handleUrlBlur('website')}
                          placeholder="maferme.fr"
                          helperText="https:// sera ajouté automatiquement"
                          leftIcon={<span style={{ fontSize: '1.2rem' }}>{getSocialIcon('website')}</span>}
                        />
                        {formData.website && (
                          <button
                            type="button"
                            onClick={() => openLink(formData.website)}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '38px',
                              padding: '8px 12px',
                              backgroundColor: '#0074e4',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                          >
                            🔗 Tester
                          </button>
                        )}
                      </div>

                      <div style={{ position: 'relative' }}>
                        <Input
                          label="Autre site web"
                          type="text"
                          name="otherWebsite"
                          value={formData.otherWebsite}
                          onChange={handleChange}
                          onBlur={() => handleUrlBlur('otherWebsite')}
                          placeholder="boutique.maferme.fr"
                          leftIcon={<span style={{ fontSize: '1.2rem' }}>{getSocialIcon('otherWebsite')}</span>}
                        />
                        {formData.otherWebsite && (
                          <button
                            type="button"
                            onClick={() => openLink(formData.otherWebsite)}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '38px',
                              padding: '8px 12px',
                              backgroundColor: '#0074e4',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                          >
                            🔗 Tester
                          </button>
                        )}
                      </div>

                      {/* Titre section réseaux sociaux */}
                      <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          🌐 Réseaux sociaux
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Connectez vos réseaux sociaux pour améliorer votre visibilité
                        </p>
                      </div>

                      {/* Grille réseaux sociaux compacte 2x3 */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        {/* Colonne gauche */}
                        <div style={{ position: 'relative' }}>
                          <Input
                            label="📘 Facebook"
                            type="text"
                            name="facebook"
                            value={formData.facebook}
                            onChange={handleChange}
                            onBlur={() => handleUrlBlur('facebook')}
                            placeholder="facebook.com/maferme"
                          />
                          {formData.facebook && (
                            <button
                              type="button"
                              onClick={() => openLink(formData.facebook)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '38px',
                                padding: '6px 10px',
                                backgroundColor: '#0074e4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease'
                              }}
                              title="Ouvrir le lien"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                            >
                              🔗
                            </button>
                          )}
                        </div>

                        <div style={{ position: 'relative' }}>
                          <Input
                            label="📹 YouTube"
                            type="text"
                            name="youtube"
                            value={formData.youtube}
                            onChange={handleChange}
                            onBlur={() => handleUrlBlur('youtube')}
                            placeholder="youtube.com/@maferme"
                          />
                          {formData.youtube && (
                            <button
                              type="button"
                              onClick={() => openLink(formData.youtube)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '38px',
                                padding: '6px 10px',
                                backgroundColor: '#0074e4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease'
                              }}
                              title="Ouvrir le lien"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                            >
                              🔗
                            </button>
                          )}
                        </div>

                        <Input
                          label="📷 Instagram"
                          type="text"
                          name="instagram"
                          value={formData.instagram}
                          onChange={handleChange}
                          placeholder="@maferme"
                        />

                        <Input
                          label="🎵 TikTok"
                          type="text"
                          name="tiktok"
                          value={formData.tiktok}
                          onChange={handleChange}
                          placeholder="@maferme"
                        />

                        <Input
                          label="💬 WhatsApp"
                          type="tel"
                          name="whatsapp"
                          value={formData.whatsapp}
                          onChange={handleChange}
                          placeholder="6 12 34 56 78"
                        />

                        <Input
                          label="✈️ Telegram"
                          type="text"
                          name="telegram"
                          value={formData.telegram}
                          onChange={handleChange}
                          placeholder="@maferme"
                        />
                      </div>
                    </Stack>
                </CardContent>
              </Card>
              )}

              {/* ONGLET: Vérification */}
              {activeTab === 'verification' && (
                <Card style={{ backgroundColor: '#eff6ff', borderColor: '#3b82f6' }}>
                  <CardContent style={{ padding: '24px' }}>
                    {/* Avertissement modification champs sensibles (répété ici pour visibilité) */}
                    {existingFarm?.verified && sensitiveFieldsChanged && (
                      <div style={{
                        padding: '16px',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        marginBottom: '20px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              fontSize: '0.9rem', 
                              color: '#92400e',
                              margin: 0,
                              fontWeight: '600',
                              lineHeight: '1.5'
                            }}>
                              <strong>Modification détectée :</strong> Les changements sur le SIRET nécessiteront une nouvelle validation administrative.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Stack spacing="md">
                      {/* Email avec switch confidentialité */}
                      <div>
                        <Input
                          label="Email *"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="contact@maferme.fr"
                          required
                          helperText="Requis pour la vérification et les notifications"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '8px' }}>
                          <Switch
                            checked={privacy.hideEmail}
                            onChange={(checked) => handlePrivacyChange('hideEmail', checked)}
                          />
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            🙈 Masquer l'email sur le profil public
                          </span>
                        </div>
                      </div>

                      {/* Téléphone avec switch confidentialité */}
                      <div>
                        <Input
                          label="Téléphone *"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="6 12 34 56 78"
                          required
                          helperText="Requis pour la vérification (Format : 6 12 34 56 78)"
                          leftIcon={<span style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>🇫🇷 +33</span>}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '8px' }}>
                          <Switch
                            checked={privacy.hidePhone}
                            onChange={(checked) => handlePrivacyChange('hidePhone', checked)}
                          />
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            🙈 Masquer le téléphone sur le profil public
                          </span>
                        </div>
                      </div>
                    
                    {/* SIRET avec switch confidentialité */}
                    <div>
                      <Input
                        label="SIRET / Company ID *"
                        type="text"
                        name="companyid"
                        value={formData.companyid}
                        onChange={handleChange}
                        placeholder="12345678901234"
                        helperText="Requis pour la vérification"
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '8px' }}>
                        <Switch
                          checked={privacy.hideSiret}
                          onChange={(checked) => handlePrivacyChange('hideSiret', checked)}
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          🙈 Masquer le SIRET sur le profil public
                        </span>
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <Input
                        label="Lien de vérification SIRET *"
                        type="text"
                        name="governmentidverificationweblink"
                        value={formData.governmentidverificationweblink}
                        onChange={handleChange}
                        onBlur={() => handleUrlBlur('governmentidverificationweblink')}
                        placeholder="annuaire-entreprises.data.gouv.fr/..."
                        helperText="Lien vers l'annuaire officiel (requis pour validation)"
                        leftIcon={<span style={{ fontSize: '1.2rem' }}>🏛️</span>}
                      />
                      {formData.governmentidverificationweblink && (
                        <button
                          type="button"
                          onClick={() => openLink(formData.governmentidverificationweblink)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '38px',
                            padding: '8px 12px',
                            backgroundColor: '#0074e4',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                        >
                          🔗 Vérifier
                        </button>
                      )}
                    </div>

                    {/* Représentant légal avec switch */}
                    <div>
                      <Input
                        label="Représentant légal"
                        type="text"
                        name="legalRepresentative"
                        value={formData.legalRepresentative}
                        onChange={handleChange}
                        placeholder="Ex: Jean Dupont"
                        helperText="Recommandé pour la vérification"
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '8px' }}>
                        <Switch
                          checked={privacy.hideLegalRep}
                          onChange={(checked) => handlePrivacyChange('hideLegalRep', checked)}
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          🙈 Masquer le représentant légal sur le profil public
                        </span>
                      </div>
                    </div>

                    {/* Note de sécurité */}
                    <div style={{
                      marginTop: '20px',
                      padding: '14px 16px',
                      backgroundColor: '#fef3c7',
                      borderLeft: '4px solid #f59e0b',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#92400e',
                      lineHeight: '1.5'
                    }}>
                      <strong>🔐 Confidentialité :</strong> Les informations masquées restent accessibles aux administrateurs pour la vérification, mais ne seront pas affichées publiquement.
                    </div>
                  </Stack>
                </CardContent>
              </Card>
              )}

              {/* ONGLET: Certifications */}
              {activeTab === 'certifications' && (
                <Card>
                  <CardContent style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏆</span>
                        <span>Certifications</span>
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Valorisez vos labels et certifications (optionnel)
                      </p>
                    </div>

                    <Stack spacing="md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Certification nationale (AB, etc.)"
                          type="text"
                          name="nationalcertification"
                          value={formData.nationalcertification}
                          onChange={handleChange}
                          placeholder="Ex: Agriculture Biologique"
                          leftIcon={<span style={{ fontSize: '1.2rem' }}>🇷🇺</span>}
                        />

                        <div style={{ position: 'relative' }}>
                          <Input
                            label="Lien certification nationale"
                            type="text"
                            name="nationalcertificationweblink"
                            value={formData.nationalcertificationweblink}
                            onChange={handleChange}
                            onBlur={() => handleUrlBlur('nationalcertificationweblink')}
                            placeholder="certificat-agence.fr/..."
                            leftIcon={<span style={{ fontSize: '1.2rem' }}>🔗</span>}
                          />
                          {formData.nationalcertificationweblink && (
                            <button
                              type="button"
                              onClick={() => openLink(formData.nationalcertificationweblink)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '38px',
                                padding: '6px 10px',
                                backgroundColor: '#0074e4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease'
                              }}
                              title="Ouvrir le lien"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                            >
                              🔗
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Certification internationale"
                          type="text"
                          name="internationalcertification"
                          value={formData.internationalcertification}
                          onChange={handleChange}
                          placeholder="Ex: Ecocert, Demeter"
                          leftIcon={<span style={{ fontSize: '1.2rem' }}>🌍</span>}
                        />

                        <div style={{ position: 'relative' }}>
                          <Input
                            label="Lien certification internationale"
                            type="text"
                            name="internationalcertificationweblink"
                            value={formData.internationalcertificationweblink}
                            onChange={handleChange}
                            onBlur={() => handleUrlBlur('internationalcertificationweblink')}
                            placeholder="ecocert.com/..."
                            leftIcon={<span style={{ fontSize: '1.2rem' }}>🔗</span>}
                          />
                          {formData.internationalcertificationweblink && (
                            <button
                              type="button"
                              onClick={() => openLink(formData.internationalcertificationweblink)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '38px',
                                padding: '6px 10px',
                                backgroundColor: '#0074e4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease'
                              }}
                              title="Ouvrir le lien"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0074e4'}
                            >
                              🔗
                            </button>
                          )}
                        </div>
                      </div>
                    </Stack>
                </CardContent>
              </Card>
              )}

              {/* Alertes système */}
              {/* Alerte suppression en cours */}
                {existingFarm && existingFarm.status === 'pending_deletion' && (
                  <Card>
                    <CardContent className="p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-500">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div className="flex-1">
                          <p className="text-base text-red-900 dark:text-red-100 font-bold mb-2">
                            🗑️ Ferme en cours de suppression
                          </p>
                          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                            Votre ferme a été marquée pour suppression et sera définitivement supprimée le{' '}
                            <strong>
                              {new Date(new Date(existingFarm.deletion_requested_at).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}
                            </strong>.
                          </p>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-300 mb-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Raison:
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              {existingFarm.deletion_reason || 'Non spécifiée'}
                            </p>
                          </div>
                          <p className="text-xs text-red-700 dark:text-red-300">
                            ⏱️ Votre jeton reste utilisable. Vous pouvez continuer à l'utiliser normalement pendant cette période.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Alerte ferme masquée */}
                {existingFarm && existingFarm.status === 'hidden' && (
                  <Card>
                    <CardContent className="p-4 bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-400">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🚫</span>
                        <div className="flex-1">
                          <p className="text-sm text-orange-900 dark:text-orange-100 font-bold mb-2">
                            Ferme temporairement masquée du directory
                          </p>
                          <p className="text-sm text-orange-800 dark:text-orange-200 bg-white dark:bg-gray-800 p-3 rounded border border-orange-200">
                            {existingFarm.deletion_reason || 'Votre ferme a été masquée par l\'équipe de modération.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Barre d'action fixe en bas */}
              <Card style={{ position: 'sticky', bottom: '16px', zIndex: 10, boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}>
                <CardContent style={{ padding: '16px' }}>
                  <Stack spacing="sm">
                    {/* Boutons de base : toujours visibles */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <Button
                        type="button"
                        onClick={() => navigate('/manage-token')}
                        variant="outline"
                      >
                        Annuler
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={submitting}
                        variant="secondary"
                      >
                        {submitting ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>

                    {/* Bouton Demander Vérification : visible uniquement sur l'onglet 'verification', si non vérifié et pas pending */}
                    {activeTab === 'verification' && existingFarm && !existingFarm.verified && existingFarm.verification_status !== 'pending' && (
                      <>
                        <Button
                          type="button"
                          onClick={async (e) => {
                            if (!canRequestVerification()) {
                              setNotification({
                                type: 'error',
                                message: `Champs manquants : ${getMissingFieldsForVerification().join(', ')}`
                              });
                              return;
                            }
                            
                            // Sauvegarder avec demande de vérification
                            await handleSubmit(e, true);
                            
                            // Afficher popup de confirmation (disparaît en 3 secondes)
                            setNotification({
                              type: 'success',
                              message: '✅ Votre demande a été envoyée'
                            });
                          }}
                          disabled={!canRequestVerification() || submitting}
                          variant="primary"
                          fullWidth
                          style={{ 
                            backgroundColor: canRequestVerification() ? '#10b981' : '#cbd5e1', 
                            borderColor: canRequestVerification() ? '#10b981' : '#cbd5e1',
                            color: '#ffffff'
                          }}
                        >
                          {canRequestVerification() 
                            ? 'Enregistrer et Vérifier' 
                            : 'Complétez les champs requis'}
                        </Button>
                        
                        {/* Message d'aide si champs manquants */}
                        {!canRequestVerification() && (
                          <div style={{
                            padding: '10px 12px',
                            backgroundColor: '#fef3c7',
                            border: '1px solid #fbbf24',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#92400e'
                          }}>
                            <strong>Manquants :</strong> {getMissingFieldsForVerification().join(', ')}
                          </div>
                        )}
                      </>
                    )}

                    {/* Info validation en cours */}
                    {existingFarm && existingFarm.verification_status === 'pending' && (
                      <div style={{
                        padding: '10px 12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#92400e',
                        textAlign: 'center'
                      }}>
                        Validation en cours par un administrateur
                      </div>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </form>

          {/* HISTORIQUE: Échanges avec l'administrateur */}
          {existingFarm && (
            (existingFarm.communication_history && existingFarm.communication_history.length > 0) ||
            existingFarm.verification_status === 'pending' ||
            existingFarm.verification_status === 'info_requested'
          ) && (
            <details style={{ marginTop: '1.5rem' }}>
              <summary style={{
                cursor: 'pointer',
                padding: '1.25rem',
                backgroundColor: '#f0f9ff',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                listStyle: 'none',
                userSelect: 'none'
              }}>
                <span style={{ fontSize: '1.5rem' }}>💬</span>
                <span>Historique des échanges</span>
                
                {/* Badge compteur total */}
                <span style={{ 
                  marginLeft: 'auto',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>
                  {existingFarm.communication_history?.length || 0} message(s)
                </span>
                
                {/* Badge messages admin non lus */}
                {unreadAdminCount > 0 && (
                  <span style={{ 
                    fontSize: '0.75rem',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}>
                    {unreadAdminCount} nouveau(x)
                  </span>
                )}
              </summary>
              
              <Card style={{ marginTop: '0.5rem', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }}>
                <CardContent style={{ padding: '24px' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Historique des communications concernant la vérification de votre établissement
                  </p>

                  {/* Historique des messages */}
                  {existingFarm.communication_history && existingFarm.communication_history.length > 0 && (
                    <div style={{ 
                      marginBottom: '20px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      padding: '12px',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <Stack spacing="md">
                        {existingFarm.communication_history.map((msg, idx) => {
                          const isSystem = msg.author === 'system';
                          const isAdmin = msg.author === 'admin';
                          const isUser = msg.author === 'creator' || msg.author === 'user';
                          
                          // Détecter si c'est un message de refus
                          const isRejectionMessage = isSystem && msg.message.includes('🚫 REFUS');
                          
                          if (isSystem) {
                            return (
                              <div
                                key={idx}
                                style={{
                                  textAlign: 'center',
                                  padding: '12px 16px',
                                  backgroundColor: isRejectionMessage ? '#fee2e2' : '#f3f4f6',
                                  borderRadius: '8px',
                                  border: isRejectionMessage ? '2px solid #ef4444' : 'none',
                                  fontSize: '0.875rem',
                                  color: isRejectionMessage ? '#b91c1c' : '#6b7280',
                                  fontWeight: isRejectionMessage ? '600' : '400',
                                  fontStyle: 'italic'
                                }}
                              >
                                {msg.message}
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  marginTop: '4px',
                                  color: isRejectionMessage ? '#991b1b' : '#9ca3af'
                                }}>
                                  {new Date(msg.timestamp).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: isAdmin ? 'flex-start' : 'flex-end',
                                marginBottom: '12px'
                              }}
                            >
                              <div
                                style={{
                                  maxWidth: '75%',
                                  padding: '12px 16px',
                                  borderRadius: '12px',
                                  backgroundColor: isAdmin ? '#eff6ff' : '#dcfce7',
                                  border: isAdmin ? '1px solid #3b82f6' : '1px solid #22c55e',
                                  wordBreak: 'break-word'
                                }}
                              >
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  fontWeight: '600',
                                  color: isAdmin ? '#1e40af' : '#15803d',
                                  marginBottom: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span>{isAdmin ? '👨‍💼 Administrateur' : '👤 Vous'}</span>
                                  <span style={{ color: '#9ca3af' }}>•</span>
                                  <span style={{ color: '#9ca3af', fontWeight: '400' }}>
                                    {new Date(msg.timestamp).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p style={{ 
                                  fontSize: '0.9rem', 
                                  color: 'var(--text-primary)',
                                  margin: 0,
                                  lineHeight: '1.5'
                                }}>
                                  {msg.message}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </Stack>
                    </div>
                  )}

                  {/* Zone de saisie nouveau message - Toujours disponible pour permettre contestation */}
                  {existingFarm.verification_status !== 'banned' && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#fff', 
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {/* Info contextuelle selon le statut */}
                      {existingFarm.verification_status === 'rejected' && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fbbf24',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          fontSize: '0.875rem',
                          color: '#92400e'
                        }}>
                          💬 <strong>Votre demande a été refusée.</strong> Vous pouvez contester cette décision en envoyant un message.
                        </div>
                      )}
                      {existingFarm.verification_status === 'verified' && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#d1fae5',
                          border: '1px solid #10b981',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          fontSize: '0.875rem',
                          color: '#065f46'
                        }}>
                          ✅ <strong>Votre établissement est vérifié.</strong> Vous pouvez signaler un problème ou poser une question.
                        </div>
                      )}
                      
                      <Textarea
                        label="Votre message"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrivez votre message à l'administrateur..."
                        rows={3}
                        style={{ marginBottom: '12px' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                        >
                          {sendingMessage ? 'Envoi...' : '📤 Envoyer'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Message si pas de conversation active */}
                  {(!existingFarm.communication_history || existingFarm.communication_history.length === 0) &&
                   existingFarm.verification_status !== 'pending' &&
                   existingFarm.verification_status !== 'info_requested' && (
                    <div style={{
                      textAlign: 'center',
                      padding: '32px',
                      color: '#6b7280'
                    }}>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>
                        Aucun message pour le moment. L'administrateur vous contactera si nécessaire.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </details>
          )}

                    {/* LISTE DES JETONS ASSOCIÉS */}
          {existingFarm && (() => {
            const hasTokens = existingFarm?.tokens && Array.isArray(existingFarm.tokens) && existingFarm.tokens.length > 0;
            
            return (
              <Card>
                <CardContent style={{ padding: '24px' }}>
                  <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
                    🪙 Jetons associés à votre établissement
                  </h2>
                  
                  {!hasTokens ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '16px',
                      border: '2px dashed var(--border-primary)'
                    }}>
                      <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>📭</div>
                      <p style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600', 
                        color: 'var(--text-primary)',
                        marginBottom: '8px'
                      }}>
                        Aucun jeton associé à ce profil
                      </p>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        color: 'var(--text-secondary)',
                        marginBottom: '24px'
                      }}>
                        Créez ou importez un jeton pour commencer
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/create-token')}
                        style={{ height: '40px' }}
                      >
                        🔨 Créer un jeton
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(tokensWithStats.length > 0 ? tokensWithStats : existingFarm.tokens).map((token, idx) => {
                          const isExpanded = expandedDescriptions[token.tokenId];
                          const isIncomplete = token.isComplete === false;
                          
                          const truncateText = (text, maxLength = 60) => {
                            if (!text) return null;
                            if (text.length <= maxLength) return text;
                            return text.substring(0, maxLength) + '...';
                          };
                          
                          return (
                            <div 
                              key={token.tokenId || idx} 
                              style={{
                                padding: '20px',
                                backgroundColor: isIncomplete ? '#fef2f2' : 'var(--bg-secondary)',
                                borderRadius: '16px',
                                border: isIncomplete ? '2px solid #ef4444' : '1px solid var(--border-primary)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isIncomplete) {
                                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isIncomplete) {
                                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              {/* Alerte incomplet */}
                              {isIncomplete && (
                                <div style={{
                                  marginBottom: '12px',
                                  padding: '10px 14px',
                                  backgroundColor: '#fee2e2',
                                  border: '1px solid #ef4444',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#dc2626', marginBottom: '2px' }}>
                                      Jeton incomplet - Masqué de l'annuaire
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                                      Ajoutez un objectif et une contrepartie pour le rendre visible
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* En-tête : Ticker + Nom */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#3b82f6',
                                  color: '#fff',
                                  borderRadius: '8px',
                                  fontWeight: '700',
                                  fontSize: '0.875rem',
                                  fontFamily: 'monospace'
                                }}>
                                  {token.ticker || 'UNK'}
                                </span>
                                <h3 style={{
                                  fontSize: '1.125rem',
                                  fontWeight: '700',
                                  color: 'var(--text-primary)',
                                  margin: 0,
                                  flex: 1
                                }}>
                                  {token.tokenName || 'Sans nom'}
                                </h3>
                              </div>
                              
                              {/* Objectif */}
                              {token.purpose ? (
                                <div style={{ marginBottom: '8px' }}>
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '4px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase'
                                  }}>
                                    🎯 Objectif
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {isExpanded ? token.purpose : truncateText(token.purpose)}
                                    {token.purpose.length > 60 && (
                                      <button
                                        onClick={() => setExpandedDescriptions(prev => ({
                                          ...prev,
                                          [token.tokenId]: !prev[token.tokenId]
                                        }))}
                                        style={{
                                          marginLeft: '8px',
                                          background: 'none',
                                          border: 'none',
                                          color: 'var(--primary-color)',
                                          cursor: 'pointer',
                                          fontSize: '0.8rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        {isExpanded ? 'Moins' : 'Plus'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  marginBottom: '8px',
                                  padding: '8px 12px',
                                  backgroundColor: '#fef3c7',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  color: '#92400e'
                                }}>
                                  ⚠️ Objectif manquant
                                </div>
                              )}
                              
                              {/* Contrepartie */}
                              {token.counterpart ? (
                                <div style={{ marginBottom: '12px' }}>
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '4px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase'
                                  }}>
                                    🎁 Contrepartie
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {truncateText(token.counterpart)}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  marginBottom: '12px',
                                  padding: '8px 12px',
                                  backgroundColor: '#fef3c7',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  color: '#92400e'
                                }}>
                                  ⚠️ Contrepartie manquante
                                </div>
                              )}
                              
                              {/* Statistiques et Actions sur une ligne */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                backgroundColor: 'var(--bg-primary)',
                                borderRadius: '12px',
                                marginBottom: '12px',
                                flexWrap: 'wrap'
                              }}>
                                {/* Détenteurs */}
                                <div style={{ minWidth: '100px' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                                    👥 Détenteurs
                                  </div>
                                  <div style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {token.holdersCount !== null && token.holdersCount !== undefined 
                                      ? token.holdersCount 
                                      : '...'}
                                  </div>
                                </div>
                                
                                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-primary)' }} />
                                
                                {/* Switch visibilité */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Switch
                                    checked={token.isVisible !== false && !isIncomplete}
                                    onChange={(checked) => {
                                      if (!isIncomplete && checked !== undefined) {
                                        handleToggleVisibility(token.tokenId, token.isVisible !== false);
                                      }
                                    }}
                                    disabled={togglingVisibility[token.tokenId] || isIncomplete}
                                  />
                                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    {isIncomplete ? '🔒 Masqué' : (token.isVisible !== false ? '👁️ Visible' : '🙈 Masqué')}
                                  </span>
                                </div>
                                
                                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-primary)' }} />
                                
                                {/* Bouton Modifier compact */}
                                <Button
                                  variant="outline"
                                  onClick={() => navigate(`/token/${token.tokenId}`)}
                                  style={{ height: '40px', fontSize: '0.85rem', padding: '0 16px', flexShrink: 0 }}
                                >
                                  ⚙️ Modifier
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        backgroundColor: '#dbeafe',
                        borderRadius: '12px',
                        border: '1px solid #93c5fd'
                      }}>
                        <p style={{ 
                          fontSize: '0.8rem', 
                          color: '#1e40af',
                          margin: 0,
                          lineHeight: '1.5'
                        }}>
                          💡 <strong>Info :</strong> Le Ticker, le Nom et le nombre de Détenteurs sont récupérés automatiquement de la blockchain. 
                          Les jetons sans objectif ou contrepartie sont automatiquement masqués de l'annuaire. 
                          Pour modifier l'objectif, la contrepartie ou la visibilité, cliquez sur "⚙️ Modifier".
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Zone de danger : Suppression du profil */}
          {existingFarm && existingFarm.status !== 'deleted' && (
            <Card style={{ 
              marginTop: '2rem',
              backgroundColor: '#fef2f2', 
              border: '2px solid #dc2626' 
            }}>
              <CardContent style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: '#991b1b',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>⚠️</span>
                    <span>Demander la suppression de son profil</span>
                  </h3>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#7f1d1d',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    La suppression de votre profil est une action définitive qui effacera toutes vos données personnelles 
                    de nos serveurs. Vos jetons resteront liés à votre adresse blockchain.
                  </p>
                </div>
                <Button 
                  variant="danger"
                  onClick={handleDeleteProfile}
                  style={{ width: '100%' }}
                >
                  🗑️ Supprimer mon profil
                </Button>
              </CardContent>
            </Card>
          )}
        </Stack>
      </PageLayout>

      {/* Modal avertissement modifications sensibles */}
      <Modal isOpen={showWarningModal} onClose={handleCancelWarning}>
        <Modal.Header>Attention : Modification de données sensibles</Modal.Header>
        <Modal.Body>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: '1rem', fontWeight: '500', color: '#dc2626' }}>
              Vous êtes sur le point de modifier ou supprimer des informations vérifiées :
            </p>
            <ul style={{ 
              listStyle: 'disc', 
              paddingLeft: '1.5rem', 
              marginBottom: '1rem',
              color: '#6b7280'
            }}>
              {pendingSaveAction?.sensitiveChanges?.map((change, idx) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>{change}</li>
              ))}
            </ul>
            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              Ces modifications entraîneront la <strong>perte du statut vérifié</strong> de votre établissement. 
              Une nouvelle vérification sera nécessaire.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={handleCancelWarning}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={handleConfirmWarning}
            disabled={submitting}
          >
            {submitting ? 'Enregistrement...' : 'Confirmer et perdre le statut'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal suppression profil - Double validation */}
      <Modal isOpen={showDeleteModal} onClose={handleCancelDelete}>
        <Modal.Header>
          {deleteStep === 1 ? 'Supprimer votre profil ?' : 'Confirmation finale'}
        </Modal.Header>
        <Modal.Body>
          {deleteStep === 1 ? (
            <div>
              <p style={{ marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
                Êtes-vous sûr de vouloir supprimer votre profil ?
              </p>
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#fef3c7', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '0.9rem', color: '#92400e', margin: 0, lineHeight: '1.5' }}>
                  <strong>⚠️ Attention :</strong> Votre profil disparaîtra de l'annuaire public. 
                  Vos données personnelles seront effacées de nos serveurs.
                </p>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Cliquez sur "Continuer" pour passer à l'étape finale de confirmation.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ 
                padding: '1.25rem', 
                backgroundColor: '#fee2e2', 
                border: '2px solid #dc2626',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <p style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: '#991b1b',
                  marginBottom: '0.75rem' 
                }}>
                  🚨 Cette action est irréversible
                </p>
                <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0, lineHeight: '1.6' }}>
                  Vos données personnelles (nom, email, téléphone, description, certifications) 
                  seront <strong>définitivement effacées</strong> de nos serveurs.
                </p>
              </div>
              
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#dbeafe', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                  <strong>ℹ️ Note :</strong> L'historique de vos jetons restera lié à votre adresse 
                  blockchain. Cette information est immuable et fait partie de la blockchain eCash.
                </p>
              </div>

              <p style={{ 
                fontSize: '0.875rem', 
                color: '#374151',
                fontWeight: '500',
                textAlign: 'center',
                margin: '1rem 0 0 0'
              }}>
                Confirmez-vous la suppression définitive de votre profil ?
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={handleCancelDelete}>
            Annuler
          </Button>
          {deleteStep === 1 ? (
            <Button variant="danger" onClick={handleConfirmDeleteStep1}>
              Continuer
            </Button>
          ) : (
            <Button 
              variant="danger" 
              onClick={handleConfirmDeleteStep2}
              disabled={deleting}
            >
              {deleting ? 'Suppression...' : 'Confirmer la suppression définitive'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </MobileLayout>
  );
};

export default ManageFarmPage;
