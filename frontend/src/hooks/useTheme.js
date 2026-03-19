import { useState } from 'react'

export default function useTheme() {
  const [theme, setTheme] = useState(() => document.body.classList.contains('light') ? 'light' : 'dark')

  function toggleTheme() {
    document.body.classList.toggle('light')
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggleTheme }
}
