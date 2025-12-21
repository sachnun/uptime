<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMonitorsStore } from '@/stores/monitors'
import { useDarkMode } from '@/lib/darkMode'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Bell,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  Code,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDark, setTheme, theme } = useDarkMode()
const sidebarOpen = ref(true)
const mobileMenuOpen = ref(false)

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Status Pages', href: '/status-pages', icon: FileText },
  { name: 'API Docs', href: '/docs', icon: Code },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const isActive = (href: string) => {
  if (href === '/') return route.path === '/'
  return route.path.startsWith(href)
}

function toggleTheme() {
  const themeMap: Record<string, 'dark' | 'light' | 'system'> = {
    system: 'dark',
    dark: 'light',
    light: 'system',
  }
  setTheme(themeMap[theme.value])
}

function handleLogout() {
  const monitorsStore = useMonitorsStore()
  monitorsStore.$reset()
  authStore.logout()
  router.push('/login')
}

const userInitial = computed(() => {
  const name = authStore.user?.name || authStore.user?.email || ''
  return name.charAt(0).toUpperCase() || 'U'
})
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div class="min-h-screen bg-background">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="mobileMenuOpen = false"
      />

      <aside
        :class="cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          'max-lg:w-64',
          mobileMenuOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          sidebarOpen ? 'lg:w-64' : 'lg:w-16'
        )"
      >
        <div :class="cn('flex h-14 items-center border-b border-sidebar-border', sidebarOpen ? 'justify-between px-3' : 'lg:justify-center px-3 lg:px-2')">
          <RouterLink to="/" :class="cn('flex items-center', sidebarOpen ? 'gap-2' : 'lg:justify-center gap-2 lg:gap-0')" @click="mobileMenuOpen = false">
            <span :class="cn('font-semibold text-sidebar-foreground', sidebarOpen ? '' : 'lg:hidden')">Uptime</span>
          </RouterLink>
          <Button
            :class="cn('h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent', sidebarOpen ? '' : 'lg:hidden')"
            variant="ghost"
            size="icon"
            @click="sidebarOpen = false; mobileMenuOpen = false"
          >
            <PanelLeftClose class="h-4 w-4 hidden lg:block" />
            <X class="h-4 w-4 lg:hidden" />
          </Button>
        </div>

        <nav :class="cn('flex-1 p-2', sidebarOpen ? 'space-y-1' : 'lg:flex lg:flex-col lg:items-center space-y-1')">
          <template v-for="item in navigation" :key="item.name">
            <Tooltip v-if="!sidebarOpen">
              <TooltipTrigger as-child>
                <RouterLink
                  :to="item.href"
                  :class="cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors max-lg:hidden',
                    isActive(item.href)
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )"
                >
                  <component :is="item.icon" class="h-4 w-4" />
                </RouterLink>
              </TooltipTrigger>
              <TooltipContent side="right">{{ item.name }}</TooltipContent>
            </Tooltip>
            <RouterLink
              :class="cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                !sidebarOpen && 'lg:hidden',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )"
              :to="item.href"
              @click="mobileMenuOpen = false"
            >
              <component :is="item.icon" class="h-4 w-4" />
              <span>{{ item.name }}</span>
            </RouterLink>
          </template>
        </nav>

        <div class="border-t border-sidebar-border p-2">
          <div v-if="!sidebarOpen" class="flex-col items-center gap-1 hidden lg:flex">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent" @click="sidebarOpen = true">
                  <PanelLeft class="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent" @click="toggleTheme">
                  <Sun v-if="isDark" class="h-4 w-4" />
                  <Moon v-else class="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Toggle theme</TooltipContent>
            </Tooltip>
            <Separator class="my-1" />
            <Tooltip>
              <TooltipTrigger as-child>
                <Avatar class="h-9 w-9 cursor-pointer">
                  <AvatarFallback class="text-xs bg-sidebar-accent text-sidebar-accent-foreground">{{ userInitial }}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">{{ authStore.user?.name || authStore.user?.email }}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="h-10 w-10 text-danger hover:bg-sidebar-accent" @click="handleLogout">
                  <LogOut class="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          </div>

          <template v-if="sidebarOpen || true">
            <div :class="cn('flex items-center gap-2 px-1 py-1', !sidebarOpen && 'lg:hidden')">
              <Button variant="ghost" size="icon" class="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" @click="toggleTheme">
                <Sun v-if="isDark" class="h-4 w-4" />
                <Moon v-else class="h-4 w-4" />
              </Button>
              <span class="text-xs text-muted-foreground capitalize">{{ theme }}</span>
            </div>
            <Separator :class="cn('my-2', !sidebarOpen && 'lg:hidden')" />
            <div :class="cn('flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors', !sidebarOpen && 'lg:hidden')">
              <Avatar class="h-8 w-8">
                <AvatarFallback class="text-xs bg-sidebar-accent text-sidebar-accent-foreground">{{ userInitial }}</AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-sidebar-foreground truncate">{{ authStore.user?.name || authStore.user?.email }}</p>
              </div>
              <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-transparent" @click="handleLogout">
                <LogOut class="h-4 w-4" />
              </Button>
            </div>
          </template>
        </div>
      </aside>

      <header class="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
        <Button variant="ghost" size="icon" class="h-9 w-9" @click="mobileMenuOpen = true">
          <Menu class="h-5 w-5" />
        </Button>
        <RouterLink to="/" class="flex items-center gap-2">
          <span class="font-semibold">Uptime</span>
        </RouterLink>
      </header>

      <main :class="cn('min-h-screen transition-all duration-300 pt-14 lg:pt-0', sidebarOpen ? 'lg:ml-64' : 'lg:ml-16')">
        <div class="px-4 py-4 lg:px-6 lg:py-6">
          <RouterView />
        </div>
      </main>
    </div>
  </TooltipProvider>
</template>
