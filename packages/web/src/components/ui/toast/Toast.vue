<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { toastVariants, type ToastVariants } from '.'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  variant?: ToastVariants['variant']
  class?: HTMLAttributes['class']
  onDismiss?: () => void
}>()
</script>

<template>
  <div
    :class="cn(toastVariants({ variant }), props.class)"
    role="alert"
  >
    <div class="flex-1">
      <slot />
    </div>
    <button
      v-if="onDismiss"
      type="button"
      class="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
      @click="onDismiss"
    >
      <X class="h-4 w-4" />
      <span class="sr-only">Close</span>
    </button>
  </div>
</template>
