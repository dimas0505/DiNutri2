import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Subscription, Patient } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, AlertCircle, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderDNutri } from "@/components/ui/header-dinutri";
import { DNutriBottomNav } from "@/components/ui/dinutri-bottom-nav";
import { ProfileModal } from "@/components/ui/profile-modal";

export default function MyPlanPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Get current patient data
  const { data: currentPatient } = useQuery<Patient>({
    queryKey: ["/api/patient/my-profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patient/my-profile");
      return await response.json();
    },
    enabled: !!user && user.role === "patient",
  });

  const { data: subscription, isLoading: isLoadingSubscription, isError } = useQuery<Subscription>({
    queryKey: ["/api/patients", currentPatient?.id, "subscription"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients/${currentPatient?.id}/subscription`);
      return await response.json();
    },
    enabled: !!currentPatient?.id,
  });

  const renderStatusBadge = (status: Subscription['status'], expiresAt?: Date | null) => {
    // Check if subscription is actually expired based on date, regardless of status field
    const isActuallyExpired = expiresAt && expiresAt < new Date();
    
    const statusMap = {
      active: { label: isActuallyExpired ? "Expirado" : "Ativo", className: isActuallyExpired ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      pending_payment: { label: "Aguardando Pagamento", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      pending_approval: { label: "Aguardando Aprovação", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      expired: { label: "Expirado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
    };
    const config = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPlanTypeLabel = (planType: Subscription['planType']) => {
    const planMap = {
      free: "Gratuito",
      monthly: "Mensal",
      quarterly: "Trimestral"
    };
    return planMap[planType] || planType;
  };

  const daysUntilExpiry = subscription && subscription.expiresAt ? differenceInDays(subscription.expiresAt, new Date()) : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "patient") {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Acesso negado. Esta página é apenas para pacientes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const content = (
    <div className="space-y-6 pb-20 md:pb-6">
      <Card className="overflow-hidden shadow-lg border-primary/20">
        <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Meu Plano
          </CardTitle>
          <CardDescription>Visualize o status do seu plano e faça a renovação.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {isLoadingSubscription ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando informações do plano...</span>
            </div>
          ) : isError || !subscription ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sem Plano Ativo</AlertTitle>
              <AlertDescription>
                Você ainda não possui um plano ativo. Entre em contato com seu nutricionista para ativar um plano.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold capitalize">
                  Plano {getPlanTypeLabel(subscription.planType)}
                </span>
                {renderStatusBadge(subscription.status, subscription.expiresAt)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Válido até</p>
                <p className="text-lg font-semibold">
                  {subscription.expiresAt 
                    ? format(subscription.expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : "Sem expiração"
                  }
                </p>
                {subscription.expiresAt && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                  <p className="text-sm text-amber-600 font-medium">
                    Expira em {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}
                  </p>
                )}
              </div>
              {subscription.startDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Início</p>
                  <p className="text-base">
                    {format(subscription.startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
{/* --- INÍCIO DA MODIFICAÇÃO CORRIGIDA --- */}
{/* Bloco de Lógica para Notificações de Status do Plano */}
{subscription && subscription.expiresAt && (
  <>
    {/* 1. Alerta para plano JÁ EXPIRADO (Verifica a data primeiro) */}
    {new Date(subscription.expiresAt) < new Date() ? (
      <Alert 
        variant="destructive" 
        className="border-red-500 bg-red-50 dark:bg-red-950/30 shadow-lg border-2 animate-bounce-in"
      >
        <div className="flex items-start gap-3">
          <XCircle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <AlertTitle className="text-red-800 dark:text-red-200 text-lg font-bold mb-2">
              🚨 Seu plano expirou!
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300 text-base leading-relaxed">
              <div className="space-y-2">
                <p>
                  <strong>Data de expiração:</strong>{' '}
                  {format(new Date(subscription.expiresAt), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
                <p>
                  Para continuar sua consultoria e ter acesso aos seus planos, 
                  <strong> clique no botão abaixo para solicitar a renovação</strong>.
                </p>
              </div>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    ) : (
      /* 2. Alerta para plano PRESTES A EXPIRAR (só executa se o plano ainda não expirou) */
      <>
        {subscription.status === 'active' && daysUntilExpiry <= 7 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Seu plano está prestes a expirar!</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Faltam {daysUntilExpiry} dia{daysUntilExpiry !== 1 ? 's' : ''}{' '}
              para o vencimento. Renove seu plano para não perder o acesso às
              suas prescrições.
            </AlertDescription>
          </Alert>
        )}
      </>
    )}
  </>
)}
{/* --- FIM DA MODIFICAÇÃO CORRIGIDA --- */}

      {/* Renovation section - simplified for now */}
      <div className="text-center">
        <Button 
          size="lg" 
          className="w-full sm:w-auto"
          disabled={!subscription || subscription.status === 'pending_payment' || subscription.status === 'pending_approval'}
        >
          {subscription?.status === 'pending_payment' 
            ? 'Pagamento Pendente' 
            : subscription?.status === 'pending_approval'
            ? 'Aguardando Aprovação'
            : 'Solicitar Renovação'
          }
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Em breve você poderá renovar seus planos diretamente por aqui
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <HeaderDNutri 
          goalText="Meu Plano"
          onProfileClick={() => setIsProfileModalOpen(true)}
        />
        <main className="p-4">
          {content}
        </main>
        <DNutriBottomNav
          activeItem="my-plan"
          onItemClick={(item) => {
            if (item === "home") setLocation("/");
            else if (item === "prescriptions") setLocation("/patient/prescriptions");
            else if (item === "my-plan") setLocation("/my-plan");
            else if (item === "profile") setIsProfileModalOpen(true);
          }}
        />
        <ProfileModal 
          open={isProfileModalOpen} 
          onOpenChange={setIsProfileModalOpen}
          patient={currentPatient || null}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Meu Plano</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {content}
      </main>
    </div>
  );
}