import React from 'react';
import { Card, CardContent } from './Card';

// --- ActionBar ---
interface ActionBarProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({ title, children, variant = 'default', className = '' }) => {
  const styles: Record<string, { bg: string; border: string }> = {
    default: { bg: '#f9fafb', border: '#e5e7eb' },
    primary: { bg: '#eff6ff', border: '#3b82f6' },
    danger: { bg: '#fef2f2', border: '#ef4444' },
    success: { bg: '#f0fdf4', border: '#16a34a' }
  };
  const style = styles[variant] || styles.default;
  
  return (
    <div className={className} style={{
      padding: '1rem',
      backgroundColor: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: '12px',
      marginTop: '1rem'
    }}>
      {title && <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>{title}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
};

// --- Accordion ---
interface AccordionProps {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ title, badge, children, defaultOpen = false, variant = 'default', className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  const variants: Record<string, any> = {
    default: { bg: '#f0f9ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#16a34a', text: '#166534' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }
  };
  const style = variants[variant] || variants.default;
  
  return (
    <div className={className} style={{ marginBottom: '1.5rem' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '1.25rem',
          backgroundColor: style.bg,
          border: `2px solid ${style.border}`,
          borderRadius: '12px',
          fontSize: '1.125rem',
          fontWeight: 700,
          color: style.text,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        <span style={{ fontSize: '1rem', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span style={{ flex: 1 }}>{title}</span>
        {badge && <div style={{ marginLeft: 'auto' }}>{badge}</div>}
      </button>
      
      {isOpen && (
        <Card style={{ marginTop: '0.5rem', backgroundColor: style.bg, borderColor: style.border, animation: 'fadeIn 0.2s ease-in' }}>
          <CardContent>{children}</CardContent>
        </Card>
      )}
    </div>
  );
};