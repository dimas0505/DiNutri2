import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus, Eye, FileText, Link as LinkIcon, Copy, MoreVertical, Users } from "lucide-react";
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
      className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-gray-800/50 border-0 shadow-lg overflow-hidden group"
      onClick={onViewDetails}
      data-testid={`card-patient-${patient.id}`}
    >
      <CardContent className="p-6 flex items-center justify-between relative">
        {/* Gradient border effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 dark:text-white truncate" data-testid={`text-patient-name-${patient.id}`}> 
                {patient.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate" data-testid={`text-patient-email-${patient.id}`}> 
                {patient.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={patient.userId ? "default" : "secondary"}
              className={patient.userId ? 
                "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm" : 
                "bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-sm"
              }
            >
              {patient.userId ? "Ativo" : "Cadastro Pendente"}
            </Badge>
            {age !== null && (
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
              >
                {age} anos
              </Badge>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 ml-3 flex-shrink-0 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-200 relative z-10" 
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Opções</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-md border-0 shadow-xl">
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              className="hover:bg-blue-50 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2 text-blue-600" /> Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onNewPrescription(); }}
              disabled={!patient.userId}
              className="hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4 mr-2 text-purple-600" /> Nova prescrição
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
      <div className="space-y-6 py-4 relative">
        {/* Enhanced Header Section */}
        <div className="relative">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Meus Pacientes</h1>
                <p className="text-blue-100 text-sm opacity-90">Gerencie seus pacientes com facilidade</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Actions */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="search"
              placeholder="Buscar pacientes..."
              className="pl-12 h-12 bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-xl text-base"
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
              className="flex-1 h-12 text-sm bg-white/90 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 rounded-xl shadow-md"
              data-testid="button-invite-patient"
            >
              <LinkIcon className="h-4 w-4 mr-2 text-blue-600" />
              {createInvitationMutation.isPending ? "Gerando..." : "Convidar"}
            </Button>
            <Button 
              onClick={() => setLocation("/patients/new")}
              className="flex-1 h-12 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              data-testid="button-new-patient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Enhanced Patients List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 font-medium">Carregando pacientes...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium text-lg mb-2">
                {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery ? "Tente ajustar sua busca" : "Comece adicionando seu primeiro paciente"}
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
    <>
      {/* Modern CSS Animations */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 8s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 relative overflow-hidden">
        {/* Enhanced Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-4000"></div>
        </div>

        <Header title="Meus Pacientes" />
        <main className="max-w-7xl mx-auto p-4 lg:p-6 relative z-10">
          {/* Enhanced Header Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Meus Pacientes</h1>
                    <p className="text-blue-100 text-lg opacity-90">Gerencie todos os seus pacientes em um só lugar</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{patients.length}</div>
                  <div className="text-blue-100 text-sm opacity-75">Total de Pacientes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Actions Section */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="search"
                placeholder="Buscar pacientes por nome ou email..."
                className="pl-12 h-12 bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-xl text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-patients"
              />
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline"
                onClick={() => createInvitationMutation.mutate()}
                disabled={createInvitationMutation.isPending}
                className="flex items-center space-x-2 h-12 px-6 bg-white/90 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 rounded-xl shadow-md"
                data-testid="button-invite-patient"
              >
                <LinkIcon className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{createInvitationMutation.isPending ? "Gerando..." : "Convidar Paciente"}</span>
              </Button>
              <Button 
                onClick={() => setLocation("/patients/new")}
                className="flex items-center space-x-2 h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] font-medium"
                data-testid="button-new-patient"
              >
                <Plus className="h-5 w-5" />
                <span>Adicionar Manualmente</span>
              </Button>
            </div>
          </div>
        {/* Enhanced Table Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Lista de Pacientes</CardTitle>
                <CardDescription className="text-gray-600">Gerencie seus pacientes e acesse seus detalhes com facilidade.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-6 font-semibold text-gray-700">Paciente</th>
                    <th className="text-left p-6 font-semibold text-gray-700 hidden sm:table-cell">Idade</th>
                    <th className="text-left p-6 font-semibold text-gray-700 hidden md:table-cell">Status</th>
                    <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                          <p className="text-gray-600 font-medium">Carregando pacientes...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="h-10 w-10 text-gray-400" />
                          </div>
                          <p className="text-gray-600 font-medium text-lg mb-2">
                            {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
                          </p>
                          <p className="text-gray-400">
                            {searchQuery ? "Tente ajustar sua busca" : "Comece adicionando seu primeiro paciente"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 cursor-pointer group" onClick={() => setLocation(`/patients/${patient.id}`)}>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors" data-testid={`text-patient-name-${patient.id}`}> 
                                {patient.name}
                              </div>
                              <div className="text-sm text-gray-500" data-testid={`text-patient-email-${patient.id}`}> 
                                {patient.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 hidden sm:table-cell">
                          <span className="text-gray-600 font-medium">
                            {patient.birthDate ? `${calculateAge(patient.birthDate)} anos` : "-"}
                          </span>
                        </td>
                        <td className="p-6 hidden md:table-cell">
                          <Badge 
                            variant={patient.userId ? "default" : "secondary"}
                            className={patient.userId ? 
                              "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm" : 
                              "bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-sm"
                            }
                          >
                            {patient.userId ? "Ativo" : "Pendente"}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setLocation(`/patients/${patient.id}`); }}
                              title="Ver detalhes"
                              className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600 transition-all duration-200"
                              data-testid={`button-view-patient-${patient.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!patient.userId}
                              title={!patient.userId ? "Paciente precisa ter um login" : "Nova prescrição"}
                              onClick={(e) => { e.stopPropagation(); setLocation(`/patients/${patient.id}`); }}
                              className="h-9 w-9 p-0 hover:bg-purple-100 hover:text-purple-600 transition-all duration-200 disabled:opacity-50"
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
    </>
  );

  return (
    <>
      {isMobile ? mobileContent : desktopContent}

      <Dialog open={!!invitationLink} onOpenChange={(isOpen) => !isOpen && setInvitationLink(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <LinkIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Link de Convite Gerado</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Envie este link para o seu paciente. Ele será válido para um único cadastro.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
            <Input 
              value={invitationLink || ""} 
              readOnly 
              className="bg-white/80 border-0 shadow-sm text-sm"
            />
            <Button 
              variant="outline" 
              onClick={handleCopyToClipboard} 
              size="icon"
              className="flex-shrink-0 h-10 w-10 bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 transition-all duration-200"
            >
              <Copy className="h-4 w-4 text-blue-600" />
            </Button>
          </div>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setInvitationLink(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0 rounded-lg"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}