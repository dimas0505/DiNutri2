import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        destructive:
          "bg-gradient-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-gradient-secondary text-secondary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm rounded-lg",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        success: "bg-gradient-success text-success-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        warning: "bg-gradient-warning text-warning-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        accent: "bg-gradient-accent text-accent-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        emerald: "bg-gradient-emerald text-accent-emerald-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        orange: "bg-gradient-orange text-accent-orange-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        purple: "bg-gradient-purple text-accent-purple-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        info: "bg-gradient-info text-info-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        vibrant: "bg-gradient-primary-vibrant text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs font-medium",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
