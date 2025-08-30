import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  touchOptimized?: boolean;
}

export function MobileCard({ 
  className, 
  children, 
  padding = "md",
  interactive = false,
  touchOptimized = true,
  ...props 
}: MobileCardProps) {
  const isMobile = useIsMobile();

  const paddingClasses = {
    none: "",
    sm: "p-2 sm:p-3",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        paddingClasses[padding],
        interactive && [
          "cursor-pointer transition-all duration-200",
          "hover:shadow-md active:scale-[0.98]",
          isMobile && touchOptimized && "active:bg-accent/50",
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface MobileCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function MobileCardHeader({ className, children, ...props }: MobileCardHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface MobileCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function MobileCardTitle({ className, children, size = "md", ...props }: MobileCardTitleProps) {
  const sizeClasses = {
    sm: "text-base sm:text-lg",
    md: "text-lg sm:text-xl",
    lg: "text-xl sm:text-2xl",
  };

  return (
    <h3
      className={cn(
        "font-semibold leading-none tracking-tight",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

interface MobileCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function MobileCardDescription({ className, children, ...props }: MobileCardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

interface MobileCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function MobileCardContent({ className, children, ...props }: MobileCardContentProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}

interface MobileCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function MobileCardFooter({ className, children, ...props }: MobileCardFooterProps) {
  return (
    <div
      className={cn("flex items-center justify-between pt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}