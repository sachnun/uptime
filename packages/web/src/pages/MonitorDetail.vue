<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useMonitorsStore, type Heartbeat } from '@/stores/monitors'
import { formatMs, formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { ArrowLeft, Loader2, Pause, Play, Pencil, Trash2, Clock, Activity, TrendingUp, Timer } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const monitorsStore = useMonitorsStore()

const loading = ref(true)
const heartbeats = ref<Heartbeat[]>([])

const monitorId = computed(() => parseInt(route.params.id as string))
const monitor = computed(() => monitorsStore.monitors.find(m => m.id === monitorId.value))

const status = computed(() => {
  if (!monitor.value?.active) return { text: 'Paused', variant: 'warning' as const, color: 'bg-warning' }
  if (monitor.value?.latestHeartbeat?.status === true) return { text: 'Up', variant: 'success' as const, color: 'bg-success' }
  if (monitor.value?.latestHeartbeat?.status === false) return { text: 'Down', variant: 'destructive' as const, color: 'bg-danger' }
  return { text: 'Pending', variant: 'secondary' as const, color: 'bg-muted-foreground' }
})

const displayedHeartbeats = computed(() => {
  const reversed = [...heartbeats.value].reverse()
  return reversed.slice(0, 90)
})

async function loadData() {
  loading.value = true
  await monitorsStore.fetchMonitors()
  
  if (monitor.value) {
    heartbeats.value = await monitorsStore.getHeartbeats(monitorId.value, 24)
  }
  loading.value = false
}

async function handlePause() {
  if (monitor.value?.active) {
    await monitorsStore.pauseMonitor(monitorId.value)
  } else {
    await monitorsStore.resumeMonitor(monitorId.value)
  }
}

async function handleDelete() {
  if (confirm('Are you sure you want to delete this monitor?')) {
    await monitorsStore.deleteMonitor(monitorId.value)
    router.push('/')
  }
}

onMounted(loadData)
watch(() => route.params.id, loadData)
</script>

<template>
  <div v-if="loading" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="!monitor" class="flex flex-col items-center justify-center py-12">
    <p class="text-muted-foreground">Monitor not found</p>
    <Button class="mt-4" variant="outline" as-child>
      <RouterLink to="/">Back to Monitors</RouterLink>
    </Button>
  </div>

  <div v-else>
    <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" as-child class="shrink-0">
          <RouterLink to="/">
            <ArrowLeft class="h-4 w-4" />
          </RouterLink>
        </Button>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <div :class="cn('h-3 w-3 rounded-full shrink-0', status.color)" />
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight truncate">{{ monitor.name }}</h1>
            <Badge :variant="status.variant">{{ status.text }}</Badge>
          </div>
          <p class="text-muted-foreground mt-1 text-sm sm:text-base truncate">
            {{ monitor.url || monitor.hostname }}
            <span v-if="monitor.port">:{{ monitor.port }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" @click="handlePause">
          <Pause v-if="monitor.active" class="h-4 w-4 sm:mr-2" />
          <Play v-else class="h-4 w-4 sm:mr-2" />
          <span class="hidden sm:inline">{{ monitor.active ? 'Pause' : 'Resume' }}</span>
        </Button>
        <Button variant="outline" size="sm" as-child>
          <RouterLink :to="`/monitors/${monitor.id}/edit`">
            <Pencil class="h-4 w-4 sm:mr-2" />
            <span class="hidden sm:inline">Edit</span>
          </RouterLink>
        </Button>
        <Button variant="destructive" size="sm" @click="handleDelete">
          <Trash2 class="h-4 w-4 sm:mr-2" />
          <span class="hidden sm:inline">Delete</span>
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-3">
            <Activity class="h-5 w-5 text-muted-foreground" />
            <div>
              <p class="text-sm text-muted-foreground">Status</p>
              <p class="text-lg font-semibold">{{ status.text }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-3">
            <TrendingUp class="h-5 w-5 text-muted-foreground" />
            <div>
              <p class="text-sm text-muted-foreground">Uptime (24h)</p>
              <p class="text-lg font-semibold">{{ monitor.uptime.toFixed(2) }}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-3">
            <Timer class="h-5 w-5 text-muted-foreground" />
            <div>
              <p class="text-sm text-muted-foreground">Avg Response</p>
              <p class="text-lg font-semibold">{{ formatMs(monitor.avgResponseTime) }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-3">
            <Clock class="h-5 w-5 text-muted-foreground" />
            <div>
              <p class="text-sm text-muted-foreground">Check Interval</p>
              <p class="text-lg font-semibold">{{ monitor.interval }}s</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Response Time (Last 24h)</CardTitle>
      </CardHeader>
      <CardContent>
          <div class="flex items-end gap-0.5 h-24">
          <div
            v-for="hb in displayedHeartbeats"
            :key="hb.id"
            :class="cn(
              'flex-1 min-w-[2px] sm:min-w-[3px] max-w-2 rounded-sm transition-all cursor-pointer',
              hb.status ? 'bg-success hover:bg-success/80' : 'bg-danger hover:bg-danger/80'
            )"
              :style="{ height: `${Math.min(100, Math.max(10, (hb.responseTime || 0) / 10))}%` }"
              :title="`${formatMs(hb.responseTime || 0)} - ${formatDate(hb.createdAt)}`"
            />
          </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Recent Events</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          <div
            v-for="hb in heartbeats.slice(0, 20)"
            :key="hb.id"
            class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4"
          >
            <div :class="cn('h-2.5 w-2.5 rounded-full shrink-0 hidden sm:block', hb.status ? 'bg-success' : 'bg-danger')" />
            <div class="flex-1 flex items-center gap-2 sm:block">
              <div :class="cn('h-2 w-2 rounded-full shrink-0 sm:hidden', hb.status ? 'bg-success' : 'bg-danger')" />
              <p class="text-sm font-medium">
                {{ hb.status ? 'Up' : 'Down' }}
                <span v-if="hb.statusCode" class="text-muted-foreground">({{ hb.statusCode }})</span>
              </p>
              <p class="text-sm text-muted-foreground">{{ hb.message }}</p>
            </div>
            <div class="text-right text-sm sm:text-right flex items-center gap-3 sm:block">
              <p class="font-medium">{{ formatMs(hb.responseTime || 0) }}</p>
              <p class="text-muted-foreground">{{ formatDate(hb.createdAt) }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
