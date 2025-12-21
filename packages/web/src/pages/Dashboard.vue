<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMonitorsStore } from '@/stores/monitors'
import MonitorCard from '@/components/MonitorCard.vue'

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
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Monitor your services in real-time</p>
      </div>
      <RouterLink
        to="/monitors/new"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Monitor
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">Up</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ upMonitors }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">Down</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ downMonitors }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <svg class="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">Paused</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ pausedMonitors }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="monitorsStore.loading && monitorsStore.monitors.length === 0" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
      <p class="mt-4 text-slate-500 dark:text-slate-400">Loading monitors...</p>
    </div>

    <div v-else-if="monitorsStore.monitors.length === 0" class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-white">No monitors yet</h3>
      <p class="mt-2 text-slate-500 dark:text-slate-400">Get started by creating your first monitor.</p>
      <RouterLink
        to="/monitors/new"
        class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Monitor
      </RouterLink>
    </div>

    <div v-else class="space-y-3">
      <MonitorCard
        v-for="monitor in monitorsStore.monitors"
        :key="monitor.id"
        :monitor="monitor"
      />
    </div>
  </div>
</template>
