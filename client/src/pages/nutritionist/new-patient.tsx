import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema } from "@shared/schema";

// O schema do formulário agora corresponde exatamente ao schema do backend.
// A conversão de tipos será feita pelo Zod.
const formSchema = insertPatientSchema.omit({ ownerId: true }).extend({
  // Pré-processa o campo de altura: se for uma string vazia, transforma em 'undefined'.
  heightCm: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().optional()
  ),
  // O campo de peso (decimal) é tratado como string, mas validamos seu formato.
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Ex: 65.50").optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export default function NewPatientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      birthDate: "",
      sex: undefined,
      heightCm: undefined,
      weightKg: "", // Inicia como string vazia
      notes: "",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Limpa os campos opcionais que não foram preenchidos
      const payload = { ...data };
      if (payload.weightKg === "") {
        delete payload.weightKg;
      }
      return await apiRequest("POST", "/api/patients", payload);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setLocation("/patients");
    },
    onError: (error) => {
      console.error("Erro ao criar paciente:", error);
      toast({
        title: "Erro",
        description: "Falha ao cadastrar paciente. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createPatientMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Novo Paciente"
        leftElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/patients")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <main className="max-w-2xl mx-auto p-4 lg:p-6">
        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campos Name, Email, BirthDate, Sex (sem alterações) */}
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do paciente" {...field} />
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
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                  
                  {/* Campo Height (Altura) */}
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
                              // Mostra string vazia se o valor for undefined
                              value={field.value ?? ''}
                              // Passa o valor como string para o Zod processar
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Campo Weight (Peso) */}
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
                              // O valor do campo é tratado como string
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Campo Notes (Observações) */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações..." className="h-24" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setLocation("/patients")}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createPatientMutation.isPending}>
                    {createPatientMutation.isPending ? "Cadastrando..." : "Cadastrar Paciente"}
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