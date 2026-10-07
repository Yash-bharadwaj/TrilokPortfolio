import type * as React from 'react'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return <tfoot className={cn('border-t-2 border-border font-bold', className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-border/70 transition-colors', className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-9 px-2.5 text-left align-middle text-xs font-semibold whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-2.5 py-2 align-middle whitespace-nowrap', className)} {...props} />
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return <caption className={cn('mt-3 text-xs text-muted-foreground', className)} {...props} />
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
