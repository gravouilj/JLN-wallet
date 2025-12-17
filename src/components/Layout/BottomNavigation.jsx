import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const BottomNavigation = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const navItems = [
      { 
      path: '/wallet', 
      icon: '🤝',
      label: t('navigation.wallet'), 
      ariaLabel: t('navigation.wallet') + ' page' 
    },
    { 
      path: '/', 
      icon: '🧑‍🌾',
      label: t('navigation.directory'), 
      ariaLabel: t('navigation.directory') + ' page' 
    },
    { 
      path: '/settings', 
      icon: '⚙️',
      label: t('navigation.settings'), 
      ariaLabel: t('navigation.settings') + ' page' 
    }
  ];

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="bottom-navigation">
      {navItems.map((item) => {
        const isActive = currentPath === item.path;
        return (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className={`nav-item accessible-focus ${isActive ? 'active' : ''}`}
            aria-label={item.ariaLabel}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNavigation;
