"use client"

import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/lib/theme'

export function AnimatedThemeToggler() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="theme-toggle"
    >
      <span className={`theme-icon ${theme === 'dark' ? 'on' : ''}`}>
        <Moon size={16} />
      </span>
      <span className={`theme-icon ${theme === 'light' ? 'on' : ''}`}>
        <Sun size={16} />
      </span>
    </button>
  )
}
