import { ref, computed, watch, onMounted } from 'vue'

export interface LiveStatusConfig {
  enabled: boolean
  interval: number
  lastUpdate: Date | null
  isUpdating: boolean
}

export function useLiveStatus(fetchFn: () => Promise<void>, intervalMs = 10000) {
  const isLive = ref(true)
  const isUpdating = ref(false)
  const lastUpdate = ref<Date | null>(null)
  const error = ref<string | null>(null)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const timeSinceUpdate = computed(() => {
    if (!lastUpdate.value) return null
    const seconds = Math.floor((Date.now() - lastUpdate.value.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  })

  async function refresh() {
    if (isUpdating.value) return
    isUpdating.value = true
    error.value = null
    try {
      await fetchFn()
      lastUpdate.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
    } finally {
      isUpdating.value = false
    }
  }

  function startPolling() {
    if (intervalId) return
    intervalId = setInterval(refresh, intervalMs)
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function toggle() {
    isLive.value = !isLive.value
  }

  watch(isLive, (enabled) => {
    if (enabled) {
      refresh()
      startPolling()
    } else {
      stopPolling()
    }
  }, { immediate: true })

  onMounted(() => {
    return () => stopPolling()
  })

  return {
    isLive,
    isUpdating,
    lastUpdate,
    timeSinceUpdate,
    error,
    refresh,
    toggle,
    startPolling,
    stopPolling,
  }
}
