import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus, Eye, FileText, Link as LinkIcon, Copy, MoreVertical, Heart, User, Calendar, Activity, Stethoscope, Users2 } from "lucide-react";
import Header from "@/components/layout/header";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { MobileCard, MobileCardHeader, MobileCardTitle, MobileCardContent } from "@/components/mobile/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <MobileCard interactive className="p-4 bg-gradient-to-r from-white to-emerald-50 border-l-4 border-emerald-400 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 truncate flex items-center gap-2" data-testid={`text-patient-name-${patient.id}`}>
                {patient.name}
                <span className="text-xs">💚</span>
              </h3>
              <p className="text-sm text-gray-600 truncate flex items-center gap-1" data-testid={`text-patient-email-${patient.id}`}>
                <span>📧</span>
                {patient.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
            {patient.birthDate && (
              <span className="flex items-center gap-1">
                🎂 {calculateAge(patient.birthDate)} anos
              </span>
            )}
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold",
              patient.userId 
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" 
                : "bg-gradient-to-r from-yellow-400 to-orange-400 text-white"
            )}>
              {patient.userId ? "✅ Ativo" : "⏳ Pendente"}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="emerald" size="sm" className="h-8 w-8 p-0 shadow-success">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-emerald-200">
            <DropdownMenuItem onClick={onViewDetails} className="hover:bg-emerald-50">
              <Eye className="h-4 w-4 mr-2 text-blue-600" />
              👁️ Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onNewPrescription}
              disabled={!patient.userId}
              className="hover:bg-emerald-50"
            >
              <Stethoscope className="h-4 w-4 mr-2 text-emerald-600" />
              🩺 Nova prescrição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </MobileCard>
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
    mutationFn: () => apiRequest("POST", "/api/invitations"),
    onSuccess: async (res) => {
      const { token } = await res.json();
      const fullUrl = `${window.location.origin}/api/login?token=${token}`;
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

  // Enhanced Mobile layout
  if (isMobile) {
    return (
      <MobileLayout 
        title="🥗 Meus Pacientes" 
        drawerContent={<DefaultMobileDrawer />}
        className="bg-gradient-to-br from-emerald-50 to-teal-50"
      >
        <div className="space-y-4 py-4">
          {/* Enhanced Search and Actions */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-4 w-4" />
              <Input
                type="search"
                placeholder="🔍 Buscar pacientes..."
                className="pl-10 border-2 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 bg-white/80 backdrop-blur-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-patients"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="emerald"
                onClick={() => createInvitationMutation.mutate()}
                disabled={createInvitationMutation.isPending}
                className="flex-1 text-sm shadow-success"
                data-testid="button-invite-patient"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {createInvitationMutation.isPending ? "🔄 Gerando..." : "🔗 Convidar"}
              </Button>
              <Button 
                variant="vibrant"
                onClick={() => setLocation("/patients/new")}
                className="flex-1 text-sm shadow-primary"
                data-testid="button-new-patient"
              >
                <Plus className="h-4 w-4 mr-2" />
                ➕ Adicionar
              </Button>
            </div>
          </div>

          {/* Enhanced Patients List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-emerald-600 font-semibold">🔄 Carregando pacientes...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {searchQuery ? "🔍 Nenhum paciente encontrado." : "📝 Nenhum paciente cadastrado."}
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
  }

  // Desktop layout (original)
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 relative">
      {/* Background enhancements */}
      <div className="absolute inset-0 pattern-grid opacity-5"></div>
      <div className="absolute inset-0 gradient-mesh-2 opacity-40"></div>
      
      <Header title="🥗 Meus Pacientes" />
      
      <main className="max-w-7xl mx-auto p-4 lg:p-6 relative z-10">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
            <Input
              type="search"
              placeholder="🔍 Buscar pacientes por nome ou email..."
              className="pl-12 border-2 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 bg-white/80 backdrop-blur-sm h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-patients"
            />
          </div>
          <div className="flex gap-3">
            <Button 
              variant="emerald"
              onClick={() => createInvitationMutation.mutate()}
              disabled={createInvitationMutation.isPending}
              className="flex items-center space-x-2 shadow-success"
              data-testid="button-invite-patient"
            >
              <LinkIcon className="h-4 w-4" />
              <span>{createInvitationMutation.isPending ? "🔄 Gerando..." : "🔗 Convidar Paciente"}</span>
            </Button>
            <Button 
              variant="vibrant"
              onClick={() => setLocation("/patients/new")}
              className="flex items-center space-x-2 shadow-primary"
              data-testid="button-new-patient"
            >
              <Plus className="h-4 w-4" />
              <span>➕ Adicionar Manualmente</span>
            </Button>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-t-lg">
            <h3 className="text-lg font-bold flex items-center gap-3">
              <Users2 className="h-6 w-6" />
              👥 Lista de Pacientes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    👤 Paciente
                  </th>
                  <th className="text-left p-4 font-bold text-gray-700 hidden sm:table-cell">
                    🎂 Idade
                  </th>
                  <th className="text-left p-4 font-bold text-gray-700 hidden md:table-cell flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    📊 Acesso
                  </th>
                  <th className="text-left p-4 font-bold text-gray-700">
                    ⚙️ Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        <p className="text-emerald-600 font-semibold">🔄 Carregando pacientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Heart className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500 font-medium">
                          {searchQuery ? "🔍 Nenhum paciente encontrado." : "📝 Nenhum paciente cadastrado."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 flex items-center gap-2" data-testid={`text-patient-name-${patient.id}`}>
                              {patient.name}
                              <span className="text-xs">💚</span>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1" data-testid={`text-patient-email-${patient.id}`}>
                              <span>📧</span>
                              {patient.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-gray-600 font-medium">
                        <span className="flex items-center gap-2">
                          🎂 {patient.birthDate ? `${calculateAge(patient.birthDate)} anos` : "-"}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          patient.userId 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                            : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                        }`}>
                          {patient.userId ? "✅ Ativo" : "⏳ Pendente"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => setLocation(`/patients/${patient.id}`)}
                            title="Ver detalhes"
                            className="shadow-primary"
                            data-testid={`button-view-patient-${patient.id}`}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">👁️ Ver</span>
                          </Button>
                          <Button
                            variant="emerald"
                            size="sm"
                            disabled={!patient.userId}
                            title={!patient.userId ? "Paciente precisa ter um login" : "Nova prescrição"}
                            onClick={() => setLocation(`/patients/${patient.id}`)}
                            className="shadow-success"
                            data-testid={`button-new-prescription-${patient.id}`}
                          >
                            <Stethoscope className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">🩺 Prescrição</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Dialog open={!!invitationLink} onOpenChange={(isOpen) => !isOpen && setInvitationLink(null)}>
        <DialogContent className="bg-gradient-to-br from-white to-emerald-50 border-2 border-emerald-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-emerald-800 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              🔗 Link de Convite Gerado
            </DialogTitle>
            <DialogDescription className="text-emerald-700">
              ✨ Envie este link para o seu paciente. Ele será válido para um único cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input 
              value={invitationLink || ""} 
              readOnly 
              className="border-2 border-emerald-200 focus:border-emerald-400 bg-white"
            />
            <Button 
              variant="emerald" 
              onClick={handleCopyToClipboard} 
              size="icon"
              className="shadow-success"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvitationLink(null)} className="border-emerald-200 hover:bg-emerald-50">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}