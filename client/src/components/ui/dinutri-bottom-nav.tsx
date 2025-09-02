import * as React from "react";
import { cn } from "@/lib/utils";
import { Home, FileText, User } from "lucide-react";

interface DNutriBottomNavProps {
  className?: string;
  onItemClick?: (item: string) => void;
  activeItem?: string;
}

export function DNutriBottomNav({ className, onItemClick, activeItem = "home" }: DNutriBottomNavProps) {
  const navItems = [
    { id: "home", icon: Home, label: "Início" },
    { id: "prescription", icon: FileText, label: "Prescrição" },
    { id: "profile", icon: User, label: "Perfil" },
  ];

  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
    }
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        // Purple gradient background
        "bg-gradient-to-r from-[var(--dn-header-from)] to-[var(--dn-header-to)]",
        "px-2 py-2",
        "safe-area-inset-bottom",
        className
      )}
    >
      <div className="flex items-center justify-around max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-h-[60px] px-3 py-2",
                "text-xs font-medium",
                "transition-all duration-200",
                "relative",
                "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-500",
                "active:scale-95",
                isActive 
                  ? "text-white" 
                  : "text-white/70 hover:text-white"
              )}
            >
              <div className="relative mb-1">
                <Icon className="h-5 w-5" />
              </div>
              <span className="truncate max-w-[60px] text-white">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}