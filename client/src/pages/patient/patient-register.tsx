import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema } from "@shared/schema";

// Schema for the patient self-registration form
const formSchema = insertPatientSchema.omit({ ownerId: true, userId: true }).extend({
  heightCm: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().optional()
  ),
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Ex: 65.50").optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export default function PatientRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();

  // 1. Validate the invitation token on page load
  const { data: invitation, isLoading: isValidationLoading, error } = useQuery<{ valid: boolean }>({
    queryKey: ["/api/invitations/validate"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Convite inválido",
        description: "Este link de convite é inválido ou já foi utilizado. Peça um novo ao seu nutricionista.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [error, setLocation, toast]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "",
      email: user?.email || "",
      birthDate: "",
      sex: undefined,
      heightCm: undefined,
      weightKg: "",
      notes: "",
    },
  });
  
  // Pre-fill form with user data once authentication is complete
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "",
        email: user.email || "",
      });
    }
  }, [user, form]);


  const registerPatientMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data };
      if (payload.weightKg === "") {
        delete payload.weightKg;
      }
      return apiRequest("POST", "/api/patient/register", payload);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro concluído!",
        description: "Seus dados foram enviados ao seu nutricionista.",
      });
      setLocation("/patient/prescription");
    },
    onError: (err) => {
      console.error("Erro no registro:", err);
      toast({
        title: "Erro no Cadastro",
        description: "Não foi possível concluir seu cadastro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    registerPatientMutation.mutate(data);
  };

  if (isAuthLoading || isValidationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete seu Cadastro</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                            <Input type="email" {...field} disabled />
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
                  {registerPatientMutation.isPending ? "Enviando..." : "Finalizar Cadastro"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}