<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useMonitorsStore } from '@/stores/monitors'
import { useDarkMode } from '@/lib/darkMode'
import CommandItem from './CommandItem.vue'
import {
  Activity,
  Bell,
  FileText,
  Settings,
  Code,
  Plus,
  Search,
  Sun,
  Moon,
  Globe,
  Server,
  Wifi,
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const monitorsStore = useMonitorsStore()
const { isDark, setTheme } = useDarkMode()

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const typeIcons: Record<string, typeof Globe> = {
  http: Globe,
  https: Globe,
  tcp: Server,
  dns: Wifi,
}

const navigationItems = [
  { id: 'nav-monitors', name: 'Go to Monitors', icon: Activity, action: () => router.push('/'), shortcut: 'G M' },
  { id: 'nav-notifications', name: 'Go to Notifications', icon: Bell, action: () => router.push('/notifications'), shortcut: 'G N' },
  { id: 'nav-status-pages', name: 'Go to Status Pages', icon: FileText, action: () => router.push('/status-pages'), shortcut: 'G S' },
  { id: 'nav-docs', name: 'Go to API Docs', icon: Code, action: () => router.push('/docs'), shortcut: 'G D' },
  { id: 'nav-settings', name: 'Go to Settings', icon: Settings, action: () => router.push('/settings') },
]

const actionItems = [
  { id: 'action-new-monitor', name: 'Create New Monitor', icon: Plus, action: () => router.push('/monitors/new'), shortcut: 'N' },
  {
    id: 'action-toggle-theme',
    name: computed(() => isDark.value ? 'Switch to Light Mode' : 'Switch to Dark Mode'),
    icon: computed(() => isDark.value ? Sun : Moon),
    action: () => setTheme(isDark.value ? 'light' : 'dark'),
    shortcut: 'T'
  },
]

const monitorItems = computed(() => 
  monitorsStore.monitors.map(m => ({
    id: `monitor-${m.id}`,
    name: m.name,
    subtitle: m.url || m.hostname,
    icon: typeIcons[m.type] || Activity,
    action: () => router.push(`/monitors/${m.id}`),
    monitor: m,
  }))
)

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  
  const navFiltered = navigationItems.filter(item =>
    item.name.toLowerCase().includes(query)
  )
  
  const actionFiltered = actionItems.filter(item => {
    const name = typeof item.name === 'string' ? item.name : item.name.value
    return name.toLowerCase().includes(query)
  })
  
  const monitorFiltered = monitorItems.value.filter(item =>
    item.name.toLowerCase().includes(query) ||
    item.subtitle?.toLowerCase().includes(query)
  )
  
  return {
    navigation: navFiltered,
    actions: actionFiltered,
    monitors: monitorFiltered.slice(0, 5),
  }
})

const allItems = computed(() => [
  ...filteredItems.value.navigation,
  ...filteredItems.value.actions,
  ...filteredItems.value.monitors,
])

const totalCount = computed(() => allItems.value.length)

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    selectedIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

watch(searchQuery, () => {
  selectedIndex.value = 0
})

function close() {
  emit('update:open', false)
}

function selectItem(index: number) {
  const item = allItems.value[index]
  if (item) {
    item.action()
    close()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % totalCount.value
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + totalCount.value) % totalCount.value
  } else if (e.key === 'Enter') {
    e.preventDefault()
    selectItem(selectedIndex.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

function getItemIndex(sectionIndex: number, itemIndex: number) {
  let offset = 0
  if (sectionIndex === 1) offset = filteredItems.value.navigation.length
  if (sectionIndex === 2) offset = filteredItems.value.navigation.length + filteredItems.value.actions.length
  return offset + itemIndex
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        @click="close"
      />
    </Transition>
    <Transition name="scale">
      <div
        v-if="open"
        class="fixed left-1/2 top-[20%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border bg-background shadow-2xl"
        @keydown="handleKeydown"
      >
        <div class="flex items-center gap-3 border-b px-4 py-3">
          <Search class="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search monitors, pages, or actions..."
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd class="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div class="max-h-[300px] overflow-y-auto p-2">
          <template v-if="totalCount === 0">
            <div class="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          </template>

          <template v-if="filteredItems.navigation.length > 0">
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Navigation
            </div>
            <CommandItem
              v-for="(item, idx) in filteredItems.navigation"
              :key="item.id"
              :icon="item.icon"
              :shortcut="item.shortcut"
              :selected="selectedIndex === getItemIndex(0, idx)"
              @select="selectItem(getItemIndex(0, idx))"
              @mouseenter="selectedIndex = getItemIndex(0, idx)"
            >
              {{ item.name }}
            </CommandItem>
          </template>

          <template v-if="filteredItems.actions.length > 0">
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
              Actions
            </div>
            <CommandItem
              v-for="(item, idx) in filteredItems.actions"
              :key="item.id"
              :icon="typeof item.icon === 'function' ? item.icon : item.icon.value"
              :shortcut="item.shortcut"
              :selected="selectedIndex === getItemIndex(1, idx)"
              @select="selectItem(getItemIndex(1, idx))"
              @mouseenter="selectedIndex = getItemIndex(1, idx)"
            >
              {{ typeof item.name === 'string' ? item.name : item.name.value }}
            </CommandItem>
          </template>

          <template v-if="filteredItems.monitors.length > 0">
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
              Monitors
            </div>
            <CommandItem
              v-for="(item, idx) in filteredItems.monitors"
              :key="item.id"
              :icon="item.icon"
              :selected="selectedIndex === getItemIndex(2, idx)"
              @select="selectItem(getItemIndex(2, idx))"
              @mouseenter="selectedIndex = getItemIndex(2, idx)"
            >
              <span>{{ item.name }}</span>
              <span class="text-xs text-muted-foreground ml-2 truncate">{{ item.subtitle }}</span>
            </CommandItem>
          </template>
        </div>

        <div class="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <kbd class="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px]">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div class="flex items-center gap-2">
            <kbd class="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px]">↵</kbd>
            <span>Select</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.scale-enter-active,
.scale-leave-active {
  transition: all 0.15s ease;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: translate(-50%, 0) scale(0.95);
}
.scale-enter-to,
.scale-leave-from {
  transform: translate(-50%, 0) scale(1);
}
</style>
