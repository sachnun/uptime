<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMonitorsStore } from '@/stores/monitors'
import MonitorCard from '@/components/MonitorCard.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, CheckCircle, XCircle, PauseCircle, BarChart3, Loader2 } from 'lucide-vue-next'

const monitorsStore = useMonitorsStore()

const upMonitors = computed(() => monitorsStore.monitors.filter(m => m.latestHeartbeat?.status === true).length)
const downMonitors = computed(() => monitorsStore.monitors.filter(m => m.latestHeartbeat?.status === false).length)
const pausedMonitors = computed(() => monitorsStore.monitors.filter(m => !m.active).length)

onMounted(() => {
  monitorsStore.fetchMonitors()
  
  const interval = setInterval(() => {
    monitorsStore.fetchMonitors()
  }, 30000)

  return () => clearInterval(interval)
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p class="text-muted-foreground">Monitor your services in real-time</p>
      </div>
      <Button as-child>
        <RouterLink to="/monitors/new">
          <Plus class="h-4 w-4 mr-2" />
          Add Monitor
        </RouterLink>
      </Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle class="h-6 w-6 text-success" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Up</p>
              <p class="text-2xl font-bold">{{ upMonitors }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10">
              <XCircle class="h-6 w-6 text-danger" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Down</p>
              <p class="text-2xl font-bold">{{ downMonitors }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
              <PauseCircle class="h-6 w-6 text-warning" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Paused</p>
              <p class="text-2xl font-bold">{{ pausedMonitors }}</p>
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
