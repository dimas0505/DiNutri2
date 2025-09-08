import * as React from "react";
import { LogOut, Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { cn } from "@/lib/utils";
import { MobileDrawer } from "./drawer";

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  drawerContent?: React.ReactNode;
}

export function MobileHeader({ 
  title, 
  subtitle, 
  showBack = false,
  onBack,
  leftElement, 
  rightElement, 
  children,
  className,
  drawerContent
}: MobileHeaderProps) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    console.debug('[logout] click');
    try {
      await logout();
    } catch (error) {
      console.error('Erro durante o logout:', error);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (!isMobile) {
    return null; // Use regular header on desktop
  }

  return (
    <header className={cn(
      "bg-card border-b border-border px-4 py-3",
      "safe-area-inset-top",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showBack ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Button>
          ) : drawerContent ? (
            <MobileDrawer title="Menu">
              {drawerContent}
            </MobileDrawer>
          ) : null}
          
          {leftElement}
          
          {children ? (
            children
          ) : (
            <div className="flex items-center space-x-3">
              <DiNutriLogo size="sm" variant="full" />
              {title && (
                <>
                  <span className="text-muted-foreground text-sm">|</span>
                  <div>
                    <span className="text-foreground font-medium text-sm truncate max-w-[120px]">
                      {title}
                    </span>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {rightElement}
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {(user as any)?.firstName || (user as any)?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Sair"
              className="h-8 w-8 p-0"
              data-testid="logout-button"
            >
              <LogOut className="h-3 w-3" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}