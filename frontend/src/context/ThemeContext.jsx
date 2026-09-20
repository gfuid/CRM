import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      // Respect explicit manual user choice if set
      const manualChoice = localStorage.getItem('crm_theme_manual');
      if (manualChoice === 'dark') {
        return 'dark';
      }
      if (manualChoice === 'light') {
        return 'light';
      }
      // If user hasn't explicitly chosen dark, clear legacy auto-dark preference
      localStorage.removeItem('crm_theme');
      localStorage.removeItem('crm_theme_mode');
    } catch {
      // Fallback
    }
    // Default strictly to clean, luminous Light Mode
    return 'light';
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
      }
      localStorage.setItem('crm_theme', theme);
      localStorage.setItem('crm_theme_mode', theme);
    } catch (e) {
      console.warn('Could not persist theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('crm_theme_manual', next);
        localStorage.setItem('crm_theme', next);
      } catch {}
      return next;
    });
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      try {
        localStorage.setItem('crm_theme_manual', newTheme);
        localStorage.setItem('crm_theme', newTheme);
      } catch {}
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
