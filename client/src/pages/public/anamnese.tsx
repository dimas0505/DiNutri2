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
import { insertPatientSchema, anamnesisSchema } from "@shared/schema";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Date formatting function for dd/mm/yyyy mask
const formatDate = (value: string) => {
  // Remove tudo que não for dígito
  const onlyNums = value.replace(/[^\d]/g, "");

  if (onlyNums.length <= 2) {
    return onlyNums;
  }
  if (onlyNums.length <= 4) {
    return `${onlyNums.slice(0, 2)}/${onlyNums.slice(2)}`;
  }
  return `${onlyNums.slice(0, 2)}/${onlyNums.slice(2, 4)}/${onlyNums.slice(4, 8)}`;
};

// Schema for the anamnese form with all mandatory fields
const formSchema = anamnesisSchema;

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
      sex: "M", // Set a default value instead of undefined
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
    <>
      {/* Estilos para os blobs animados e efeitos 3D dos cards */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        /* Efeitos 3D para os cards */
        .card-3d {
          perspective: 1000px;
          transform-style: preserve-3d;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-3d:hover {
          transform: translateY(-8px) rotateX(2deg) rotateY(-2deg);
        }
        
        .card-3d::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%);
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 1;
        }
        
        .card-3d:hover::before {
          opacity: 1;
        }
        
        .card-3d > * {
          position: relative;
          z-index: 2;
        }
        
        /* Sombras aprimoradas */
        .shadow-3d {
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06),
            0 10px 25px -3px rgba(59, 130, 246, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }
        
        .shadow-3d:hover {
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04),
            0 25px 50px -12px rgba(59, 130, 246, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        
        /* Gradientes sutis para diferentes cards */
        .card-personal {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        
        .card-goals {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 244, 0.95) 100%);
          border: 1px solid rgba(34, 197, 94, 0.1);
        }
        
        .card-preferences {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 247, 237, 0.95) 100%);
          border: 1px solid rgba(251, 146, 60, 0.1);
        }
        
        .card-health {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(252, 231, 243, 0.95) 100%);
          border: 1px solid rgba(236, 72, 153, 0.1);
        }
        
        /* Animação de entrada suave */
        .card-enter {
          animation: cardSlideIn 0.6s ease-out forwards;
        }
        
        @keyframes cardSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .card-enter:nth-child(1) { animation-delay: 0.1s; }
        .card-enter:nth-child(2) { animation-delay: 0.2s; }
        .card-enter:nth-child(3) { animation-delay: 0.3s; }
        .card-enter:nth-child(4) { animation-delay: 0.4s; }
        .card-enter:nth-child(5) { animation-delay: 0.5s; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Elementos decorativos do fundo */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        {/* Logo Destacada */}
        <div className="flex justify-center mb-6 mt-8">
          <DiNutriLogo variant="full" className="h-24" />
        </div>

        <main className="w-full max-w-4xl mx-auto space-y-8">
          <ErrorBoundary>
            <Card className="card-3d shadow-3d rounded-3xl border-0 bg-white/95 backdrop-blur-md card-enter">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Anamnese Nutricional
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground mt-2">
                Parabéns pela escolha de cuidar da sua saúde! Preencha os campos abaixo para criarmos seu plano.
              </CardDescription>
            </CardHeader>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <Card className="card-3d card-personal shadow-3d rounded-3xl border-0 backdrop-blur-md card-enter">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    Dados Pessoais e Acesso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                          <FormLabel>Data de Nascimento *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="dd/mm/aaaa"
                              maxLength={10}
                              {...field}
                              onChange={(e) => {
                                const formattedDate = formatDate(e.target.value);
                                field.onChange(formattedDate);
                              }}
                              value={field.value || ""}
                            />
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
                          <FormLabel>Sexo *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              // Defensive handling: only accept valid enum values
                              const validValues = new Set(["M", "F", "Outro"]);
                              const normalizedValue = typeof value === "string" ? value.trim() : "";
                              field.onChange(validValues.has(normalizedValue) ? normalizedValue : "M");
                            }} 
                            value={field.value || "M"} // Ensure we always have a valid value
                          >
                            <FormControl>
                              <SelectTrigger autoComplete="off">
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M">Masculino</SelectItem>
                              <SelectItem value="F">Feminino</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                          <FormDescription>Altura em centímetros</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <FormDescription>Formato: 70.5</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-3d card-goals shadow-3d rounded-3xl border-0 backdrop-blur-md card-enter">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    Objetivos e Hábitos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

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
                </CardContent>
              </Card>

              <Card className="card-3d card-preferences shadow-3d rounded-3xl border-0 backdrop-blur-md card-enter">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    Preferências e Restrições
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
              
              <Card className="card-3d card-health shadow-3d rounded-3xl border-0 backdrop-blur-md card-enter">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                    Saúde e Informações Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="diseases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doenças ou condições de saúde</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Diabetes, hipertensão, hipotireoidismo... (Digite 'Nenhuma' se não possui)"
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
                            placeholder="Liste os medicamentos que utiliza regularmente... (Digite 'Nenhum' se não usa)"
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
                            placeholder="Whey protein, vitamina D, ômega 3... (Digite 'Nenhum' se não usa)"
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
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-4 pt-6 pb-8">
                <Button asChild variant="ghost" className="px-8 py-3 text-lg rounded-2xl">
                  <Link to="/">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={registerPatientMutation.isPending}
                  className="min-w-[200px] text-lg py-6 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  size="lg"
                >
                  {registerPatientMutation.isPending ? "Finalizando..." : "Concluir e Criar Conta"}
                </Button>
              </div>

            </form>
          </Form>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}