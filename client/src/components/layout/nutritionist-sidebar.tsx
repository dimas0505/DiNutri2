import { LogOut, Home, Settings, Package2, Users2, Calendar, FileText, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

export function NutritionistSidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/patients"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Package2 className="h-4 w-4 transition-all group-hover:scale-110" />
          <span className="sr-only">DiNutri</span>
        </Link>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/patients"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              data-active={location.startsWith('/patients')}
            >
              <Users2 className="h-5 w-5" />
              <span className="sr-only">Pacientes</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Pacientes</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/subscriptions"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              data-active={location.startsWith('/subscriptions')}
            >
              <CreditCard className="h-5 w-5" />
              <span className="sr-only">Assinaturas</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Assinaturas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
            >
              <Calendar className="h-5 w-5" />
              <span className="sr-only">Agenda</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Agenda</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/reports"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              data-active={location.startsWith('/reports')}
            >
              <FileText className="h-5 w-5" />
              <span className="sr-only">Relatórios</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Relatórios</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Configurações</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Configurações</TooltipContent>
        </Tooltip>
      </nav>

      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Sair</TooltipContent>
        </Tooltip>
      </nav>
    </aside>
  );
}