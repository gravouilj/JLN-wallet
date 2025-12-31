import React from 'react';

interface BalanceContent {
  subtitle: string;
  label: string;
  value: string | number;
  conversion?: number;
}

interface BalanceCardProps {
  leftContent: BalanceContent;
  rightContent: BalanceContent;
  onRightClick?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ leftContent, rightContent, onRightClick }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: '1rem',
    padding: '1.5rem',
    background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    marginBottom: '20px'
  }}>
    <div>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>{leftContent.subtitle}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{leftContent.label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color, #0074e4)' }}>{leftContent.value}</div>
    </div>
    <div style={{ backgroundColor: '#e2e8f0' }} />
    <div onClick={onRightClick} style={{ cursor: onRightClick ? 'pointer' : 'default', textAlign: 'right' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>{rightContent.subtitle}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{rightContent.label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color, #0074e4)' }}>{rightContent.value}</div>
      {rightContent.conversion !== undefined && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>≈ {rightContent.conversion.toFixed(2)}</div>}
    </div>
  </div>
);