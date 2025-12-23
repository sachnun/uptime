<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMonitorsStore, type Monitor } from '@/stores/monitors'
import { formatMs } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Activity, Globe, Server, Wifi, Play, Pause, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  monitor: Monitor
}>()

const monitorsStore = useMonitorsStore()
const isToggling = ref(false)

const status = computed(() => {
  if (!props.monitor.active) return 'paused'
  if (props.monitor.latestHeartbeat?.status === true) return 'up'
  if (props.monitor.latestHeartbeat?.status === false) return 'down'
  return 'pending'
})

const statusConfig = {
  up: { bg: 'bg-success', text: 'Up', variant: 'success' as const },
  down: { bg: 'bg-danger', text: 'Down', variant: 'destructive' as const },
  paused: { bg: 'bg-warning', text: 'Paused', variant: 'warning' as const },
  pending: { bg: 'bg-muted-foreground', text: 'Pending', variant: 'secondary' as const },
}

const typeIcons = {
  http: Globe,
  https: Globe,
  tcp: Server,
  dns: Wifi,
}

const monitorTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    http: 'HTTP',
    https: 'HTTPS',
    tcp: 'TCP',
    dns: 'DNS',
  }
  return labels[props.monitor.type] || props.monitor.type.toUpperCase()
})

const uptimeColor = computed(() => {
  const uptime = props.monitor.uptime
  if (uptime >= 99) return 'text-success'
  if (uptime >= 95) return 'text-warning'
  return 'text-danger'
})

async function toggleMonitor(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (isToggling.value) return
  
  isToggling.value = true
  try {
    if (props.monitor.active) {
      await monitorsStore.pauseMonitor(props.monitor.id)
    } else {
      await monitorsStore.resumeMonitor(props.monitor.id)
    }
  } finally {
    isToggling.value = false
  }
}
</script>

<template>
  <RouterLink :to="`/monitors/${monitor.id}`">
    <Card class="p-4 hover:border-primary/50 transition-colors cursor-pointer group">
      <div class="flex items-center gap-4">
        <div v-if="monitor.screenshot" class="hidden md:block shrink-0">
          <img 
            :src="monitor.screenshot" 
            :alt="monitor.name" 
            class="w-24 h-14 object-cover rounded border border-border"
          />
        </div>
        <div :class="cn('h-2.5 w-2.5 rounded-full shrink-0', statusConfig[status].bg, monitor.screenshot && 'md:hidden')" />
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-medium truncate">{{ monitor.name }}</h3>
            <Badge variant="secondary" class="text-xs">
              <component :is="typeIcons[monitor.type] || Activity" class="h-3 w-3 mr-1" />
              {{ monitorTypeLabel }}
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground truncate">
            {{ monitor.url || monitor.hostname }}
            <span v-if="monitor.port">:{{ monitor.port }}</span>
          </p>
        </div>

        <div class="flex items-center gap-4 text-sm">
          <div class="text-right hidden sm:block">
            <p class="text-muted-foreground text-xs">Response</p>
            <p class="font-medium">{{ formatMs(monitor.avgResponseTime) }}</p>
          </div>
          <div class="text-right hidden sm:block">
            <p class="text-muted-foreground text-xs">Uptime</p>
            <p :class="cn('font-medium', uptimeColor)">
              {{ monitor.uptime.toFixed(2) }}%
            </p>
          </div>
          <Badge :variant="statusConfig[status].variant">
            {{ statusConfig[status].text }}
          </Badge>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                :disabled="isToggling"
                @click="toggleMonitor"
              >
                <Loader2 v-if="isToggling" class="h-4 w-4 animate-spin" />
                <Play v-else-if="!monitor.active" class="h-4 w-4 text-success" />
                <Pause v-else class="h-4 w-4 text-warning" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {{ monitor.active ? 'Pause monitor' : 'Resume monitor' }}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  </RouterLink>
</template>
