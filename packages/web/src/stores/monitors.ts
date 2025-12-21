import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'

export interface Monitor {
  id: number
  name: string
  type: 'http' | 'https' | 'tcp' | 'dns'
  url?: string
  hostname?: string
  port?: number
  method?: string
  expectedStatus?: number
  dnsRecordType?: string
  interval: number
  timeout: number
  retries: number
  active: boolean
  createdAt: string
  updatedAt?: string
  latestHeartbeat?: Heartbeat
  uptime: number
  avgResponseTime: number
}

export interface Heartbeat {
  id: number
  monitorId: number
  status: boolean
  statusCode?: number
  responseTime?: number
  message?: string
  createdAt: string
}

export const useMonitorsStore = defineStore('monitors', () => {
  const monitors = ref<Monitor[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMonitors() {
    loading.value = true
    error.value = null
    try {
      monitors.value = await api.get('/api/monitors')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch monitors'
    } finally {
      loading.value = false
    }
  }

  async function getMonitor(id: number): Promise<Monitor | null> {
    try {
      return await api.get(`/api/monitors/${id}`)
    } catch {
      return null
    }
  }

  async function createMonitor(data: Partial<Monitor>) {
    const monitor = await api.post<Monitor>('/api/monitors', data)
    monitors.value.unshift(monitor)
    return monitor
  }

  async function updateMonitor(id: number, data: Partial<Monitor>) {
    const monitor = await api.put<Monitor>(`/api/monitors/${id}`, data)
    const index = monitors.value.findIndex(m => m.id === id)
    if (index !== -1) {
      monitors.value[index] = { ...monitors.value[index], ...monitor }
    }
    return monitor
  }

  async function deleteMonitor(id: number) {
    await api.delete(`/api/monitors/${id}`)
    monitors.value = monitors.value.filter(m => m.id !== id)
  }

  async function pauseMonitor(id: number) {
    await api.post(`/api/monitors/${id}/pause`)
    const monitor = monitors.value.find(m => m.id === id)
    if (monitor) monitor.active = false
  }

  async function resumeMonitor(id: number) {
    await api.post(`/api/monitors/${id}/resume`)
    const monitor = monitors.value.find(m => m.id === id)
    if (monitor) monitor.active = true
  }

  async function getHeartbeats(monitorId: number, hours = 24): Promise<Heartbeat[]> {
    return await api.get(`/api/heartbeats/${monitorId}?hours=${hours}`)
  }

  function $reset() {
    monitors.value = []
    loading.value = false
    error.value = null
  }

  return {
    monitors,
    loading,
    error,
    fetchMonitors,
    getMonitor,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    pauseMonitor,
    resumeMonitor,
    getHeartbeats,
    $reset,
  }
})
