import logo from '@/assets/brundavan-logo.png'
import logoLight from '@/assets/brundavan-logo-light.png'
import emblem from '@/assets/brundavan-emblem.png'
import { cn } from '@/lib/utils'

/** The supplied wordmark. Aspect ratio is fixed by the intrinsic size — never stretched. */
export function BrundavanLogo({
  className,
  variant = 'dark',
}: {
  className?: string
  variant?: 'dark' | 'light'
}) {
  return (
    <img
      src={variant === 'light' ? logoLight : logo}
      alt="Sai Brundavan Grand"
      width={805}
      height={212}
      className={cn('h-auto w-auto object-contain', className)}
      draggable={false}
    />
  )
}

export function BrundavanEmblem({ className }: { className?: string }) {
  return (
    <img
      src={emblem}
      alt=""
      aria-hidden
      width={119}
      height={108}
      className={cn('object-contain', className)}
      draggable={false}
    />
  )
}

export { logo as brundavanLogoSrc, logoLight as brundavanLogoLightSrc, emblem as brundavanEmblemSrc }
