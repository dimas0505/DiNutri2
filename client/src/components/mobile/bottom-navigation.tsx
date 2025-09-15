import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, User, ShieldCheck } from "lucide-react";

// 1. Defina os itens da esquerda e da direita
const leftItems = [
  { href: "/", label: "Início", icon: Home },
];

const rightItems = [
  { href: "/profile", label: "Perfil", icon: User },
];

export function BottomNavigation() {
  const [location] = useLocation();

  // Componente interno para evitar repetição de código
  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.FC<any> }) => (
    <Link href={href}>
      <a
        className={cn(
          "flex flex-col items-center justify-center",
          "min-h-[60px] px-3 py-2",
          "text-xs font-medium",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "active:scale-95 transition-transform",
          location === href
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 mb-1" />
        <span className="truncate">{label}</span>
      </a>
    </Link>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border px-2 py-1 safe-area-inset-bottom">
      <div className="flex items-center justify-between max-w-screen-sm mx-auto">
        {/* 2. Itens da esquerda */}
        <div className="flex">
          {leftItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* 3. Botão "Meu Plano" centralizado e destacado */}
        <div className="flex-1 flex justify-center">
          <Link href="/plan">
            <a
              className={cn(
                "flex flex-col items-center justify-center",
                "min-h-[70px] px-6 py-2",
                "text-xs font-bold",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "active:scale-95 transition-transform",
                "bg-primary text-primary-foreground rounded-full shadow-lg",
                "border-2 border-primary-foreground/20",
                location === "/plan"
                  ? "bg-primary/90 shadow-xl scale-105"
                  : "hover:bg-primary/90 hover:shadow-xl hover:scale-105"
              )}
            >
              <ShieldCheck className="h-6 w-6 mb-1" />
              <span className="truncate">Meu Plano</span>
            </a>
          </Link>
        </div>

        {/* 4. Itens da direita */}
        <div className="flex">
          {rightItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}