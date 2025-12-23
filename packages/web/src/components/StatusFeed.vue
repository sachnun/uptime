<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Monitor } from '@/stores/monitors'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpCircle, ArrowDownCircle, PauseCircle, Clock } from 'lucide-vue-next'

interface StatusEvent {
  id: string
  monitorId: number
  monitorName: string
  type: 'up' | 'down' | 'paused' | 'resumed'
  message?: string
  timestamp: Date
}

const props = defineProps<{
  monitors: Monitor[]
  maxItems?: number
}>()

const statusEvents = computed(() => {
  const events: StatusEvent[] = []
  
  for (const monitor of props.monitors) {
    if (monitor.latestHeartbeat) {
      events.push({
        id: `${monitor.id}-${monitor.latestHeartbeat.id}`,
        monitorId: monitor.id,
        monitorName: monitor.name,
        type: monitor.latestHeartbeat.status ? 'up' : 'down',
        message: monitor.latestHeartbeat.message || undefined,
        timestamp: new Date(monitor.latestHeartbeat.createdAt),
      })
    }
  }
  
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  
  return events.slice(0, props.maxItems || 10)
})

const eventConfig = {
  up: { 
    icon: ArrowUpCircle, 
    color: 'text-success',
    bg: 'bg-success/10',
    label: 'Up'
  },
  down: { 
    icon: ArrowDownCircle, 
    color: 'text-danger',
    bg: 'bg-danger/10',
    label: 'Down'
  },
  paused: { 
    icon: PauseCircle, 
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Paused'
  },
  resumed: { 
    icon: ArrowUpCircle, 
    color: 'text-success',
    bg: 'bg-success/10',
    label: 'Resumed'
  },
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-base flex items-center gap-2">
        <Clock class="h-4 w-4" />
        Recent Activity
      </CardTitle>
    </CardHeader>
    <CardContent class="p-0">
      <div v-if="statusEvents.length === 0" class="px-4 pb-4 text-center text-sm text-muted-foreground">
        No recent activity
      </div>
      <div v-else class="divide-y">
        <RouterLink
          v-for="event in statusEvents"
          :key="event.id"
          :to="`/monitors/${event.monitorId}`"
          class="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
        >
          <div :class="cn('flex h-8 w-8 items-center justify-center rounded-full', eventConfig[event.type].bg)">
            <component :is="eventConfig[event.type].icon" :class="cn('h-4 w-4', eventConfig[event.type].color)" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ event.monitorName }}</p>
            <p class="text-xs text-muted-foreground truncate">
              {{ event.message || eventConfig[event.type].label }}
            </p>
          </div>
          <span class="text-xs text-muted-foreground whitespace-nowrap">
            {{ formatRelativeTime(event.timestamp) }}
          </span>
        </RouterLink>
      </div>
    </CardContent>
  </Card>
</template>
