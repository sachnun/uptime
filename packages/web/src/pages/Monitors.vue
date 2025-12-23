<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMonitorsStore } from '@/stores/monitors'
import { useLiveStatus } from '@/composables/useLiveStatus'
import MonitorCard from '@/components/MonitorCard.vue'
import StatusFeed from '@/components/StatusFeed.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, CheckCircle, XCircle, PauseCircle, BarChart3, RefreshCw, Radio, WifiOff } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const monitorsStore = useMonitorsStore()

const {
  isLive,
  isUpdating,
  timeSinceUpdate,
  refresh,
  toggle,
} = useLiveStatus(() => monitorsStore.fetchMonitors(), 10000)

const monitorStats = computed(() => {
  let up = 0, down = 0, paused = 0
  for (const m of monitorsStore.monitors) {
    if (!m.active) paused++
    else if (m.latestHeartbeat?.status === true) up++
    else if (m.latestHeartbeat?.status === false) down++
  }
  return { up, down, paused }
})

onMounted(() => {
  monitorsStore.fetchLimits()
})
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Monitors</h1>
          <Badge v-if="monitorsStore.limits" variant="secondary">
            {{ monitorsStore.limits.used }} / {{ monitorsStore.limits.limit }}
          </Badge>
        </div>
        <p class="text-muted-foreground text-sm sm:text-base">Monitor your services in real-time</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 mr-2">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                :class="cn('h-8 w-8', isLive && 'text-success')"
                @click="toggle"
              >
                <Radio v-if="isLive" class="h-4 w-4" />
                <WifiOff v-else class="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {{ isLive ? 'Live updates enabled' : 'Live updates disabled' }}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                :disabled="isUpdating"
                @click="refresh"
              >
                <RefreshCw :class="cn('h-4 w-4', isUpdating && 'animate-spin')" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span v-if="timeSinceUpdate">Updated {{ timeSinceUpdate }}</span>
              <span v-else>Refresh</span>
            </TooltipContent>
          </Tooltip>
          <span v-if="isLive" class="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Live
          </span>
        </div>
        <Button as-child class="w-full sm:w-auto">
          <RouterLink to="/monitors/new">
            <Plus class="h-4 w-4 mr-2" />
            Add Monitor
          </RouterLink>
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
      <Card>
        <CardContent class="p-3 sm:pt-6 sm:p-6">
          <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle class="h-5 w-5 sm:h-6 sm:w-6 text-success" />
            </div>
            <div class="text-center sm:text-left">
              <p class="text-xs sm:text-sm text-muted-foreground">Up</p>
              <p class="text-xl sm:text-2xl font-bold">{{ monitorStats.up }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-3 sm:pt-6 sm:p-6">
          <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-danger/10">
              <XCircle class="h-5 w-5 sm:h-6 sm:w-6 text-danger" />
            </div>
            <div class="text-center sm:text-left">
              <p class="text-xs sm:text-sm text-muted-foreground">Down</p>
              <p class="text-xl sm:text-2xl font-bold">{{ monitorStats.down }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-3 sm:pt-6 sm:p-6">
          <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-warning/10">
              <PauseCircle class="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
            </div>
            <div class="text-center sm:text-left">
              <p class="text-xs sm:text-sm text-muted-foreground">Paused</p>
              <p class="text-xl sm:text-2xl font-bold">{{ monitorStats.paused }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-if="monitorsStore.loading && monitorsStore.monitors.length === 0" class="space-y-4">
      <Card v-for="i in 3" :key="i" class="p-4">
        <div class="flex items-center gap-4">
          <Skeleton class="h-12 w-12 rounded-lg" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-[200px]" />
            <Skeleton class="h-3 w-[150px]" />
          </div>
          <div class="hidden sm:flex items-center gap-4">
            <Skeleton class="h-8 w-16" />
            <Skeleton class="h-8 w-20" />
          </div>
        </div>
      </Card>
    </div>

    <Card v-else-if="monitorsStore.monitors.length === 0" class="flex flex-col items-center justify-center py-12">
      <BarChart3 class="h-12 w-12 text-muted-foreground" />
      <h3 class="mt-4 text-lg font-medium">No monitors yet</h3>
      <p class="mt-2 text-muted-foreground">Get started by creating your first monitor.</p>
      <Button class="mt-4" as-child>
        <RouterLink to="/monitors/new">
          <Plus class="h-4 w-4 mr-2" />
          Add Monitor
        </RouterLink>
      </Button>
    </Card>

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-4">
        <MonitorCard
          v-for="monitor in monitorsStore.monitors"
          :key="monitor.id"
          :monitor="monitor"
        />
      </div>
      <div class="hidden lg:block">
        <StatusFeed :monitors="monitorsStore.monitors" :max-items="8" />
      </div>
    </div>
  </div>
</template>
