import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack } from '../components/UI';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { notificationAtom } from '../atoms';
import { profilService } from '../services/profilService';

const RequestListingPage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { wallet, address } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [formData, setFormData] = useState({
    profileName: '',
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
    companyid: '',
    governmentidverificationweblink: '',
    nationalcertification: '',
    nationalcertificationweblink: '',
    internationalcertification: '',
    internationalcertificationweblink: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadTokenInfo = async () => {
      if (!wallet || !tokenId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const info = await wallet.getTokenInfo(tokenId);
        setTokenInfo(info);
      } catch (err) {
        console.error('❌ Erreur chargement token:', err);
        setNotification({
          type: 'error',
          message: 'Impossible de charger les données du jeton'
        });
      } finally {
        setLoading(false);
      }
    };

    loadTokenInfo();
  }, [tokenId, wallet, setNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.profileName || !formData.description || !formData.email) {
      setNotification({
        type: 'error',
        message: 'Veuillez remplir tous les champs obligatoires'
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!address) {
        throw new Error('Wallet non connecté');
      }

      // Construire l'objet profile pour Supabase
      const profileData = {
        name: formData.profileName,
        description: formData.description,
        location_country: formData.country,
        location_region: formData.region,
        location_department: formData.department,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        image_url: formData.image || null,
        
        socials: {
          facebook: formData.facebook || null,
          instagram: formData.instagram || null,
          tiktok: formData.tiktok || null,
          youtube: formData.youtube || null,
          whatsapp: formData.whatsapp || null,
          telegram: formData.telegram || null,
          other_website: formData.otherWebsite || null
        },
        
        certifications: {
          siret: formData.companyid || null,
          siret_link: formData.governmentidverificationweblink || null,
          national: formData.nationalcertification || null,
          national_link: formData.nationalcertificationweblink || null,
          international: formData.internationalcertification || null,
          international_link: formData.internationalcertificationweblink || null
        },
        
        products: formData.products.split(',').map(p => p.trim()).filter(Boolean),
        services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
        
        tokens: [{
          tokenId: tokenId,
          ticker: tokenInfo?.genesisInfo?.tokenTicker || 'UNK',
          purpose: '',
          isVisible: true
        }],
        
        forceStatus: 'pending' // Demande en attente de validation admin
      };

      // Sauvegarder dans Supabase
      const savedProfile = await profilService.saveProfil(profileData, address);

      console.log('✅ Demande de listing enregistrée:', savedProfile);

      setNotification({
        type: 'success',
        message: '✅ Demande envoyée ! Elle sera examinée par un administrateur.'
      });

      // Rediriger vers la page de gestion après 1.5s
      setTimeout(() => navigate(`/manage-profile/${tokenId}`), 1500);

    } catch (err) {
      console.error('❌ Erreur:', err);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la génération de la demande'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Chargement...">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
            </CardContent>
          </Card>
        </PageLayout>
      </MobileLayout>
    );
  }

  const ticker = tokenInfo?.genesisInfo?.tokenTicker || 'UNK';
  const name = tokenInfo?.genesisInfo?.tokenName || 'Jeton Inconnu';

  return (
    <MobileLayout title="Demande de Listing">
      <PageLayout hasBottomNav className="max-w-2xl">
        <Stack spacing="md">
          
          {/* En-tête */}
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                📝 Demander le référencement
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ajoutez votre jeton <strong>{ticker}</strong> à l'annuaire public pour le rendre visible à tous les utilisateurs.
              </p>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Token ID</div>
                <div className="font-mono text-xs break-all text-gray-900 dark:text-white">
                  {tokenId}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire */}
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom de la ferme / exploitation *
                  </label>
                  <input
                    type="text"
                    value={formData.profileName}
                    onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                    placeholder="Ferme du Soleil"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Production bio de fruits et légumes..."
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Région
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      placeholder="Occitanie"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Département
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="34"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse postale
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Route des Champs, 34000 Montpellier"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email de contact *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@ferme.fr"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site web
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.ferme.fr"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL de l'image
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/logo.jpg"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Produits (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.products}
                    onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                    placeholder="Tomates, Salades, Pommes de terre"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Services (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.services}
                    onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                    placeholder="Vente directe, Livraison, Paniers bio"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
                      ℹ️ En cliquant sur "Soumettre", les informations seront copiées dans votre presse-papiers. 
                      Envoyez-les ensuite au mainteneur du projet pour validation.
                    </p>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? '⏳ Génération...' : '📋 Copier la demande'}
                </Button>

              </form>
            </CardContent>
          </Card>

          {/* Bouton Retour */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/token/${tokenId}`)}
          >
            ← Retour aux détails
          </Button>

        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default RequestListingPage;
