import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/25 hover:-translate-y-px hover:shadow-lg hover:shadow-emerald-600/30 hover:brightness-110 active:translate-y-0',
        destructive: 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/25 hover:brightness-110',
        outline: 'border-2 border-emerald-200 bg-white/80 text-emerald-900 shadow-xs hover:border-emerald-400 hover:bg-emerald-50',
        secondary: 'bg-white text-emerald-800 shadow-md hover:bg-emerald-50',
        ghost: 'hover:bg-emerald-500/10 hover:text-emerald-800',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-12 rounded-xl px-7 text-base has-[>svg]:px-4',
        xl: 'h-16 rounded-lg px-6 text-xl font-semibold',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
