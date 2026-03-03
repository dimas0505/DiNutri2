import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Printer, FileDown, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePrescriptionPDF } from "@/utils/pdf-generator";
import type { Prescription, Patient } from "@shared/schema";

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

  const nutritionist = {
    name: "Equipe DiNutri",
    role: "Nutrição Especializada",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!prescription || !patient) return;
    try {
      await generatePrescriptionPDF({
        prescription,
        patient,
      });
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!prescription || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops!</h2>
          <p className="text-slate-600 mb-6">Não conseguimos encontrar os detalhes desta prescrição.</p>
          <Button onClick={() => setLocation("/patient/prescription")} className="w-full">
            Voltar para Prescrições
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Action Header - Hidden on Print */}
      <header className="no-print sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/patient/prescription")}
              className="rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Plano Alimentar</h1>
              <p className="text-xs text-slate-500 mt-1">Visualização e Exportação</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-2 rounded-xl border-slate-200"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </Button>
            <Button
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all"
            >
              <FileDown className="h-4 w-4" />
              <span>Baixar PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-8 mt-4 sm:mt-8">
        {/* Document Container */}
        <div className="bg-white shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none">
          
          {/* Top Decorative Bar */}
          <div className="h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

          <div className="p-8 sm:p-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-600/30">
                    D
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-slate-900">DiNutri</span>
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">PLANO ALIMENTAR</h2>
                <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">Acompanhamento Nutricional</p>
              </div>
              <div className="text-left sm:text-right bg-slate-50 p-6 rounded-2xl border border-slate-100 min-w-[240px]">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Responsável</p>
                <p className="text-slate-900 font-bold text-lg">{nutritionist.name}</p>
                <p className="text-slate-500 text-sm">{nutritionist.role}</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Data de Emissão</p>
                  <p className="text-slate-900 font-semibold">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Patient Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="md:col-span-2 bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-900/10">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Paciente</p>
                <h3 className="text-2xl font-bold truncate mb-1" data-testid="text-patient-name">{patient.name}</h3>
                <p className="text-slate-400 text-sm truncate">{patient.email}</p>
              </div>
              <div className="grid grid-cols-2 md:col-span-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-emerald-600/60 text-[10px] font-bold uppercase tracking-widest mb-1">Altura</p>
                  <p className="text-emerald-900 font-bold text-lg" data-testid="text-patient-height">{patient.heightCm ? `${patient.heightCm} cm` : '--'}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-indigo-600/60 text-[10px] font-bold uppercase tracking-widest mb-1">Peso</p>
                  <p className="text-indigo-900 font-bold text-lg" data-testid="text-patient-weight">{patient.weightKg ? `${patient.weightKg} kg` : '--'}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-amber-600/60 text-[10px] font-bold uppercase tracking-widest mb-1">Idade</p>
                  <p className="text-amber-900 font-bold text-lg" data-testid="text-patient-age">{patient.birthDate ? `${calculateAge(patient.birthDate)} anos` : '--'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Sexo</p>
                  <p className="text-slate-900 font-bold text-lg" data-testid="text-patient-sex">{patient.sex === 'F' ? 'Fem' : 'Masc'}</p>
                </div>
              </div>
            </div>

            {/* Prescription Summary */}
            <div className="mb-12 flex flex-col items-center text-center max-w-2xl mx-auto">
              <div className="w-12 h-1 bg-emerald-500 rounded-full mb-6" />
              <h2 className="text-3xl font-black text-slate-900 mb-4" data-testid="text-prescription-title">
                {prescription.title}
              </h2>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Válido desde {prescription.publishedAt && formatDate(prescription.publishedAt.toString())}
              </div>
            </div>

            {/* Meals Section */}
            <div className="space-y-12">
              {prescription.meals.map((meal, index) => (
                <div key={meal.id} className="break-inside-avoid relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${index % 2 === 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-500 shadow-indigo-500/20'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900" data-testid={`text-meal-name-${meal.id}`}>
                        {meal.name}
                      </h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Refeição Programada</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 divide-y divide-slate-100">
                      {meal.items.map((item) => (
                        <div key={item.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-lg mb-1" data-testid={`text-item-description-${item.id}`}>
                              {item.description}
                            </p>
                            {item.substitutes && item.substitutes.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded">Substitutos</span>
                                {item.substitutes.map((sub, i) => (
                                  <span key={i} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{sub}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap border border-emerald-100" data-testid={`text-item-amount-${item.id}`}>
                            {item.amount}
                          </div>
                        </div>
                      ))}
                    </div>

                    {meal.notes && (
                      <div className="bg-amber-50/50 p-6 border-t border-amber-100 flex gap-4">
                        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                          <Info className="h-4 w-4" />
                        </div>
                        <div className="text-sm text-amber-900 leading-relaxed" data-testid={`text-meal-notes-${meal.id}`}>
                          <strong className="block text-[10px] font-black uppercase tracking-widest mb-1 text-amber-600">Nota da Refeição</strong>
                          {meal.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* General Notes */}
            {prescription.generalNotes && (
              <div className="mt-16 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold">Orientações Gerais</h3>
                  </div>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm sm:text-base" data-testid="text-general-notes">
                    {prescription.generalNotes}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-20 pt-10 border-t border-slate-100 text-center">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <Printer className="h-5 w-5" />
                </div>
              </div>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                Este documento é de uso exclusivo de <strong>{patient.name}</strong>.
                As orientações aqui contidas foram elaboradas com base em sua avaliação nutricional.
              </p>
              <div className="mt-8">
                <p className="text-slate-900 font-black tracking-tighter text-xl">DiNutri</p>
                <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest mt-1">Sua Saúde, Nossa Missão</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
