import { Toaster as Sonner } from 'sonner'
import type * as React from 'react'

/** Short, calm confirmations — never stacked spam. */
function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton={false}
      duration={2600}
      visibleToasts={2}
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-border bg-card text-card-foreground shadow-raise text-sm font-medium',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
