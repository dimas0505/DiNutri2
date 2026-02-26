import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/components/mobile";
import { BottomNavigation } from "@/components/mobile";
import { useAuth } from "@/hooks/useAuth";
import { Home, Users, FileText, User, LogOut, Shield, UserPlus, Settings, ShieldCheck, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  showBottomNav?: boolean;
  hideHeader?: boolean;
  drawerContent?: React.ReactNode;
}

interface LayoutNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function MobileLayout({
  children,
  title,
  subtitle,
  showBack = false,
  showBackButton,
  onBack,
  className,
  showBottomNav = true,
  hideHeader = false,
  drawerContent,
}: MobileLayoutProps) {
  const isMobile = useIsMobile();
  const { isPatient, isNutritionist } = useAuth();
  const [location] = useLocation();

  const navItems: LayoutNavItem[] = isPatient
    ? [
        { icon: Home, label: "Início", href: "/dashboard" },
        { icon: BookOpen, label: "Diário", href: "/diary" },
        { icon: User, label: "Perfil", href: "/profile" },
      ]
    : isNutritionist
      ? [
          { icon: Users, label: "Pacientes", href: "/patients" },
          { icon: User, label: "Perfil", href: "/admin/profile" },
        ]
      : [];

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {!hideHeader && (
        <MobileHeader
          title={title}
          subtitle={subtitle}
          showBack={showBackButton ?? showBack}
          onBack={onBack}
          drawerContent={drawerContent}
        />
      )}

      <main className={cn("mobile-container", showBottomNav && navItems.length > 0 && "pb-20", className)}>
        {children}
      </main>

      {showBottomNav && navItems.length > 0 && <BottomNavigation items={navItems} currentPath={location} />}
    </div>
  );
}

// Default drawer content for authenticated users
interface DefaultMobileDrawerProps {
  onProfileClick?: () => void;
}

export function DefaultMobileDrawer({ onProfileClick }: DefaultMobileDrawerProps = {}) {
  const { isNutritionist, isPatient, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    ...(isAdmin
      ? [
          { label: "Painel Principal", href: "/admin", icon: Shield, action: "navigate" },
          { label: "Criar Usuário", href: "/admin/create-user", icon: UserPlus, action: "navigate" },
          { label: "Meu Perfil", href: "/admin/profile", icon: Settings, action: "navigate" },
        ]
      : []),
    ...(isNutritionist
      ? [
          { label: "Pacientes", href: "/patients", icon: Users, action: "navigate" },
          { label: "Nova Prescrição", href: "/patients/new", icon: FileText, action: "navigate" },
        ]
      : []),
    ...(isPatient
      ? [
          { label: "Início", href: "/dashboard", icon: Home, action: "navigate" },
          { label: "Meu Plano", href: "/my-plan", icon: ShieldCheck, action: "navigate" },
          { label: "Prescrições", href: "/patient/prescriptions", icon: FileText, action: "navigate" },
          { label: "Perfil", href: "/profile", icon: User, action: "navigate" },
        ]
      : []),
  ];

  const handleItemClick = (item: any) => {
    if (item.action === "navigate") {
      setLocation(item.href);
    } else if (item.action === "profile" && onProfileClick) {
      onProfileClick();
    }
  };

  return (
    <div className="space-y-2">
      {navigationItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={`${item.label}-${index}`}
            onClick={() => handleItemClick(item)}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-accent rounded-lg transition-colors"
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}

      {navigationItems.length > 0 && (
        <div className="border-t pt-2 mt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-accent rounded-lg transition-colors text-red-600 hover:text-red-700"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}
