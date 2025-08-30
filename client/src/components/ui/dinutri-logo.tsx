import React from "react";
import { cn } from "@/lib/utils";

interface DiNutriLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8", 
  lg: "h-12 w-12",
  xl: "h-16 w-16"
};

export function DiNutriLogo({ 
  className, 
  size = "md", 
  variant = "icon" 
}: DiNutriLogoProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* DiNutri Icon */}
      <div className={cn("relative", sizeClasses[size])}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Outer circle with gradient */}
          <circle
            cx="20"
            cy="20"
            r="18"
            className="fill-primary"
            style={{
              fill: "url(#gradient1)"
            }}
          />
          
          {/* Inner leaf/nutrition symbol */}
          <path
            d="M12 20C12 15.5 15.5 12 20 12C24.5 12 28 15.5 28 20C28 24.5 24.5 28 20 28C15.5 28 12 24.5 12 20Z"
            className="fill-white"
            fillOpacity="0.9"
          />
          
          {/* Nutrition/leaf detail */}
          <path
            d="M16 20C16 17.8 17.8 16 20 16C22.2 16 24 17.8 24 20C24 22.2 22.2 24 20 24C17.8 24 16 22.2 16 20Z"
            className="fill-primary"
            style={{
              fill: "url(#gradient2)"
            }}
          />
          
          {/* Central dot */}
          <circle
            cx="20"
            cy="20"
            r="2"
            className="fill-white"
          />
          
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "hsl(221.2 83.2% 53.3%)" }} />
              <stop offset="100%" style={{ stopColor: "hsl(142.1 76.2% 36.3%)" }} />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "hsl(142.1 76.2% 36.3%)" }} />
              <stop offset="100%" style={{ stopColor: "hsl(221.2 83.2% 53.3%)" }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Text logo */}
      {variant === "full" && (
        <div className="flex flex-col">
          <span className="font-bold text-primary text-lg leading-none">
            DiNutri
          </span>
          <span className="text-xs text-muted-foreground leading-none">
            NUTRIÇÃO
          </span>
        </div>
      )}
    </div>
  );
}