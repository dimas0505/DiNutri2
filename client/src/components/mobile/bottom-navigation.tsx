import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
}

interface BottomNavigationProps {
  items: BottomNavItem[];
  className?: string;
  onItemClick?: (item: BottomNavItem) => void;
}

export function BottomNavigation({ items, className, onItemClick }: BottomNavigationProps) {
  const handleItemClick = (item: BottomNavItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
    if (item.onClick) {
      item.onClick();
    }
    if (item.href) {
      window.location.href = item.href;
    }
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-background border-t border-border",
        "px-2 py-1",
        "safe-area-inset-bottom",
        className
      )}
    >
      <div className="flex items-center justify-around max-w-screen-sm mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-h-[60px] px-2 py-2",
                "text-xs font-medium",
                "transition-colors duration-200",
                "relative",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "active:scale-95 transition-transform",
                item.active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative mb-1">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <span className={cn(
                    "absolute -top-2 -right-2",
                    "flex items-center justify-center",
                    "min-w-[18px] h-[18px] px-1",
                    "bg-destructive text-destructive-foreground",
                    "text-xs font-bold rounded-full",
                    "border-2 border-background"
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[60px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}