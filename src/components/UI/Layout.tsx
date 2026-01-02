import React from 'react';

// On importe les types HTML de base pour permettre le passage de style, className, onClick, etc.
// On évite React.FC (déprécié ou déconseillé en React 19) au profit d'un typage direct des props.

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hasBottomNav?: boolean;
}

export const PageLayout = ({ 
  children, 
  hasBottomNav = false, 
  className = '', 
  style,
  ...props // On récupère tous les autres attributs standards
}: PageLayoutProps) => {
  return (
    <div 
      className={`page-layout ${className}`}
      style={{
        paddingBottom: hasBottomNav ? '80px' : '20px',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #f8fafc)',
        ...style // On fusionne le style par défaut avec le style reçu en prop
      }}
      {...props} // On injecte les props (id, data-testid, etc.)
    >
      {children}
    </div>
  );
};

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spacing?: 'xs' | 'sm' | 'md' | 'lg'; // Ajout de 'xs' pour résoudre les erreurs TS
}

export const Stack = ({ 
  children, 
  spacing = 'md', 
  className = '', 
  style,
  ...props 
}: StackProps) => {
  // Calcul dynamique du gap
  const gapMap = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem'
  };
  
  const gap = gapMap[spacing];

  return (
    <div 
      className={className} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap,
        ...style 
      }}
      {...props}
    >
      {children}
    </div>
  );
};

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string;
  title: string;
  subtitle?: string;
}

export const PageHeader = ({ 
  icon = '', 
  title, 
  subtitle = '', 
  className = '',
  style,
  ...props 
}: PageHeaderProps) => (
  <div 
    className={`page-header ${className}`}
    style={{ 
      padding: '1.5rem', 
      background: 'var(--bg-secondary, #f8fafc)', 
      borderRadius: '12px', 
      marginBottom: '1.5rem', 
      border: '1px solid #e2e8f0',
      ...style
    }}
    {...props}
  >
    {icon && <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>}
    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{title}</h1>
    {subtitle && <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>{subtitle}</p>}
  </div>
);