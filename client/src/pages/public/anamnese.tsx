import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { insertPatientSchema } from "@shared/schema";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Schema for the anamnese form with all fields
const formSchema = insertPatientSchema.omit({ ownerId: true, userId: true }).extend({
  heightCm: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().optional()
  ),
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Ex: 65.50").optional().or(z.literal('')),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
  // Transform string arrays for multi-select fields
  likedHealthyFoods: z.array(z.string()).default([]),
  dislikedFoods: z.array(z.string()).default([]),
  intolerances: z.array(z.string()).default([]),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export default function AnamnesePage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract token from URL
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), [location]);

  // Validate invitation token
  const { isLoading: isValidationLoading, isError: isTokenInvalid } = useQuery({
    queryKey: ["/api/invitations/validate", token],
    queryFn: () => fetch(`/api/invitations/validate?token=${token}`).then(res => {
      if (!res.ok) throw new Error("Token inválido");
      return res.json();
    }),
    enabled: !!token,
    retry: false,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      sex: undefined,
      heightCm: undefined,
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

  const registerPatientMutation = useMutation({
    mutationFn: (data: Omit<FormData, 'confirmPassword'> & { token: string }) => {
      return apiRequest("POST", "/api/patient/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Anamnese concluída com sucesso!",
        description: "Sua conta foi criada e você já pode acessá-la.",
      });
      // Reload page to let App.tsx redirect to patient home
      window.location.href = "/";
    },
    onError: (err: any) => {
      console.error("Erro no registro:", err);
      const errorMessage = err.message.includes("409")
        ? "Este email já está cadastrado no sistema."
        : "Não foi possível concluir sua anamnese. Tente novamente.";
      toast({
        title: "Erro no Cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (!token) return;
    const { confirmPassword, ...payload } = data;
    registerPatientMutation.mutate({ ...payload, token });
  };

  if (isValidationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (isTokenInvalid || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Link de Convite Inválido</AlertTitle>
          <AlertDescription>
            Este link é inválido, expirou ou já foi utilizado. Por favor, solicite um novo convite ao seu nutricionista.
            <div className="mt-4">
              <Button asChild variant="link" className="p-0">
                <Link to="/">Voltar para a página de login</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="flex justify-center mb-6">
        <DiNutriLogo variant="full" className="h-16" />
      </div>
      <main className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Anamnese Nutricional</CardTitle>
            <CardDescription>
              Parabéns pela escolha de cuidar da sua saúde! Este formulário nos ajudará a criar um plano nutricional personalizado.
              Trabalhe com profissionais capacitados para alcançar seus objetivos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crie sua Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirme sua Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sexo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="F">Feminino</SelectItem>
                              <SelectItem value="M">Masculino</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="heightCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (cm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="170"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription>Altura em centímetros (opcional)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weightKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="70.5"
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription>Formato: 70.5 (opcional)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Perfil de Atividade */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Perfil de Atividade</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Atividade Física</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
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
                    <FormField
                      control={form.control}
                      name="biotype"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Biotipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gain_weight_easily">Ganho peso facilmente</SelectItem>
                              <SelectItem value="hard_to_gain">Dificuldade para ganhar peso</SelectItem>
                              <SelectItem value="gain_muscle_easily">Ganho músculo facilmente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Hábitos Alimentares */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Hábitos Alimentares</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mealsPerDayCurrent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantas refeições faz por dia atualmente?</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              placeholder="3"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mealsPerDayWilling"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantas refeições estaria disposto a fazer?</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              placeholder="5"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="canEatMorningSolids"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Consegue comer sólidos pela manhã?</FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alcoholConsumption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consumo de Álcool</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="no">Não bebo</SelectItem>
                              <SelectItem value="moderate">Moderadamente</SelectItem>
                              <SelectItem value="yes">Sim, frequentemente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Preferências e Restrições */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Preferências e Restrições</h3>
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
                          <FormLabel>Possui alguma intolerância alimentar?</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("hasIntolerance") && (
                    <FormField
                      control={form.control}
                      name="intolerances"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quais intolerâncias? (separar por vírgula)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Lactose, glúten, etc."
                              value={field.value?.join(", ") || ""}
                              onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="likedHealthyFoods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alimentos saudáveis que você gosta (separar por vírgula)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brócolis, quinoa, salmão, abacate..."
                            value={field.value?.join(", ") || ""}
                            onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dislikedFoods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alimentos que não gosta (separar por vírgula)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Cebola, peixe, couve-flor..."
                            value={field.value?.join(", ") || ""}
                            onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Saúde e Medicamentos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Saúde e Medicamentos</h3>
                  <FormField
                    control={form.control}
                    name="diseases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doenças ou condições de saúde</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Diabetes, hipertensão, hipotireoidismo..."
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
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
                        <FormLabel>Medicamentos em uso</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Liste os medicamentos que utiliza regularmente..."
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
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
                        <FormLabel>Suplementos em uso</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Whey protein, vitamina D, ômega 3..."
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Observações */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Adicionais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Compartilhe qualquer informação adicional que possa ser relevante..."
                          className="min-h-[100px]"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button asChild variant="outline">
                    <Link to="/">Cancelar</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerPatientMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {registerPatientMutation.isPending ? "Criando conta..." : "Concluir Anamnese"}
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