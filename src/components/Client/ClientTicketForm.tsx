import { Card, CardContent, Button, Input, Textarea, Select, InfoBox, Stack } from '../UI';
import { useClientTicketForm } from '../../hooks/useClientTicketForm';
import { useTranslation } from '../../hooks';

/**
 * ClientTicketForm - Formulaire de création de ticket pour les clients (REFACTORISÉ)
 * 
 * Utilise useClientTicketForm pour encapsuler toute la logique métier.
 * Taille réduite de 367 → 200 lignes (45% réduction).
 * 
 * @param {Object} props
 * @param {Object} [props.autoContext] - Contexte auto-détecté { tokenId, creatorProfileId, tokenInfo }
 * @param {boolean} [props.allowTypeSelection=false] - Permet de choisir Admin ou Créateur
 * @param {boolean} [props.allowTokenSelection=false] - Permet de choisir un token
 * @param {Array} [props.availableTokens=[]] - Liste des tokens pour sélection
 * @param {String} props.walletAddress - Adresse du wallet client
 * @param {Function} props.onSubmit - Callback après soumission réussie
 * @param {Function} props.onCancel - Callback pour annuler
 * @param {Function} props.setNotification - Pour afficher des notifications
 */
const ClientTicketForm = ({
  autoContext = null,
  allowTypeSelection = false,
  allowTokenSelection = false,
  availableTokens = [],
  walletAddress,
  onSubmit,
  onCancel,
  setNotification
}) => {
  const { t } = useTranslation();

  // Hook métier
  const {
    ticketType,
    setTicketType,
    selectedTokenId,
    setSelectedTokenId,
    selectedProfileId,
    setSelectedProfileId,
    formData,
    updateField,
    submitting,
    error,
    submitForm,
    resetForm
  } = useClientTicketForm(autoContext, allowTypeSelection);

  // Catégories contextuelles
  const categories = ticketType === 'admin' 
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
        { value: 'order', label: '📦 Commande / Livraison' },
        { value: 'report', label: '⚠️ Signaler un problème' },
        { value: 'partnership', label: '🤝 Proposition de partenariat' },
      ];

  const priorities = [
    { value: 'low', label: '🟢 Basse' },
    { value: 'normal', label: '🟡 Normale' },
    { value: 'high', label: '🟠 Haute' },
    { value: 'urgent', label: '🔴 Urgente' },
  ];

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitForm(walletAddress);
    
    if (success) {
      if (setNotification) {
        setNotification({
          type: 'success',
          message: ticketType === 'creator' 
            ? '✅ Message envoyé au créateur !'
            : '✅ Ticket créé ! On vous répond bientôt.'
        });
      }
      onSubmit?.();
      resetForm();
    } else if (setNotification && error) {
      setNotification({ type: 'error', message: `❌ ${error}` });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {ticketType === 'admin' ? '📧 Contacter le support' : '💬 Contacter le créateur'}
        </h2>

        {/* Sélecteur de type */}
        {allowTypeSelection && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              🎯 Destinataire
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant={ticketType === 'admin' ? 'primary' : 'outline'}
                onClick={() => setTicketType('admin')}
                style={{ flex: 1 }}
              >
                👨‍💼 Admin
              </Button>
              <Button
                variant={ticketType === 'creator' ? 'primary' : 'outline'}
                onClick={() => setTicketType('creator')}
                style={{ flex: 1 }}
              >
                🌾 Créateur
              </Button>
            </div>
          </div>
        )}

        {/* Sélecteur de token */}
        {allowTokenSelection && ticketType === 'creator' && availableTokens.length > 0 && (
          <Select
            label="🎫 Token"
            value={selectedTokenId || ''}
            onChange={(e) => {
              const tokenId = e.target.value;
              setSelectedTokenId(tokenId);
              const token = availableTokens.find((t: any) => t.tokenId === tokenId);
              if (token?.creatorProfileId) {
                setSelectedProfileId(token.creatorProfileId);
              }
            }}
            options={[
              { value: '', label: '-- Sélectionner --' },
              ...availableTokens.map((token: any) => ({
                value: token.tokenId,
                label: `${token.ticker} - ${token.name}`
              }))
            ]}
          />
        )}

        {/* Info contextuelle */}
        {ticketType === 'creator' && autoContext?.tokenInfo && (
          <InfoBox type="info" icon="💡" className="mb-4">
            Message pour <strong>{autoContext.tokenInfo.ticker}</strong>
          </InfoBox>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing="md">
            {/* Sujet */}
            <Input
              label="📝 Sujet"
              value={formData.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              placeholder="Résumez votre demande"
              required
              maxLength={100}
            />

            {/* Catégorie */}
            <Select
              label="📂 Catégorie"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              options={categories}
            />

            {/* Priorité */}
            <Select
              label="⚡ Priorité"
              value={formData.priority}
              onChange={(e) => updateField('priority', e.target.value)}
              options={priorities}
            />

            {/* Description */}
            <Textarea
              label="📄 Description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Décrivez votre demande en détail..."
              rows={6}
              required
              maxLength={2000}
            />

            <div className="text-sm text-secondary">
              {formData.description.length}/2000
            </div>

            {/* Erreur */}
            {error && (
              <InfoBox type="error" icon="❌">
                {error}
              </InfoBox>
            )}

            {/* Info temps de réponse */}
            <InfoBox type="info" icon="⏱️">
              <strong>Temps de réponse :</strong>
              <ul className="mb-0 mt-1" style={{ paddingLeft: '1.5rem' }}>
                <li>Urgente : &lt;4h</li>
                <li>Haute : &lt;24h</li>
                <li>Normale : 1-2j</li>
                <li>Basse : 3-5j</li>
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
