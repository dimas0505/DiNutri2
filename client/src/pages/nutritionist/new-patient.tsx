import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema } from "@shared/schema";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { Copy, LinkIcon, UserPlus, User, Calendar, Activity, ClipboardList } from "lucide-react";

// Schema do formulário de criação manual - alinhado com anamnese.tsx
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

export default function NewPatientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [useInvitationLink, setUseInvitationLink] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

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

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invitations");
      return res.json();
    },
    onSuccess: (data: any) => {
      const token = data?.token;
      if (!token) {
        toast({
          title: "Erro",
          description: "Resposta inválida do servidor ao gerar convite.",
          variant: "destructive",
        });
        return;
      }
      const fullUrl = `${window.location.origin}/anamnese?token=${token}`;
      setInvitationLink(fullUrl);
      toast({ title: "Link de convite gerado!" });
    },
    onError: (err: any) => {
      console.error("Erro ao gerar convite:", err);
      const errorMessage = err?.message || "Não foi possível gerar o link de convite.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: Omit<FormData, 'confirmPassword'>) => {
      const payload = { 
        ...data,
        ownerId: user?.id
      };
      
      // Normalize optional fields
      if (payload.weightKg === "") {
        delete (payload as any).weightKg;
      }

      const res = await apiRequest("POST", "/api/patients", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Paciente e seu acesso foram criados com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setLocation("/patients");
    },
    onError: (error: any) => {
      console.error("Erro ao criar paciente:", error);
      const errorMessage = error?.message?.includes("409")
        ? "Já existe um usuário com este email."
        : error?.message || "Falha ao cadastrar paciente. Verifique os dados e tente novamente.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    const { confirmPassword, ...payload } = data;
    createPatientMutation.mutate(payload);
  };

  const handleGenerateInvite = () => {
    createInvitationMutation.mutate();
  };

  const copyToClipboard = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast({ title: "Link copiado para a área de transferência!" });
    }
  };

  return (
    <>
      {/* CSS Animations */}
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
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-2000"></div>
        </div>

        <Header 
          title="Novo Paciente"
          showBack={true}
          onBack={() => setLocation("/patients")}
          drawerContent={<DefaultMobileDrawer />}
        />
        
        <main className="max-w-4xl mx-auto p-4 lg:p-6 relative z-10">
          {/* Enhanced Header Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <UserPlus className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Adicionar Novo Paciente</h1>
                  <p className="text-blue-100 text-lg opacity-90">Cadastre um novo paciente ou envie um convite para anamnese</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg rounded-2xl overflow-hidden relative">
            {/* Card gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-2xl blur-sm opacity-10"></div>
            <div className="relative bg-white/90 backdrop-blur-md rounded-2xl">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <Switch
                      id="use-invitation"
                      checked={useInvitationLink}
                      onCheckedChange={setUseInvitationLink}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-500"
                    />
                    <Label htmlFor="use-invitation" className="text-gray-700 font-medium cursor-pointer">
                      Enviar link de anamnese ao invés de preencher manualmente
                    </Label>
                  </div>
                  
                  {useInvitationLink ? (
                    <div className="space-y-6 text-center py-8">
                      <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                        <LinkIcon className="h-10 w-10 text-blue-600" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">Convite por Link de Anamnese</h3>
                        <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                          Ao gerar um link de convite, o paciente receberá um formulário completo de anamnese para preencher, 
                          criando automaticamente sua conta após o envio.
                        </p>
                      </div>
                      
                      <Button
                        onClick={handleGenerateInvite}
                        disabled={createInvitationMutation.isPending}
                        className="h-14 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] font-medium"
                      >
                        <LinkIcon className="h-5 w-5 mr-3" />
                        {createInvitationMutation.isPending ? "Gerando..." : "Gerar Link de Anamnese"}
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* Dados Pessoais Section */}
                        <div className="space-y-6">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <User className="h-5 w-5" />
                              </div>
                              <h3 className="text-lg font-semibold">Dados do Paciente</h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-semibold">Nome Completo *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Nome do paciente" 
                                        className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-semibold">E-mail *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="email" 
                                        placeholder="email@exemplo.com" 
                                        className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
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
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-semibold">Senha de Acesso *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="password" 
                                        placeholder="••••••••" 
                                        className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
                                        {...field} 
                                      />
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
                                    <FormLabel className="text-gray-700 font-semibold">Confirme a Senha *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="password" 
                                        placeholder="••••••••" 
                                        className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="birthDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-semibold">Data de Nascimento</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
                                      {...field} 
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
                                  <FormLabel className="text-gray-700 font-semibold">Sexo</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm">
                                        <SelectValue placeholder="Selecionar" />
                                      </SelectTrigger>
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
                              name="heightCm"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-semibold">Altura (cm)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="165"
                                      className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
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
                              name="weightKg"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-semibold">Peso (kg) - Opcional</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number" 
                                      step="0.01"
                                      placeholder="64.50"
                                      className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
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
                        </div>

                        {/* Objetivos e Hábitos Section */}
                        <div className="space-y-6">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Activity className="h-5 w-5" />
                              </div>
                              <h3 className="text-lg font-semibold">Objetivos e Hábitos</h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="goal"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-semibold">Objetivo</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm">
                                        <SelectValue placeholder="Selecionar" />
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
                                  <FormLabel className="text-gray-700 font-semibold">Nível de Atividade Física</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm">
                                        <SelectValue placeholder="Selecionar" />
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="biotype"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-semibold">Biotipo</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm">
                                        <SelectValue placeholder="Selecionar" />
                                      </SelectTrigger>
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
                                  <FormLabel className="text-gray-700 font-semibold">Quantas refeições faz por dia atualmente?</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="10"
                                      placeholder="3"
                                      className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="mealsPerDayWilling"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-semibold">Quantas refeições estaria disposto a fazer?</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="10"
                                      placeholder="5"
                                      className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
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
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-gray-700 font-semibold">Consegue comer sólidos pela manhã?</FormLabel>
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
                                <FormLabel className="text-gray-700 font-semibold">Consumo de Álcool</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm">
                                      <SelectValue placeholder="Selecionar" />
                                    </SelectTrigger>
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

                        {/* Preferências e Restrições Section */}
                        <div className="space-y-6">
                          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <h3 className="text-lg font-semibold">Preferências e Restrições</h3>
                            </div>
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="hasIntolerance"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-gray-700 font-semibold">Possui alguma intolerância alimentar?</FormLabel>
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
                                  <FormLabel className="text-gray-700 font-semibold">Quais intolerâncias? (separar por vírgula)</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Lactose, glúten, etc."
                                      className="h-12 border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm"
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
                                <FormLabel className="text-gray-700 font-semibold">Alimentos saudáveis que você gosta (separar por vírgula)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Brócolis, quinoa, salmão, abacate..."
                                    className="min-h-[100px] border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm resize-none"
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
                                <FormLabel className="text-gray-700 font-semibold">Alimentos que não gosta (separar por vírgula)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Cebola, peixe, couve-flor..."
                                    className="min-h-[100px] border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm resize-none"
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

                        {/* Saúde e Informações Adicionais Section */}
                        <div className="space-y-6">
                          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-4 text-white">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <ClipboardList className="h-5 w-5" />
                              </div>
                              <h3 className="text-lg font-semibold">Saúde e Informações Adicionais</h3>
                            </div>
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="diseases"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-semibold">Doenças ou condições de saúde</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Diabetes, hipertensão, hipotireoidismo..."
                                    className="min-h-[100px] border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm resize-none"
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
                                <FormLabel className="text-gray-700 font-semibold">Medicamentos em uso</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Liste os medicamentos que utiliza regularmente..."
                                    className="min-h-[100px] border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm resize-none"
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
                                <FormLabel className="text-gray-700 font-semibold">Suplementos em uso</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Whey protein, vitamina D, ômega 3..."
                                    className="min-h-[100px] border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm resize-none"
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

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-semibold">Observações</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Alguma observação para o paciente..."
                                  className="min-h-[120px] border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 rounded-xl text-base bg-white/80 backdrop-blur-sm resize-none"
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

                        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setLocation("/patients")}
                            className="h-12 px-8 text-base border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 rounded-xl font-medium"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createPatientMutation.isPending}
                            className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] font-medium"
                          >
                            {createPatientMutation.isPending ? "Criando..." : "Criar Paciente"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        </main>

        {/* Enhanced Dialog for invitation link */}
        <Dialog open={!!invitationLink} onOpenChange={() => setInvitationLink(null)}>
          <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
            <DialogHeader className="text-center space-y-4 pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Link de Anamnese Gerado
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                Envie este link para o paciente preencher sua anamnese nutricional completa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 font-mono text-sm break-all overflow-auto max-h-32">
                {invitationLink}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setInvitationLink(null)}
                  className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 rounded-xl font-medium"
                >
                  Fechar
                </Button>
                <Button 
                  onClick={copyToClipboard}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] font-medium"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}