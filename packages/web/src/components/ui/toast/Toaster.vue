<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Toast from './Toast.vue'
import ToastTitle from './ToastTitle.vue'
import ToastDescription from './ToastDescription.vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <Toast
          v-for="t in toasts"
          :key="t.id"
          :variant="t.variant"
          :on-dismiss="() => dismiss(t.id)"
        >
          <ToastTitle v-if="t.title">{{ t.title }}</ToastTitle>
          <ToastDescription v-if="t.description">{{ t.description }}</ToastDescription>
        </Toast>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
