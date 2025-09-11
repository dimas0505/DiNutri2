import * as React from "react";
import { cn } from "@/lib/utils";
import { Home, User, ShieldCheck } from "lucide-react"; // FileText removed

interface DNutriBottomNavProps {
  className?: string;
  onItemClick?: (item: string) => void;
  activeItem?: string;
}

// 1. Define left and right navigation items
const leftItems = [
  { id: "home", icon: Home, label: "Início" },
];

const rightItems = [
  { id: "profile", icon: User, label: "Perfil" },
];

export function DNutriBottomNav({ className, onItemClick, activeItem = "home" }: DNutriBottomNavProps) {
  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
    }
  };

  // Internal component to avoid code repetition
  const NavLink = ({ id, icon: Icon, label }: { id: string; icon: React.FC<any>; label: string }) => (
    <button
      onClick={() => handleItemClick(id)}
      className={cn(
        "flex w-20 flex-col items-center justify-center gap-1 text-xs text-white/70 transition-colors hover:text-white",
        "min-h-[60px] px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-500",
        "active:scale-95",
        activeItem === id && "text-white"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        // Purple gradient background
        "bg-gradient-to-r from-[var(--dn-header-from)] to-[var(--dn-header-to)]",
        "px-4 py-2",
        "safe-area-inset-bottom",
        className
      )}
    >
      {/* 2. Updated main layout to Flexbox */}
      <div className="flex h-16 items-center justify-between max-w-screen-sm mx-auto">
        {/* Left Items */}
        <div className="flex items-center gap-4">
          {leftItems.map((item) => (
            <NavLink key={item.id} {...item} />
          ))}
        </div>

        {/* 3. Central Highlighted Button */}
        <div className="-mt-4">
          <button
            onClick={() => handleItemClick("my-plan")}
            className={cn(
              "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-full bg-white text-xs shadow-lg transition-all hover:shadow-xl",
              "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-500",
              "active:scale-95",
              // Use gradient text color to match the nav background
              "text-purple-600 font-semibold",
              activeItem === "my-plan" && "ring-2 ring-white ring-offset-2 ring-offset-purple-500"
            )}
          >
            <ShieldCheck className="h-5 w-5" />
            {/* Full text display without truncation */}
            <span className="text-[9px] leading-tight">Meu Plano</span>
          </button>
        </div>

        {/* Right Items */}
        <div className="flex items-center gap-4">
          {rightItems.map((item) => (
            <NavLink key={item.id} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}