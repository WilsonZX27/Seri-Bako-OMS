import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-[var(--sb-control-height)] max-w-full items-center justify-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-none border border-transparent px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 sm:text-xs",
  {
    variants: {
      variant: {
        default: "bg-[var(--sb-amber-700)] text-white hover:bg-[var(--sb-amber-600)]",
        secondary: "border-[var(--sb-border)] bg-white text-[var(--sb-text)] hover:bg-[var(--sb-surface-muted)]",
        outline: "border-[var(--sb-border)] bg-white text-[var(--sb-text)] hover:bg-[var(--sb-surface-muted)]",
        ghost: "hover:bg-[var(--sb-surface-muted)]",
        destructive: "border-[var(--sb-danger)] bg-white text-[var(--sb-danger)] hover:bg-[var(--sb-danger-bg)]",
      },
      size: {
        default: "h-[var(--sb-control-height)] px-3",
        sm: "h-[var(--sb-control-height)] px-2.5 text-sm sm:text-xs",
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
