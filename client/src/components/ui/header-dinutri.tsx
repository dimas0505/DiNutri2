import * as React from "react";
import { cn } from "@/lib/utils";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { GoalCard } from "@/components/ui/goal-card";
import { useAuth } from "@/hooks/useAuth";
import { MobileDrawer } from "@/components/mobile/drawer";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";

interface HeaderDNutriProps {
  className?: string;
  showGoalCard?: boolean;
  goalText?: string;
  onProfileClick?: () => void;
}

export function HeaderDNutri({ 
  className, 
  showGoalCard = true, 
  goalText = "Seu Plano Alimentar",
  onProfileClick
}: HeaderDNutriProps) {
  const { user } = useAuth();
  const userName = (user as any)?.firstName || (user as any)?.email?.split('@')[0] || "Usuário";

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
      {/* Top bar with hamburger menu, logo and user chip */}
      <div className="flex items-center justify-between mb-4">
        {/* Left side: Hamburger menu + Logo */}
        <div className="flex items-center space-x-3">
          {/* Hamburger menu */}
          <MobileDrawer title="Menu">
            <DefaultMobileDrawer onProfileClick={onProfileClick} />
          </MobileDrawer>
          
          {/* Logo */}
          <DiNutriLogo 
            size="sm" 
            variant="full" 
            className="h-8 brightness-0 invert" // Make logo white
          />
        </div>
        
        {/* Right side: User chip (display only) */}
        <div 
          className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
          aria-label={`Usuário: ${userName}`}
        >
          <span className="text-white text-sm font-medium">
            {userName}
          </span>
        </div>
      </div>

      {/* Goal card */}
      {showGoalCard && (
        <GoalCard goal={goalText} />
      )}
    </header>
  );
}