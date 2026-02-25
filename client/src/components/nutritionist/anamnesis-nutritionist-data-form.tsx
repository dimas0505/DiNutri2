import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AnamnesisRecord, Patient } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Scale, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Schema de validação específico para este formulário
const formSchema = z.object({
  tmb: z.coerce.number().min(0, "Valor inválido").optional().nullable(),
  get: z.coerce.number().min(0, "Valor inválido").optional().nullable(),
  vet: z.coerce.number().min(0, "Valor inválido").optional().nullable(),
  usedFormula: z.string().optional().nullable(),
  targetCarbPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  targetProteinPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  targetFatPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  targetCarbG: z.coerce.number().min(0).optional().nullable(),
  targetProteinG: z.coerce.number().min(0).optional().nullable(),
  targetFatG: z.coerce.number().min(0).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface AnamnesisNutritionistDataFormProps {
  anamnesis: AnamnesisRecord;
  patient?: Patient; // Optional initially to avoid breaking existing usage if any
}

export function AnamnesisNutritionistDataForm({ anamnesis, patient }: AnamnesisNutritionistDataFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFormula, setSelectedFormula] = useState("harris_benedict");
  const [activityFactor, setActivityFactor] = useState("1.2");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tmb: anamnesis.tmb ?? undefined,
      get: anamnesis.get ?? undefined,
      vet: anamnesis.vet ?? undefined,
      usedFormula: anamnesis.usedFormula ?? "Harris-Benedict",
      targetCarbPercent: anamnesis.targetCarbPercent ?? 50,
      targetProteinPercent: anamnesis.targetProteinPercent ?? 20,
      targetFatPercent: anamnesis.targetFatPercent ?? 30,
      targetCarbG: anamnesis.targetCarbG ?? undefined,
      targetProteinG: anamnesis.targetProteinG ?? undefined,
      targetFatG: anamnesis.targetFatG ?? undefined,
    },
  });

  // Calculate age from birthdate
  const calculateAge = (birthDateString?: string | null) => {
    if (!birthDateString) return 30; // Default age if missing
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateMetabolicRates = () => {
    if (!patient || !anamnesis.weightKg) {
      toast({
        title: "Dados insuficientes",
        description: "É necessário peso, altura, data de nascimento e sexo do paciente.",
        variant: "destructive"
      });
      return;
    }

    const weight = parseFloat(anamnesis.weightKg.replace(',', '.'));
    const height = patient.heightCm || 170; // Default height if missing
    const age = calculateAge(patient.birthDate);
    const sex = patient.sex || 'M';

    let tmb = 0;

    if (selectedFormula === "harris_benedict") {
      // Harris-Benedict (1919)
      if (sex === 'M') {
        tmb = 66.5 + (13.75 * weight) + (5.003 * height) - (6.75 * age);
      } else {
        tmb = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
      }
    } else if (selectedFormula === "mifflin_st_jeor") {
      // Mifflin-St Jeor (1990)
      if (sex === 'M') {
        tmb = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      } else {
        tmb = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      }
    }

    const fa = parseFloat(activityFactor);
    const get = tmb * fa;

    form.setValue("tmb", Math.round(tmb));
    form.setValue("get", Math.round(get));

    // Set VET initially to GET if not set
    if (!form.getValues("vet")) {
      form.setValue("vet", Math.round(get));
    }

    // Update used formula text
    const formulaName = selectedFormula === "harris_benedict" ? "Harris-Benedict" : "Mifflin-St Jeor";
    form.setValue("usedFormula", `${formulaName} (FA: ${activityFactor})`);

    toast({
      title: "Cálculo realizado",
      description: `TMB: ${Math.round(tmb)} kcal | GET: ${Math.round(get)} kcal`,
    });
  };

  // Hook para realizar a chamada à API
  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest("PATCH", `/api/anamnesis/${anamnesis.id}/nutritionist-data`, data);
    },
    onSuccess: () => {
      toast({ title: "Dados salvos com sucesso!" });
      // Invalida a query do paciente para forçar a busca dos dados atualizados
      queryClient.invalidateQueries({ queryKey: ["/api/patients", anamnesis.patientId, "anamnesis-records"] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Card className="mt-6 border-blue-100 dark:border-blue-900 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Planejamento Energético
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Seção de Cálculo Automático */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 space-y-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Cálculo de TMB e GET
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase">Fórmula Preditiva</label>
                  <Select value={selectedFormula} onValueChange={setSelectedFormula}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="harris_benedict">Harris-Benedict (1919)</SelectItem>
                      <SelectItem value="mifflin_st_jeor">Mifflin-St Jeor (1990)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase">Fator Atividade (FA)</label>
                  <Select value={activityFactor} onValueChange={setActivityFactor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.2">1.2 - Sedentário</SelectItem>
                      <SelectItem value="1.375">1.375 - Levemente Ativo</SelectItem>
                      <SelectItem value="1.55">1.55 - Moderadamente Ativo</SelectItem>
                      <SelectItem value="1.725">1.725 - Muito Ativo</SelectItem>
                      <SelectItem value="1.9">1.9 - Extremamente Ativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                    onClick={calculateMetabolicRates}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calcular Automaticamente
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resultados dos Cálculos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="tmb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-blue-600 dark:text-blue-400">Taxa Metabólica Basal (TMB)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="any" {...field} value={field.value ?? ""} className="pr-12 font-semibold" />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">kcal</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="get"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-green-600 dark:text-green-400">Gasto Energético Total (GET)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="any" {...field} value={field.value ?? ""} className="pr-12 font-semibold" />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">kcal</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-purple-600 dark:text-purple-400 font-bold">VET Prescrito (Meta)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="any" {...field} value={field.value ?? ""} className="pr-12 font-bold border-purple-200 focus-visible:ring-purple-500" />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">kcal</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Distribuição de Macronutrientes */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Distribuição de Macronutrientes
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">

                {/* Carboidratos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-orange-600 dark:text-orange-400">Carboidratos</label>
                    <span className="text-xs text-slate-500">4 kcal/g</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="targetCarbPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                placeholder="%"
                                className="pr-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const pct = parseFloat(e.target.value);
                                  const vet = Number(form.getValues("vet")) || 0;
                                  if (!isNaN(pct) && vet > 0) {
                                    form.setValue("targetCarbG", Math.round((vet * pct / 100) / 4));
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetCarbG"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                placeholder="g"
                                className="pr-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const g = parseFloat(e.target.value);
                                  const vet = Number(form.getValues("vet")) || 0;
                                  if (!isNaN(g) && vet > 0) {
                                    form.setValue("targetCarbPercent", Math.round(((g * 4) / vet) * 100));
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2.5 text-xs text-slate-400">g</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Proteínas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-blue-600 dark:text-blue-400">Proteínas</label>
                    <span className="text-xs text-slate-500">4 kcal/g</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="targetProteinPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                placeholder="%"
                                className="pr-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const pct = parseFloat(e.target.value);
                                  const vet = Number(form.getValues("vet")) || 0;
                                  if (!isNaN(pct) && vet > 0) {
                                    form.setValue("targetProteinG", Math.round((vet * pct / 100) / 4));
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetProteinG"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                placeholder="g"
                                className="pr-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const g = parseFloat(e.target.value);
                                  const vet = Number(form.getValues("vet")) || 0;
                                  if (!isNaN(g) && vet > 0) {
                                    form.setValue("targetProteinPercent", Math.round(((g * 4) / vet) * 100));
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2.5 text-xs text-slate-400">g</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Gorduras */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Gorduras</label>
                    <span className="text-xs text-slate-500">9 kcal/g</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="targetFatPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                placeholder="%"
                                className="pr-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const pct = parseFloat(e.target.value);
                                  const vet = Number(form.getValues("vet")) || 0;
                                  if (!isNaN(pct) && vet > 0) {
                                    form.setValue("targetFatG", Math.round((vet * pct / 100) / 9));
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetFatG"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                placeholder="g"
                                className="pr-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const g = parseFloat(e.target.value);
                                  const vet = Number(form.getValues("vet")) || 0;
                                  if (!isNaN(g) && vet > 0) {
                                    form.setValue("targetFatPercent", Math.round(((g * 9) / vet) * 100));
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2.5 text-xs text-slate-400">g</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </div>

              {/* Total Percentage Check */}
              <div className="flex justify-between text-xs px-2">
                <span className="text-slate-500">
                  Total: {
                    (form.watch("targetCarbPercent") || 0) +
                    (form.watch("targetProteinPercent") || 0) +
                    (form.watch("targetFatPercent") || 0)
                  }%
                </span>
                {Math.abs(
                  (form.watch("targetCarbPercent") || 0) +
                  (form.watch("targetProteinPercent") || 0) +
                  (form.watch("targetFatPercent") || 0) - 100
                ) > 1 && (
                  <span className="text-amber-600 font-medium">
                    A soma deve ser 100%
                  </span>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="usedFormula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fórmula de Referência</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Ex: Harris-Benedict (FA: 1.2)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                {mutation.isPending ? "Salvando..." : "Salvar Planejamento"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}