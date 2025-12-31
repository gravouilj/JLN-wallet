import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  hasBottomNav?: boolean;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, hasBottomNav = false, className = '' }) => {
  return (
    <div 
      className={`page-layout ${className}`}
      style={{
        paddingBottom: hasBottomNav ? '80px' : '20px',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #f8fafc)'
      }}
    >
      {children}
    </div>
  );
};

interface StackProps {
  children: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Stack: React.FC<StackProps> = ({ children, spacing = 'md', className = '' }) => {
  const gap = spacing === 'sm' ? '0.5rem' : spacing === 'lg' ? '1.5rem' : '1rem';
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </div>
  );
};

interface PageHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon = '', title, subtitle = '' }) => (
  <div style={{ padding: '1.5rem', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{title}</h1>
    {subtitle && <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>{subtitle}</p>}
  </div>
);