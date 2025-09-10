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
        "w-full h-20 rounded-xl shadow-md transition-all duration-200",
        // Gradient background (salmon to peach)
        "bg-gradient-to-r from-[var(--dn-meal-from)] to-[var(--dn-meal-to)]",
        // Layout
        "flex items-center justify-start px-5 gap-3",
        // Text styling
        "text-white font-medium",
        // Hover effects
        "hover:scale-[1.02] hover:shadow-lg",
        // Focus styles for accessibility
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-500",
        className
      )}
      aria-label={`Acessar ${title}`}
    >
      <Icon className="h-5 w-5 text-white flex-shrink-0" />
      <span className="text-white">{title}</span>
    </button>
  );
}