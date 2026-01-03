import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, Tabs, Modal } from '../components/UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useProfiles } from '../hooks/useProfiles';
import { notificationAtom } from '../atoms';
import { ProfilService } from '../services/profilService';
import { supabase } from '../services/supabaseClient';
import { CommunicationSection as _CommunicationSection } from '../features/admin/components';
import type { UserProfile, TokenInfo } from '../types';

// Type pour les tokens enrichis avec stats
interface TokenWithStats {
  tokenId: string;
  tokenName: string;
  ticker: string;
  holdersCount: number;
  isComplete: boolean;
  isVariable: boolean;
  isVisible: boolean;
  isLinked?: boolean;
  purpose?: string;
  counterpart?: string;
  image?: string;
  name?: string;
  decimals?: number;
  [key: string]: unknown;
}

// Type pour les champs sensibles
interface SensitiveFieldsState {
  profileName: string;
  streetAddress: string;
  companyid: string;
  [key: string]: string;
}

// Type pour l'action en attente
interface PendingSaveActionState {
  e: React.FormEvent | null;
  requestVerification: boolean;
  sensitiveChanges: string[];
}

// Profile feature hooks and components
import { 
  useProductServiceTags,
  // Available but not yet integrated: useProfileForm, useProfileSubmit, useTokenStats
  InfosTab,
  LocationTab,
  ContactTab,
  VerificationTab,
  CertificationsTab,
  TokensListTab,
  SecurityTab,
} from '../features/profile';

