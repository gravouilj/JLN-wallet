import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button, Badge, InfoBox, VisibilityToggle, Stack } from '../../UI';
import CreateTokenModal from '../CreateTokenModal';
import ImportTokenModal from '../ImportTokenModal';

/**
 * TokensListTab - Liste des jetons associés au profil
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Affiche tous les tokens liés au profil de la ferme avec possibilité
 * de gérer leur visibilité dans le profil public.
 * 
 * @param {Object} props
 * @param {Array} props.tokensWithStats - Liste des tokens avec statistiques
 * @param {Object} props.togglingVisibility - État du toggle par token
 * @param {Function} props.onToggleVisibility - Callback toggle visibilité (tokenId, field='isVisible')
 * @param {Function} props.onRefresh - Callback refresh liste
 */
const TokensListTab = ({ 
  tokensWithStats = [], 
  togglingVisibility = {},
  onToggleVisibility,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filtrer pour afficher uniquement les tokens liés (isLinked !== false)
  const linkedTokens = tokensWithStats.filter(token => token.isLinked !== false);

  // Formater l'offre avec décimales
  const formatSupply = (supply, decimals = 0) => {
    if (!supply) return '0';
    try {
      const num = BigInt(supply);
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      const remainder = num % divisor;
      
      if (remainder === 0n) return whole.toString();
      
      const decimal = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
      return decimal ? `${whole}.${decimal}` : whole.toString();
    } catch {
      return supply.toString();
    }
  };

  return (
    <Stack spacing="md">
      <Card>
        <CardContent className="p-6">
          <div className="d-flex justify-between align-center mb-4">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                🪙 Jetons associés à mon profil
              </h2>
              <p className="text-sm text-secondary">
                Gérez la visibilité de vos jetons dans votre profil public
              </p>
            </div>
          </div>

          {tokensWithStats.length === 0 ? (
            <InfoBox type="info" icon="💡">
              <strong>Aucun jeton associé</strong><br />
              Créez ou importez un jeton pour commencer à l'utiliser dans votre ferme.
            </InfoBox>
          ) : linkedTokens.length === 0 ? (
            <InfoBox type="warning" icon="⚠️">
              <strong>Aucun jeton lié</strong><br />
              Vous avez des jetons mais aucun n'est lié à votre profil. Activez le switch "Lié au profil" pour les afficher.
            </InfoBox>
          ) : (
            <div 
              className="tokens-table-container"
              style={{
                overflowX: 'auto',
                marginBottom: '1rem'
              }}
            >
              <table 
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Jeton
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Ticker
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'right',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Détenteurs
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Type
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Visible
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Lié au profil
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linkedTokens.map((token, index) => (
                    <tr 
                      key={token.tokenId}
                      style={{ 
                        borderBottom: index < linkedTokens.length - 1 ? '1px solid var(--border-primary)' : 'none',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px' }}>
                        <div className="d-flex align-center gap-2">
                          <img
                            src={token.image || 'https://placehold.co/32x32?text=Token'}
                            alt={token.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid var(--border-primary)'
                            }}
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/32x32?text=Token';
                            }}
                          />
                          <span 
                            style={{ 
                              fontWeight: '500',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {token.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ 
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace'
                        }}>
                          {token.ticker}
                        </strong>
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: 'var(--text-primary)',
                        fontWeight: '600'
                      }}>
                        👥 {token.holdersCount || 0}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <Badge variant={token.isVariable ? 'success' : 'secondary'}>
                          {token.isVariable ? '🔄 Variable' : '🔒 Fixe'}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <VisibilityToggle
                          isVisible={token.isVisible !== false}
                          onChange={() => onToggleVisibility(token.tokenId)}
                          disabled={togglingVisibility[token.tokenId]}
                          labelVisible="Visible"
                          labelHidden="Masqué"
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <VisibilityToggle
                          isVisible={token.isLinked !== false}
                          onChange={() => onToggleVisibility(token.tokenId, 'isLinked')}
                          disabled={togglingVisibility[token.tokenId]}
                          labelVisible="Lié"
                          labelHidden="Non lié"
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/token/${token.tokenId}`)}
                        >
                          Gérer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info sur les tokens */}
      <InfoBox type="info" icon="💡">
        <strong>À savoir :</strong><br />
        • <strong>Visible/Masqué :</strong> Contrôle l'affichage du jeton sur votre profil public<br />
        • <strong>Lié/Non lié :</strong> Les jetons non liés ne sont pas inclus dans les demandes de vérification envoyées aux administrateurs
      </InfoBox>

      {/* Modals */}
      <CreateTokenModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(tokenData) => {
          console.log('Token créé:', tokenData);
          setShowCreateModal(false);
          onRefresh?.();
        }}
      />

      <ImportTokenModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          setShowImportModal(false);
          onRefresh?.();
        }}
      />
    </Stack>
  );
};

export default TokensListTab;
