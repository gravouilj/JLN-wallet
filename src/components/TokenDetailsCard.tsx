import React, { useState, ChangeEvent, SyntheticEvent } from 'react';
import { Card, CardContent, Button, Badge, Switch, Input, Textarea } from './UI';
import { FarmService } from '../services/profilService';

/**
 * TokenDetailsCard - Carte détaillée d'un jeton
 * 
 * Affiche toutes les informations d'un jeton avec possibilité de modification
 * des objectifs et contreparties
 */

interface TokenData {
  tokenId: string;
  name?: string;
  ticker?: string;
  balance?: string;
  imageUrl?: string;
  purpose?: string;
  counterpart?: string;
  purpose_updated_at?: string;
  counterpart_updated_at?: string;
  isVariable?: boolean;
  isActive?: boolean;
  isVisible?: boolean;
  isLinked?: boolean;
}

interface TokenDetailsCardProps {
  token: TokenData;
  farmId?: string;
  onUpdate?: (token: TokenData) => void;
  onCopyTokenId?: (tokenId: string) => void;
  onToggleVisibility?: () => void;
  onToggleLinking?: () => void;
  togglingVisibility?: boolean;
  togglingLinking?: boolean;
}

const TokenDetailsCard: React.FC<TokenDetailsCardProps> = ({
  token,
  farmId,
  onUpdate,
  onCopyTokenId,
  onToggleVisibility,
  onToggleLinking,
  togglingVisibility = false,
  togglingLinking = false
}) => {
  const [editingPurpose, setEditingPurpose] = useState<boolean>(false);
  const [editingCounterpart, setEditingCounterpart] = useState<boolean>(false);
  const [purposeValue, setPurposeValue] = useState<string>(token.purpose || '');
  const [counterpartValue, setCounterpartValue] = useState<string>(token.counterpart || '');
  const [savingPurpose, setSavingPurpose] = useState<boolean>(false);
  const [savingCounterpart, setSavingCounterpart] = useState<boolean>(false);

  // Sauvegarder l'objectif
  const handleSavePurpose = async (): Promise<void> => {
    if (!farmId || !token.tokenId) return;
    
    setSavingPurpose(true);
    try {
      await FarmService.updateTokenMetadata(farmId, token.tokenId, {
        purpose: purposeValue,
        purpose_updated_at: new Date().toISOString()
      });
      
      setEditingPurpose(false);
      if (onUpdate) onUpdate({ ...token, purpose: purposeValue });
    } catch (err) {
      console.error('❌ Erreur sauvegarde objectif:', err);
    } finally {
      setSavingPurpose(false);
    }
  };

  // Sauvegarder la contrepartie
  const handleSaveCounterpart = async (): Promise<void> => {
    if (!farmId || !token.tokenId) return;
    
    setSavingCounterpart(true);
    try {
      await FarmService.updateTokenMetadata(farmId, token.tokenId, {
        counterpart: counterpartValue,
        counterpart_updated_at: new Date().toISOString()
      });
      
      setEditingCounterpart(false);
      if (onUpdate) onUpdate({ ...token, counterpart: counterpartValue });
    } catch (err) {
      console.error('❌ Erreur sauvegarde contrepartie:', err);
    } finally {
      setSavingCounterpart(false);
    }
  };

  // Formater la date de mise à jour
  const formatUpdateDate = (date: string | undefined): string => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* En-tête avec image et infos principales */}
        <div className="d-flex gap-4 align-items-start mb-4">
          {/* Image du jeton */}
          <img
            src={token.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(token.name || token.ticker)}&size=128&background=random`}
            alt={token.name}
            className="rounded-lg"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'cover',
              border: '2px solid var(--border-primary)'
            }}
            onError={(e: SyntheticEvent<HTMLImageElement>) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(token.name || token.ticker || 'UNK')}&size=128&background=random`;
            }}
          />

          {/* Nom, Ticker et Solde */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {token.name || 'Sans nom'}
            </h2>
            <div className="text-lg font-semibold text-uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
              {token.ticker || 'UNK'}
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Solde:</span>
              <span className="text-xl font-bold" style={{ color: 'var(--primary-color)' }}>
                {token.balance || '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Token ID et lien Explorer */}
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="d-flex justify-between align-items-center gap-2">
            <div className="flex-1 overflow-hidden">
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Token ID</div>
              <code className="text-sm font-mono" style={{ 
                color: 'var(--text-primary)',
                wordBreak: 'break-all'
              }}>
                {token.tokenId}
              </code>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopyTokenId && onCopyTokenId(token.tokenId)}
              >
                📋
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://explorer.e.cash/tx/${token.tokenId}`, '_blank')}
              >
                🔗
              </Button>
            </div>
          </div>
        </div>

        {/* Badges: Type et Circulation */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <Badge variant={token.isVariable ? 'primary' : 'warning'}>
            {token.isVariable ? '🔄 Variable' : '🔒 Fixe'}
          </Badge>
          <Badge variant={token.isActive ? 'success' : 'secondary'}>
            {token.isActive ? '🟢 En Circulation' : '⚫ Inactif'}
          </Badge>
          <Badge variant={token.isVisible ? 'primary' : 'secondary'}>
          {token.isVisible ? '👁️ Visible' : '🙈 Masqué'}
            </Badge>
            <Badge variant={token.isLinked ? 'primary' : 'secondary'}>
          {token.isLinked ? '🔗 Lié' : '🔗 Non lié'}
            </Badge>
        </div>


        {/* Objectif et Contrepartie - Grid 2 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Objectif */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="d-flex justify-between align-items-center mb-2">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                🎯 Objectif
              </h3>
              {!editingPurpose && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPurpose(true)}
                >
                  ✏️ Modifier
                </Button>
              )}
            </div>

            {editingPurpose ? (
              <>
                <Textarea
                  value={purposeValue}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPurposeValue(e.target.value)}
                  rows={4}
                  placeholder="Décrivez l'objectif de ce jeton..."
                  className="mb-2"
                />
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSavePurpose}
                    disabled={savingPurpose}
                    className="flex-1"
                  >
                    {savingPurpose ? '⏳ Sauvegarde...' : '✓ Sauvegarder'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPurposeValue(token.purpose || '');
                      setEditingPurpose(false);
                    }}
                    className="flex-1"
                  >
                    ✕ Annuler
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-2" style={{ 
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  minHeight: '3rem'
                }}>
                  {token.purpose || 'Aucun objectif défini'}
                </p>
                {token.purpose_updated_at && (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Mis à jour: {formatUpdateDate(token.purpose_updated_at)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Contrepartie */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="d-flex justify-between align-items-center mb-2">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                🎁 Contrepartie
              </h3>
              {!editingCounterpart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCounterpart(true)}
                >
                  ✏️ Modifier
                </Button>
              )}
            </div>

            {editingCounterpart ? (
              <>
                <Textarea
                  value={counterpartValue}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCounterpartValue(e.target.value)}
                  rows={4}
                  placeholder="Décrivez la contrepartie offerte..."
                  className="mb-2"
                />
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCounterpart}
                    disabled={savingCounterpart}
                    className="flex-1"
                  >
                    {savingCounterpart ? '⏳ Sauvegarde...' : '✓ Sauvegarder'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCounterpartValue(token.counterpart || '');
                      setEditingCounterpart(false);
                    }}
                    className="flex-1"
                  >
                    ✕ Annuler
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-2" style={{ 
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  minHeight: '3rem'
                }}>
                  {token.counterpart || 'Aucune contrepartie définie'}
                </p>
                {token.counterpart_updated_at && (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Mis à jour: {formatUpdateDate(token.counterpart_updated_at)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenDetailsCard;
