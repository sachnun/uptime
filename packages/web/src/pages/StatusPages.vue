<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useMonitorsStore } from '@/stores/monitors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Loader2, FileText, Eye, Pencil, Trash2, ExternalLink, Check } from 'lucide-vue-next'

interface StatusPage {
  id: number
  slug: string
  title: string
  description?: string
  published: boolean
  theme: 'light' | 'dark' | 'auto'
  monitorIds: number[]
  createdAt: string
}

const monitorsStore = useMonitorsStore()
const statusPages = ref<StatusPage[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<StatusPage | null>(null)
const saving = ref(false)
const error = ref('')

const form = ref({
  slug: '',
  title: '',
  description: '',
  published: false,
  theme: 'auto' as StatusPage['theme'],
  monitorIds: [] as number[],
})

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto (System)' },
]

async function fetchStatusPages() {
  loading.value = true
  try {
    statusPages.value = await api.get('/api/status-pages')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch status pages'
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editing.value = null
  form.value = {
    slug: '',
    title: '',
    description: '',
    published: false,
    theme: 'auto',
    monitorIds: [],
  }
  showModal.value = true
}

function openEditModal(statusPage: StatusPage) {
  editing.value = statusPage
  form.value = {
    slug: statusPage.slug,
    title: statusPage.title,
    description: statusPage.description || '',
    published: statusPage.published,
    theme: statusPage.theme,
    monitorIds: [...statusPage.monitorIds],
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  error.value = ''
}

function toggleMonitor(monitorId: number) {
  const index = form.value.monitorIds.indexOf(monitorId)
  if (index === -1) {
    form.value.monitorIds.push(monitorId)
  } else {
    form.value.monitorIds.splice(index, 1)
  }
}

async function handleSubmit() {
  if (!form.value.slug || !form.value.title) {
    error.value = 'Slug and title are required'
    return
  }

  saving.value = true
  error.value = ''

  const data = {
    slug: form.value.slug,
    title: form.value.title,
    description: form.value.description || null,
    published: form.value.published,
    theme: form.value.theme,
    monitorIds: form.value.monitorIds,
  }

  try {
    if (editing.value) {
      const updated = await api.put<StatusPage>(`/api/status-pages/${editing.value.id}`, data)
      const index = statusPages.value.findIndex(s => s.id === editing.value!.id)
      if (index !== -1) statusPages.value[index] = updated
    } else {
      const created = await api.post<StatusPage>('/api/status-pages', data)
      statusPages.value.unshift(created)
    }
    closeModal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save status page'
  } finally {
    saving.value = false
  }
}

async function handleDelete(statusPage: StatusPage) {
  if (!confirm(`Delete status page "${statusPage.title}"?`)) return
  
  try {
    await api.delete(`/api/status-pages/${statusPage.id}`)
    statusPages.value = statusPages.value.filter(s => s.id !== statusPage.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete status page'
  }
}

function getPublicUrl(slug: string): string {
  return `${window.location.origin}/status/${slug}`
}

onMounted(async () => {
  await Promise.all([fetchStatusPages(), monitorsStore.fetchMonitors()])
})
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Status Pages</h1>
        <p class="text-muted-foreground text-sm sm:text-base">Create public status pages for your services</p>
      </div>
      <Button @click="openCreateModal" class="w-full sm:w-auto">
        <Plus class="h-4 w-4 mr-2" />
        New Status Page
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <Card v-else-if="statusPages.length === 0" class="flex flex-col items-center justify-center py-12">
      <FileText class="h-12 w-12 text-muted-foreground" />
      <h3 class="mt-4 text-lg font-medium">No status pages</h3>
      <p class="mt-2 text-muted-foreground">Create a public status page to share with your users.</p>
      <Button class="mt-4" @click="openCreateModal">
        <Plus class="h-4 w-4 mr-2" />
        New Status Page
      </Button>
    </Card>

    <div v-else class="space-y-3">
      <Card v-for="page in statusPages" :key="page.id" class="p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-medium truncate">{{ page.title }}</h3>
              <Badge :variant="page.published ? 'success' : 'warning'">
                {{ page.published ? 'Published' : 'Draft' }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground">/status/{{ page.slug }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ page.monitorIds.length }} monitor{{ page.monitorIds.length !== 1 ? 's' : '' }}
            </p>
          </div>
          <div class="flex items-center gap-2 justify-end">
            <Button
              v-if="page.published"
              variant="outline"
              size="sm"
              as-child
            >
              <a :href="getPublicUrl(page.slug)" target="_blank">
                <Eye class="h-4 w-4 sm:mr-2" />
                <span class="hidden sm:inline">View</span>
                <ExternalLink class="h-3 w-3 ml-1 hidden sm:inline" />
              </a>
            </Button>
            <Button variant="outline" size="sm" @click="openEditModal(page)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="handleDelete(page)">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <Dialog :open="showModal" @update:open="val => !val && closeModal()">
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Edit Status Page' : 'New Status Page' }}</DialogTitle>
          <DialogDescription>Configure your public status page settings</DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {{ error }}
          </div>

          <div class="space-y-2">
            <Label for="title">Title</Label>
            <Input id="title" v-model="form.title" placeholder="Service Status" />
          </div>

          <div class="space-y-2">
            <Label for="slug">Slug</Label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">/status/</span>
              <Input id="slug" v-model="form.slug" placeholder="my-service" class="flex-1" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Input id="description" v-model="form.description" placeholder="Optional description" />
          </div>

          <div class="space-y-2">
            <Label>Theme</Label>
            <Select v-model="form.theme">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in themes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Monitors</Label>
            <div class="border rounded-lg max-h-48 overflow-y-auto">
              <div
                v-for="monitor in monitorsStore.monitors"
                :key="monitor.id"
                @click="toggleMonitor(monitor.id)"
                :class="cn(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer transition',
                  form.monitorIds.includes(monitor.id)
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                )"
              >
                <div
                  :class="cn(
                    'h-4 w-4 rounded border flex items-center justify-center',
                    form.monitorIds.includes(monitor.id)
                      ? 'bg-primary border-primary'
                      : 'border-input'
                  )"
                >
                  <Check v-if="form.monitorIds.includes(monitor.id)" class="h-3 w-3 text-primary-foreground" />
                </div>
                <span class="text-sm">{{ monitor.name }}</span>
              </div>
              <div v-if="monitorsStore.monitors.length === 0" class="px-3 py-4 text-center text-sm text-muted-foreground">
                No monitors available
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <input
              id="published"
              v-model="form.published"
              type="checkbox"
              class="h-4 w-4 rounded border border-input bg-background text-primary accent-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
            />
            <Label for="published">Published</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
