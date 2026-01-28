import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_THEME = {
  language: 'en-US',
  primaryColor: '#4A453E',
  backgroundColor: '#FDFBF7',
  chatBgImage: null,
  bubbleCss: '',
};

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  updateTheme: () => {},
  resetTheme: () => {},
  t: (key) => key,
});

export function ThemeProvider({ children }) {
  const { t, i18n } = useTranslation();
  
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      const parsed = saved ? JSON.parse(saved) : {};
      // If no saved language, use i18n's language (which defaults to browser or stored i18nextLng)
      if (!parsed.language) {
        parsed.language = i18n.language || 'en-US';
      }
      return { ...DEFAULT_THEME, ...parsed };
    } catch (e) {
      return DEFAULT_THEME;
    }
  });

  // Sync theme.language with i18n.language on mount and update
  useEffect(() => {
    if (theme.language && theme.language !== i18n.language) {
      i18n.changeLanguage(theme.language);
    }
  }, [theme.language, i18n]);

  // Listen for i18n language changes and update theme state
  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      if (lng && lng !== theme.language) {
        setTheme(prev => ({ ...prev, language: lng }));
      }
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [theme.language, i18n]);

  useEffect(() => {
    localStorage.setItem('app_theme', JSON.stringify(theme));
    
    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-cream-900', theme.primaryColor);
    root.style.setProperty('--color-diary-bg', theme.backgroundColor);
    
    // Apply Bubble CSS
    let styleTag = document.getElementById('custom-bubble-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'custom-bubble-css';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = theme.bubbleCss || '';

  }, [theme]);

  const updateTheme = (updates) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };

  const resetTheme = () => {
    setTheme(prev => ({
      ...DEFAULT_THEME,
      language: prev.language // Preserve current language
    }));
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
