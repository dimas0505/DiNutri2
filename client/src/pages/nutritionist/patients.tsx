import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus, Eye, FileText } from "lucide-react";
import Header from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Patient } from "@shared/schema";

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="min-h-screen bg-background">
      <Header title="Meus Pacientes" />
      
      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Search and Add Patient */}
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
          <Button 
            onClick={() => setLocation("/patients/new")}
            className="flex items-center space-x-2"
            data-testid="button-new-patient"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Paciente</span>
          </Button>
        </div>

        {/* Patients List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Paciente</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Idade</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Última Prescrição</th>
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
                        <span className="text-sm text-muted-foreground">-</span>
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
                            onClick={() => {
                              // Create new prescription - will be handled in patient details
                              setLocation(`/patients/${patient.id}`);
                            }}
                            title="Nova prescrição"
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
        </Card>
      </main>
    </div>
  );
}
