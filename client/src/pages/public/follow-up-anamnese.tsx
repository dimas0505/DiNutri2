import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertAnamnesisRecordSchema } from "@shared/schema";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Schema for the follow-up anamnese form (without account creation fields)
const formSchema = insertAnamnesisRecordSchema.omit({ patientId: true }).extend({
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Ex: 65.50").optional().or(z.literal('')),
  // Transform string arrays for multi-select fields
  likedHealthyFoods: z.array(z.string()).default([]),
  dislikedFoods: z.array(z.string()).default([]),
  intolerances: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

export default function FollowUpAnamnesePage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract patientId from URL
  const patientId = useMemo(() => new URLSearchParams(window.location.search).get("patientId"), [location]);

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Link inválido</AlertTitle>
              <AlertDescription>
                Este link de anamnese de retorno não é válido ou expirou.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weightKg: "",
      notes: "",
      goal: undefined,
      activityLevel: undefined,
      likedHealthyFoods: [],
      dislikedFoods: [],
      hasIntolerance: false,
      intolerances: [],
      canEatMorningSolids: false,
      mealsPerDayCurrent: undefined,
      mealsPerDayWilling: undefined,
      alcoholConsumption: undefined,
      supplements: "",
      diseases: "",
      medications: "",
      biotype: undefined,
    },
  });

  const submitAnamneseMutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest("POST", `/api/patients/${patientId}/anamnesis-records`, data);
    },
    onSuccess: () => {
      toast({
        title: "Anamnese de retorno enviada!",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      // Redirect to home
      setLocation("/");
    },
    onError: (err: any) => {
      console.error("Erro ao enviar anamnese:", err);
      toast({
        title: "Erro ao enviar anamnese",
        description: err.message || "Não foi possível enviar as informações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    submitAnamneseMutation.mutate(data);
  };

  const healthyFoodOptions = [
    "Verduras (alface, rúcula, espinafre)",
    "Legumes (cenoura, beterraba, abobrinha)",
    "Frutas (maçã, banana, laranja)",
    "Grãos integrais (aveia, quinoa, arroz integral)",
    "Proteínas magras (frango, peixe, ovos)",
    "Oleaginosas (castanhas, amêndoas, nozes)"
  ];

  const dislikedFoodOptions = [
    "Verduras folhosas",
    "Legumes cozidos",
    "Frutas ácidas",
    "Peixes",
    "Frutos do mar",
    "Queijos",
    "Ovos",
    "Carne vermelha"
  ];

  const intoleranceOptions = [
    "Lactose",
    "Glúten",
    "Ovo",
    "Soja",
    "Amendoim",
    "Frutos do mar",
    "Nozes"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto py-8 px-4">
        <DiNutriLogo variant="full" className="h-16" />
      </div>
      <main className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Anamnese de Retorno</CardTitle>
            <CardDescription>
              Atualize suas informações nutricionais para que possamos acompanhar melhor sua evolução.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Current Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Dados Atuais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weightKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso atual (kg)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 65.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Goals and Activity */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Objetivos e Atividade</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo principal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione seu objetivo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="lose_weight">Perder peso</SelectItem>
                              <SelectItem value="maintain_weight">Manter peso</SelectItem>
                              <SelectItem value="gain_weight">Ganhar peso</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de atividade física</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione seu nível" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 - Sedentário</SelectItem>
                              <SelectItem value="2">2 - Levemente ativo</SelectItem>
                              <SelectItem value="3">3 - Moderadamente ativo</SelectItem>
                              <SelectItem value="4">4 - Muito ativo</SelectItem>
                              <SelectItem value="5">5 - Extremamente ativo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Food Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Preferências Alimentares</h3>
                  
                  <FormField
                    control={form.control}
                    name="likedHealthyFoods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alimentos saudáveis que você gosta</FormLabel>
                        <FormDescription>
                          Marque os alimentos saudáveis que você consome ou gostaria de consumir mais
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {healthyFoodOptions.map((food) => (
                            <div key={food} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value?.includes(food)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, food]);
                                  } else {
                                    field.onChange(currentValue.filter((value) => value !== food));
                                  }
                                }}
                              />
                              <label className="text-sm">{food}</label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dislikedFoods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alimentos que você não gosta ou evita</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {dislikedFoodOptions.map((food) => (
                            <div key={food} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value?.includes(food)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, food]);
                                  } else {
                                    field.onChange(currentValue.filter((value) => value !== food));
                                  }
                                }}
                              />
                              <label className="text-sm">{food}</label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Health Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informações de Saúde</h3>
                  
                  <FormField
                    control={form.control}
                    name="hasIntolerance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Tenho intolerâncias ou alergias alimentares
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("hasIntolerance") && (
                    <FormField
                      control={form.control}
                      name="intolerances"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quais intolerâncias você tem?</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {intoleranceOptions.map((intolerance) => (
                              <div key={intolerance} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(intolerance)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, intolerance]);
                                    } else {
                                      field.onChange(currentValue.filter((value) => value !== intolerance));
                                    }
                                  }}
                                />
                                <label className="text-sm">{intolerance}</label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="diseases"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doenças/Condições</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Diabetes, hipertensão, etc."
                              className="resize-none"
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicamentos atuais</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Liste os medicamentos que usa"
                              className="resize-none"
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supplements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suplementos</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Vitaminas, proteínas, etc."
                              className="resize-none"
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Observações Adicionais</h3>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Conte-nos sobre mudanças em sua rotina, dificuldades, progressos ou qualquer outra informação relevante..."
                            className="min-h-[100px]"
                            value={field.value || ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={submitAnamneseMutation.isPending}>
                    {submitAnamneseMutation.isPending ? "Enviando..." : "Enviar Anamnese"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/">Cancelar</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}