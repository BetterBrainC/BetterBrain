import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-[var(--dur-fast)] ease-out-expo focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // One confident blue pill CTA per surface.
        primary:
          "rounded-pill bg-primary text-primary-fg shadow-primary hover:bg-primary-600 active:bg-primary-700",
        secondary:
          "rounded-pill border border-border-strong bg-surface text-navy hover:bg-surface-tint",
        tonal:
          "rounded-pill bg-surface-tint text-primary-700 hover:bg-[var(--surface-tint-2)]",
        ghost: "rounded-md text-navy hover:bg-surface-tint",
        destructive:
          "rounded-pill bg-[var(--danger-bg)] text-[var(--danger-fg)] hover:brightness-95",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-[52px] px-6 text-base", // PWA primary touch target
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
