import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronDown, Link as LinkIcon, MoreHorizontal, Plus, Search, UserRound } from "lucide-react";
import Header from "@/components/layout/header";
import { NutritionistSidebar } from "@/components/layout/nutritionist-sidebar";
import { DefaultMobileDrawer, MobileLayout } from "@/components/layout/mobile-layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Patient } from "@shared/schema";

type DateFilter = "all" | "1m" | "2m" | "3m" | "custom";
type LoginFilter = "all" | "yes" | "no";
type GenderFilter = "all" | "M" | "F";
type SortBy = "updatedAt" | "createdAt" | "name" | "appLogin";

const DATE_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "Todo período" },
  { value: "1m", label: "1 mês atrás" },
  { value: "2m", label: "2 meses atrás" },
  { value: "3m", label: "3 meses atrás" },
  { value: "custom", label: "Personalizar data" },
];

const LOGIN_OPTIONS: Array<{ value: LoginFilter; label: string }> = [
  { value: "all", label: "Sem especificar" },
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
];

const GENDER_OPTIONS: Array<{ value: GenderFilter; label: string }> = [
  { value: "all", label: "Sem especificar" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
];

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: "updatedAt", label: "Data de modificação" },
  { value: "createdAt", label: "Data de cadastro" },
  { value: "name", label: "Ordem alfabética" },
  { value: "appLogin", label: "Login no app" },
];

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDateThreshold(filter: DateFilter): number | null {
  if (filter === "all" || filter === "custom") return null;
  const months = Number(filter.replace("m", ""));
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);
  return threshold.getTime();
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 rounded-full border-border px-3 text-xs font-medium",
              value === option.value ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-background",
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function PatientGridCard({
  patient,
  onOpen,
  onDelete,
}: {
  patient: Patient;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const updatedLabel = patient.updatedAt ? formatDate(patient.updatedAt) : "-";

  return (
    <Card
      className="cursor-pointer border-border bg-card shadow-none transition-colors hover:bg-muted/30"
      onClick={onOpen}
      data-testid={`card-patient-${patient.id}`}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground" data-testid={`text-patient-name-${patient.id}`}>
              {patient.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">Modificado em {updatedLabel}</p>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-auto px-0 py-0.5 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              + nova tag
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-muted/50">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Opções</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onOpen}>Visualizar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant={patient.userId ? "default" : "secondary"}>{patient.userId ? "Logou no app" : "Sem login"}</Badge>
          {patient.sex && <Badge variant="outline">{patient.sex === "M" ? "Masculino" : patient.sex === "F" ? "Feminino" : patient.sex}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [modifiedDateFilter, setModifiedDateFilter] = useState<DateFilter>("all");
  const [createdDateFilter, setCreatedDateFilter] = useState<DateFilter>("all");
  const [loginFilter, setLoginFilter] = useState<LoginFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");

  const hasCustomDateFilter = modifiedDateFilter === "custom" || createdDateFilter === "custom";

  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/invitations");
      return response.json();
    },
    onSuccess: (data) => {
      const url = `${window.location.origin}/anamnese?token=${data.token}`;
      setInvitationLink(url);
      toast({ title: "Link de convite gerado!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível gerar o link de convite.", variant: "destructive" });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (patientId: string) => apiRequest("DELETE", `/api/patients/${patientId}`),
    onSuccess: () => {
      toast({ title: "Paciente excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setPatientToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro ao excluir paciente",
        description: "Ocorreu um erro ao excluir o paciente. Tente novamente.",
        variant: "destructive",
      });
      setPatientToDelete(null);
    },
  });

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const modifiedThreshold = getDateThreshold(modifiedDateFilter);
    const createdThreshold = getDateThreshold(createdDateFilter);

    return [...patients]
      .filter((patient) => {
        const searchable = [
          patient.name,
          patient.email,
          patient.notes,
          patient.id,
          String(patient.weightKg ?? ""),
          String(patient.heightCm ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (query && !searchable.includes(query)) return false;

        if (loginFilter === "yes" && !patient.userId) return false;
        if (loginFilter === "no" && patient.userId) return false;

        if (genderFilter !== "all" && patient.sex !== genderFilter) return false;

        if (modifiedThreshold && patient.updatedAt) {
          const updated = new Date(patient.updatedAt).getTime();
          if (!Number.isNaN(updated) && updated < modifiedThreshold) return false;
        }

        if (createdThreshold && patient.createdAt) {
          const created = new Date(patient.createdAt).getTime();
          if (!Number.isNaN(created) && created < createdThreshold) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name, "pt-BR");
        }

        if (sortBy === "appLogin") {
          return Number(Boolean(b.userId)) - Number(Boolean(a.userId));
        }

        const left = sortBy === "createdAt" ? a.createdAt : a.updatedAt;
        const right = sortBy === "createdAt" ? b.createdAt : b.updatedAt;
        const leftTime = left ? new Date(left).getTime() : 0;
        const rightTime = right ? new Date(right).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [patients, searchQuery, modifiedDateFilter, createdDateFilter, loginFilter, genderFilter, sortBy]);

  const dashboardContent = (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pacientes cadastrados</h1>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground">
            Exportar pacientes
          </Button>
          <span aria-hidden="true">|</span>
          <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground">
            Desativar materiais em massa
          </Button>
        </div>
      </header>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="w-full sm:w-auto" onClick={() => setLocation("/patients/new")} data-testid="button-new-patient">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar paciente
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => createInvitationMutation.mutate()}
              disabled={createInvitationMutation.isPending}
              data-testid="button-invite-patient"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              {createInvitationMutation.isPending ? "Gerando..." : "Gerar convite"}
            </Button>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Busque pelo nome, apelido, CPF, telefone ou pela tag do paciente"
                className="h-10 pl-9"
                data-testid="input-search-patients"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="w-full sm:w-auto"
              data-testid="button-toggle-filters"
            >
              {filtersOpen ? "ocultar filtros" : "exibir filtros"}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
            </Button>
          </div>

          {filtersOpen && (
            <div className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <FilterGroup label="Data de modificação" options={DATE_OPTIONS} value={modifiedDateFilter} onChange={setModifiedDateFilter} />
                <FilterGroup label="Data de criação" options={DATE_OPTIONS} value={createdDateFilter} onChange={setCreatedDateFilter} />
                <FilterGroup label="Logou no app?" options={LOGIN_OPTIONS} value={loginFilter} onChange={setLoginFilter} />
                <FilterGroup label="Gênero do paciente" options={GENDER_OPTIONS} value={genderFilter} onChange={setGenderFilter} />
              </div>

              {hasCustomDateFilter && (
                <p className="text-xs text-muted-foreground">
                  Filtro por data personalizada em breve. Exibindo resultados sem limite de data personalizada.
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Ordenar resultados por:</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SORT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSortBy(option.value)}
                      className={cn(
                        "h-8 rounded-full border-border px-3 text-xs font-medium",
                        sortBy === option.value ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-background",
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Card className="col-span-full border-border bg-card">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando pacientes...</CardContent>
          </Card>
        ) : filteredPatients.length === 0 ? (
          <Card className="col-span-full border-border bg-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm font-medium text-foreground">Nenhum paciente encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou a busca para visualizar resultados.</p>
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <PatientGridCard
              key={patient.id}
              patient={patient}
              onOpen={() => setLocation(`/patients/${patient.id}`)}
              onDelete={() => setPatientToDelete(patient)}
            />
          ))
        )}
      </div>
    </main>
  );

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="hidden md:block">
          <NutritionistSidebar />
          <div className="pl-14">
            <Header title="Pacientes cadastrados" />
            {dashboardContent}
          </div>
        </div>

        <div className="md:hidden">
          <MobileLayout title="Pacientes cadastrados" drawerContent={<DefaultMobileDrawer />}>
            {dashboardContent}
          </MobileLayout>
        </div>
      </div>

      <AlertDialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O paciente e os dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {patientToDelete && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="truncate text-sm font-medium text-foreground">{patientToDelete.name}</p>
              <p className="truncate text-xs text-muted-foreground">{patientToDelete.email}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePatientMutation.isPending}
              onClick={() => patientToDelete && deletePatientMutation.mutate(patientToDelete.id)}
            >
              {deletePatientMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!invitationLink} onOpenChange={(open) => !open && setInvitationLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de convite gerado</DialogTitle>
            <DialogDescription>Envie este link para o paciente finalizar o cadastro.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
            <Input value={invitationLink || ""} readOnly className="min-w-0 flex-1" />
            <Button type="button" variant="outline" onClick={() => invitationLink && navigator.clipboard.writeText(invitationLink)}>
              <LinkIcon className="mr-2 h-4 w-4" /> Copiar
            </Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setInvitationLink(null)}>
              Fechar
            </Button>
            <Button onClick={() => createInvitationMutation.mutate()} disabled={createInvitationMutation.isPending}>
              {createInvitationMutation.isPending ? "Gerando..." : "Gerar novo link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
