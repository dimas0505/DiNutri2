import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  CreditCard, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Eye, 
  User,
  Calendar,
  DollarSign,
  FileText
} from "lucide-react";
import Header from "@/components/layout/header";
import { NutritionistSidebar } from "@/components/layout/nutritionist-sidebar";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import type { Subscription, Patient } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SubscriptionWithPatient {
  subscription: Subscription;
  patient: Pick<Patient, 'id' | 'name' | 'email'>;
}

interface ManageSubscriptionDialogProps {
  subscription: SubscriptionWithPatient | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function ManageSubscriptionDialog({ subscription, isOpen, onClose, onUpdate }: ManageSubscriptionDialogProps) {
  const [newStatus, setNewStatus] = useState<Subscription['status']>('active');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSubscriptionMutation = useMutation({
    mutationFn: (data: { status: Subscription['status']; startDate?: Date; expiresAt?: Date }) =>
      apiRequest("PATCH", `/api/subscriptions/${subscription?.subscription.id}/manage`, data),
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionist/subscriptions/pending"] });
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar assinatura:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar assinatura.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!subscription) return;
    
    const planType = subscription.subscription.planType;
    const startDate = new Date();
    const durationDays = planType === 'monthly' ? 30 : planType === 'quarterly' ? 90 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    updateSubscriptionMutation.mutate({
      status: 'active',
      startDate,
      expiresAt,
    });
  };

  const handleReject = () => {
    updateSubscriptionMutation.mutate({ status: 'canceled' });
  };

  if (!subscription) return null;

  const getPlanTypeLabel = (planType: Subscription['planType']) => {
    const planMap = {
      free: "Gratuito",
      monthly: "Mensal",
      quarterly: "Trimestral"
    };
    return planMap[planType] || planType;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinatura</DialogTitle>
          <DialogDescription>
            Aprove ou rejeite a solicitação de assinatura
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-600">Paciente</p>
              <p>{subscription.patient.name}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Email</p>
              <p className="truncate">{subscription.patient.email}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Plano</p>
              <p>{getPlanTypeLabel(subscription.subscription.planType)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Status Atual</p>
              <p className="capitalize">{subscription.subscription.status.replace('_', ' ')}</p>
            </div>
          </div>

          {subscription.subscription.proofOfPaymentUrl && (
            <div>
              <p className="font-medium text-gray-600 mb-2">Comprovante de Pagamento</p>
              <a 
                href={subscription.subscription.proofOfPaymentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                Ver comprovante
              </a>
            </div>
          )}

          <div>
            <p className="font-medium text-gray-600 mb-2">Solicitado em</p>
            <p>{format(new Date(subscription.subscription.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={updateSubscriptionMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject}
            disabled={updateSubscriptionMutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={updateSubscriptionMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionCard({ subscriptionData, onManage }: {
  subscriptionData: SubscriptionWithPatient;
  onManage: () => void;
}) {
  const { subscription, patient } = subscriptionData;

  const getStatusBadge = (status: Subscription['status']) => {
    const statusMap = {
      active: { label: "Ativo", className: "bg-green-100 text-green-800" },
      pending_payment: { label: "Aguardando Pagamento", className: "bg-yellow-100 text-yellow-800" },
      pending_approval: { label: "Aguardando Aprovação", className: "bg-blue-100 text-blue-800" },
      expired: { label: "Expirado", className: "bg-red-100 text-red-800" },
      canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-800" },
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

  const needsAction = subscription.status === 'pending_payment' || subscription.status === 'pending_approval';

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      needsAction && "border-blue-200 bg-blue-50/30"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">{patient.name}</span>
              {needsAction && <AlertCircle className="h-4 w-4 text-blue-600" />}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>Plano {getPlanTypeLabel(subscription.planType)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(subscription.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(subscription.status)}
              {subscription.proofOfPaymentUrl && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Com comprovante
                </Badge>
              )}
            </div>
          </div>

          {needsAction && (
            <Button onClick={onManage} size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Gerenciar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithPatient | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const { data: pendingSubscriptions, isLoading, refetch } = useQuery<SubscriptionWithPatient[]>({
    queryKey: ["/api/nutritionist/subscriptions/pending"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/nutritionist/subscriptions/pending");
      return await response.json();
    },
  });

  const handleManageSubscription = (subscription: SubscriptionWithPatient) => {
    setSelectedSubscription(subscription);
    setIsManageDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsManageDialogOpen(false);
    setSelectedSubscription(null);
  };

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Assinaturas</h1>
          <p className="text-muted-foreground">
            Aprove ou gerencie as solicitações de assinatura dos seus pacientes
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando assinaturas...</p>
          </div>
        </div>
      ) : !pendingSubscriptions || pendingSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma assinatura pendente
            </h3>
            <p className="text-gray-500">
              Todas as assinaturas dos seus pacientes estão em dia. 
              Novas solicitações aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            <span>{pendingSubscriptions.length} solicitação(ões) aguardando sua ação</span>
          </div>
          
          {pendingSubscriptions.map((subscriptionData) => (
            <SubscriptionCard
              key={subscriptionData.subscription.id}
              subscriptionData={subscriptionData}
              onManage={() => handleManageSubscription(subscriptionData)}
            />
          ))}
        </div>
      )}

      <ManageSubscriptionDialog
        subscription={selectedSubscription}
        isOpen={isManageDialogOpen}
        onClose={handleCloseDialog}
        onUpdate={() => refetch()}
      />
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout>
        <DefaultMobileDrawer />
        <div className="p-4">
          <div className="flex items-center mb-4">
            <CreditCard className="h-6 w-6 mr-2" />
            <span className="font-medium">Assinaturas</span>
          </div>
          {content}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <NutritionistSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 flex-1">
        <Header />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {content}
        </main>
      </div>
    </div>
  );
}