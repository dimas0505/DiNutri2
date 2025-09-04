import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MealCardProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function MealCard({ title, icon: Icon, onClick, className }: MealCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles
        "w-full min-h-[80px] md:min-h-[88px] rounded-xl shadow-sm transition-all duration-300",
        // Gradient background (salmon to peach) with better contrast
        "bg-gradient-to-r from-[var(--dn-meal-from)] to-[var(--dn-meal-to)]",
        // Layout with better spacing
        "flex items-center justify-between px-6 py-4 gap-4",
        // Text styling with better hierarchy
        "text-white font-medium text-base md:text-lg",
        // Enhanced hover effects
        "hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]",
        // Better focus styles for accessibility
        "focus:outline-none focus:ring-3 focus:ring-purple-300 focus:ring-offset-2",
        // Improved mobile touch targets
        "touch-manipulation",
        className
      )}
      aria-label={`Acessar detalhes de ${title}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
          <Icon className="h-6 w-6 text-white flex-shrink-0" />
        </div>
        <div className="text-left flex-1">
          <span className="text-white font-semibold block leading-tight">
            {title}
          </span>
          <span className="text-white/80 text-sm font-normal">
            Toque para ver detalhes
          </span>
        </div>
      </div>
      
      {/* Arrow indicator */}
      <div className="text-white/60 group-hover:text-white transition-colors duration-200">
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 5l7 7-7 7" 
          />
        </svg>
      </div>
    </button>
  );
}