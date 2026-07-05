import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-gh-canvas",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border dark:border-gh-border dark:bg-gh-neutral dark:text-gh-fg dark:hover:bg-gh-neutral-emphasis",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-50 dark:border-gh-border dark:bg-gh-canvas-subtle dark:hover:bg-gh-neutral",
        ghost: "hover:bg-slate-100 dark:hover:bg-gh-neutral",
        destructive: "bg-red-600 text-white hover:bg-red-700 dark:bg-gh-danger dark:hover:bg-[#da3633]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
