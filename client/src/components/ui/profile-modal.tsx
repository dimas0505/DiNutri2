import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Calendar, Ruler, Weight, FileText } from "lucide-react";
import type { Patient } from "@shared/schema";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

export function ProfileModal({ open, onOpenChange, patient }: ProfileModalProps) {
  if (!patient) return null;

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
      <DialogContent className="sm:max-w-md">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}