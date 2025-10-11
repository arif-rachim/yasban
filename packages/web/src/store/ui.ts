import { atom } from 'jotai';

// UI state atoms

export const themeAtom = atom<'light' | 'dark' | 'system'>('system');

export const sidebarOpenAtom = atom(true);

export const activeModalAtom = atom<string | null>(null);

export const toastAtom = atom<{
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
} | null>(null);

// Derived atoms
export const effectiveThemeAtom = atom((get) => {
  const theme = get(themeAtom);
  if (theme === 'system') {
    // Check system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }
  return theme;
});
