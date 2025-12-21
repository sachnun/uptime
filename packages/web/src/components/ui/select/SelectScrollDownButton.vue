<script setup lang="ts">
import { SelectScrollDownButton, type SelectScrollDownButtonProps } from 'reka-ui'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<SelectScrollDownButtonProps & { class?: string }>()
</script>

<template>
  <SelectScrollDownButton
    v-bind="props"
    :class="cn('flex cursor-default items-center justify-center py-1', props.class)"
  >
    <slot>
      <ChevronDown class="h-4 w-4" />
    </slot>
  </SelectScrollDownButton>
</template>
