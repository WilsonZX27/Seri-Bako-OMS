import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-[var(--sb-control-height)] max-w-full touch-manipulation select-none items-center justify-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--sb-radius-control)] border border-transparent px-3 text-xs font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        default: "bg-[var(--sb-green-900)] text-white hover:bg-[var(--sb-green-800)]",
        secondary: "border-[var(--sb-border)] bg-white text-[var(--sb-text)] hover:bg-[var(--sb-surface-muted)]",
        outline: "border-[var(--sb-border)] bg-white text-[var(--sb-text)] hover:bg-[var(--sb-surface-muted)]",
        ghost: "hover:bg-[var(--sb-surface-muted)]",
        success: "border-[var(--sb-success)] bg-[var(--sb-success)] text-white hover:bg-[var(--sb-green-700)]",
        destructive: "border-[var(--sb-danger)] bg-white text-[var(--sb-danger)] hover:bg-[var(--sb-danger-bg)]",
      },
      size: {
        default: "h-[var(--sb-control-height)] px-3",
        sm: "h-[var(--sb-control-height)] px-2.5 text-xs",
        lg: "h-12 px-4 sm:h-10",
        icon: "h-[var(--sb-control-height)] w-[var(--sb-control-height)] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
