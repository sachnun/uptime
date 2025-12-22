<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-vue-next'

const copiedCode = ref<string | null>(null)

async function copyCode(code: string, id: string) {
  await navigator.clipboard.writeText(code)
  copiedCode.value = id
  setTimeout(() => { copiedCode.value = null }, 2000)
}

const baseUrl = computed(() => window.location.origin)

const endpoints = [
  {
    category: 'Monitors',
    items: [
      { method: 'GET', path: '/api/monitors', desc: 'List all monitors', auth: true },
      { method: 'GET', path: '/api/monitors/:id', desc: 'Get monitor details', auth: true },
      { method: 'POST', path: '/api/monitors', desc: 'Create new monitor', auth: true },
      { method: 'PUT', path: '/api/monitors/:id', desc: 'Update monitor', auth: true },
      { method: 'DELETE', path: '/api/monitors/:id', desc: 'Delete monitor', auth: true },
      { method: 'POST', path: '/api/monitors/:id/pause', desc: 'Pause monitoring', auth: true },
      { method: 'POST', path: '/api/monitors/:id/resume', desc: 'Resume monitoring', auth: true },
      { method: 'POST', path: '/api/monitors/test', desc: 'Test monitor config', auth: true },
    ]
  },
  {
    category: 'Heartbeats',
    items: [
      { method: 'GET', path: '/api/heartbeats/:monitorId', desc: 'Get heartbeats', auth: true },
      { method: 'GET', path: '/api/heartbeats/:monitorId/stats', desc: 'Uptime statistics', auth: true },
      { method: 'GET', path: '/api/heartbeats/:monitorId/incidents', desc: 'List incidents', auth: true },
      { method: 'GET', path: '/api/heartbeats/:monitorId/hourly', desc: 'Hourly statistics', auth: true },
    ]
  },
  {
    category: 'Notifications',
    items: [
      { method: 'GET', path: '/api/notifications', desc: 'List notification channels', auth: true },
      { method: 'GET', path: '/api/notifications/:id', desc: 'Get notification details', auth: true },
      { method: 'POST', path: '/api/notifications', desc: 'Create notification', auth: true },
      { method: 'PUT', path: '/api/notifications/:id', desc: 'Update notification', auth: true },
      { method: 'DELETE', path: '/api/notifications/:id', desc: 'Delete notification', auth: true },
      { method: 'POST', path: '/api/notifications/:id/test', desc: 'Send test notification', auth: true },
    ]
  },
  {
    category: 'Status Pages',
    items: [
      { method: 'GET', path: '/api/status-pages/public/:slug', desc: 'Public status page', auth: false },
      { method: 'GET', path: '/api/status-pages', desc: 'List status pages', auth: true },
      { method: 'GET', path: '/api/status-pages/:id', desc: 'Get status page details', auth: true },
      { method: 'POST', path: '/api/status-pages', desc: 'Create status page', auth: true },
      { method: 'PUT', path: '/api/status-pages/:id', desc: 'Update status page', auth: true },
      { method: 'DELETE', path: '/api/status-pages/:id', desc: 'Delete status page', auth: true },
    ]
  },
]

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-600 dark:text-green-400',
  POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PUT: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

const curlExample = computed(() => `curl -H "x-api-key: up_xxx..." ${baseUrl.value}/api/monitors`)
const jsExample = computed(() => `const res = await fetch('${baseUrl.value}/api/monitors', {
  headers: { 'x-api-key': 'up_xxx...' }
});
const monitors = await res.json();`)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight">API Documentation</h1>
      <p class="text-muted-foreground text-sm sm:text-base">REST API reference for programmatic access</p>
    </div>

    <div class="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader class="p-4 sm:p-6">
          <CardTitle class="text-base sm:text-lg">Authentication</CardTitle>
          <CardDescription class="text-xs sm:text-sm">Two authentication methods supported</CardDescription>
        </CardHeader>
        <CardContent class="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
          <div>
            <h4 class="font-medium mb-2 text-sm sm:text-base">1. API Key (Recommended)</h4>
            <p class="text-xs sm:text-sm text-muted-foreground mb-2">
              Create an API key in Settings, then use the <code class="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-xs">x-api-key</code> header
            </p>
            <div class="relative">
              <pre class="bg-muted p-2 sm:p-3 rounded-lg text-xs sm:text-sm overflow-x-auto"><code>{{ curlExample }}</code></pre>
              <Button
                variant="ghost"
                size="icon"
                class="absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 sm:h-7 sm:w-7"
                @click="copyCode(curlExample, 'curl')"
              >
                <Check v-if="copiedCode === 'curl'" class="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
                <Copy v-else class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <h4 class="font-medium mb-2 text-sm sm:text-base">2. Bearer Token</h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              JWT token from OAuth login. Use header <code class="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;token&gt;</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="p-4 sm:p-6">
          <CardTitle class="text-base sm:text-lg">Base URL</CardTitle>
        </CardHeader>
        <CardContent class="p-4 pt-0 sm:p-6 sm:pt-0">
          <div class="flex items-center gap-2 bg-muted rounded-lg">
            <code class="px-2 sm:px-3 py-2 text-xs sm:text-sm flex-1 overflow-x-auto">{{ baseUrl }}/api</code>
            <Button variant="ghost" size="icon" class="bg-muted-foreground/10 h-8 w-8 sm:h-9 sm:w-9 shrink-0 mr-1" @click="copyCode(`${baseUrl}/api`, 'baseurl')">
              <Check v-if="copiedCode === 'baseurl'" class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <Copy v-else class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="p-4 sm:p-6">
          <CardTitle class="text-base sm:text-lg">Quick Example</CardTitle>
          <CardDescription class="text-xs sm:text-sm">JavaScript / TypeScript</CardDescription>
        </CardHeader>
        <CardContent class="p-4 pt-0 sm:p-6 sm:pt-0">
          <div class="relative">
            <pre class="bg-muted p-2 sm:p-3 rounded-lg text-xs sm:text-sm overflow-x-auto"><code>{{ jsExample }}</code></pre>
            <Button
              variant="ghost"
              size="icon"
              class="absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 sm:h-7 sm:w-7"
              @click="copyCode(jsExample, 'js')"
            >
              <Check v-if="copiedCode === 'js'" class="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
              <Copy v-else class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card v-for="section in endpoints" :key="section.category">
        <CardHeader class="p-4 sm:p-6">
          <CardTitle class="text-base sm:text-lg">{{ section.category }}</CardTitle>
        </CardHeader>
        <CardContent class="p-4 pt-0 sm:p-6 sm:pt-0">
          <div class="divide-y">
            <div
              v-for="(ep, idx) in section.items"
              :key="idx"
              class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5 sm:py-3 first:pt-0 last:pb-0"
            >
              <div class="flex items-center gap-2 sm:gap-3">
                <Badge :class="methodColors[ep.method]" variant="secondary" class="font-mono text-xs w-14 sm:w-16 justify-center shrink-0">
                  {{ ep.method }}
                </Badge>
                <code class="text-xs sm:text-sm font-mono truncate">{{ ep.path }}</code>
                <Badge v-if="ep.auth" variant="outline" class="text-xs shrink-0 sm:hidden">Auth</Badge>
              </div>
              <div class="flex items-center gap-2 sm:flex-1 sm:justify-end pl-16 sm:pl-0">
                <span class="text-xs sm:text-sm text-muted-foreground truncate">{{ ep.desc }}</span>
                <Badge v-if="ep.auth" variant="outline" class="text-xs shrink-0 hidden sm:inline-flex">Auth</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  </div>
</template>
