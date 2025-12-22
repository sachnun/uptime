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
  expectedBody?: string
  headers?: Record<string, string>
  dnsRecordType?: string
  interval: number
  timeout: number
  retries: number
  active: boolean
  screenshot?: string
  createdAt: string
  updatedAt?: string
  latestHeartbeat?: Heartbeat
  uptime: number
  avgResponseTime: number
}

export interface TestMonitorResult {
  success: boolean
  statusCode?: number
  responseTime?: number
  message?: string
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
  const limits = ref<{ used: number; limit: number } | null>(null)

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

  async function fetchLimits() {
    try {
      limits.value = await api.get('/api/monitors/limits')
    } catch {
      limits.value = null
    }
  }

  async function getMonitor(id: number): Promise<Monitor | null> {
    const cached = monitors.value.find(m => m.id === id)
    if (cached) return cached
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

  async function testMonitor(data: Partial<Monitor>): Promise<TestMonitorResult> {
    return await api.post('/api/monitors/test', data)
  }

  function $reset() {
    monitors.value = []
    loading.value = false
    error.value = null
    limits.value = null
  }

  return {
    monitors,
    loading,
    error,
    limits,
    fetchMonitors,
    fetchLimits,
    getMonitor,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    pauseMonitor,
    resumeMonitor,
    getHeartbeats,
    testMonitor,
    $reset,
  }
})
