<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/lib/darkMode'

const router = useRouter()
const authStore = useAuthStore()
const { isDark, setTheme, theme } = useDarkMode()
const sidebarOpen = ref(true)

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Notifications', href: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { name: 'Status Pages', href: '/status-pages', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'Settings', href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function toggleTheme() {
  if (theme.value === 'system') {
    setTheme('dark')
  } else if (theme.value === 'dark') {
    setTheme('light')
  } else {
    setTheme('system')
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <div class="flex h-16 items-center justify-between px-4">
        <RouterLink to="/" class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span v-if="sidebarOpen" class="text-xl font-bold text-white">Uptime</span>
        </RouterLink>
        <button @click="sidebarOpen = !sidebarOpen" class="text-slate-400 hover:text-white">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-4">
        <RouterLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="bg-slate-800 text-white"
        >
          <svg class="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
          </svg>
          <span v-if="sidebarOpen">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-slate-700 p-4">
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleTheme"
            class="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            :title="`Theme: ${theme}`"
          >
            <svg v-if="isDark" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          <span v-if="sidebarOpen" class="text-xs text-slate-500 capitalize">{{ theme }}</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center">
            <span class="text-sm font-medium text-white">{{ authStore.user?.username?.charAt(0).toUpperCase() }}</span>
          </div>
          <div v-if="sidebarOpen" class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ authStore.user?.username }}</p>
          </div>
          <button @click="handleLogout" class="text-slate-400 hover:text-white" title="Logout">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <main :class="['transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-20']">
      <div class="p-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
