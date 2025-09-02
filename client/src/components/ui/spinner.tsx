import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary-foreground",
        muted: "text-muted-foreground",
        destructive: "text-destructive",
        success: "text-success",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant, className }))}
        {...props}
      />
    )
  }
)
Spinner.displayName = "Spinner"

// Enhanced loading state component
export interface LoadingStateProps {
  size?: "sm" | "default" | "lg" | "xl"
  text?: string
  className?: string
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ size = "default", text = "Carregando...", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}
        {...props}
      >
        <Spinner size={size} />
        {text && (
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            {text}
          </p>
        )}
      </div>
    )
  }
)
LoadingState.displayName = "LoadingState"

// Pulse loading dots
const PulseDots = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex space-x-1", className)}
        {...props}
      >
        <div className="h-2 w-2 bg-current rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-current rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-current rounded-full animate-pulse"></div>
      </div>
    )
  }
)
PulseDots.displayName = "PulseDots"

export { Spinner, LoadingState, PulseDots, spinnerVariants }