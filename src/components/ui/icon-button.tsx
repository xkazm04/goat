'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const iconButtonVariants = cva(
  'relative inline-flex items-center justify-center',
  {
    variants: {
      iconSize: {
        sm: '[&>svg]:h-4 [&>svg]:w-4',
        default: '[&>svg]:h-[1.2rem] [&>svg]:w-[1.2rem]',
        lg: '[&>svg]:h-6 [&>svg]:w-6',
      },
    },
    defaultVariants: {
      iconSize: 'default',
    },
  }
);

export interface IconState {
  icon: React.ReactNode;
  rotation?: 'rotate-0' | 'rotate-90' | 'rotate-180' | 'rotate-270' | '-rotate-90';
  scale?: 'scale-0' | 'scale-50' | 'scale-75' | 'scale-100';
  condition?: string;
}

type IconButtonProps<T extends React.ElementType = 'button'> = {
  icons: IconState[];
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, 'onClick'> &
  VariantProps<typeof iconButtonVariants>;

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icons,
      onClick,
      ariaLabel,
      variant = 'outline',
      size = 'icon',
      iconSize,
      asChild = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        onClick={onClick}
        className={cn(iconButtonVariants({ iconSize }), className)}
        asChild={asChild}
        {...props}
      >
        <>
          {icons.map((iconState, index) => {
            const {
              icon,
              rotation = 'rotate-0',
              scale = 'scale-100',
              condition,
            } = iconState;

            // Build transition classes
            const transitionClasses = cn(
              'transition-all',
              index > 0 && 'absolute', // All icons after the first are absolutely positioned
              rotation,
              scale,
              condition // Apply conditional dark mode classes if provided
            );

            return (
              <span key={index} className={transitionClasses}>
                {icon}
              </span>
            );
          })}
          <span className="sr-only">{ariaLabel}</span>
        </>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };
export type { IconButtonProps };
