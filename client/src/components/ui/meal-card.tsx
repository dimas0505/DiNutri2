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
        // Base styles with modern design
        "group w-full h-28 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300",
        // Enhanced gradient background
        "bg-gradient-to-br from-[var(--dn-meal-from)] to-[var(--dn-meal-to)]",
        // Layout
        "flex items-center justify-start px-6 gap-4 relative overflow-hidden",
        // Text styling
        "text-white font-semibold text-lg",
        // Enhanced hover effects
        "hover:scale-[1.03] hover:shadow-2xl transform-gpu",
        // Focus styles for accessibility
        "focus:outline-none focus:ring-3 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-purple-500",
        // Touch optimizations
        "active:scale-[0.98] touch-target",
        className
      )}
      aria-label={`Acessar ${title}`}
    >
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Icon with glassmorphism container */}
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:bg-white/30 transition-all duration-300">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 relative z-10">
        <span className="text-white group-hover:drop-shadow-lg transition-all duration-300">{title}</span>
        <div className="text-white/80 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Toque para ver detalhes
        </div>
      </div>
      
      {/* Arrow indicator */}
      <div className="relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">
        <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}