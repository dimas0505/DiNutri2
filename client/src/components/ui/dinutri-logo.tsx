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
  if (variant === "full") {
    // Full horizontal logo with icon and text
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        {/* DiNutri Icon */}
        <div className={cn("relative", sizeClasses[size])}>
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
          >
            {/* Outer circle with blue to purple gradient */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="url(#dinutriGradient)"
            />
            
            {/* White leaf/apple shape - main body */}
            <path
              d="M50 20C40 20 32 28 32 38C32 48 40 56 50 56C60 56 68 48 68 38C68 28 60 20 50 20Z"
              fill="white"
            />
            
            {/* Leaf stem */}
            <ellipse
              cx="54"
              cy="15"
              rx="6"
              ry="2.5"
              fill="url(#dinutriGradient)"
              transform="rotate(25 54 15)"
            />
            
            {/* Small nutrition squares inside the circle */}
            <rect x="40" y="65" width="3" height="3" rx="0.5" fill="#4285F4"/>
            <rect x="46" y="68" width="2.5" height="2.5" rx="0.5" fill="#4285F4"/>
            <rect x="54" y="68" width="2.5" height="2.5" rx="0.5" fill="#4285F4"/>
            <rect x="60" y="65" width="3" height="3" rx="0.5" fill="#4285F4"/>
            
            {/* Central nutrition elements in the white area */}
            <circle cx="44" cy="35" r="1.5" fill="url(#dinutriGradient)"/>
            <circle cx="56" cy="32" r="1" fill="url(#dinutriGradient)"/>
            <rect x="48" y="42" width="1.5" height="1.5" rx="0.5" fill="url(#dinutriGradient)"/>
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="dinutriGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285F4"/>
                <stop offset="50%" stopColor="#5B63F7"/>
                <stop offset="100%" stopColor="#8B5FBF"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Text logo */}
        <span 
          className="font-bold text-2xl leading-none bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 bg-clip-text text-transparent"
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: '700'
          }}
        >
          DiNutri
        </span>
      </div>
    );
  }
  
  // Icon only variant
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        {/* Outer circle with blue to purple gradient */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#dinutriGradient)"
        />
        
        {/* White leaf/apple shape - main body */}
        <path
          d="M50 20C40 20 32 28 32 38C32 48 40 56 50 56C60 56 68 48 68 38C68 28 60 20 50 20Z"
          fill="white"
        />
        
        {/* Leaf stem */}
        <ellipse
          cx="54"
          cy="15"
          rx="6"
          ry="2.5"
          fill="url(#dinutriGradient)"
          transform="rotate(25 54 15)"
        />
        
        {/* Small nutrition squares inside the circle */}
        <rect x="40" y="65" width="3" height="3" rx="0.5" fill="#4285F4"/>
        <rect x="46" y="68" width="2.5" height="2.5" rx="0.5" fill="#4285F4"/>
        <rect x="54" y="68" width="2.5" height="2.5" rx="0.5" fill="#4285F4"/>
        <rect x="60" y="65" width="3" height="3" rx="0.5" fill="#4285F4"/>
        
        {/* Central nutrition elements in the white area */}
        <circle cx="44" cy="35" r="1.5" fill="url(#dinutriGradient)"/>
        <circle cx="56" cy="32" r="1" fill="url(#dinutriGradient)"/>
        <rect x="48" y="42" width="1.5" height="1.5" rx="0.5" fill="url(#dinutriGradient)"/>
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="dinutriGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4"/>
            <stop offset="50%" stopColor="#5B63F7"/>
            <stop offset="100%" stopColor="#8B5FBF"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}