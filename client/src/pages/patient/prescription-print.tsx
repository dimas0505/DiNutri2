import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePDF } from "@/lib/pdf";
import type { Prescription, Patient, User } from "@shared/schema";

interface PrescriptionPrintPageProps {
  params: { id: string };
}

export default function PrescriptionPrintPage({ params }: PrescriptionPrintPageProps) {
  const [, setLocation] = useLocation();

  const { data: prescription, isLoading } = useQuery<Prescription>({
    queryKey: ["/api/prescriptions", params.id],
  });

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", prescription?.patientId],
    enabled: !!prescription?.patientId,
  });

  // Mock nutritionist data - in real app, fetch from prescription.nutritionistId
  const nutritionist = {
    name: "Dr. Ana Silva",
    crn: "12345",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!prescription || !patient) return;
    try {
      await generatePDF(prescription, patient, nutritionist);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
    });
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!prescription || !patient) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="max-w-4xl mx-auto p-8">
          <p className="text-center text-gray-600">Prescrição não encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Printer Header (No Printer Controls) */}
      <header className="no-print bg-card border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/patient/prescription")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Visualização para Impressão</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handlePrint}
              className="flex items-center space-x-2"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportPDF}
              className="flex items-center space-x-2"
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4" />
              <span>Salvar PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        {/* Printer Document */}
        <div className="bg-white">
          {/* Document Header */}
          <div className="text-center mb-8 border-b-2 border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">PRESCRIÇÃO NUTRICIONAL</h1>
            <div className="text-lg text-gray-600">
              <div>{nutritionist.name}</div>
              <div className="text-sm">CRN: {nutritionist.crn} • Nutricionista</div>
            </div>
          </div>

          {/* Patient Info */}
          <div className="mb-8 bg-gray-50 p-6 rounded">
            <h2 className="text-xl font-semibold mb-4">Dados do Paciente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><strong>Nome:</strong> <span data-testid="text-patient-name">{patient.name}</span></div>
              <div><strong>Email:</strong> <span data-testid="text-patient-email">{patient.email}</span></div>
              {patient.birthDate && (
                <div><strong>Idade:</strong> <span data-testid="text-patient-age">{calculateAge(patient.birthDate)} anos</span></div>
              )}
              {patient.sex && (
                <div><strong>Sexo:</strong> <span data-testid="text-patient-sex">{patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : 'Outro'}</span></div>
              )}
              {patient.heightCm && (
                <div><strong>Altura:</strong> <span data-testid="text-patient-height">{patient.heightCm} cm</span></div>
              )}
              {patient.weightKg && (
                <div><strong>Peso:</strong> <span data-testid="text-patient-weight">{patient.weightKg} kg</span></div>
              )}
            </div>
          </div>

          {/* Prescription Title */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800" data-testid="text-prescription-title">
              {prescription.title}
            </h2>
            <p className="text-gray-600 mt-2">
              Publicado em {prescription.publishedAt && formatDate(prescription.publishedAt)}
            </p>
          </div>

          {/* Meals */}
          <div className="space-y-8">
            {prescription.meals.map((meal) => (
              <div key={meal.id} className="break-inside-avoid">
                <div className="bg-blue-50 p-4 rounded-t-lg border-l-4 border-blue-500">
                  <h3 className="text-xl font-semibold text-gray-800" data-testid={`text-meal-name-${meal.id}`}>
                    {meal.name}
                  </h3>
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b-lg p-4">
                  <ul className="space-y-3">
                    {meal.items.map((item) => (
                      <li key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="font-medium" data-testid={`text-item-description-${item.id}`}>
                          {item.description}
                        </span>
                        <span className="text-gray-600" data-testid={`text-item-amount-${item.id}`}>
                          {item.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {meal.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <p className="text-sm text-gray-700" data-testid={`text-meal-notes-${meal.id}`}>
                        <strong>Observação:</strong> {meal.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* General Notes */}
          {prescription.generalNotes && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Observações Gerais</h3>
              <p className="text-gray-700" data-testid="text-general-notes">
                {prescription.generalNotes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-gray-200 text-center text-sm text-gray-600">
            <p>Esta prescrição foi elaborada especificamente para {patient.name}.</p>
            <p className="mt-2">Em caso de dúvidas, entre em contato com seu nutricionista.</p>
            <p className="mt-4 font-semibold">{nutritionist.name} - CRN: {nutritionist.crn}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
