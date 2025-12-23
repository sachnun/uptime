import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDarkMode } from '@/lib/darkMode'

export interface ShortcutHandler {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  handler: () => void
  description: string
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const { isDark, setTheme } = useDarkMode()
  const commandPaletteOpen = ref(false)
  const sequenceBuffer = ref('')
  let sequenceTimer: ReturnType<typeof setTimeout> | null = null

  const shortcuts: ShortcutHandler[] = [
    {
      key: 'k',
      ctrl: true,
      handler: () => { commandPaletteOpen.value = true },
      description: 'Open command palette',
    },
    {
      key: 'k',
      meta: true,
      handler: () => { commandPaletteOpen.value = true },
      description: 'Open command palette (Mac)',
    },
  ]

  const sequenceShortcuts: Record<string, () => void> = {
    'gm': () => router.push('/'),
    'gn': () => router.push('/notifications'),
    'gs': () => router.push('/status-pages'),
    'gd': () => router.push('/docs'),
    'ge': () => router.push('/settings'),
  }

  const singleKeyShortcuts: Record<string, () => void> = {
    'n': () => router.push('/monitors/new'),
    't': () => setTheme(isDark.value ? 'light' : 'dark'),
    '?': () => { commandPaletteOpen.value = true },
  }

  function isInputFocused(): boolean {
    const active = document.activeElement
    if (!active) return false
    const tagName = active.tagName.toLowerCase()
    return tagName === 'input' || tagName === 'textarea' || (active as HTMLElement).isContentEditable
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isInputFocused() && !e.ctrlKey && !e.metaKey) return

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true
      const metaMatch = shortcut.meta ? e.metaKey : true
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      
      if (e.key.toLowerCase() === shortcut.key && ctrlMatch && metaMatch && shiftMatch) {
        e.preventDefault()
        shortcut.handler()
        return
      }
    }

    if (isInputFocused()) return

    if (singleKeyShortcuts[e.key]) {
      e.preventDefault()
      singleKeyShortcuts[e.key]()
      return
    }

    if (sequenceTimer) {
      clearTimeout(sequenceTimer)
    }

    sequenceBuffer.value += e.key.toLowerCase()
    
    const matchedSequence = Object.keys(sequenceShortcuts).find(
      seq => seq === sequenceBuffer.value
    )

    if (matchedSequence) {
      e.preventDefault()
      sequenceShortcuts[matchedSequence]()
      sequenceBuffer.value = ''
      return
    }

    const hasPartialMatch = Object.keys(sequenceShortcuts).some(
      seq => seq.startsWith(sequenceBuffer.value)
    )

    if (!hasPartialMatch) {
      sequenceBuffer.value = ''
    } else {
      sequenceTimer = setTimeout(() => {
        sequenceBuffer.value = ''
      }, 1000)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    if (sequenceTimer) {
      clearTimeout(sequenceTimer)
    }
  })

  return {
    commandPaletteOpen,
  }
}
