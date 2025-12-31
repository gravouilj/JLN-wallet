import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style = {} }) => (
  <div 
    className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}
    style={{ ...style }}
  >
    {children}
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '', noPadding = false }) => (
  <div className={`card-content ${className}`} style={{ padding: noPadding ? '0' : '24px' }}>
    {children}
  </div>
);