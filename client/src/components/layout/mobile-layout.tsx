import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/components/mobile";
import { BottomNavigation } from "@/components/mobile";
import { useAuth } from "@/hooks/useAuth";
import { Home, Users, FileText, User, Menu, LogOut, Shield, UserPlus, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  className?: string;
  showBottomNav?: boolean;
  drawerContent?: React.ReactNode;
}

export function MobileLayout({
  children,
  title,
  subtitle,
  showBack = false,
  onBack,
  className,
  showBottomNav = true,
  drawerContent,
}: MobileLayoutProps) {
  const isMobile = useIsMobile();
  const { isNutritionist, isPatient } = useAuth();
  const [location, setLocation] = useLocation();

  // Navigation items based on user role
  const getNavigationItems = () => {
    if (isNutritionist) {
      return [
        {
          id: 'patients',
          label: 'Pacientes',
          icon: Users,
          href: '/patients',
          active: location.startsWith('/patients'),
        },
        {
          id: 'profile',
          label: 'Perfil',
          icon: User,
          href: '/profile',
          active: location.startsWith('/profile'),
        },
      ];
    } else if (isPatient) {
      return [
        {
          id: 'home',
          label: 'Início',
          icon: Home,
          href: '/',
          active: location === '/',
        },
        {
          id: 'prescription',
          label: 'Prescrição',
          icon: FileText,
          href: '/patient/prescription',
          active: location.startsWith('/patient/prescription'),
        },
        {
          id: 'profile',
          label: 'Perfil',
          icon: User,
          href: '/patient/profile',
          active: location.startsWith('/patient/profile'),
        },
      ];
    }
    return [];
  };

  const handleBottomNavClick = (item: any) => {
    setLocation(item.href);
  };

  if (!isMobile) {
    // Return children without mobile layout on desktop
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        drawerContent={drawerContent}
      />
      
      <main className={cn(
        "mobile-container",
        showBottomNav && "pb-20", // Add padding for bottom navigation
        className
      )}>
        {children}
      </main>

      {showBottomNav && (
        <BottomNavigation
          items={getNavigationItems()}
          onItemClick={handleBottomNavClick}
        />
      )}
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
    // Redireciona diretamente para a rota de logout que fará o redirecionamento
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    ...(isAdmin ? [
      { label: 'Painel Principal', href: '/admin', icon: Shield, action: 'navigate' },
      { label: 'Criar Usuário', href: '/admin/create-user', icon: UserPlus, action: 'navigate' },
      { label: 'Meu Perfil', href: '/admin/profile', icon: Settings, action: 'navigate' },
    ] : []),
    ...(isNutritionist ? [
      { label: 'Pacientes', href: '/patients', icon: Users, action: 'navigate' },
      { label: 'Nova Prescrição', href: '/patients/new', icon: FileText, action: 'navigate' },
    ] : []),
    ...(isPatient ? [
      { label: 'Minha Prescrição', href: '/patient/prescription', icon: FileText, action: 'navigate' },
      { label: 'Perfil', href: '', icon: User, action: 'profile' },
    ] : []),
  ];

  const handleItemClick = (item: any) => {
    if (item.action === 'navigate') {
      setLocation(item.href);
    } else if (item.action === 'profile' && onProfileClick) {
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
      
      {/* Separator and logout option */}
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