'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

function applyTheme(theme: ThemeMode) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
}

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<ThemeMode>('light');

    useEffect(() => {
        const saved = window.localStorage.getItem('theme');
        const initialTheme: ThemeMode = saved === 'dark' || saved === 'light'
            ? saved
            : window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';

        applyTheme(initialTheme);
        setTheme(initialTheme);
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    if (!mounted) {
        return (
            <button
                type="button"
                aria-label="Toggle theme"
                className="theme-toggle"
            >
                <span className="theme-toggle-icon">◐</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            className="theme-toggle"
        >
            <span className="theme-toggle-icon">{theme === 'light' ? '☾' : '☀'}</span>
        </button>
    );
}
