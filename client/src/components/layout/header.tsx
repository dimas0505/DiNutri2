import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Header({ title, subtitle, leftElement, rightElement, children }: HeaderProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {leftElement}
          {children ? (
            children
          ) : (
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">WebDiet</h1>
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
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
