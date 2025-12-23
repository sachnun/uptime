<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { Component } from 'vue'

defineProps<{
  icon?: Component
  shortcut?: string
  selected?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    :class="cn(
      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left',
      selected
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent'
    )"
    @click="emit('select')"
  >
    <component v-if="icon" :is="icon" class="h-4 w-4 shrink-0 opacity-70" />
    <span class="flex-1 truncate">
      <slot />
    </span>
    <kbd
      v-if="shortcut"
      class="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
    >
      {{ shortcut }}
    </kbd>
  </button>
</template>
