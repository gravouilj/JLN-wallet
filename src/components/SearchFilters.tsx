import React, { useState, ChangeEvent, FocusEvent } from 'react';
import { Button } from './UI';
import { useTranslation } from '../hooks/useTranslation';

/**
 * SearchFilters - Composant de recherche et filtrage générique
 * 
 * Conforme au STYLING_GUIDE.md :
 * - Utilise les classes utilitaires (d-flex, gap-*, mb-*, etc.)
 * - Variables CSS pour les couleurs
 * - Responsive et accessible
 */

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  id: string;
  label: string;
  value: string;
  options?: FilterOption[];
  onChange?: (value: string) => void;
  icon?: string;
}

interface SearchFiltersProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  leftActions?: React.ReactNode;
  searchPlaceholder?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery = '',
  onSearchChange,
  filters = [],
  onClearAll,
  hasActiveFilters = false,
  leftActions = null,
  searchPlaceholder = 'Rechercher...'
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="search-filters-wrapper" style={{
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Search Bar + Left Actions */}
      <div className="d-flex align-center gap-3 mb-4">
        {/* Left Actions (ex: bouton favoris) */}
        {leftActions && (
          <div className="search-filters-left-actions">
            {leftActions}
          </div>
        )}
        
        {/* Search Input */}
        <div className="search-filters-input-wrapper flex-1" style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span className="search-filters-icon" style={{
            position: 'absolute',
            left: '12px',
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            pointerEvents: 'none'
          }}>
            🔍
          </span>
          <input
            type="text"
            className="search-filters-input"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange?.(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 40px 12px 44px',
              fontSize: '0.95rem',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              outline: 'none'
            }}
            onFocus={(e: FocusEvent<HTMLInputElement>) => {
              e.target.style.borderColor = 'var(--accent-primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e: FocusEvent<HTMLInputElement>) => {
              e.target.style.borderColor = 'var(--border-primary)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              className="search-filters-clear cursor-pointer hover-opacity"
              onClick={() => onSearchChange?.('')}
              aria-label="Effacer la recherche"
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                color: 'var(--text-secondary)',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Toggle Filters Button (mobile) */}
        {filters.length > 0 && (
          <button
            className="search-filters-toggle cursor-pointer hover-lift"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: 'none', // Visible seulement sur mobile via media query
              padding: '10px 14px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {isExpanded ? '🔼 Masquer' : '🔽 Filtres'}
          </button>
        )}
      </div>

      {/* Filters Grid */}
      {filters.length > 0 && isExpanded && (
        <div 
          className="search-filters-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: hasActiveFilters ? '16px' : 0
          }}
        >
          {filters.map((filter) => (
            <div key={filter.id} className="search-filters-item">
              <select
                className="search-filters-select"
                value={filter.value}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => filter.onChange?.(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 12px',
                  fontSize: '0.9rem',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e: FocusEvent<HTMLSelectElement>) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e: FocusEvent<HTMLSelectElement>) => e.target.style.borderColor = 'var(--border-primary)'}
              >
                <option value="all">
                  {filter.icon} {filter.label}
                </option>
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Button */}
      {hasActiveFilters && (
        <div className="d-flex justify-center">
          <Button
            variant="ghost"
            onClick={onClearAll}
            style={{
              fontSize: '0.85rem',
              padding: '6px 16px',
              color: 'var(--text-secondary)'
            }}
          >
            <span style={{ marginRight: '6px' }}>✕</span>
            {t('directory.clearAllFilters') || 'Réinitialiser les filtres'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
