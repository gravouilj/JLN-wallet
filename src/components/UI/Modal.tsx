import React from 'react';

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const ModalMain: React.FC<ModalProps> = ({ children, isOpen = false, onClose, className = '' }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(2px)'
    }} onClick={onClose}>
      <div className={className} style={{
        background: 'var(--bg-primary, #fff)',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const Header: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '1.25rem', fontWeight: 'bold' }}>{children}</div>
);

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '1.5rem' }}>{children}</div>
);

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>{children}</div>
);

// On attache les sous-composants pour garder la syntaxe <Modal.Header>
export const Modal = Object.assign(ModalMain, {
  Header,
  Body,
  Footer
});