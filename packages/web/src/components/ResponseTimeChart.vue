<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-vue-next'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  monitorId: number
}>()

type Period = '24h' | '7d' | '30d'

interface StatsDataPoint {
  timestamp: number
  responseTime: number | null
  status?: boolean
  minResponseTime?: number | null
  maxResponseTime?: number | null
  uptimePercentage?: number | null
}

interface StatsResponse {
  period: string
  data: StatsDataPoint[]
}

const periods: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

const selectedPeriod = ref<Period>('24h')
const loading = ref(false)
const statsData = ref<StatsDataPoint[]>([])

const formatTime = (timestamp: number, period: Period): string => {
  const date = new Date(timestamp)
  if (period === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  if (period === '7d') {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const chartData = computed<ChartData<'line'>>(() => {
  const labels = statsData.value.map(d => formatTime(d.timestamp, selectedPeriod.value))
  const responseTimeData = statsData.value.map(d => d.responseTime ?? 0)

  const datasets: ChartData<'line'>['datasets'] = [
    {
      label: 'Response Time (ms)',
      data: responseTimeData,
      borderColor: 'hsl(142.1 76.2% 36.3%)',
      backgroundColor: 'hsla(142.1, 76.2%, 36.3%, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: selectedPeriod.value === '24h' ? 2 : 3,
      pointHoverRadius: 5,
    },
  ]

  if (selectedPeriod.value !== '24h') {
    const minData = statsData.value.map(d => d.minResponseTime ?? 0)
    const maxData = statsData.value.map(d => d.maxResponseTime ?? 0)

    datasets.push({
      label: 'Min',
      data: minData,
      borderColor: 'hsl(221.2 83.2% 53.3%)',
      borderDash: [5, 5],
      fill: false,
      tension: 0.3,
      pointRadius: 0,
    })

    datasets.push({
      label: 'Max',
      data: maxData,
      borderColor: 'hsl(0 84.2% 60.2%)',
      borderDash: [5, 5],
      fill: false,
      tension: 0.3,
      pointRadius: 0,
    })
  }

  return { labels, datasets }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: selectedPeriod.value !== '24h',
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: 'hsl(0 0% 3.9%)',
      titleColor: 'hsl(0 0% 98%)',
      bodyColor: 'hsl(0 0% 98%)',
      borderColor: 'hsl(0 0% 14.9%)',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context) => {
          const value = context.raw as number
          return `${context.dataset.label}: ${value}ms`
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxTicksLimit: 8,
        color: 'hsl(0 0% 45.1%)',
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'hsl(0 0% 14.9%)',
      },
      ticks: {
        color: 'hsl(0 0% 45.1%)',
        callback: (value) => `${value}ms`,
      },
    },
  },
}))

async function fetchStats() {
  loading.value = true
  try {
    const response = await api.get<StatsResponse>(`/monitors/${props.monitorId}/stats?period=${selectedPeriod.value}`)
    statsData.value = response.data ?? []
  } catch {
    statsData.value = []
  }
  loading.value = false
}

watch(selectedPeriod, fetchStats)
onMounted(fetchStats)
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-4">
      <CardTitle>Response Time</CardTitle>
      <div class="flex gap-1">
        <Button
          v-for="period in periods"
          :key="period.value"
          :variant="selectedPeriod === period.value ? 'default' : 'outline'"
          size="sm"
          @click="selectedPeriod = period.value"
        >
          {{ period.label }}
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="flex items-center justify-center h-64">
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
      </div>
      <div v-else-if="statsData.length === 0" class="flex items-center justify-center h-64 text-muted-foreground">
        No data available for this period
      </div>
      <div v-else class="h-64">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </CardContent>
  </Card>
</template>
