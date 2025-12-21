import { ref, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'uptime-theme'

const theme = ref<Theme>('system')
const isDark = ref(false)

function getSystemTheme(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function updateDarkClass() {
  if (theme.value === 'system') {
    isDark.value = getSystemTheme()
  } else {
    isDark.value = theme.value === 'dark'
  }

  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function setTheme(newTheme: Theme) {
  theme.value = newTheme
  localStorage.setItem(STORAGE_KEY, newTheme)
  updateDarkClass()
}

function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    theme.value = stored
  }
  updateDarkClass()

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') {
      updateDarkClass()
    }
  })
}

export function useDarkMode() {
  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    isDark,
    setTheme,
  }
}

export function initDarkMode() {
  initTheme()
}
