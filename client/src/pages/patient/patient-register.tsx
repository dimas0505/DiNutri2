import { useEffect, useMemo } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema } from "@shared/schema";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Schema for the patient self-registration form, now with password
const formSchema = insertPatientSchema.omit({ ownerId: true, userId: true }).extend({
  heightCm: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().optional()
  ),
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Ex: 65.50").optional().or(z.literal('')),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"], // O erro aparecerá no campo de confirmação
});

type FormData = z.infer<typeof formSchema>;

export default function PatientRegisterPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extrai o token da URL
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), [location]);

  // Valida o token de convite na montagem da página
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
    },
  });

  const registerPatientMutation = useMutation({
    mutationFn: (data: Omit<FormData, 'confirmPassword'> & { token: string }) => {
      return apiRequest("POST", "/api/patient/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro concluído com sucesso!",
        description: "Você já pode acessar sua conta.",
      });
      // Recarrega a página para que o App.tsx redirecione para a home do paciente
      window.location.href = "/";
    },
    onError: (err: any) => {
      console.error("Erro no registro:", err);
      const errorMessage = err.message.includes("409")
        ? "Este email já está cadastrado no sistema."
        : "Não foi possível concluir seu cadastro. Tente novamente.";
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
       <div className="flex justify-center mb-6">
          <DiNutriLogo variant="full" className="h-16" />
        </div>
      <main className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete seu Cadastro</CardTitle>
            <CardDescription>Preencha seus dados para criar sua conta de paciente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
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
                  </div>
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <div className="md:col-span-1">
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
                  </div>
                  <div className="md:col-span-1">
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
                  <div>
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
                  </div>
                  <div>
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
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="heightCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (cm)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="165"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="weightKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg) - Opcional</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="64.50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Alguma observação para seu nutricionista?" className="h-24" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={registerPatientMutation.isPending}>
                  {registerPatientMutation.isPending ? "Finalizando..." : "Finalizar Cadastro e Entrar"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}