import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export type PatientModuleItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type PatientLayoutProps = {
  modules: PatientModuleItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  children: ReactNode;
};

export function PatientLayout({ modules, activeModule, onModuleChange, children }: PatientLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <aside className="lg:sticky lg:top-24 h-fit">
        <Card className="p-3 border border-border/70 shadow-sm rounded-2xl">
          <p className="px-2 pb-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Módulos do paciente</p>
          <nav className="space-y-1">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Button
                  key={module.id}
                  variant="ghost"
                  onClick={() => onModuleChange(module.id)}
                  className={cn(
                    "w-full justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    activeModule === module.id
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {module.label}
                </Button>
              );
            })}
          </nav>
        </Card>
      </aside>

      <section className="space-y-6 min-w-0">{children}</section>
    </div>
  );
}
