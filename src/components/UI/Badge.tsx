import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'primary';
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', style }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    primary: { bg: '#dbeafe', text: '#1e40af' },
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef9c3', text: '#854d0e' },
    danger: { bg: '#fee2e2', text: '#991b1b' },
    neutral: { bg: '#f3f4f6', text: '#374151' },
    info: { bg: '#e0f2fe', text: '#075985' }
  };
  const currentStyle = colors[variant] || colors.neutral;

  return (
    <span className={className} style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: currentStyle.bg,
      color: currentStyle.text,
      whiteSpace: 'nowrap',
      ...style
    }}>
      {children}
    </span>
  );
};