import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack } from '../components/UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useFarms } from '../hooks/useFarms';
import { notificationAtom } from '../atoms';
import { FarmService } from '../services/farmService';

const ManageFarmPage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
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
    address: '',
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

  // Recharger les données quand on revient sur la page
  useEffect(() => {
    if (address && wallet && tokenId) {
      // Recharger la ferme depuis Supabase pour voir les modifications
      FarmService.getMyFarm(address).then(farm => {
        if (farm) {
          setExistingFarm(farm);
          console.log('🔄 Ferme rechargée:', farm);
        }
      }).catch(err => {
        console.error('❌ Erreur rechargement ferme:', err);
      });
    }
  }, [address, wallet, tokenId, farms]); // Se déclenche quand farms change (après refreshFarms)

  useEffect(() => {
    const loadData = async () => {
      if (!wallet || !tokenId || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Charger les infos du token
        const info = await wallet.getTokenInfo(tokenId);
        setTokenInfo(info);

        // Charger la ferme depuis Supabase (Cloud)
        const farm = await FarmService.getMyFarm(address);
        console.log('📊 Ferme récupérée depuis Supabase:', farm);
        console.log('🔑 Address utilisée:', address);
        
        if (farm) {
          console.log('✅ Farm trouvée, pré-remplissage du formulaire...');
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
            address: farm.address || '',
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Champs toujours obligatoires
    if (!formData.farmName || !formData.description || !formData.email || !formData.address) {
      setNotification({
        type: 'error',
        message: 'Veuillez remplir tous les champs obligatoires (Nom, Description, Email, Adresse)'
      });
      return;
    }
    
    // Validation renforcée si demande de vérification (status = pending)
    const requestingVerification = existingFarm?.verification_status === 'unverified';
    if (requestingVerification) {
      const missingFields = [];
      if (!formData.companyid) missingFields.push('SIRET/Company ID');
      if (!formData.governmentidverificationweblink) missingFields.push('Lien de vérification SIRET');
      if (!formData.phone) missingFields.push('Téléphone');
      
      if (missingFields.length > 0) {
        setNotification({
          type: 'error',
          message: `Pour demander la vérification, veuillez remplir : ${missingFields.join(', ')}`
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Construire l'objet ferme compatible Supabase
      const farmData = {
        name: formData.farmName,
        description: formData.description,
        location_country: formData.country,
        location_region: formData.region,
        location_department: formData.department,
        address: formData.address,
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
          international_link: formData.internationalcertificationweblink || null
        },
        
        products: formData.products.split(',').map(p => p.trim()).filter(Boolean),
        services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
        
        // Tokens (JSONB Array)
        tokens: [{
          tokenId: tokenId,
          ticker: tokenInfo?.genesisInfo?.tokenTicker || 'UNK',
          purpose: formData.tokenPurpose || '',
          isVisible: true
        }]
      };

      // Sauvegarder dans Supabase (Cloud)
      const savedFarm = await FarmService.saveFarm(farmData, address);
      
      console.log('✅ Ferme sauvegardée sur Supabase:', savedFarm);
      console.log('☁️ Accessible depuis n\'importe quel appareil avec:', address);

      setNotification({
        type: 'success',
        message: existingFarm 
          ? '✅ Ferme mise à jour avec succès !'
          : '✅ Ferme enregistrée ! Elle apparaîtra dans l\'annuaire après vérification.'
      });

      // Navigation différée
      setTimeout(() => {
        navigate('/manage-token');
      }, 1500);

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
        message: `Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`
      });
    } finally {
      setSubmitting(false);
    }
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

          {/* TABLEAU RÉCAPITULATIF DES TOKENS */}
          {existingFarm && existingFarm.tokens && existingFarm.tokens.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  🪙 Les Jetons de mon Etablissement
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left p-3 font-semibold">Ticker</th>
                        <th className="text-left p-3 font-semibold">Nom</th>
                        <th className="text-left p-3 font-semibold">Objectif</th>
                        <th className="text-left p-3 font-semibold">Contrepartie</th>
                        <th className="text-center p-3 font-semibold">Visible</th>
                        <th className="text-center p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingFarm.tokens.map((token, index) => (
                        <tr key={token.tokenId || index} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {token.ticker || 'N/A'}
                          </td>
                          <td className="p-3 text-gray-900 dark:text-white">
                            {token.tokenName || 'Sans nom'}
                          </td>
                          <td className="p-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {token.purpose || (
                              <span className="text-gray-400 italic">Non défini</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {token.counterpart || (
                              <span className="text-gray-400 italic">Non définie</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {token.isVisible !== false ? (
                              <span className="text-green-600">👁️ Oui</span>
                            ) : (
                              <span className="text-gray-400">🙈 Non</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/token/${token.tokenId}`)}
                            >
                              Modifier
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    💡 <strong>Info :</strong> Le Ticker et le Nom du jeton ne sont pas modifiables car récupérés sur la blockchain. 
                    Pour modifier l'objectif du jeton, sa contrepartie ou sa visibilité, cliquez sur "Modifier" 
                    pour accéder à la page de détails du jeton.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing="md">
              {/* Informations principales */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4">📋 Informations principales</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nom de la ferme <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="farmName"
                        value={formData.farmName}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Ferme Bio du Soleil"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        rows="4"
                        placeholder="Décrivez votre ferme, vos valeurs, vos pratiques..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Produits (séparés par des virgules)
                      </label>
                      <input
                        type="text"
                        name="products"
                        value={formData.products}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Légumes bio, Œufs, Miel"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Services (séparés par des virgules)
                      </label>
                      <input
                        type="text"
                        name="services"
                        value={formData.services}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Vente directe, Livraison, Visite ferme"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Objectif du token associé
                      </label>
                      <input
                        type="text"
                        name="tokenPurpose"
                        value={formData.tokenPurpose || ''}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Points de fidélité, Accès premium, etc."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Décrivez l'utilité du token {tokenInfo?.genesisInfo?.tokenTicker || 'de votre ferme'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Localisation */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4">📍 Localisation</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Pays</label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Région</label>
                      <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Occitanie"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Département</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Haute-Garonne"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Adresse complète <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: 123 Chemin des Champs, 31000 Toulouse"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Affichée dans l'annuaire public
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4">📞 Contact</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="contact@maferme.fr"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Téléphone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Site web principal</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="https://maferme.fr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Autre site web</label>
                      <input
                        type="url"
                        name="otherWebsite"
                        value={formData.otherWebsite}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="https://boutique.maferme.fr"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Réseaux sociaux */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4">🌐 Réseaux sociaux</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Facebook</label>
                      <input
                        type="url"
                        name="facebook"
                        value={formData.facebook}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="https://facebook.com/maferme"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Instagram</label>
                      <input
                        type="text"
                        name="instagram"
                        value={formData.instagram}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="@maferme"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">TikTok</label>
                      <input
                        type="text"
                        name="tiktok"
                        value={formData.tiktok}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="@maferme"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">YouTube</label>
                      <input
                        type="url"
                        name="youtube"
                        value={formData.youtube}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="https://youtube.com/@maferme"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">WhatsApp</label>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="+33612345678"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Telegram</label>
                      <input
                        type="text"
                        name="telegram"
                        value={formData.telegram}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="@maferme"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4">🏆 Certifications</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">SIRET / Company ID</label>
                      <input
                        type="text"
                        name="companyid"
                        value={formData.companyid}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="12345678901234"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Lien de vérification SIRET</label>
                      <input
                        type="url"
                        name="governmentidverificationweblink"
                        value={formData.governmentidverificationweblink}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="https://annuaire-entreprises.data.gouv.fr/..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Requis pour la vérification
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Représentant légal</label>
                      <input
                        type="text"
                        name="legalRepresentative"
                        value={formData.legalRepresentative}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Jean Dupont"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Recommandé pour la vérification
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Certification nationale (AB, etc.)</label>
                      <input
                        type="text"
                        name="nationalcertification"
                        value={formData.nationalcertification}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Agriculture Biologique"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Lien certification nationale</label>
                      <input
                        type="url"
                        name="nationalcertificationweblink"
                        value={formData.nationalcertificationweblink}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Certification internationale</label>
                      <input
                        type="text"
                        name="internationalcertification"
                        value={formData.internationalcertification}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Ex: Ecocert, Demeter"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Lien certification internationale</label>
                      <input
                        type="url"
                        name="internationalcertificationweblink"
                        value={formData.internationalcertificationweblink}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex flex-col gap-3">
                {/* Bouton de demande de vérification (si ferme existe et non vérifiée) */}
                {existingFarm && !existingFarm.verified && existingFarm.verificationStatus !== 'pending' && existingFarm.verificationStatus !== 'info_requested' && (
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        // Forcer le statut 'pending' dans Supabase
                        await FarmService.saveFarm(
                          { ...existingFarm, forceStatus: 'pending' }, 
                          address
                        );
                        
                        setNotification({
                          type: 'success',
                          message: '✅ Demande de vérification envoyée ! Votre ferme est en attente de validation par l\'administrateur.'
                        });
                        
                        // Recharger les données
                        const updatedFarm = await FarmService.getMyFarm(address);
                        setExistingFarm(updatedFarm);
                      } catch (err) {
                        console.error('❌ Erreur demande vérification:', err);
                        setNotification({
                          type: 'error',
                          message: `Erreur: ${err.message || 'Erreur lors de la demande de vérification'}`
                        });
                      }
                    }}
                    variant="primary"
                    fullWidth
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  >
                    ✅ Demander la vérification
                  </Button>
                )}
                
                {/* Message admin visible en haut */}
                {existingFarm && existingFarm.admin_message && (
                  <Card>
                    <CardContent className="p-4 bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">💬</span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-bold mb-2">
                            📢 Message de l'administrateur
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded border border-orange-200">
                            {existingFarm.admin_message}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                            ⚠️ Veuillez corriger les informations demandées ci-dessous, puis cliquez sur "💾 Enregistrer" pour soumettre une nouvelle demande de vérification.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
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
                
                {/* Statut de vérification */}
                {existingFarm && existingFarm.verificationStatus === 'pending' && (
                  <Card>
                    <CardContent className="p-4 bg-yellow-50 dark:bg-yellow-950/30">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        ⏳ Vérification en attente
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Votre demande de vérification est en cours de traitement par l'équipe Farm Wallet.
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {existingFarm && existingFarm.verified && (
                  <Card>
                    <CardContent className="p-4 bg-green-50 dark:bg-green-950/30">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        ✅ Ferme vérifiée
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Votre ferme est vérifiée et apparaît dans l'annuaire public.
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => navigate('/manage-token')}
                    variant="outline"
                    fullWidth
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    variant="primary"
                    fullWidth
                  >
                    {submitting ? '⌛ Enregistrement...' : '💾 Enregistrer'}
                  </Button>
                </div>
                
                {existingFarm && existingFarm.verification_status === 'pending' && (
                  <Card>
                    <CardContent className="p-4 bg-yellow-50 dark:bg-yellow-950/30">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⏳ Votre demande de validation est en attente d'examen par un administrateur.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    ℹ️ <strong>Note :</strong> Après enregistrement, cliquez sur "Demander la validation" 
                    pour que votre ferme apparaisse dans l'annuaire public après validation.
                  </p>
                </CardContent>
              </Card>
            </Stack>
          </form>
        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default ManageFarmPage;
