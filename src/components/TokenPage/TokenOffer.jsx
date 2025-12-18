import { useState, useEffect } from 'react';
import { Badge } from '../UI';
import { useEcashWallet } from '../../hooks/useEcashWallet';

/**
 * TokenOffer - Affiche le type d'offre du token (Variable/Fixe)
 * Récupère l'information directement depuis la blockchain
 * 
 * Un token est "Variable" s'il possède un mint baton (authPubkey défini)
 * Un token est "Fixe" s'il n'a pas de mint baton
 * 
 * @param {string} tokenId - ID du token à vérifier
 * @param {boolean} showIcon - Afficher l'icône (défaut: true)
 * @param {string} variant - Variante du badge (défaut: auto selon type)
 * @param {boolean} isCreator - Si l'utilisateur est créateur (affecte le style)
 */
const TokenOffer = ({ 
  tokenId, 
  showIcon = true,
  variant = null,
  isCreator = false 
}) => {
  const { wallet } = useEcashWallet();
  const [tokenType, setTokenType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTokenType = async () => {
      if (!wallet || !tokenId) {
        setLoading(false);
        return;
      }

      try {
        const tokenInfo = await wallet.getTokenInfo(tokenId);
        
        // Vérifier si le token a un mint baton (authPubkey)
        const hasAuthPubkey = !!tokenInfo?.genesisInfo?.authPubkey;
        const hasMintBaton = tokenInfo?.genesisInfo?.mintBatonVout !== undefined && 
                            tokenInfo?.genesisInfo?.mintBatonVout !== null;
        
        const isVariable = hasAuthPubkey || hasMintBaton;
        
        setTokenType(isVariable ? 'variable' : 'fixed');
      } catch (err) {
        console.warn(`⚠️ Impossible de vérifier le type de token ${tokenId}:`, err);
        // Par défaut, considérer comme fixe en cas d'erreur
        setTokenType('fixed');
      } finally {
        setLoading(false);
      }
    };

    checkTokenType();
  }, [wallet, tokenId]);

  if (loading) {
    return (
      <Badge variant="secondary">
        ⏳ Vérification...
      </Badge>
    );
  }

  if (!tokenType) {
    return (
      <Badge variant="secondary">
        ❓ Inconnu
      </Badge>
    );
  }

  const isVariable = tokenType === 'variable';
  
  // Déterminer la variante du badge
  let badgeVariant = variant;
  if (!badgeVariant) {
    if (isCreator) {
      badgeVariant = isVariable ? 'success' : 'secondary';
    } else {
      badgeVariant = 'secondary';
    }
  }

  return (
    <Badge variant={badgeVariant}>
      {showIcon && (isVariable ? '🔄 ' : '🔒 ')}
      {isVariable ? 'Variable' : 'Fixe'}
    </Badge>
  );
};

export default TokenOffer;
