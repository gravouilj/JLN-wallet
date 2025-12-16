import { useState } from 'react';
import { Card, CardContent, Button, Input, Textarea, Select, InfoBox, Stack } from '../UI';
import { supabase } from '../../services/supabaseClient';

/**
 * ClientTicketForm - Formulaire de création de ticket pour les clients
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Permet aux clients de :
 * - Envoyer un ticket à l'admin global
 * - Envoyer un ticket au créateur d'un token spécifique
 * 
 * @param {Object} props
 * @param {String} props.type - Type de destinataire: 'admin' ou 'creator'
 * @param {String} props.tokenId - ID du token (requis si type='creator')
 * @param {String} props.profilId - ID du profil (optionnel si type='creator')
 * @param {String} props.walletAddress - Adresse du wallet client
 * @param {Function} props.onSubmit - Callback après soumission réussie
 * @param {Function} props.onCancel - Callback pour annuler
 */
const ClientTicketForm = ({ 
  type = 'admin', 
  tokenId = null,
  profilId = null,
  walletAddress,
  onSubmit,
  onCancel,
  setNotification
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    category: 'question',
    priority: 'normal',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Catégories selon le type
  const categories = type === 'admin' 
    ? [
        { value: 'question', label: '❓ Question générale' },
        { value: 'bug', label: '🐛 Signaler un bug' },
        { value: 'feature', label: '✨ Demande de fonctionnalité' },
        { value: 'payment', label: '💳 Problème de paiement' },
        { value: 'account', label: '👤 Problème de compte' },
      ]
    : [
        { value: 'question', label: '❓ Question sur le token' },
        { value: 'support', label: '🆘 Demande de support' },
        { value: 'report', label: '⚠️ Signaler un problème' },
        { value: 'partnership', label: '🤝 Proposition de partenariat' },
      ];

  const priorities = [
    { value: 'low', label: '🟢 Basse' },
    { value: 'normal', label: '🟡 Normale' },
    { value: 'high', label: '🟠 Haute' },
    { value: 'urgent', label: '🔴 Urgente' },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.subject.trim()) {
      setError('Le sujet est requis');
      return false;
    }
    if (formData.subject.trim().length < 5) {
      setError('Le sujet doit contenir au moins 5 caractères');
      return false;
    }
    if (!formData.description.trim()) {
      setError('La description est requise');
      return false;
    }
    if (formData.description.trim().length < 20) {
      setError('La description doit contenir au moins 20 caractères');
      return false;
    }
    if (type === 'creator' && !tokenId) {
      setError('Token ID manquant');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');

    try {
      // Données du ticket selon le schéma SQL
      const ticketData = {
        type: type === 'creator' ? 'creator' : 'client', // 'creator' pour client→créateur avec token_id
        subject: formData.subject.trim(),
        category: formData.category,
        priority: formData.priority,
        description: formData.description.trim(),
        status: 'open',
        created_by: walletAddress || 'anonymous',
      };

      // Ajouter les identifiants selon le type
      if (type === 'creator') {
        ticketData.token_id = tokenId; // Token concerné par le ticket
        ticketData.farm_id = profilId; // Profil du créateur
      }

      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Notification de succès
      if (setNotification) {
        setNotification({
          type: 'success',
          message: type === 'creator' 
            ? 'Message envoyé au créateur avec succès !' 
            : 'Ticket créé avec succès ! Notre équipe vous répondra bientôt.'
        });
      }

      // Réinitialiser le formulaire
      setFormData({
        subject: '',
        category: 'question',
        priority: 'normal',
        description: ''
      });

      // Callback de succès
      if (onSubmit) {
        onSubmit(ticket);
      }

    } catch (err) {
      console.error('Erreur création ticket:', err);
      const errorMessage = err.message || 'Erreur lors de la création du ticket';
      setError(errorMessage);
      
      if (setNotification) {
        setNotification({
          type: 'error',
          message: errorMessage
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {type === 'admin' ? '📧 Contacter le support' : '💬 Contacter le créateur'}
        </h2>

        {type === 'creator' && (
          <InfoBox type="info" icon="💡" className="mb-4">
            Votre message sera envoyé directement au créateur de ce token. 
            Il recevra une notification et pourra vous répondre rapidement.
          </InfoBox>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing="md">
            {/* Sujet */}
            <Input
              label="📝 Sujet"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Résumez votre demande en quelques mots"
              required
              maxLength={100}
            />

            {/* Catégorie */}
            <Select
              label="📂 Catégorie"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              options={categories}
            />

            {/* Priorité */}
            <Select
              label="⚡ Priorité"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              options={priorities}
            />

            {/* Description */}
            <Textarea
              label="📄 Description détaillée"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Décrivez votre demande en détail..."
              rows={6}
              required
              maxLength={2000}
            />

            <div className="text-sm text-secondary">
              {formData.description.length}/2000 caractères
            </div>

            {/* Erreur */}
            {error && (
              <InfoBox type="error" icon="❌">
                {error}
              </InfoBox>
            )}

            {/* Info temps de réponse */}
            <InfoBox type="info" icon="⏱️">
              <strong>Temps de réponse estimé :</strong>
              <ul className="mb-0 mt-1" style={{ paddingLeft: '1.5rem' }}>
                <li>Urgente : sous 4 heures</li>
                <li>Haute : sous 24 heures</li>
                <li>Normale : 1-2 jours ouvrés</li>
                <li>Basse : 3-5 jours ouvrés</li>
              </ul>
            </InfoBox>

            {/* Boutons */}
            <div className="d-flex gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  disabled={submitting}
                >
                  Annuler
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !formData.subject.trim() || !formData.description.trim()}
                className="flex-1"
              >
                {submitting ? 'Envoi...' : '📤 Envoyer'}
              </Button>
            </div>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};

export default ClientTicketForm;
