import * as React from "react";
import { cn } from "@/lib/utils";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { GoalCard } from "@/components/ui/goal-card";
import { useAuth } from "@/hooks/useAuth";
import { MobileDrawer } from "@/components/mobile/drawer";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderDNutriProps {
  className?: string;
  showGoalCard?: boolean;
  goalText?: string;
}

export function HeaderDNutri({ 
  className, 
  showGoalCard = true, 
  goalText = "Déficit 1000 kcal" 
}: HeaderDNutriProps) {
  const { user } = useAuth();
  const userName = (user as any)?.firstName || (user as any)?.email?.split('@')[0] || "Usuário";

  const handleLogout = () => {
    // Redireciona diretamente para a rota de logout que fará o redirecionamento
    window.location.href = "/api/logout";
  };

  return (
    <header 
      className={cn(
        // Purple gradient background
        "bg-gradient-to-r from-[var(--dn-header-from)] to-[var(--dn-header-to)]",
        // Layout
        "px-4 py-3 pb-0",
        // Safe area for mobile
        "safe-area-inset-top",
        className
      )}
    >
      {/* Top bar with hamburger menu, logo and user actions */}
      <div className="flex items-center justify-between mb-4">
        {/* Left side: Hamburger menu + Logo */}
        <div className="flex items-center space-x-3">
          {/* Hamburger menu */}
          <MobileDrawer title="Menu">
            <DefaultMobileDrawer />
          </MobileDrawer>
          
          {/* Logo */}
          <DiNutriLogo 
            size="sm" 
            variant="full" 
            className="h-8 brightness-0 invert" // Make logo white
          />
        </div>
        
        {/* Right side: User chip with logout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 transition-all hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-500"
              aria-label={`Menu do usuário: ${userName}`}
            >
              <span className="text-white text-sm font-medium">
                {userName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Goal card */}
      {showGoalCard && (
        <GoalCard goal={goalText} />
      )}
    </header>
  );
}