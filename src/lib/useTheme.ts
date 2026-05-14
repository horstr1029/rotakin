'use client';
import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('rk-theme') as 'dark' | 'light' | null;
    const initial = stored ?? 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function applyTheme(t: 'dark' | 'light') {
    const html = document.documentElement;
    if (t === 'light') {
      html.classList.add('light');
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
      html.classList.remove('light');
    }
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('rk-theme', next);
  }

  return { theme, toggle };
}
