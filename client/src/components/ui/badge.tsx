import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-primary text-primary-foreground hover:shadow-md shadow-primary hover:scale-105",
        secondary:
          "border-transparent bg-gradient-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm",
        destructive:
          "border-transparent bg-gradient-destructive text-destructive-foreground hover:shadow-md shadow-destructive hover:scale-105",
        success:
          "border-transparent bg-gradient-success text-success-foreground hover:shadow-md shadow-success hover:scale-105",
        warning:
          "border-transparent bg-gradient-warning text-warning-foreground hover:shadow-md shadow-warning hover:scale-105",
        emerald:
          "border-transparent bg-gradient-emerald text-accent-emerald-foreground hover:shadow-md shadow-success hover:scale-105",
        orange:
          "border-transparent bg-gradient-orange text-accent-orange-foreground hover:shadow-md shadow-warning hover:scale-105",
        purple:
          "border-transparent bg-gradient-purple text-accent-purple-foreground hover:shadow-md shadow-primary hover:scale-105",
        info:
          "border-transparent bg-gradient-info text-info-foreground hover:shadow-md shadow-primary hover:scale-105",
        outline: "text-foreground border-border hover:bg-accent hover:text-accent-foreground",
        subtle: "bg-muted text-muted-foreground hover:bg-muted/80",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
