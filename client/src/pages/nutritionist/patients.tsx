import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus, Eye, FileText, Link as LinkIcon, Copy, MoreVertical } from "lucide-react";
import Header from "@/components/layout/header";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { MobileCard, MobileCardHeader, MobileCardTitle, MobileCardContent } from "@/components/mobile/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@shared/schema";
import { cn } from "@/lib/utils";

function PatientCard({ patient, onViewDetails, onNewPrescription }: {
  patient: Patient;
  onViewDetails: () => void;
  onNewPrescription: () => void;
}) {
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(patient.birthDate);

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onViewDetails}
      data-testid={`card-patient-${patient.id}`}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate" data-testid={`text-patient-name-${patient.id}`}>
            {patient.name}
          </p>
          <p className="text-sm text-muted-foreground truncate" data-testid={`text-patient-email-${patient.id}`}>
            {patient.email}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={patient.userId ? "default" : "secondary"}>
              {patient.userId ? "Ativo" : "Cadastro Pendente"}
            </Badge>
            {age !== null && <Badge variant="outline">{age} anos</Badge>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Opções</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
              <Eye className="h-4 w-4 mr-2" /> Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onNewPrescription(); }}
              disabled={!patient.userId}
            >
              <FileText className="h-4 w-4 mr-2" /> Nova prescrição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invitations");
      return res.json();
    },
    onSuccess: (data) => {
      const { token } = data;
      const fullUrl = `${window.location.origin}/anamnese?token=${token}`;
      setInvitationLink(fullUrl);
      toast({ title: "Link de convite gerado!" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o link de convite.",
        variant: "destructive",
      });
    },
  });

  const handleCopyToClipboard = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    toast({ description: "Link copiado para a área de transferência!" });
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const mobileContent = (
    <MobileLayout 
      title="Meus Pacientes" 
      drawerContent={<DefaultMobileDrawer />}
    >
      <div className="space-y-4 py-4">
        {/* Search and Actions */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Buscar pacientes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-patients"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => createInvitationMutation.mutate()}
              disabled={createInvitationMutation.isPending}
              className="flex-1 text-sm"
              data-testid="button-invite-patient"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {createInvitationMutation.isPending ? "Gerando..." : "Convidar"}
            </Button>
            <Button 
              onClick={() => setLocation("/patients/new")}
              className="flex-1 text-sm"
              data-testid="button-new-patient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Patients List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Carregando pacientes...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
              </p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onViewDetails={() => setLocation(`/patients/${patient.id}`)}
                onNewPrescription={() => setLocation(`/patients/${patient.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );

  const desktopContent = (
    <div className="min-h-screen bg-background">
      <Header title="Meus Pacientes" />
      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Buscar pacientes por nome ou email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-patients"
            />
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => createInvitationMutation.mutate()}
              disabled={createInvitationMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-invite-patient"
            >
              <LinkIcon className="h-4 w-4" />
              <span>{createInvitationMutation.isPending ? "Gerando..." : "Convidar Paciente"}</span>
            </Button>
            <Button 
              onClick={() => setLocation("/patients/new")}
              className="flex items-center space-x-2"
              data-testid="button-new-patient"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Manualmente</span>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>Gerencie seus pacientes e acesse seus detalhes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Paciente</th>
                    <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Idade</th>
                    <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Acesso</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-muted-foreground">Carregando pacientes...</p>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <p className="text-muted-foreground">
                          {searchQuery ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium" data-testid={`text-patient-name-${patient.id}`}>
                              {patient.name}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-patient-email-${patient.id}`}>
                              {patient.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground">
                          {patient.birthDate ? `${calculateAge(patient.birthDate)} anos` : "-"}
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className={`text-sm ${patient.userId ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {patient.userId ? "Ativo" : "Pendente"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/patients/${patient.id}`)}
                              title="Ver detalhes"
                              data-testid={`button-view-patient-${patient.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!patient.userId}
                              title={!patient.userId ? "Paciente precisa ter um login" : "Nova prescrição"}
                              onClick={() => setLocation(`/patients/${patient.id}`)}
                              data-testid={`button-new-prescription-${patient.id}`}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );

  return (
    <>
      {isMobile ? mobileContent : desktopContent}

      <Dialog open={!!invitationLink} onOpenChange={(isOpen) => !isOpen && setInvitationLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Convite Gerado</DialogTitle>
            <DialogDescription>
              Envie este link para o seu paciente. Ele será válido para um único cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={invitationLink || ""} readOnly />
            <Button variant="outline" onClick={handleCopyToClipboard} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setInvitationLink(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}