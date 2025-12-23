import { ref, computed } from 'vue'

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

const toasts = ref<Toast[]>([])
const TOAST_LIMIT = 5

export function useToast() {
  const visibleToasts = computed(() => toasts.value.slice(-TOAST_LIMIT))

  function toast(options: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2)
    const duration = options.duration ?? 4000

    toasts.value.push({ ...options, id })

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }

    return id
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function dismissAll() {
    toasts.value = []
  }

  return {
    toasts: visibleToasts,
    toast,
    dismiss,
    dismissAll,
  }
}
