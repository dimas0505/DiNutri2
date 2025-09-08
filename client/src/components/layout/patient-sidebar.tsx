// client/src/components/layout/patient-sidebar.tsx

import { Link, useLocation } from "wouter";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Home, Notebook, UtensilsCrossed } from "lucide-react";

// Itens de navegação da barra lateral
const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/patient/prescriptions", label: "Meus Planos", icon: UtensilsCrossed },
  { href: "/diary", label: "Diário Alimentar", icon: Notebook },
];

export function PatientSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const getInitials = (firstName: string, lastName: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.email || "Usuário";

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-gray-50 lg:flex">
      <div className="flex h-16 items-center justify-center border-b">
        <DiNutriLogo variant="full" className="h-10" />
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-2 text-gray-700 transition-colors hover:bg-primary/10 hover:text-primary",
              location === item.href && "bg-primary/10 font-semibold text-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback>{getInitials(user?.firstName || "", user?.lastName || "")}</AvatarFallback>
              </Avatar>
              <span className="truncate">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}