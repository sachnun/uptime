<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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
  Monitor,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDark, setTheme, theme } = useDarkMode()
const sidebarOpen = ref(true)

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Status Pages', href: '/status-pages', icon: FileText },
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
  authStore.logout()
  router.push('/login')
}

const userInitial = computed(() => authStore.user?.username?.charAt(0).toUpperCase() || 'U')
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div class="min-h-screen bg-background">
      <aside
        :class="cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )"
      >
        <div :class="cn('flex h-14 items-center border-b border-sidebar-border', sidebarOpen ? 'justify-between px-3' : 'justify-center px-2')">
          <RouterLink to="/" :class="cn('flex items-center', sidebarOpen ? 'gap-2' : 'justify-center')">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <Monitor class="h-4 w-4 text-primary-foreground" />
            </div>
            <span v-if="sidebarOpen" class="font-semibold text-sidebar-foreground">Uptime</span>
          </RouterLink>
          <Button
            v-if="sidebarOpen"
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            @click="sidebarOpen = false"
          >
            <PanelLeftClose class="h-4 w-4" />
          </Button>
        </div>

        <nav :class="cn('flex-1 p-2', sidebarOpen ? 'space-y-1' : 'flex flex-col items-center space-y-1')">
          <template v-for="item in navigation" :key="item.name">
            <Tooltip v-if="!sidebarOpen">
              <TooltipTrigger as-child>
                <RouterLink
                  :to="item.href"
                  :class="cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
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
              v-else
              :to="item.href"
              :class="cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )"
            >
              <component :is="item.icon" class="h-4 w-4" />
              <span>{{ item.name }}</span>
            </RouterLink>
          </template>
        </nav>

        <div class="border-t border-sidebar-border p-2">
          <div v-if="!sidebarOpen" class="flex flex-col items-center gap-1">
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
              <TooltipContent side="right">{{ authStore.user?.username }}</TooltipContent>
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

          <template v-else>
            <div class="flex items-center gap-2 px-1 py-1">
              <Button variant="ghost" size="icon" class="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" @click="toggleTheme">
                <Sun v-if="isDark" class="h-4 w-4" />
                <Moon v-else class="h-4 w-4" />
              </Button>
              <span class="text-xs text-muted-foreground capitalize">{{ theme }}</span>
            </div>
            <Separator class="my-2" />
            <div class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
              <Avatar class="h-8 w-8">
                <AvatarFallback class="text-xs bg-sidebar-accent text-sidebar-accent-foreground">{{ userInitial }}</AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-sidebar-foreground truncate">{{ authStore.user?.username }}</p>
              </div>
              <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-transparent" @click="handleLogout">
                <LogOut class="h-4 w-4" />
              </Button>
            </div>
          </template>
        </div>
      </aside>

      <main :class="cn('min-h-screen transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-16')">
        <div class="px-6 py-6">
          <RouterView />
        </div>
      </main>
    </div>
  </TooltipProvider>
</template>
