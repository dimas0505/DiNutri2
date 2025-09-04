import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/components/mobile";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  drawerContent?: React.ReactNode;
  className?: string;
}

export default function Header({ 
  title, 
  subtitle, 
  leftElement, 
  rightElement, 
  children, 
  showBack,
  onBack,
  drawerContent,
  className
}: HeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    // Redireciona diretamente para a rota de logout que fará o redirecionamento
    window.location.href = "/api/logout";
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  // On mobile, use the MobileHeader component
  if (isMobile) {
    return (
      <MobileHeader
        title={title}
        subtitle={subtitle}
        leftElement={leftElement}
        rightElement={rightElement}
        showBack={showBack}
        onBack={onBack}
        drawerContent={drawerContent}
        className={className}
      >
        {children}
      </MobileHeader>
    );
  }

  // Desktop header
  return (
    <header className={cn("bg-card border-b border-border px-4 py-3", className)}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              title="Voltar"
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Button>
          )}
          {leftElement}
          {children ? (
            children
          ) : (
            <div className="flex items-center space-x-4">
              <DiNutriLogo size="sm" variant="full" />
              {title && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <div>
                    <span className="text-foreground font-medium" data-testid="text-page-title">{title}</span>
                    {subtitle && (
                      <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">{subtitle}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {rightElement}
          <span className="text-sm text-muted-foreground" data-testid="text-user-name">
            {(user as any)?.firstName || (user as any)?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Sair"
            data-testid="button-logout"
            className="h-8 w-8 p-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}