const ManageProfilePage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet, address } = useEcashWallet();
  const { profiles, refreshProfiles } = useProfiles();
  const setNotification = useSetAtom(notificationAtom);

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);
  
  // Use ProductServiceTags hook for tag management
  const {
    productTags,
    serviceTags,
    productInput,
    serviceInput,
    productSuggestions,
    serviceSuggestions,
    setProductInput,
    setServiceInput,
    addProductTag,
    removeProductTag,
    addServiceTag,
    removeServiceTag,
    handleProductKeyDown,
    handleServiceKeyDown,
    resetFromProfile,
  } = useProductServiceTags();
  
  const [formData, setFormData] = useState({
    profileName: '',
    description: '',
    country: 'France',
    locationCountry: 'France',
    region: '',
    locationRegion: '',
    department: '',
    locationDepartment: '',
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
    certification1: '',
    certification1weblink: '',
    certification2: '',
    certification2weblink: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [tokensWithStats, setTokensWithStats] = useState<TokenWithStats[]>([]);
  const [togglingVisibility, setTogglingVisibility] = useState<Record<string, boolean>>({});
  const [_expandedDescriptions, _setExpandedDescriptions] = useState<Record<string, boolean>>({});
  
  // Onglets - Initialiser depuis la navigation si disponible
  // Mapper les anciens noms d'onglets pour compatibilité
  const getInitialTab = () => {
    const stateTab = location.state?.activeTab as string | undefined;
    if (!stateTab) return 'profile';
    
    // Mapping pour compatibilité
    const tabMapping: Record<string, string> = {
      'info': 'profile',
      'verification': 'verification',
      'tokens': 'tokens',
      'security': 'security',
      'support': 'security', // Rediriger support vers security
    };
    
    return tabMapping[stateTab] || 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  
  // Confidentialité
  const [privacy, setPrivacy] = useState({
    hideEmail: false,
    hidePhone: false,
    hideCompanyID: false,
    hideLegalRep: false
  });
  
  // Tracking modifications champs sensibles
  const [sensitiveFieldsChanged, setSensitiveFieldsChanged] = useState(false);
  const [initialSensitiveFields, setInitialSensitiveFields] = useState<SensitiveFieldsState | null>(null);
  
  // Modal avertissement modifications sensibles
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<PendingSaveActionState | null>(null);
  
  // Re-vérification annuelle
  const [_confirmingInfo, setConfirmingInfo] = useState(false);
  
  // Communication avec admin
  const [newMessage, setNewMessage] = useState('');
  const [_sendingMessage, setSendingMessage] = useState(false);
  
  // Signalements reçus
  const [_profileReports, setProfileReports] = useState<unknown[]>([]);
  const [_loadingReports, setLoadingReports] = useState(false);
  
  // Suppression profil
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = première confirmation, 2 = confirmation finale
  const [deleting, setDeleting] = useState(false);
  
  // Toggle visibilité ferme (active/draft)
  const [togglingProfileStatus, setTogglingProfileStatus] = useState(false);

  // Calculer le nombre de messages admin non lus (postérieurs au dernier message creator)
  const _unreadAdminCount = useMemo(() => {
    if (!existingProfile?.communication_history || existingProfile.communication_history.length === 0) {
      return 0;
    }

    const history = existingProfile.communication_history;
    
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
      return history.filter((msg: { author: string }) => msg.author === 'admin').length;
    }

    // Compter les messages admin après le dernier message creator
    let count = 0;
    for (let i = lastCreatorIndex + 1; i < history.length; i++) {
      if (history[i].author === 'admin') {
        count++;
      }
    }

    return count;
  }, [existingProfile?.communication_history]);

  // Charger le nombre de détenteurs pour chaque token
  useEffect(() => {
    if (!existingProfile?.tokens || !Array.isArray(existingProfile.tokens) || existingProfile.tokens.length === 0 || !wallet) {
      setTokensWithStats([]);
      return;
    }
    
    loadTokensWithStats();
  }, [existingProfile?.tokens, wallet]);

  // Fonction pour charger les stats des tokens (utilisable depuis TokensListTab)
  const loadTokensWithStats = async () => {
    if (!existingProfile?.tokens || !Array.isArray(existingProfile.tokens) || existingProfile.tokens.length === 0 || !wallet) {
      setTokensWithStats([]);
      return;
    }

    console.log('🔄 Chargement des données enrichies des jetons...');
    
    const enrichedTokens = await Promise.all(
      existingProfile.tokens.map(async (token) => {
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
        
        // 4. Déterminer si le jeton est variable (a un mint baton)
        const isVariable = tokenInfo?.genesisInfo?.mintBatonVout !== undefined && tokenInfo?.genesisInfo?.mintBatonVout !== null;
        
        console.log(`✅ Jeton ${ticker} chargé: ${tokenName}, ${holdersCount} détenteurs, complet: ${isComplete}, variable: ${isVariable}`);
        
        return { 
          ...token, 
          tokenName,
          ticker,
          holdersCount,
          isComplete,
          isVariable,
          // Forcer masqué si incomplet
          isVisible: isComplete ? (token.isVisible !== false) : false
        };
      })
    );
    
    setTokensWithStats(enrichedTokens);
    console.log('✅ Tous les jetons enrichis chargés:', enrichedTokens);
  };

  // Fonction pour auto-formater les URLs
  const handleUrlBlur = (fieldName: string) => {
    const value = (formData as Record<string, string>)[fieldName];
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: `https://${value}`
      }));
    }
  };
  
  // Obtenir l'icône pour un réseau social
  const getSocialIcon = (fieldName: string) => {
    const icons: Record<string, string> = {
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
  const openLink = (url: string | undefined) => {
    if (!url) return;
    
    // S'assurer que l'URL a un protocole
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = `https://${url}`;
    }
    
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };
  
  // Fonction pour gérer les changements de confidentialité
  const handlePrivacyChange = (field: keyof typeof privacy, checked: boolean) => {
    setPrivacy(prev => ({
      ...prev,
      [field]: checked
    }));
  };
  
  // Vérifier si les champs obligatoires pour la vérification sont remplis
  const _canRequestVerification = () => {
    return !!(
      formData.companyid &&
      formData.governmentidverificationweblink &&
      formData.phone &&
      formData.email
    );
  };
  
  const _getMissingFieldsForVerification = () => {
    const missing = [];
    if (!formData.companyid) missing.push('SIRET');
    if (!formData.governmentidverificationweblink) missing.push('Preuve SIRET');
    if (!formData.phone) missing.push('Téléphone');
    if (!formData.email) missing.push('Email');
    return missing;
  };
  
  // Détecter si le formulaire a été modifié
  const hasFormChanges = useMemo(() => {
    if (!existingProfile) return true; // Nouveau profil, toujours actif
    
    // Comparer les champs avec les valeurs d'origine
    const socials = existingProfile.socials || {};
    const certs = existingProfile.certifications || {};
    const _tokenData = Array.isArray(existingProfile.tokens) && existingProfile.tokens.length > 0 ? existingProfile.tokens[0] : {};
    
    return (
      formData.profileName !== (existingProfile.name || '') ||
      formData.description !== (existingProfile.description || '') ||
      formData.locationCountry !== (existingProfile.location_country || 'France') ||
      formData.locationRegion !== (existingProfile.location_region || '') ||
      formData.locationDepartment !== (existingProfile.location_department || '') ||
      formData.city !== (existingProfile.city || '') ||
      formData.postalCode !== (existingProfile.postal_code || '') ||
      formData.streetAddress !== (existingProfile.street_address || '') ||
      formData.addressComplement !== (existingProfile.address_complement || '') ||
      formData.phone !== (existingProfile.phone || '') ||
      formData.email !== (existingProfile.email || '') ||
      formData.website !== (existingProfile.website || '') ||
      formData.otherWebsite !== (socials.other_website || '') ||
      formData.facebook !== (socials.facebook || '') ||
      formData.instagram !== (socials.instagram || '') ||
      formData.tiktok !== (socials.tiktok || '') ||
      formData.youtube !== (socials.youtube || '') ||
      formData.whatsapp !== (socials.whatsapp || '') ||
      formData.telegram !== (socials.telegram || '') ||
      formData.companyid !== (certs.siret || '') ||
      formData.governmentidverificationweblink !== (certs.siret_link || '') ||
      formData.legalRepresentative !== (certs.legal_representative || '') ||
      formData.nationalcertification !== (certs.national || '') ||
      formData.nationalcertificationweblink !== (certs.national_link || '') ||
      formData.internationalcertification !== (certs.international || '') ||
      formData.internationalcertificationweblink !== (certs.international_link || '') ||
      formData.certification1 !== (certs.certification_1 || '') ||
      formData.certification1weblink !== (certs.certification_1_link || '') ||
      formData.certification2 !== (certs.certification_2 || '') ||
      formData.certification2weblink !== (certs.certification_2_link || '') ||
      productTags.join(',') !== (Array.isArray(existingProfile.products) ? existingProfile.products.join(',') : '') ||
      serviceTags.join(',') !== (Array.isArray(existingProfile.services) ? existingProfile.services.join(',') : '')
    );
  }, [formData, productTags, serviceTags, existingProfile]);
  
  // Fonction pour toggle la visibilité ou isLinked
  const handleToggleVisibility = async (tokenId: string, field: 'isVisible' | 'isLinked' = 'isVisible') => {
    setTogglingVisibility(prev => ({ ...prev, [tokenId]: true }));
    try {
      // Récupérer la valeur actuelle du token
      const currentToken = tokensWithStats.find(t => t.tokenId === tokenId);
      const currentValue = field === 'isLinked' ? currentToken?.isLinked : currentToken?.isVisible;
      
      // Construire l'objet de mise à jour
      const updateData = {
        [field]: currentValue === false ? true : false
      };
      
      await ProfilService.updateTokenMetadata(address, tokenId, updateData);
      
      // Mettre à jour l'état local
      const updatedProfile = await ProfilService.getMyProfil(address);
      setExistingProfile(updatedProfile);
      refreshProfiles();
      
      // Recharger les tokens avec stats
      await loadTokensWithStats();
    } catch (err) {
      console.error('❌ Erreur toggle:', err);
      setNotification({
        type: 'error',
        message: 'Impossible de modifier le paramètre'
      });
    } finally {
      setTogglingVisibility(prev => ({ ...prev, [tokenId]: false }));
    }
  };


  // Recharger les données quand on revient sur la page
  useEffect(() => {
    if (address && wallet) {
      // Recharger la ferme depuis Supabase pour voir les modifications
      ProfilService.getMyProfil(address).then(profile => {
        if (profile) {
          setExistingProfile(profile);
          console.log('🔄 Profil rechargé:', profile);
          
          // Initialiser tags produits et services via hook
          const products = Array.isArray(profile.products) 
            ? profile.products 
            : (typeof profile.products === 'string' 
                ? profile.products.split(',').map(p => p.trim()).filter(Boolean) 
                : []);
          const services = Array.isArray(profile.services) 
            ? profile.services 
            : (typeof profile.services === 'string' 
                ? profile.services.split(',').map(s => s.trim()).filter(Boolean) 
                : []);
          resetFromProfile(products, services);
          
          // Charger privacy depuis certifications JSONB
          if (profile.certifications) {
            setPrivacy({
              hideEmail: profile.certifications.hide_email || false,
              hidePhone: profile.certifications.hide_phone || false,
              hideCompanyID: profile.certifications.hide_company_id || profile.certifications.hide_siret || false,
              hideLegalRep: profile.certifications.hide_legal_rep || false
            });
          }
        }
      }).catch(err => {
        console.error('❌ Erreur rechargement profil:', err);
      });
    }
  }, [address, wallet, resetFromProfile]); // Recharger uniquement quand l'adresse ou le wallet change

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

        // Charger le profil depuis Supabase (Cloud)
        const profile = await ProfilService.getMyProfil(address);
        console.log('📊 Profil récupéré depuis Supabase:', profile);
        console.log('🔑 Address utilisée:', address);
        
        if (profile) {
          console.log('✅ Profil trouvé, pré-remplissage du formulaire...');
          console.log('🪙 Tokens dans la ferme:', profile.tokens);
          console.log('📊 Nombre de tokens:', Array.isArray(profile.tokens) ? profile.tokens.length : 0);
          setExistingProfile(profile);
          // Pré-remplir le formulaire avec les données Supabase
          const socials = profile.socials || {};
          const certs = profile.certifications || {};
          const tokenData: { purpose?: string; counterpart?: string } = Array.isArray(profile.tokens) && profile.tokens.length > 0 ? profile.tokens[0] : {};
          
          const newFormData = {
            profileName: profile.name || '',
            description: profile.description || '',
            country: profile.location_country || 'France',
            locationCountry: profile.location_country || 'France',
            region: profile.location_region || '',
            locationRegion: profile.location_region || '',
            department: profile.location_department || '',
            locationDepartment: profile.location_department || '',
            city: profile.city || '',
            postalCode: profile.postal_code || '',
            streetAddress: profile.street_address || '',
            addressComplement: profile.address_complement || '',
            phone: profile.phone || '',
            email: profile.email || '',
            website: profile.website || '',
            otherWebsite: socials.other_website || '',
            facebook: socials.facebook || '',
            instagram: socials.instagram || '',
            tiktok: socials.tiktok || '',
            youtube: socials.youtube || '',
            whatsapp: socials.whatsapp || '',
            telegram: socials.telegram || '',
            products: Array.isArray(profile.products) ? profile.products.join(', ') : '',
            services: Array.isArray(profile.services) ? profile.services.join(', ') : '',
            tokenPurpose: tokenData.purpose || '',
            companyid: certs.siret || '',
            governmentidverificationweblink: certs.siret_link || '',
            legalRepresentative: certs.legal_representative || '',
            nationalcertification: certs.national || '',
            nationalcertificationweblink: certs.national_link || '',
            internationalcertification: certs.international || '',
            internationalcertificationweblink: certs.international_link || '',
            certification1: certs.certification_1 || '',
            certification1weblink: certs.certification_1_link || '',
            certification2: certs.certification_2 || '',
            certification2weblink: certs.certification_2_link || '',
          };
          
          console.log('📄 FormData construit:', newFormData);
          setFormData(newFormData);
          
          // Sauvegarder les valeurs initiales des champs sensibles
          setInitialSensitiveFields({
            profileName: newFormData.profileName,
            streetAddress: newFormData.streetAddress,
            companyid: newFormData.companyid
          });
          
          // Charger les signalements si le profil existe
          await loadProfileReports(profile.id);
        } else {
          console.log('⚠️ Aucune profile trouvée pour cette adresse');
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
  }, [tokenId, wallet, address, profiles, setNotification]);
  
  // Fonction pour charger les signalements
  const loadProfileReports = async (profileId: string) => {
    if (!profileId) return;
    
    try {
      setLoadingReports(true);
      // Charger les signalements directement depuis Supabase
      const { data, error } = await supabase
        .from('profile_reports')
        .select('*')
        .eq('profil_id', profileId)
        .eq('admin_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProfileReports(data || []);
    } catch (err) {
      console.error('❌ Erreur chargement signalements:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Handler pour toggle de visibilité profile (active/draft)
  const handleToggleProfileStatus = async (newStatus: 'active' | 'draft') => {
    if (!existingProfile) return;
    
    setTogglingProfileStatus(true);
    try {
      const updatedProfile = await ProfilService.saveProfil(
        { 
          ...existingProfile,
          status: newStatus 
        },
        address
      );
      
      setExistingProfile(updatedProfile);
      await refreshProfiles();
      
      setNotification({
        type: 'success',
        message: newStatus === 'active' 
          ? '✅ Profil publié dans l\'annuaire' 
          : '📝 Profil en mode brouillon'
      });
    } catch (err) {
      console.error('❌ Erreur toggle visibilité:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors du changement de visibilité'
      });
    } finally {
      setTogglingProfileStatus(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Vérifier si un champ sensible a été modifié (profile vérifié uniquement)
    if (existingProfile?.verified && initialSensitiveFields) {
      const sensitiveFields = ['profileName', 'streetAddress', 'companyid'];
      if (sensitiveFields.includes(name)) {
        // Comparer avec la valeur initiale
        const hasChanged = value !== initialSensitiveFields[name];
        if (hasChanged && !sensitiveFieldsChanged) {
          setSensitiveFieldsChanged(true);
        } else if (!hasChanged) {
          // Vérifier si d'autres champs ont changé
          const formDataRecord = formData as Record<string, string>;
          const otherFieldsChanged = sensitiveFields.some(
            field => field !== name && formDataRecord[field] !== initialSensitiveFields[field]
          );
          setSensitiveFieldsChanged(otherFieldsChanged);
        }
      }
    }
  };

  // Vérifier si champs sensibles modifiés/vidés avant sauvegarde
  const checkSensitiveFields = (_requestVerification = false) => {
    // Si profile verified ou pending, vérifier modifications sensibles
    if (!existingProfile || (!existingProfile.verified && existingProfile.verification_status !== 'pending')) {
      return false; // Pas de restriction
    }

    const sensitiveChanges = [];
    
    // Vérifier SIRET
    const currentSiret = formData.companyid || '';
    const initialSiret = existingProfile.certifications?.siret || '';
    if (currentSiret !== initialSiret) {
      if (!currentSiret) {
        sensitiveChanges.push('SIRET supprimé');
      } else {
        sensitiveChanges.push('SIRET modifié');
      }
    }
    
    // Vérifier Email
    const currentEmail = formData.email || '';
    const initialEmail = existingProfile.email || '';
    if (currentEmail !== initialEmail) {
      if (!currentEmail) {
        sensitiveChanges.push('Email supprimé');
      } else {
        sensitiveChanges.push('Email modifié');
      }
    }
    
    // Vérifier Phone
    const currentPhone = formData.phone || '';
    const initialPhone = existingProfile.phone || '';
    if (currentPhone !== initialPhone) {
      if (!currentPhone) {
        sensitiveChanges.push('Téléphone supprimé');
      } else {
        sensitiveChanges.push('Téléphone modifié');
      }
    }

    return sensitiveChanges.length > 0 ? sensitiveChanges : false;
  };

  const handleSubmit = async (e: React.FormEvent | null, requestVerification = false) => {
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
  const performSave = async (e: React.FormEvent | null, requestVerification = false) => {
    e?.preventDefault();
    
    // Bloquer toute action si le profile est banni
    if (existingProfile && existingProfile.status === 'banned') {
      setNotification({
        type: 'error',
        message: '🚫 Profile banni : aucune modification possible. Contactez l\'administrateur.'
      });
      return false;
    }
    
    // Pour le mode brouillon (enregistrement simple), seul le nom est obligatoire
    if (!formData.profileName) {
      setNotification({
        type: 'error',
        message: 'Le nom de la ferme est obligatoire pour enregistrer'
      });
      return false;
    }
    
    // Validation renforcée si demande de vérification explicite
    if (requestVerification) {
      const missingFields = [];
      if (!formData.description) missingFields.push('Description');
      if (!formData.email) missingFields.push('Email');
      if (!formData.streetAddress) missingFields.push('Adresse de la rue');
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
      // Construire l'objet profile compatible Supabase
      const profileData: Partial<UserProfile> & { forceStatus?: string } = {
        name: formData.profileName,
        description: formData.description,
        location_country: formData.locationCountry || formData.country || 'France',
        location_region: formData.locationRegion || formData.region || '',
        location_department: formData.locationDepartment || formData.department || '',
        city: formData.city || '',
        postal_code: formData.postalCode || '',
        street_address: formData.streetAddress || '',
        address_complement: formData.addressComplement || '',
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        image_url: existingProfile?.image_url || undefined,
        
        // Réseaux sociaux (JSONB)
        socials: {
          facebook: formData.facebook || undefined,
          instagram: formData.instagram || undefined,
          tiktok: formData.tiktok || undefined,
          youtube: formData.youtube || undefined,
          whatsapp: formData.whatsapp || undefined,
          telegram: formData.telegram || undefined,
          other_website: formData.otherWebsite || undefined
        },
        
        // Certifications (JSONB)
        certifications: {
          siret: formData.companyid || undefined,
          siret_link: formData.governmentidverificationweblink || undefined,
          legal_representative: formData.legalRepresentative || undefined,
          national: formData.nationalcertification || undefined,
          national_link: formData.nationalcertificationweblink || undefined,
          international: formData.internationalcertification || undefined,
          international_link: formData.internationalcertificationweblink || undefined,
          certification_1: formData.certification1 || undefined,
          certification_1_link: formData.certification1weblink || undefined,
          certification_2: formData.certification2 || undefined,
          certification_2_link: formData.certification2weblink || undefined,
          // Privacy settings intégré dans certifications
          hide_email: privacy.hideEmail || false,
          hide_phone: privacy.hidePhone || false,
          hide_company_id: privacy.hideCompanyID || false,
          hide_legal_rep: privacy.hideLegalRep || false
        },
        
        products: productTags,
        services: serviceTags,
        
        // Tokens (JSONB Array) - Conserver les tokens existants et ajouter/mettre à jour le token actuel si tokenId existe
        tokens: (() => {
          const existingTokens = existingProfile?.tokens || [];
          
          // Si pas de tokenId, conserver simplement les tokens existants
          if (!tokenId) {
            return existingTokens;
          }
          
          // Si tokenId existe, ajouter/mettre à jour le token actuel
          const currentToken = {
            tokenId: tokenId,
            ticker: tokenInfo?.genesisInfo?.tokenTicker || 'UNK',
            isVisible: true,
            isLinked: true // Par défaut, lié au profil
          };
          
          // Si le token existe déjà, le mettre à jour en préservant isLinked et isVisible, sinon l'ajouter
          const tokenIndex = existingTokens.findIndex(t => t.tokenId === tokenId);
          if (tokenIndex >= 0) {
            const updated = [...existingTokens];
            // Préserver les valeurs existantes de isVisible et isLinked
            updated[tokenIndex] = {
              ...currentToken,
              isVisible: existingTokens[tokenIndex].isVisible !== undefined ? existingTokens[tokenIndex].isVisible : true,
              isLinked: existingTokens[tokenIndex].isLinked !== undefined ? existingTokens[tokenIndex].isLinked : true
            };
            return updated;
          } else {
            return [...existingTokens, currentToken];
          }
        })()
      };

      // Déterminer le statut de vérification selon les modifications
      let verificationStatus = existingProfile?.verification_status || 'none';
      let isVerified = existingProfile?.verified || false;
      
      if (requestVerification) {
        // Demande explicite de vérification
        // IMPORTANT: Forcer 'pending' même si le statut actuel est 'rejected'
        // Cela permet au créateur de re-soumettre sa ferme après correction
        verificationStatus = 'pending';
        isVerified = false;
        
        // Ajouter une entrée système dans l'historique pour notifier l'admin
        try {
          const currentHistory = existingProfile?.communication_history || [];
          const isResubmission = existingProfile?.verification_status === 'rejected' || existingProfile?.verification_status === 'info_requested';
          
          profileData.communication_history = [
            ...currentHistory,
            {
              author: 'system',
              message: isResubmission 
                ? '🔄 Nouvelle demande de vérification soumise après correction'
                : '📝 Demande de vérification soumise par le créateur',
              timestamp: new Date().toISOString()
            }
          ];
        } catch (err) {
          console.warn('⚠️ communication_history non disponible:', err);
          // Ne pas bloquer la sauvegarde si la colonne n'existe pas encore
        }
      } else if (existingProfile?.verified && sensitiveFieldsChanged) {
        // Profile vérifié avec modification de champs sensibles SANS demande de vérification
        // Passage en 'pending' pour nécessiter une nouvelle validation admin
        verificationStatus = 'pending';
        isVerified = false;
        
        // Ajouter une entrée système dans l'historique
        try {
          const currentHistory = existingProfile?.communication_history || [];
          profileData.communication_history = [
            ...currentHistory,
            {
              author: 'system',
              message: '⚠️ Modification de champs sensibles sur un profil vérifié - Nouvelle validation requise',
              timestamp: new Date().toISOString()
            }
          ];
        } catch (err) {
          console.warn('⚠️ communication_history non disponible:', err);
        }
      } else if (!existingProfile?.verified && sensitiveFieldsChanged && !requestVerification) {
        // Profile non vérifié avec modification - reste 'none'
        verificationStatus = 'none';
        isVerified = false;
      }
      
      profileData.verification_status = verificationStatus;
      profileData.verified = isVerified;
      
      // Sauvegarder dans Supabase (Cloud)
      const savedProfile = await ProfilService.saveProfil(profileData, address);
      
      console.log('✅ Profile sauvegardé sur Supabase:', savedProfile);
      console.log('☁️ Accessible depuis n\'importe quel appareil avec:', address);

      // Message adapté selon le statut
      let successMessage = 'Profile enregistré avec succès !';
      if (requestVerification) {
        successMessage = 'Enregistré ! Demande de vérification envoyée à l\'administrateur.';
      } else if (existingProfile?.verified && sensitiveFieldsChanged) {
        successMessage = 'Enregistré ! Une nouvelle vérification par l\'administrateur sera nécessaire.';
      } else if (sensitiveFieldsChanged) {
        successMessage = 'Coordonnées enregistrées avec succès !';
      }
      
      setNotification({
        type: 'success',
        message: successMessage
      });
      
      // Recharger les données
      await refreshProfiles();
      const updatedProfile = await ProfilService.getMyProfil(address);
      setExistingProfile(updatedProfile);
      
      // Réinitialiser les trackers
      setSensitiveFieldsChanged(false);
      if (updatedProfile) {
        setInitialSensitiveFields({
          profileName: updatedProfile.name || '',
          streetAddress: updatedProfile.street_address || '',
          companyid: updatedProfile.certifications?.siret || ''
        });
      }

      // Navigation différée uniquement si demande de vérification
      if (requestVerification) {
        setTimeout(() => {
          navigate('/manage-token');
        }, 3000);
      }

    } catch (err: unknown) {
      const error = err as Error & { code?: string; details?: string; hint?: string };
      console.error('❌ Erreur complète:', err);
      console.error('❌ Type:', typeof err);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
      
      // Si c'est une erreur Supabase, afficher détails
      if (error.code) {
        console.error('❌ Code Supabase:', error.code);
        console.error('❌ Détails Supabase:', error.details);
        console.error('❌ Hint Supabase:', error.hint);
      }
      
      setNotification({
        type: 'error',
        message: error.message || 'Erreur lors de l\'enregistrement'
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
  const _checkVerificationAge = () => {
    if (!existingProfile?.verified || !existingProfile?.verified_at) return null;
    
    const verifiedDate = new Date(existingProfile.verified_at).getTime();
    const now = Date.now();
    const diffInDays = Math.floor((now - verifiedDate) / (1000 * 60 * 60 * 24));
    const diffInYears = diffInDays / 365;
    
    return diffInYears > 1 ? diffInDays : null;
  };

  // Confirmer les informations (met à jour verified_at)
  const _handleConfirmInformation = async () => {
    setConfirmingInfo(true);
    try {
      await ProfilService.updateProfil(address, {
        verified_at: new Date().toISOString()
      });
      
      // Recharger les données
      const updatedProfile = await ProfilService.getMyProfil(address);
      setExistingProfile(updatedProfile);
      
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

  // Envoyer un message à l'admin (avec type de message)
  const _handleSendMessage = async (messageText: string, messageType = 'verification') => {
    // Si pas de paramètre, utiliser newMessage (compatibilité)
    const text = messageText || newMessage;
    
    if (!text.trim()) {
      setNotification({
        type: 'error',
        message: 'Le message ne peut pas être vide'
      });
      return;
    }

    setSendingMessage(true);
    try {
      await ProfilService.addMessage(address, 'creator', text.trim(), messageType);
      
      // Recharger les données
      const updatedProfile = await ProfilService.getMyProfil(address);
      setExistingProfile(updatedProfile);
      
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
  const _handleDeleteProfil = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
  };

  const handleConfirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleConfirmDeleteStep2 = async () => {
    setDeleting(true);
    try {
      await ProfilService.deleteProfil(existingProfile?.id || '', address);
      
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
      <MobileLayout title={existingProfile ? "Modifier mon Profil" : "Référencer mon Profil"}>
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
    <MobileLayout title={existingProfile ? "Modifier mon Profil" : "Référencer mon Profil"}>
      <PageLayout hasBottomNav>
        <Stack spacing="md">
          <Card>
            <CardContent className="p-6">
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {existingProfile ? '🏡 Profil de mon établissement' : '🌱 Demander le référencement'}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {existingProfile 
                      ? 'Mettez à jour les informations de votre établissement dans l\'annuaire.'
                      : 'Remplissez ce formulaire pour apparaître dans l\'annuaire public des établissements.'}
                  </p>
                </div>
                {existingProfile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

         
          <form onSubmit={handleSubmit}>
            <Stack spacing="md">
              {/* Onglets de navigation */}
              <Card>
                <CardContent noPadding>
                  <Tabs
                    tabs={[
                      { id: 'profile', label: '🏡 Profil' },
                      { id: 'verification', label: '✅ Vérification' },
                      { id: 'tokens', label: '🪙 Mes Jetons' },
                      { id: 'security', label: '🔒 Sécurité' },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                  />
                </CardContent>
              </Card>

              {/* Contenu des onglets */}
              
              {/* ONGLET 1: PROFIL - Grid 2 colonnes avec tous les sub-tabs */}
              {activeTab === 'profile' && (
                <div className="manage-profile-grid">
                  {/* Colonne Gauche */}
                  <Stack spacing="md">
                    <InfosTab
                      formData={formData}
                      handleChange={handleChange}
                      existingProfile={existingProfile}
                      sensitiveFieldsChanged={sensitiveFieldsChanged}
                      productTags={productTags}
                      productInput={productInput}
                      setProductInput={setProductInput}
                      handleProductKeyDown={handleProductKeyDown}
                      removeProductTag={removeProductTag}
                      addProductTag={addProductTag}
                      productSuggestions={productSuggestions}
                      serviceTags={serviceTags}
                      serviceInput={serviceInput}
                      setServiceInput={setServiceInput}
                      handleServiceKeyDown={handleServiceKeyDown}
                      removeServiceTag={removeServiceTag}
                      addServiceTag={addServiceTag}
                      serviceSuggestions={serviceSuggestions}
                    />
                    <CertificationsTab
                      formData={formData}
                      handleChange={handleChange}
                      handleUrlBlur={handleUrlBlur}
                      openLink={openLink}
                    />
                  </Stack>

                  {/* Colonne Droite */}
                  <Stack spacing="md">
                    <LocationTab
                      formData={formData}
                      handleChange={handleChange}
                    />
                    <ContactTab
                      formData={formData}
                      handleChange={handleChange}
                      handleUrlBlur={handleUrlBlur}
                      openLink={openLink}
                      getSocialIcon={getSocialIcon}
                    />
                  </Stack>
                </div>
              )}

              {/* Bouton Enregistrer pour l'onglet Profil */}
              {activeTab === 'profile' && (
                <Card style={{ marginTop: '16px' }}>
                  <CardContent style={{ padding: '16px' }}>
                    <Button
                      type="submit"
                      disabled={submitting || !formData.profileName || !hasFormChanges}
                      variant="primary"
                      style={{
                        width: '100%',
                        height: '48px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        backgroundColor: hasFormChanges ? '#10b981' : '#cbd5e1',
                        borderColor: hasFormChanges ? '#10b981' : '#cbd5e1',
                        color: '#ffffff',
                        cursor: hasFormChanges ? 'pointer' : 'not-allowed',
                        opacity: hasFormChanges ? 1 : 0.6
                      }}
                    >
                      {submitting ? '⏳ Enregistrement...' : hasFormChanges ? '💾 Enregistrer les modifications' : '✓ Aucune modification'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ONGLET 2: VÉRIFICATION - Onglet principal dédié */}
              {activeTab === 'verification' && (
                <VerificationTab
                  formData={formData}
                  handleChange={handleChange}
                  existingProfiles={existingProfile}
                  sensitiveFieldsChanged={sensitiveFieldsChanged}
                  privacy={privacy}
                  handlePrivacyChange={handlePrivacyChange}
                  handleUrlBlur={handleUrlBlur}
                  openLink={openLink}
                  onRequestVerification={async (e) => {
                    if (e) e.preventDefault();
                    
                    const sensitiveChanges = checkSensitiveFields(true);
                    if (Array.isArray(sensitiveChanges) && sensitiveChanges.length > 0 && existingProfile?.verified) {
                      // Avertir l'utilisateur que la vérification sera perdue
                      setPendingSaveAction({ 
                        e: e ?? null, 
                        requestVerification: true,
                        sensitiveChanges 
                      });
                      setShowWarningModal(true);
                    } else {
                      // Sauvegarder directement avec demande de vérification
                      await performSave(e ?? null, true);
                    }
                  }}
                  onSaveWithoutVerification={async (e) => {
                    if (e) e.preventDefault();
                    
                    // Sauvegarde simple sans demande de vérification
                    // La logique de performSave gère automatiquement le changement de statut
                    await performSave(e ?? null, false);
                  }}
                />
              )}

              {/* ONGLET 3: MES JETONS LIÉS */}
              {activeTab === 'tokens' && (
                <TokensListTab
                  tokensWithStats={tokensWithStats}
                  togglingVisibility={togglingVisibility}
                  onToggleVisibility={handleToggleVisibility}
                  onRefresh={loadTokensWithStats}
                />
              )}

              {/* ONGLET 4: SÉCURITÉ & CONFIDENTIALITÉ */}
              {activeTab === 'security' && (
                <SecurityTab
                  existingProfiles={existingProfile}
                  togglingProfileStatus={togglingProfileStatus}
                  onToggleProfileStatus={handleToggleProfileStatus}
                  privacy={privacy}
                  formData={formData}
                  onPrivacyChange={async (field, value) => {
                    // Mettre à jour le state local immédiatement
                    setPrivacy(prev => ({ ...prev, [field]: value }));
                    
                    // Sauvegarder automatiquement dans la DB
                    try {
                      const updatedPrivacy = { ...privacy, [field]: value };
                      await ProfilService.updateProfil(address, {
                        certifications: {
                          ...existingProfile?.certifications,
                          hide_email: updatedPrivacy.hideEmail || false,
                          hide_phone: updatedPrivacy.hidePhone || false,
                          hide_company_id: updatedPrivacy.hideCompanyID || false,
                          hide_legal_rep: updatedPrivacy.hideLegalRep || false
                        }
                      });
                      
                      setNotification({
                        type: 'success',
                        message: 'Paramètres de confidentialité enregistrés'
                      });
                      
                      // Recharger le profil
                      const updatedProfile = await ProfilService.getMyProfil(address);
                      setExistingProfile(updatedProfile);
                    } catch (err) {
                      console.error('Erreur sauvegarde privacy:', err);
                      setNotification({
                        type: 'error',
                        message: 'Erreur lors de l\'enregistrement'
                      });
                      // Rollback le state local en cas d'erreur
                      setPrivacy(prev => ({ ...prev, [field]: !value }));
                    }
                  }}
                  onDeleteProfile={() => setShowDeleteModal(true)}
                />
              )}

              {/* Alertes système */}
              {/* Alerte suppression / Réactivation */}
                {existingProfile && existingProfile.status === 'deleted' && (
                  <Card style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
                    <CardContent className="p-6">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ fontSize: '2.5rem' }}>🗑️</div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '700', 
                            color: '#991b1b', 
                            marginBottom: '8px' 
                          }}>
                            Profil désactivé (Suppression logique)
                          </h3>
                          
                          <p style={{ color: '#7f1d1d', marginBottom: '16px', lineHeight: '1.5' }}>
                            Votre profil a été supprimé le <strong>
                              {new Date(existingProfile.deleted_at || existingProfile.updated_at || new Date().toISOString()).toLocaleDateString('fr-FR')}
                            </strong>.
                            <br/>
                            Vos données personnelles ont été effacées, mais l'historique technique est conservé pour des raisons de sécurité pendant 1 an (jusqu'au {
                              new Date(new Date(existingProfile.deleted_at || existingProfile.updated_at || new Date().toISOString()).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
                            }).
                          </p>

                          <div style={{ 
                            backgroundColor: 'rgba(255,255,255,0.6)', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            border: '1px solid #fca5a5',
                            marginBottom: '20px'
                          }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#7f1d1d', marginBottom: '4px' }}>
                              Raison :
                            </p>
                            <p style={{ fontSize: '0.9rem', color: '#991b1b' }}>
                              {existingProfile.deletion_reason || 'Non spécifiée'}
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                             <Button
                                onClick={async () => {
                                  if(!window.confirm("Voulez-vous réactiver votre profil ? Vous devrez remplir à nouveau vos informations.")) return;
                                  
                                  try {
                                    setLoading(true);
                                    await ProfilService.reactivateMyProfil(address);
                                    setNotification({ type: 'success', message: '✅ Profil réactivé ! Vous pouvez maintenant le compléter.' });
                                    // Force reload pour rafraîchir l'état complet
                                    window.location.reload();
                                  } catch (err) {
                                    console.error(err);
                                    setNotification({ type: 'error', message: 'Erreur lors de la réactivation' });
                                    setLoading(false);
                                  }
                                }}
                                style={{ 
                                  backgroundColor: '#fff', 
                                  color: '#dc2626', 
                                  border: '1px solid #dc2626' 
                                }}
                              >
                                ↩️ Annuler la suppression & Réactiver
                              </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Alerte profil masqué */}
                {existingProfile && existingProfile.status === 'hidden' && (
                  <Card>
                    <CardContent className="p-4 bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-400">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🚫</span>
                        <div className="flex-1">
                          <p className="text-sm text-orange-900 dark:text-orange-100 font-bold mb-2">
                            Profil temporairement masqué du directory
                          </p>
                          <p className="text-sm text-orange-800 dark:text-orange-200 bg-white dark:bg-gray-800 p-3 rounded border border-orange-200">
                            {existingProfile.deletion_reason || 'Votre profil a été masqué par l\'équipe de modération.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </Stack>
          </form>
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

export default ManageProfilePage;
