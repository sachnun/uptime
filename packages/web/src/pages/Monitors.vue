<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMonitorsStore } from '@/stores/monitors'
import MonitorCard from '@/components/MonitorCard.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, CheckCircle, XCircle, PauseCircle, BarChart3, Loader2 } from 'lucide-vue-next'

const monitorsStore = useMonitorsStore()

const monitorStats = computed(() => {
  let up = 0, down = 0, paused = 0
  for (const m of monitorsStore.monitors) {
    if (!m.active) paused++
    else if (m.latestHeartbeat?.status === true) up++
    else if (m.latestHeartbeat?.status === false) down++
  }
  return { up, down, paused }
})

let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  monitorsStore.fetchMonitors()
  interval = setInterval(() => {
    monitorsStore.fetchMonitors()
  }, 30000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Monitors</h1>
        <p class="text-muted-foreground text-sm sm:text-base">Monitor your services in real-time</p>
      </div>
      <Button as-child class="w-full sm:w-auto">
        <RouterLink to="/monitors/new">
          <Plus class="h-4 w-4 mr-2" />
          Add Monitor
        </RouterLink>
      </Button>
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

    <div v-if="monitorsStore.loading && monitorsStore.monitors.length === 0" class="flex flex-col items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
      <p class="mt-4 text-muted-foreground">Loading monitors...</p>
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

    <div v-else class="space-y-3">
      <MonitorCard
        v-for="monitor in monitorsStore.monitors"
        :key="monitor.id"
        :monitor="monitor"
      />
    </div>
  </div>
</template>
