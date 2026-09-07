import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Light or dark, and nothing else.
 *
 * The app deliberately does NOT follow `prefers-color-scheme`: it always starts
 * light, so the landing page looks the same for everyone the first time they
 * see it. The switch then stores an explicit choice for that browser.
 *
 * `<html>` carries `data-theme` in the static markup in index.html, so the
 * default needs no JavaScript at all and cannot flash.
 */
export type ThemeChoice = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'trustpay.theme.v1';

export const DEFAULT_THEME: ThemeChoice = 'light';

/** Never throws: Safari in private mode throws on localStorage access. */
export function readStoredTheme(): ThemeChoice {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(choice: ThemeChoice) {
  document.documentElement.setAttribute('data-theme', choice);
}

type ThemeContextValue = {
  theme: ThemeChoice;
  setTheme: (choice: ThemeChoice) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // A locked-down browser still gets a working switch for this session.
    }
    // Keep the address-bar / OS chrome colour in step with the ground colour.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#140a2b' : '#f4f4f4');
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
