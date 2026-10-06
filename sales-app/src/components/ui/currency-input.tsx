import * as React from 'react'
import { cn } from '@/lib/utils'
import { digitsOnly, groupDigits } from '@/lib/format'

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: number | null
  onValueChange: (value: number | null) => void
  invalid?: boolean
}

/**
 * A rupee field the manager can fill one-handed: numeric keypad, digits only,
 * grouped live (`50000` shows as `50,000`) so nobody types a comma by hand.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ className, value, onValueChange, invalid, onBlur, ...props }, ref) {
    const [text, setText] = React.useState(() =>
      value === null || value === undefined ? '' : groupDigits(String(value)),
    )

    // Keep in step when the form resets or loads an existing record.
    React.useEffect(() => {
      const next = value === null || value === undefined ? '' : groupDigits(String(value))
      setText((current) => (digitsOnly(current) === digitsOnly(next) ? current : next))
    }, [value])

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const clean = digitsOnly(event.target.value).slice(0, 10)
      setText(groupDigits(clean))
      onValueChange(clean === '' ? null : Number(clean))
    }

    return (
      <div className="relative">
        <span
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg font-semibold text-muted-foreground"
          aria-hidden
        >
          ₹
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          value={text}
          onChange={handleChange}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          className={cn(
            'tnum flex h-14 w-full min-w-0 rounded-xl border border-input bg-card py-2 pr-4 pl-9 text-xl font-semibold shadow-xs transition-[color,box-shadow] outline-none',
            'placeholder:font-normal placeholder:text-muted-foreground/60',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25',
            'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          placeholder="0"
          {...props}
        />
      </div>
    )
  },
)

export { CurrencyInput }
