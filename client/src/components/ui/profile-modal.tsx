import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Calendar, Ruler, Weight, FileText, Activity } from "lucide-react";
import type { Patient, AnthropometricAssessment } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

export function ProfileModal({ open, onOpenChange, patient }: ProfileModalProps) {
  if (!patient) return null;

  const { data: latestAnthro } = useQuery<AnthropometricAssessment>({
    queryKey: ["/api/my-anthropometry/latest"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-anthropometry/latest");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open,
    retry: false,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informado";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getSexLabel = (sex: string | null) => {
    switch (sex) {
      case "M": return "Masculino";
      case "F": return "Feminino";
      case "Outro": return "Outro";
      default: return "Não informado";
    }
  };

  const profileItems = [
    {
      icon: User,
      label: "Nome",
      value: patient.name || "Não informado"
    },
    {
      icon: Mail,
      label: "Email",
      value: patient.email || "Não informado"
    },
    {
      icon: Calendar,
      label: "Data de Nascimento",
      value: formatDate(patient.birthDate)
    },
    {
      icon: User,
      label: "Sexo",
      value: getSexLabel(patient.sex)
    },
    {
      icon: Ruler,
      label: "Altura",
      value: patient.heightCm ? `${patient.heightCm} cm` : "Não informado"
    },
    {
      icon: Weight,
      label: "Peso",
      value: patient.weightKg ? `${patient.weightKg} kg` : "Não informado"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md mx-0 left-[50%] right-auto translate-x-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Perfil
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {profileItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.label}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {patient.notes && (
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Observações
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {patient.notes}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {latestAnthro && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-semibold text-gray-900">Minhas Medidas</p>
                <span className="text-xs text-gray-400">
                  ({latestAnthro.createdAt ? new Date(latestAnthro.createdAt).toLocaleDateString("pt-BR") : ""})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Pescoço", value: latestAnthro.circumNeck, unit: "cm" },
                  { label: "Tórax", value: latestAnthro.circumChest, unit: "cm" },
                  { label: "Cintura", value: latestAnthro.circumWaist, unit: "cm" },
                  { label: "Abdômen", value: latestAnthro.circumAbdomen, unit: "cm" },
                  { label: "Quadril", value: latestAnthro.circumHip, unit: "cm" },
                  { label: "Braço não dominante relaxado", value: latestAnthro.circumNonDominantArmRelaxed, unit: "cm" },
                  { label: "Braço não dominante contraído", value: latestAnthro.circumNonDominantArmContracted, unit: "cm" },
                  { label: "Coxa proximal não dominante", value: latestAnthro.circumNonDominantProximalThigh, unit: "cm" },
                  { label: "Panturrilha não dominante", value: latestAnthro.circumNonDominantCalf, unit: "cm" },
                  { label: "Dobra Bicipital", value: latestAnthro.foldBiceps, unit: "mm" },
                  { label: "Dobra Tricipital", value: latestAnthro.foldTriceps, unit: "mm" },
                  { label: "Dobra Subescapular", value: latestAnthro.foldSubscapular, unit: "mm" },
                  { label: "Dobra Suprailíaca", value: latestAnthro.foldSuprailiac, unit: "mm" },
                ].filter(item => item.value != null).map((item) => (
                  <Card key={item.label} className="border-l-4 border-l-purple-300">
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-800">{item.value} {item.unit}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}