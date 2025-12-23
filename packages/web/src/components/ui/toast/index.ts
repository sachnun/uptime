import { cva, type VariantProps } from 'class-variance-authority'

export { default as Toast } from './Toast.vue'
export { default as ToastTitle } from './ToastTitle.vue'
export { default as ToastDescription } from './ToastDescription.vue'
export { default as Toaster } from './Toaster.vue'

export const toastVariants = cva(
  'pointer-events-auto flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg',
  {
    variants: {
      variant: {
        default: 'border-border bg-background text-foreground',
        success: 'border-success/50 bg-success text-success-foreground',
        destructive: 'border-destructive/50 bg-destructive text-destructive-foreground',
        warning: 'border-warning/50 bg-warning text-warning-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type ToastVariants = VariantProps<typeof toastVariants>
