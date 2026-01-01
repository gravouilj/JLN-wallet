import { useState } from 'react';
import { Card, CardContent, Button, Input, Textarea, Select, InfoBox, Stack, Modal } from '../UI';
import { supabase } from '../../services/supabaseClient';

/**
 * CreatorTicketForm - Formulaire de création de ticket pour les créateurs
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Permet aux créateurs de contacter le support admin
 * 
 * @param {Object} props
 * @param {String} props.profilId - ID du profil créateur
 * @param {String} props.walletAddress - Adresse du wallet créateur
 * @param {Function} props.onSubmit - Callback après soumission réussie
 * @param {Function} props.onCancel - Callback pour annuler
 * @param {Function} props.setNotification - Fonction pour afficher les notifications
 */
const CreatorTicketForm = ({ 
  profilId,
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

  // Catégories pour créateurs
  const categories = [
    { value: 'question', label: '❓ Question générale' },
    { value: 'bug', label: '🐛 Signaler un bug' },
    { value: 'feature', label: '✨ Demande de fonctionnalité' },
    { value: 'verification', label: '✅ Question sur la vérification' },
    { value: 'account', label: '👤 Problème de compte' },
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
    if (formData.description.trim().length < 10) {
      setError('La description doit contenir au moins 10 caractères');
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
      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          type: 'creator',
          subject: formData.subject.trim(),
          category: formData.category,
          priority: formData.priority,
          description: formData.description.trim(),
          status: 'open',
          created_by: walletAddress || 'unknown',
          profile_id: profilId
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Notification de succès
      if (setNotification) {
        setNotification({
          type: 'success',
          message: 'Ticket créé avec succès ! Notre équipe vous répondra bientôt.'
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
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          ✉️ Nouveau ticket de support
        </h2>
        <p className="text-sm text-secondary mb-4">
          Contactez notre équipe pour toute question ou problème
        </p>

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
              disabled={submitting}
            />

            {/* Catégorie */}
            <Select
              label="📂 Catégorie"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              options={categories}
              disabled={submitting}
            />

            {/* Priorité */}
            <Select
              label="⚡ Priorité"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              options={priorities}
              disabled={submitting}
            />

            {/* Description */}
            <Textarea
              label="📄 Description détaillée"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Décrivez votre demande ou problème en détail..."
              rows={6}
              required
              maxLength={2000}
              disabled={submitting}
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
                {submitting ? '⏳ Envoi...' : '📤 Créer le ticket'}
              </Button>
            </div>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatorTicketForm;
