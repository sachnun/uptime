<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useMonitorsStore } from '@/stores/monitors'

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
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Status Pages</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Create public status pages for your services</p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Status Page
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
    </div>

    <div v-else-if="statusPages.length === 0" class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-white">No status pages</h3>
      <p class="mt-2 text-slate-500 dark:text-slate-400">Create a public status page to share with your users.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="page in statusPages"
        :key="page.id"
        class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
      >
        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-slate-900 dark:text-white truncate">{{ page.title }}</h3>
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full',
                  page.published
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                ]"
              >
                {{ page.published ? 'Published' : 'Draft' }}
              </span>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">/status/{{ page.slug }}</p>
            <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {{ page.monitorIds.length }} monitor{{ page.monitorIds.length !== 1 ? 's' : '' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <a
              v-if="page.published"
              :href="getPublicUrl(page.slug)"
              target="_blank"
              class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              View
            </a>
            <button
              @click="openEditModal(page)"
              class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Edit
            </button>
            <button
              @click="handleDelete(page)"
              class="px-3 py-1.5 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeModal"></div>
      <div class="relative bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">
          {{ editing ? 'Edit Status Page' : 'New Status Page' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {{ error }}
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
            <input
              v-model="form.title"
              type="text"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              placeholder="Service Status"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slug</label>
            <div class="flex items-center">
              <span class="text-slate-500 dark:text-slate-400 text-sm mr-1">/status/</span>
              <input
                v-model="form.slug"
                type="text"
                class="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                placeholder="my-service"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition resize-none"
              placeholder="Optional description"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
            <select
              v-model="form.theme"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            >
              <option v-for="t in themes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Monitors</label>
            <div class="border border-slate-300 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
              <div
                v-for="monitor in monitorsStore.monitors"
                :key="monitor.id"
                @click="toggleMonitor(monitor.id)"
                :class="[
                  'flex items-center gap-3 px-3 py-2 cursor-pointer transition',
                  form.monitorIds.includes(monitor.id)
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                ]"
              >
                <div
                  :class="[
                    'h-4 w-4 rounded border flex items-center justify-center',
                    form.monitorIds.includes(monitor.id)
                      ? 'bg-green-500 border-green-500'
                      : 'border-slate-300 dark:border-slate-600'
                  ]"
                >
                  <svg v-if="form.monitorIds.includes(monitor.id)" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ monitor.name }}</span>
              </div>
              <div v-if="monitorsStore.monitors.length === 0" class="px-3 py-4 text-center text-sm text-slate-500">
                No monitors available
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="published"
              v-model="form.published"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-green-500 focus:ring-green-500"
            />
            <label for="published" class="text-sm text-slate-700 dark:text-slate-300">Published</label>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
