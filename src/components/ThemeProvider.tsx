import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { themeAtom } from '../atoms';
import PropTypes from 'prop-types';

const ThemeProvider = ({ children }) => {
  const [theme] = useAtom(themeAtom);

  // Apply theme immediately on first render (before React hydration)
  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also add dark class to html element for legacy support
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Also apply theme class to body for any global styles that need it
    document.body.className = `theme-${theme}`;

    // Set meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
    } else {
      // Create meta theme-color if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
      document.head.appendChild(meta);
    }
    
    console.log('🎨 Theme applied:', theme);
  }, [theme]);

  return children;
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ThemeProvider;
