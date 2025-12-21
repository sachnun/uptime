<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Frown, CheckCircle, XCircle, AlertCircle } from 'lucide-vue-next'

interface MonitorStatus {
  id: number
  name: string
  status: boolean | null
  uptime: number
  heartbeats: Array<{
    id: number
    status: boolean
    createdAt: string
  }>
}

interface StatusPageData {
  title: string
  description?: string
  theme: 'light' | 'dark' | 'auto'
  monitors: MonitorStatus[]
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const loading = ref(true)
const error = ref('')
const data = ref<StatusPageData | null>(null)

const overallStatus = computed(() => {
  if (!data.value?.monitors.length) return null
  const allUp = data.value.monitors.every(m => m.status === true)
  const someDown = data.value.monitors.some(m => m.status === false)
  if (allUp) return 'operational'
  if (someDown) return 'degraded'
  return 'unknown'
})

const statusConfig = {
  operational: { text: 'All Systems Operational', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500' },
  degraded: { text: 'Partial System Outage', icon: XCircle, color: 'text-red-600', bg: 'bg-red-500' },
  unknown: { text: 'Status Unknown', icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-400' },
}

const effectiveTheme = computed(() => {
  if (!data.value) return 'light'
  if (data.value.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return data.value.theme
})

async function fetchStatus() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`/api/public/status/${slug.value}`)
    if (!response.ok) {
      error.value = response.status === 404 ? 'Status page not found' : 'Failed to load status page'
      return
    }
    data.value = await response.json()
  } catch (e) {
    error.value = 'Failed to load status page'
  } finally {
    loading.value = false
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

onMounted(fetchStatus)
</script>

<template>
  <div :class="cn('min-h-screen transition-colors', effectiveTheme === 'dark' ? 'dark bg-background' : 'bg-background')">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-screen">
      <Frown class="h-16 w-16 text-muted-foreground" />
      <h1 class="text-2xl font-bold mt-4">{{ error }}</h1>
    </div>

    <div v-else-if="data" class="max-w-4xl mx-auto px-4 py-12">
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold">{{ data.title }}</h1>
        <p v-if="data.description" class="mt-2 text-muted-foreground">
          {{ data.description }}
        </p>
      </div>

      <Card v-if="overallStatus" class="mb-8">
        <CardContent class="py-6">
          <div class="flex items-center justify-center gap-3">
            <component :is="statusConfig[overallStatus].icon" :class="cn('h-6 w-6', statusConfig[overallStatus].color)" />
            <span :class="cn('text-xl font-semibold', statusConfig[overallStatus].color)">
              {{ statusConfig[overallStatus].text }}
            </span>
          </div>
        </CardContent>
      </Card>

      <div class="space-y-4">
        <Card v-for="monitor in data.monitors" :key="monitor.id" class="p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                :class="cn(
                  'h-3 w-3 rounded-full',
                  monitor.status === true ? 'bg-green-500' : monitor.status === false ? 'bg-red-500' : 'bg-gray-400'
                )"
              />
              <span class="font-medium">{{ monitor.name }}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-muted-foreground">
                {{ monitor.uptime.toFixed(2) }}% uptime
              </span>
              <Badge
                :variant="monitor.status === true ? 'success' : monitor.status === false ? 'destructive' : 'secondary'"
              >
                {{ monitor.status === true ? 'Operational' : monitor.status === false ? 'Down' : 'Unknown' }}
              </Badge>
            </div>
          </div>

          <div class="flex items-center gap-0.5 h-8">
            <div
              v-for="hb in monitor.heartbeats.slice(0, 90)"
              :key="hb.id"
              :class="cn(
                'flex-1 h-full rounded-sm transition-all',
                hb.status ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
              )"
              :title="`${hb.status ? 'Up' : 'Down'} - ${formatTime(hb.createdAt)}`"
            />
            <div
              v-for="i in Math.max(0, 90 - monitor.heartbeats.length)"
              :key="`empty-${i}`"
              class="flex-1 h-full rounded-sm bg-muted"
            />
          </div>
          <div class="flex justify-between mt-2">
            <span class="text-xs text-muted-foreground">90 days ago</span>
            <span class="text-xs text-muted-foreground">Today</span>
          </div>
        </Card>
      </div>

      <div class="text-center mt-12 text-sm text-muted-foreground">
        <p>Powered by Uptime</p>
      </div>
    </div>
  </div>
</template>
