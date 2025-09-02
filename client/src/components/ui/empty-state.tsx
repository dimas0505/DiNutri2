import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline"
  }
  className?: string
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center p-8 space-y-4",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 text-muted-foreground mb-2">
            {icon}
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-sm">
              {description}
            </p>
          )}
        </div>

        {action && (
          <Button
            variant={action.variant || "default"}
            onClick={action.onClick}
            className="mt-4"
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

// Specific empty state variants
export interface EmptyStateVariantProps {
  onAction?: () => void
  className?: string
}

const NoDataEmptyState = React.forwardRef<HTMLDivElement, EmptyStateVariantProps>(
  ({ onAction, className, ...props }, ref) => {
    return (
      <EmptyState
        ref={ref}
        icon={
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        title="Nenhum dado encontrado"
        description="Não há informações para exibir no momento."
        action={onAction ? { label: "Recarregar", onClick: onAction } : undefined}
        className={className}
        {...props}
      />
    )
  }
)
NoDataEmptyState.displayName = "NoDataEmptyState"

const NoResultsEmptyState = React.forwardRef<HTMLDivElement, EmptyStateVariantProps>(
  ({ onAction, className, ...props }, ref) => {
    return (
      <EmptyState
        ref={ref}
        icon={
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        title="Nenhum resultado encontrado"
        description="Tente ajustar os filtros ou termos de busca."
        action={onAction ? { label: "Limpar filtros", onClick: onAction, variant: "outline" } : undefined}
        className={className}
        {...props}
      />
    )
  }
)
NoResultsEmptyState.displayName = "NoResultsEmptyState"

const ErrorEmptyState = React.forwardRef<HTMLDivElement, EmptyStateVariantProps>(
  ({ onAction, className, ...props }, ref) => {
    return (
      <EmptyState
        ref={ref}
        icon={
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.081 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        }
        title="Erro ao carregar dados"
        description="Ocorreu um problema ao buscar as informações. Tente novamente."
        action={onAction ? { label: "Tentar novamente", onClick: onAction } : undefined}
        className={className}
        {...props}
      />
    )
  }
)
ErrorEmptyState.displayName = "ErrorEmptyState"

export { EmptyState, NoDataEmptyState, NoResultsEmptyState, ErrorEmptyState }